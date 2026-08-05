// ============================================================
// HJS Attendance — single-file React app
// Deps: npm i @supabase/supabase-js lucide-react
// Env:  VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
// Session persist rehta hai — logout tabhi jab user khud kare.
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Fingerprint, LogOut, MapPin, CalendarDays, Users,
  Clock, AlertTriangle, Check, Download, Loader2, X,
} from "lucide-react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, storageKey: "hjs-attendance" } }
);

const EMAIL_DOMAIN = "@hjs.local";
const IST = "en-IN";

/* ---------------- helpers ---------------- */
const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString(IST, { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }) : "—";
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(IST, { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" }) : "—";
const istToday = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })).toISOString().slice(0, 10);
const hhmm = (mins) => {
  if (mins == null) return "—";
  const m = Math.max(0, Math.round(mins));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}h ${String(m % 60).padStart(2, "0")}m`;
};
const getPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Is device par location support nahi hai"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      (e) =>
        reject(
          new Error(
            e.code === 1
              ? "Location permission band hai. Browser settings mein allow karke dobara try kijiye."
              : "Location nahi mil rahi. Ek baar aur try kijiye."
          )
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });

const STATUS_STYLE = {
  Present: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Late: "bg-amber-50 text-amber-700 ring-amber-200",
  "Half Day": "bg-orange-50 text-orange-700 ring-orange-200",
  Absent: "bg-rose-50 text-rose-700 ring-rose-200",
  Leave: "bg-sky-50 text-sky-700 ring-sky-200",
  Holiday: "bg-slate-100 text-slate-600 ring-slate-200",
  "Week Off": "bg-slate-100 text-slate-600 ring-slate-200",
};
const Pill = ({ children, tone = "Present" }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLE[tone] || STATUS_STYLE.Holiday}`}>
    {children}
  </span>
);
const Banner = ({ kind = "error", children, onClose }) =>
  !children ? null : (
    <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${kind === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>
      {kind === "error" ? <AlertTriangle size={16} className="mt-0.5 shrink-0" /> : <Check size={16} className="mt-0.5 shrink-0" />}
      <span className="flex-1">{children}</span>
      {onClose && <button onClick={onClose} aria-label="Band karein"><X size={14} /></button>}
    </div>
  );

/* ---------------- login ---------------- */
function Login() {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: `${code.trim().toLowerCase()}${EMAIL_DOMAIN}`,
      password: pin,
    });
    if (error) setErr("Employee code ya PIN galat hai.");
    setBusy(false);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-white">
            <Fingerprint size={26} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">HJS Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">Ek baar login — phir roz sirf punch.</p>
        </div>
        <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <label className="block text-sm font-medium text-slate-700">Employee code</label>
          <input
            value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters"
            placeholder="HJS001"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 uppercase outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
          <label className="block text-sm font-medium text-slate-700">PIN</label>
          <input
            value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric"
            placeholder="6 digit PIN" onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 tracking-widest outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
          />
          <Banner onClose={() => setErr("")}>{err}</Banner>
          <button
            onClick={submit} disabled={busy || !code || pin.length < 6}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 font-medium text-white disabled:opacity-40"
          >
            {busy && <Loader2 size={16} className="animate-spin" />} Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- punch screen ---------------- */
function PunchScreen({ me }) {
  const [today, setToday] = useState(null);
  const [recent, setRecent] = useState([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const timer = useRef();

  const load = async () => {
    const from = new Date(); from.setDate(from.getDate() - 30);
    const { data } = await supabase
      .from("attendance_logs").select("*")
      .eq("employee_id", me.id).gte("work_date", from.toISOString().slice(0, 10))
      .order("work_date", { ascending: false });
    setRecent(data || []);
    setToday((data || []).find((r) => r.work_date === istToday()) || null);
  };
  useEffect(() => { load(); }, [me.id]);
  useEffect(() => {
    timer.current = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer.current);
  }, []);

  const liveMinutes = useMemo(() => {
    if (!today?.punch_in_at) return null;
    const end = today.punch_out_at ? new Date(today.punch_out_at) : new Date();
    return (end - new Date(today.punch_in_at)) / 60000;
  }, [today, tick]);

  const punch = async (dir) => {
    setErr(""); setOk(""); setBusy(true);
    try {
      const pos = await getPosition();
      const { data, error } = await supabase.rpc(dir === "in" ? "punch_in" : "punch_out", {
        p_lat: pos.coords.latitude,
        p_lng: pos.coords.longitude,
        p_accuracy: Math.round(pos.coords.accuracy),
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      setToday(row);
      setOk(dir === "in" ? `Punch-in ${fmtTime(row.punch_in_at)} par record ho gaya.` : `Punch-out ${fmtTime(row.punch_out_at)} — aaj ${hhmm(row.worked_minutes)}.`);
      load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const done = !!today?.punch_out_at;
  const inOnly = today?.punch_in_at && !today?.punch_out_at;
  const monthStats = useMemo(() => {
    const m = istToday().slice(0, 7);
    const rows = recent.filter((r) => r.work_date.startsWith(m));
    return {
      present: rows.filter((r) => ["Present", "Late"].includes(r.status)).length,
      late: rows.filter((r) => r.status === "Late").length,
      half: rows.filter((r) => r.status === "Half Day").length,
      hours: rows.reduce((s, r) => s + (r.worked_minutes || 0), 0),
    };
  }, [recent]);

  return (
    <div className="space-y-5 p-5">
      <div>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString(IST, { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" })}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Hi, {me.full_name.split(" ")[0]}</h2>
      </div>

      {/* signature: live clock + punch */}
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-xs uppercase tracking-wider text-slate-400">Aaj ka time</p>
        <p className="mt-1 font-mono text-4xl font-semibold tabular-nums text-slate-900">{hhmm(liveMinutes)}</p>
        <div className="mt-3 flex items-center justify-center gap-4 text-sm text-slate-600">
          <span>In {fmtTime(today?.punch_in_at)}</span>
          <span className="h-3 w-px bg-slate-300" />
          <span>Out {fmtTime(today?.punch_out_at)}</span>
        </div>
        {today && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <Pill tone={today.status}>{today.status}</Pill>
            {today.in_geo_ok === false && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                <MapPin size={12} /> Branch se {today.in_distance_m ?? "?"} m door
              </span>
            )}
          </div>
        )}

        <button
          onClick={() => punch(inOnly ? "out" : "in")}
          disabled={busy || done}
          className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-white transition
            ${done ? "bg-slate-300" : inOnly ? "bg-rose-600 active:bg-rose-700" : "bg-teal-700 active:bg-teal-800"}`}
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
          {done ? "Aaj ka din complete" : inOnly ? "Punch out" : "Punch in"}
        </button>
        <p className="mt-2 text-xs text-slate-400">Punch ke saath location record hoti hai</p>
      </div>

      <Banner onClose={() => setErr("")}>{err}</Banner>
      <Banner kind="ok" onClose={() => setOk("")}>{ok}</Banner>

      <div className="grid grid-cols-4 gap-2">
        {[
          ["Present", monthStats.present], ["Late", monthStats.late],
          ["Half", monthStats.half], ["Hours", Math.round(monthStats.hours / 60)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
            <p className="text-lg font-semibold text-slate-900">{v}</p>
            <p className="text-xs text-slate-500">{k}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Pichhle 30 din</h3>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          {recent.length === 0 && <p className="p-4 text-sm text-slate-500">Abhi koi record nahi. Pehla punch aaj se shuru kijiye.</p>}
          {recent.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="w-16 shrink-0 font-medium text-slate-700">{fmtDate(r.work_date)}</span>
              <span className="flex-1 text-slate-500">{fmtTime(r.punch_in_at)} – {fmtTime(r.punch_out_at)}</span>
              <span className="w-16 text-right tabular-nums text-slate-600">{hhmm(r.worked_minutes)}</span>
              <Pill tone={r.status}>{r.status}</Pill>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- leaves ---------------- */
function LeavesScreen({ me }) {
  const [types, setTypes] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ leave_type: "CL", from_date: istToday(), to_date: istToday(), half_day: false, reason: "" });
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const isApprover = ["manager", "admin"].includes(me.role);

  const load = async () => {
    const [{ data: t }, { data: l }] = await Promise.all([
      supabase.from("leave_types").select("*"),
      supabase.from("leaves").select("*, employees(full_name, emp_code)").order("from_date", { ascending: false }).limit(100),
    ]);
    setTypes(t || []); setRows(l || []);
  };
  useEffect(() => { load(); }, []);

  const days = useMemo(() => {
    const d = (new Date(form.to_date) - new Date(form.from_date)) / 86400000 + 1;
    return form.half_day ? 0.5 : Math.max(1, d);
  }, [form]);

  const apply = async () => {
    setMsg({ err: "", ok: "" });
    const { error } = await supabase.from("leaves").insert({ ...form, employee_id: me.id, days, status: "Pending" });
    if (error) setMsg({ err: "Leave submit nahi hui: " + error.message, ok: "" });
    else { setMsg({ err: "", ok: "Leave request bhej di gayi." }); setForm({ ...form, reason: "" }); load(); }
  };

  const decide = async (id, status) => {
    await supabase.from("leaves").update({ status, approved_by: me.id, approved_at: new Date().toISOString() }).eq("id", id);
    load();
  };

  const mine = rows.filter((r) => r.employee_id === me.id);
  const pending = rows.filter((r) => r.status === "Pending" && r.employee_id !== me.id);

  return (
    <div className="space-y-5 p-5">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">Leaves</h2>

      <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">Nayi leave apply karein</h3>
        <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
          {types.map((t) => <option key={t.code} value={t.code}>{t.name}{t.paid ? "" : " (unpaid)"}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value, to_date: e.target.value > form.to_date ? e.target.value : form.to_date })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
          <input type="date" value={form.to_date} min={form.from_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.half_day} onChange={(e) => setForm({ ...form, half_day: e.target.checked, to_date: form.from_date })} />
          Half day
        </label>
        <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2}
          placeholder="Reason" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">{days} day{days === 1 ? "" : "s"}</span>
          <button onClick={apply} disabled={!form.reason} className="rounded-xl bg-teal-700 px-5 py-2.5 font-medium text-white disabled:opacity-40">
            Apply
          </button>
        </div>
        <Banner onClose={() => setMsg({ ...msg, err: "" })}>{msg.err}</Banner>
        <Banner kind="ok" onClose={() => setMsg({ ...msg, ok: "" })}>{msg.ok}</Banner>
      </div>

      {isApprover && pending.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Approval baaki ({pending.length})</h3>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {pending.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{r.employees?.full_name}</p>
                    <p className="text-sm text-slate-500">{r.leave_type} · {fmtDate(r.from_date)} – {fmtDate(r.to_date)} · {r.days}d</p>
                    <p className="mt-1 text-sm text-slate-600">{r.reason}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => decide(r.id, "Approved")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white">Approve</button>
                    <button onClick={() => decide(r.id, "Rejected")} className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm text-slate-700">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Meri leaves</h3>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          {mine.length === 0 && <p className="p-4 text-sm text-slate-500">Abhi tak koi leave apply nahi ki.</p>}
          {mine.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="w-12 font-medium text-slate-700">{r.leave_type}</span>
              <span className="flex-1 text-slate-500">{fmtDate(r.from_date)} – {fmtDate(r.to_date)}</span>
              <span className="text-slate-600">{r.days}d</span>
              <Pill tone={r.status === "Approved" ? "Present" : r.status === "Rejected" ? "Absent" : "Late"}>{r.status}</Pill>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- team + payroll ---------------- */
function TeamScreen({ me }) {
  const [tab, setTab] = useState("today");
  const [rows, setRows] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [month, setMonth] = useState(istToday().slice(0, 7));
  const [busy, setBusy] = useState(false);

  const loadToday = async () => {
    setBusy(true);
    const [{ data: emps }, { data: logs }, { data: lvs }] = await Promise.all([
      supabase.from("employees").select("id, emp_code, full_name, designation, branches(name)").eq("active", true).order("full_name"),
      supabase.from("attendance_logs").select("*").eq("work_date", istToday()),
      supabase.from("leaves").select("employee_id, leave_type").eq("status", "Approved").lte("from_date", istToday()).gte("to_date", istToday()),
    ]);
    setRows((emps || []).map((e) => ({
      ...e,
      log: (logs || []).find((l) => l.employee_id === e.id),
      onLeave: (lvs || []).find((l) => l.employee_id === e.id),
    })));
    setBusy(false);
  };

  const loadPayroll = async () => {
    setBusy(true);
    const { data } = await supabase.rpc("payroll_summary", { p_month: `${month}-01` });
    setPayroll(data || []);
    setBusy(false);
  };

  useEffect(() => { tab === "today" ? loadToday() : loadPayroll(); }, [tab, month]);

  const exportCsv = () => {
    if (!payroll.length) return;
    const cols = Object.keys(payroll[0]);
    const csv = [cols.join(","), ...payroll.map((r) => cols.map((c) => `"${r[c] ?? ""}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `HJS_attendance_${month}.csv`;
    a.click();
  };

  const present = rows.filter((r) => r.log?.punch_in_at).length;

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Team</h2>
        <div className="flex rounded-xl bg-slate-200 p-0.5 text-sm">
          {[["today", "Aaj"], ["payroll", "Payroll"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`rounded-lg px-3 py-1.5 ${tab === k ? "bg-white font-medium shadow-sm" : "text-slate-600"}`}>{l}</button>
          ))}
        </div>
      </div>

      {busy && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Load ho raha hai…</p>}

      {tab === "today" && !busy && (
        <>
          <p className="text-sm text-slate-500">{present} of {rows.length} ne punch kiya hai</p>
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{r.full_name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {r.branches?.name || "—"} · {r.log ? `${fmtTime(r.log.punch_in_at)} – ${fmtTime(r.log.punch_out_at)}` : "koi punch nahi"}
                  </p>
                </div>
                {r.log?.in_geo_ok === false && <MapPin size={14} className="shrink-0 text-amber-600" />}
                <Pill tone={r.log?.status || (r.onLeave ? "Leave" : "Absent")}>
                  {r.log?.status || (r.onLeave ? r.onLeave.leave_type : "No punch")}
                </Pill>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "payroll" && !busy && (
        <>
          <div className="flex items-center gap-2">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2" />
            <button onClick={exportCsv} disabled={!payroll.length}
              className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
              <Download size={15} /> CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {["Name", "Present", "Half", "Late", "Paid lv", "LOP", "Absent", "Payable", "Amount"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payroll.map((r) => (
                  <tr key={r.emp_code}>
                    <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{r.full_name}</td>
                    <td className="px-3 py-2 tabular-nums">{r.present_days}</td>
                    <td className="px-3 py-2 tabular-nums">{r.half_days}</td>
                    <td className="px-3 py-2 tabular-nums">{r.late_marks}</td>
                    <td className="px-3 py-2 tabular-nums">{r.paid_leaves}</td>
                    <td className="px-3 py-2 tabular-nums">{r.unpaid_leaves}</td>
                    <td className="px-3 py-2 tabular-nums text-rose-600">{r.absent_days}</td>
                    <td className="px-3 py-2 font-medium tabular-nums">{r.payable_days}</td>
                    <td className="px-3 py-2 tabular-nums">{r.payable_amount ?? "—"}</td>
                  </tr>
                ))}
                {!payroll.length && <tr><td colSpan={9} className="px-3 py-4 text-slate-500">Is month ka data nahi mila.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- shell ---------------- */
export default function Attendance() {
  const [session, setSession] = useState(undefined);
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("punch");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setMe(null); return; }
    supabase.from("employees").select("*, branches(name)").eq("auth_user_id", session.user.id).single()
      .then(({ data }) => setMe(data));
  }, [session]);

  if (session === undefined) return <div className="flex min-h-dvh items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (!session) return <Login />;
  if (!me) return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
      <p className="text-slate-700">Is login se koi employee record juda hua nahi hai. Admin se emp code link karwa lijiye.</p>
      <button onClick={() => supabase.auth.signOut()} className="rounded-xl bg-slate-800 px-4 py-2 text-white">Sign out</button>
    </div>
  );

  const isApprover = ["manager", "admin"].includes(me.role);
  const tabs = [
    ["punch", "Punch", Fingerprint],
    ["leaves", "Leaves", CalendarDays],
    ...(isApprover ? [["team", "Team", Users]] : []),
  ];

  return (
    <div className="min-h-dvh bg-slate-50 pb-20 text-slate-900">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-teal-700" />
          <span className="text-sm font-semibold">HJS Attendance</span>
          <span className="text-xs text-slate-400">· {me.emp_code}</span>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1.5 text-sm text-slate-500">
          <LogOut size={15} /> Sign out
        </button>
      </header>

      <main className="mx-auto max-w-2xl">
        {tab === "punch" && <PunchScreen me={me} />}
        {tab === "leaves" && <LeavesScreen me={me} />}
        {tab === "team" && isApprover && <TeamScreen me={me} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-slate-200 bg-white">
        {tabs.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${tab === k ? "text-teal-700" : "text-slate-400"}`}>
            <Icon size={19} /> {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
