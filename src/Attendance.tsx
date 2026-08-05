// ============================================================
// HJS Attendance — self-contained (koi Tailwind nahi)
// Saari CSS niche .hjsatt ke andar scoped hai, isliye
// delivery / pickups / complaints par zero asar.
// Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, storageKey: "hjs-attendance" } }
);

const EMAIL_DOMAIN = "@hjs.local";
const IST = "en-IN";
const TZ = "Asia/Kolkata";

/* ------------------------- styles ------------------------- */
const CSS = `
.hjsatt, .hjsatt * { box-sizing: border-box; margin: 0; padding: 0; }
.hjsatt {
  position: fixed; inset: 0; overflow-y: auto;
  background: #f1f5f9; color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 15px; line-height: 1.45; -webkit-font-smoothing: antialiased;
}
.hjsatt button { font: inherit; cursor: pointer; border: 0; background: none; color: inherit; }
.hjsatt input, .hjsatt select, .hjsatt textarea {
  font: inherit; width: 100%; padding: 11px 13px; border: 1px solid #cbd5e1;
  border-radius: 12px; background: #fff; color: #0f172a; outline: none;
}
.hjsatt input:focus, .hjsatt select:focus, .hjsatt textarea:focus { border-color: #0f766e; box-shadow: 0 0 0 3px #ccfbf1; }
.hjsatt label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }

.att-wrap { max-width: 640px; margin: 0 auto; padding: 20px 18px 92px; }
.att-center { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px 18px; }
.att-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px; }
.att-stack > * + * { margin-top: 14px; }
.att-muted { color: #64748b; font-size: 13px; }
.hjsatt h1, .hjsatt h2, .hjsatt h3, .hjsatt p, .hjsatt b, .hjsatt span, .hjsatt div { color: inherit; }
.att-h1 { font-size: 21px; font-weight: 650; letter-spacing: -0.02em; color: #0f172a; }
.att-h2 { font-size: 14px; font-weight: 650; color: #334155; margin-bottom: 9px; }

.att-btn { display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 13px; border-radius: 13px; background: #0f766e; color: #fff;
  font-weight: 600; transition: opacity .15s; }
.att-btn:disabled { opacity: .4; cursor: not-allowed; }
.att-btn.sm { width: auto; padding: 9px 18px; font-size: 14px; }
.att-btn.grey { background: #e2e8f0; color: #334155; }
.att-btn.red { background: #be123c; }
.att-btn.green { background: #047857; }
.att-btn.big { padding: 17px; font-size: 17px; border-radius: 16px; }
.att-btn.off { background: #cbd5e1; color: #475569; cursor: default; }

.att-note { display: flex; gap: 8px; padding: 10px 13px; border-radius: 12px; font-size: 13.5px; }
.att-note.err { background: #ffe4e6; color: #9f1239; }
.att-note.ok { background: #d1fae5; color: #065f46; }

.att-pill { display: inline-block; padding: 3px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 600; white-space: nowrap; }
.p-Present, .p-Approved { background: #d1fae5; color: #065f46; }
.p-Late, .p-Pending { background: #fef3c7; color: #92400e; }
.p-HalfDay { background: #ffedd5; color: #9a3412; }
.p-Absent, .p-Rejected { background: #ffe4e6; color: #9f1239; }
.p-Leave { background: #e0f2fe; color: #075985; }
.p-Off { background: #e2e8f0; color: #475569; }

.att-hero { background: #fff; border: 1px solid #e2e8f0; border-radius: 22px; padding: 26px 20px; text-align: center; }
.att-clock { font-variant-numeric: tabular-nums; font-size: 40px; font-weight: 650; letter-spacing: -0.03em; margin-top: 4px; }
.att-eyebrow { font-size: 11px; letter-spacing: .11em; text-transform: uppercase; color: #94a3b8; }
.att-inout { display: flex; justify-content: center; gap: 14px; margin-top: 10px; font-size: 14px; color: #475569; }

.att-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.att-stat { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 11px 6px; text-align: center; }
.att-stat b { display: block; font-size: 18px; font-weight: 650; }
.att-stat span { font-size: 11.5px; color: #64748b; }

.att-list { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
.att-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; font-size: 14px; }
.att-row + .att-row { border-top: 1px solid #f1f5f9; }
.att-row .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.att-empty { padding: 16px; color: #64748b; font-size: 14px; }

.att-top { position: sticky; top: 0; z-index: 5; display: flex; align-items: center;
  justify-content: space-between; padding: 12px 18px; background: #fff; border-bottom: 1px solid #e2e8f0; }
.att-nav { position: fixed; left: 0; right: 0; bottom: 0; display: flex;
  background: #fff; border-top: 1px solid #e2e8f0; }
.att-nav button { flex: 1; padding: 13px 4px; font-size: 13px; font-weight: 600; color: #94a3b8; }
.att-nav button.on { color: #0f766e; box-shadow: inset 0 2px 0 #0f766e; }

.att-seg { display: flex; gap: 3px; background: #e2e8f0; border-radius: 12px; padding: 3px; }
.att-seg button { padding: 7px 14px; border-radius: 9px; font-size: 13.5px; color: #475569; }
.att-seg button.on { background: #fff; font-weight: 600; color: #0f172a; }

.att-scroll { overflow-x: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; }
.att-table { width: 100%; border-collapse: collapse; font-size: 13.5px; white-space: nowrap; }
.att-table th { text-align: left; padding: 9px 12px; background: #f8fafc; color: #64748b;
  font-size: 11px; letter-spacing: .06em; text-transform: uppercase; font-weight: 600; }
.att-table td { padding: 9px 12px; border-top: 1px solid #f1f5f9; font-variant-numeric: tabular-nums; }
.att-table td.name { font-weight: 600; }
.att-flex { display: flex; align-items: center; gap: 9px; }
.att-between { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
`;

/* ------------------------- helpers ------------------------- */
const fmtTime = (ts: any) =>
  ts ? new Date(ts).toLocaleTimeString(IST, { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: TZ }) : "—";
const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleDateString(IST, { day: "2-digit", month: "short", timeZone: TZ }) : "—";
const istToday = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: TZ })).toISOString().slice(0, 10);
const hhmm = (mins: number | null) => {
  if (mins == null) return "—";
  const m = Math.max(0, Math.round(mins));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}h ${String(m % 60).padStart(2, "0")}m`;
};
const pillClass = (s: string) => {
  const map: Record<string, string> = {
    Present: "p-Present", Late: "p-Late", "Half Day": "p-HalfDay", Absent: "p-Absent",
    Leave: "p-Leave", Holiday: "p-Off", "Week Off": "p-Off",
    Approved: "p-Approved", Pending: "p-Pending", Rejected: "p-Rejected",
  };
  return `att-pill ${map[s] || "p-Off"}`;
};
const getPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Is device par location support nahi hai"));
    navigator.geolocation.getCurrentPosition(resolve, (e) =>
      reject(new Error(e.code === 1
        ? "Location permission band hai. Browser settings mein allow karke dobara try kijiye."
        : "Location nahi mil rahi. Ek baar aur try kijiye.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });

const Note = ({ kind = "err", children }: any) =>
  !children ? null : <div className={`att-note ${kind}`}>{children}</div>;

/* ------------------------- login ------------------------- */
function Login() {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: `${code.trim().toLowerCase()}${EMAIL_DOMAIN}`, password: pin,
    });
    if (error) setErr("Employee code ya PIN galat hai.");
    setBusy(false);
  };

  return (
    <div className="att-center">
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <h1 className="att-h1">HJS Attendance</h1>
          <p className="att-muted" style={{ marginTop: 4 }}>Ek baar login — phir roz sirf punch.</p>
        </div>
        <div className="att-card att-stack">
          <div>
            <label>Employee code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="HJS001" autoCapitalize="characters" style={{ textTransform: "uppercase" }} />
          </div>
          <div>
            <label>PIN</label>
            <input value={pin} onChange={(e) => setPin(e.target.value)} type="password"
              inputMode="numeric" placeholder="6 digit PIN"
              onKeyDown={(e) => e.key === "Enter" && submit()} />
          </div>
          <Note>{err}</Note>
          <button className="att-btn" onClick={submit} disabled={busy || !code || pin.length < 6}>
            {busy ? "Ek minute…" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- punch ------------------------- */
function PunchScreen({ me }: any) {
  const [today, setToday] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  const load = async () => {
    const from = new Date(); from.setDate(from.getDate() - 30);
    const { data } = await supabase.from("attendance_logs").select("*")
      .eq("employee_id", me.id).gte("work_date", from.toISOString().slice(0, 10))
      .order("work_date", { ascending: false });
    setRecent(data || []);
    setToday((data || []).find((r: any) => r.work_date === istToday()) || null);
  };
  useEffect(() => { load(); }, [me.id]);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 30000); return () => clearInterval(t); }, []);

  const liveMinutes = useMemo(() => {
    if (!today?.punch_in_at) return null;
    const end = today.punch_out_at ? new Date(today.punch_out_at) : new Date();
    return (end.getTime() - new Date(today.punch_in_at).getTime()) / 60000;
  }, [today, recent]);

  const punch = async (dir: "in" | "out") => {
    setErr(""); setOk(""); setBusy(true);
    try {
      const pos = await getPosition();
      const { data, error } = await supabase.rpc(dir === "in" ? "punch_in" : "punch_out", {
        p_lat: pos.coords.latitude, p_lng: pos.coords.longitude,
        p_accuracy: Math.round(pos.coords.accuracy),
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      setToday(row);
      setOk(dir === "in"
        ? `Punch-in ${fmtTime(row.punch_in_at)} par record ho gaya.`
        : `Punch-out ${fmtTime(row.punch_out_at)} — aaj ${hhmm(row.worked_minutes)}.`);
      load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const done = !!today?.punch_out_at;
  const inOnly = today?.punch_in_at && !today?.punch_out_at;

  const stats = useMemo(() => {
    const m = istToday().slice(0, 7);
    const rows = recent.filter((r) => String(r.work_date).startsWith(m));
    return {
      present: rows.filter((r) => ["Present", "Late"].includes(r.status)).length,
      late: rows.filter((r) => r.status === "Late").length,
      half: rows.filter((r) => r.status === "Half Day").length,
      hrs: Math.round(rows.reduce((s, r) => s + (r.worked_minutes || 0), 0) / 60),
    };
  }, [recent]);

  return (
    <div className="att-wrap att-stack">
      <div>
        <p className="att-muted">
          {new Date().toLocaleDateString(IST, { weekday: "long", day: "numeric", month: "long", timeZone: TZ })}
        </p>
        <h2 className="att-h1">Hi, {String(me.full_name).split(" ")[0]}</h2>
      </div>

      <div className="att-hero">
        <p className="att-eyebrow">Aaj ka time</p>
        <p className="att-clock">{hhmm(liveMinutes)}</p>
        <div className="att-inout">
          <span>In {fmtTime(today?.punch_in_at)}</span>
          <span style={{ color: "#cbd5e1" }}>|</span>
          <span>Out {fmtTime(today?.punch_out_at)}</span>
        </div>
        {today && (
          <div style={{ marginTop: 12 }}>
            <span className={pillClass(today.status)}>{today.status}</span>
            {today.in_geo_ok === false && (
              <span className="att-muted" style={{ marginLeft: 8, color: "#b45309" }}>
                branch se {today.in_distance_m ?? "?"} m door
              </span>
            )}
          </div>
        )}
        <button
          className={`att-btn big ${done ? "off" : inOnly ? "red" : ""}`}
          style={{ marginTop: 20 }}
          onClick={() => punch(inOnly ? "out" : "in")}
          disabled={busy || done}
        >
          {busy ? "Location le raha hoon…" : done ? "Aaj ka din complete" : inOnly ? "Punch out" : "Punch in"}
        </button>
        <p className="att-muted" style={{ marginTop: 8, fontSize: 12 }}>Punch ke saath location record hoti hai</p>
      </div>

      <Note>{err}</Note>
      <Note kind="ok">{ok}</Note>

      <div className="att-grid4">
        <div className="att-stat"><b>{stats.present}</b><span>Present</span></div>
        <div className="att-stat"><b>{stats.late}</b><span>Late</span></div>
        <div className="att-stat"><b>{stats.half}</b><span>Half</span></div>
        <div className="att-stat"><b>{stats.hrs}</b><span>Hours</span></div>
      </div>

      <div>
        <h3 className="att-h2">Pichhle 30 din</h3>
        <div className="att-list">
          {recent.length === 0 && <p className="att-empty">Abhi koi record nahi. Pehla punch aaj se shuru kijiye.</p>}
          {recent.map((r) => (
            <div className="att-row" key={r.id}>
              <span style={{ width: 58, fontWeight: 600 }}>{fmtDate(r.work_date)}</span>
              <span className="grow att-muted">{fmtTime(r.punch_in_at)} – {fmtTime(r.punch_out_at)}</span>
              <span style={{ width: 62, textAlign: "right", color: "#475569" }}>{hhmm(r.worked_minutes)}</span>
              <span className={pillClass(r.status)}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- leaves ------------------------- */
function LeavesScreen({ me }: any) {
  const [types, setTypes] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    leave_type: "CL", from_date: istToday(), to_date: istToday(), half_day: false, reason: "",
  });
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const isApprover = ["manager", "admin"].includes(me.role);

  const load = async () => {
    const [t, l] = await Promise.all([
      supabase.from("leave_types").select("*"),
      supabase.from("leaves").select("*, employees(full_name, emp_code)")
        .order("from_date", { ascending: false }).limit(100),
    ]);
    setTypes(t.data || []); setRows(l.data || []);
  };
  useEffect(() => { load(); }, []);

  const days = useMemo(() => {
    const d = (new Date(form.to_date).getTime() - new Date(form.from_date).getTime()) / 86400000 + 1;
    return form.half_day ? 0.5 : Math.max(1, d);
  }, [form]);

  const apply = async () => {
    setMsg({ err: "", ok: "" });
    const { error } = await supabase.from("leaves").insert({
      ...form, employee_id: me.id, days, status: "Pending",
    });
    if (error) setMsg({ err: "Leave submit nahi hui: " + error.message, ok: "" });
    else { setMsg({ err: "", ok: "Leave request bhej di gayi." }); setForm({ ...form, reason: "" }); load(); }
  };

  const decide = async (id: string, status: string) => {
    await supabase.from("leaves").update({
      status, approved_by: me.id, approved_at: new Date().toISOString(),
    }).eq("id", id);
    load();
  };

  const mine = rows.filter((r) => r.employee_id === me.id);
  const pending = rows.filter((r) => r.status === "Pending" && r.employee_id !== me.id);

  return (
    <div className="att-wrap att-stack">
      <h2 className="att-h1">Leaves</h2>

      <div className="att-card att-stack">
        <h3 className="att-h2" style={{ margin: 0 }}>Nayi leave apply karein</h3>
        <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
          {types.map((t) => (
            <option key={t.code} value={t.code}>{t.name}{t.paid ? "" : " (unpaid)"}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="date" value={form.from_date}
            onChange={(e) => setForm({
              ...form, from_date: e.target.value,
              to_date: e.target.value > form.to_date ? e.target.value : form.to_date,
            })} />
          <input type="date" value={form.to_date} min={form.from_date}
            onChange={(e) => setForm({ ...form, to_date: e.target.value })} />
        </div>
        <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0 }}>
          <input type="checkbox" style={{ width: "auto" }} checked={form.half_day}
            onChange={(e) => setForm({ ...form, half_day: e.target.checked, to_date: form.from_date })} />
          Half day
        </label>
        <textarea rows={2} placeholder="Reason" value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <div className="att-between">
          <span className="att-muted">{days} day{days === 1 ? "" : "s"}</span>
          <button className="att-btn sm" onClick={apply} disabled={!form.reason}>Apply</button>
        </div>
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
      </div>

      {isApprover && pending.length > 0 && (
        <div>
          <h3 className="att-h2">Approval baaki ({pending.length})</h3>
          <div className="att-list">
            {pending.map((r) => (
              <div className="att-row" key={r.id} style={{ alignItems: "flex-start" }}>
                <div className="grow" style={{ whiteSpace: "normal" }}>
                  <p style={{ fontWeight: 600 }}>{r.employees?.full_name}</p>
                  <p className="att-muted">{r.leave_type} · {fmtDate(r.from_date)} – {fmtDate(r.to_date)} · {r.days}d</p>
                  <p style={{ marginTop: 3, color: "#475569" }}>{r.reason}</p>
                </div>
                <button className="att-btn sm green" onClick={() => decide(r.id, "Approved")}>Approve</button>
                <button className="att-btn sm grey" onClick={() => decide(r.id, "Rejected")}>Reject</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="att-h2">Meri leaves</h3>
        <div className="att-list">
          {mine.length === 0 && <p className="att-empty">Abhi tak koi leave apply nahi ki.</p>}
          {mine.map((r) => (
            <div className="att-row" key={r.id}>
              <span style={{ width: 42, fontWeight: 600 }}>{r.leave_type}</span>
              <span className="grow att-muted">{fmtDate(r.from_date)} – {fmtDate(r.to_date)}</span>
              <span style={{ color: "#475569" }}>{r.days}d</span>
              <span className={pillClass(r.status)}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- team + payroll ------------------------- */
function TeamScreen() {
  const [tab, setTab] = useState<"today" | "payroll">("today");
  const [rows, setRows] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [month, setMonth] = useState(istToday().slice(0, 7));
  const [busy, setBusy] = useState(false);

  const loadToday = async () => {
    setBusy(true);
    const [emps, logs, lvs] = await Promise.all([
      supabase.from("employees").select("id, emp_code, full_name, branches(name)")
        .eq("active", true).order("full_name"),
      supabase.from("attendance_logs").select("*").eq("work_date", istToday()),
      supabase.from("leaves").select("employee_id, leave_type").eq("status", "Approved")
        .lte("from_date", istToday()).gte("to_date", istToday()),
    ]);
    setRows((emps.data || []).map((e: any) => ({
      ...e,
      log: (logs.data || []).find((l: any) => l.employee_id === e.id),
      onLeave: (lvs.data || []).find((l: any) => l.employee_id === e.id),
    })));
    setBusy(false);
  };

  const loadPayroll = async () => {
    setBusy(true);
    const { data } = await supabase.rpc("payroll_summary", { p_month: `${month}-01` });
    setPayroll(data || []); setBusy(false);
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
    <div className="att-wrap att-stack">
      <div className="att-between">
        <h2 className="att-h1">Team</h2>
        <div className="att-seg">
          <button className={tab === "today" ? "on" : ""} onClick={() => setTab("today")}>Aaj</button>
          <button className={tab === "payroll" ? "on" : ""} onClick={() => setTab("payroll")}>Payroll</button>
        </div>
      </div>

      {busy && <p className="att-muted">Load ho raha hai…</p>}

      {tab === "today" && !busy && (
        <>
          <p className="att-muted">{present} of {rows.length} ne punch kiya hai</p>
          <div className="att-list">
            {rows.map((r) => (
              <div className="att-row" key={r.id}>
                <div className="grow">
                  <p style={{ fontWeight: 600 }}>{r.full_name}</p>
                  <p className="att-muted">
                    {r.branches?.name || "—"} · {r.log
                      ? `${fmtTime(r.log.punch_in_at)} – ${fmtTime(r.log.punch_out_at)}`
                      : "koi punch nahi"}
                  </p>
                </div>
                <span className={pillClass(r.log?.status || (r.onLeave ? "Leave" : "Absent"))}>
                  {r.log?.status || (r.onLeave ? r.onLeave.leave_type : "No punch")}
                </span>
              </div>
            ))}
            {!rows.length && <p className="att-empty">Koi active employee nahi mila.</p>}
          </div>
        </>
      )}

      {tab === "payroll" && !busy && (
        <>
          <div className="att-flex">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: "auto" }} />
            <button className="att-btn sm" onClick={exportCsv} disabled={!payroll.length}>CSV</button>
          </div>
          <div className="att-scroll">
            <table className="att-table">
              <thead>
                <tr>
                  {["Name", "Present", "Half", "Late", "Paid lv", "LOP", "Absent", "Payable", "Amount"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payroll.map((r) => (
                  <tr key={r.emp_code}>
                    <td className="name">{r.full_name}</td>
                    <td>{r.present_days}</td>
                    <td>{r.half_days}</td>
                    <td>{r.late_marks}</td>
                    <td>{r.paid_leaves}</td>
                    <td>{r.unpaid_leaves}</td>
                    <td style={{ color: "#be123c" }}>{r.absent_days}</td>
                    <td style={{ fontWeight: 600 }}>{r.payable_days}</td>
                    <td>{r.payable_amount ?? "—"}</td>
                  </tr>
                ))}
                {!payroll.length && (
                  <tr><td colSpan={9} style={{ color: "#64748b" }}>Is month ka data nahi mila.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------- shell ------------------------- */
export default function Attendance() {
  const [session, setSession] = useState<any>(undefined);
  const [me, setMe] = useState<any>(null);
  const [tab, setTab] = useState("punch");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setMe(null); return; }
    supabase.from("employees").select("*, branches(name)")
      .eq("auth_user_id", session.user.id).single()
      .then(({ data }) => setMe(data));
  }, [session]);

  const shell = (children: any) => (
    <div className="hjsatt">
      <style>{CSS}</style>
      {children}
    </div>
  );

  if (session === undefined) return shell(<div className="att-center att-muted">Load ho raha hai…</div>);
  if (!session) return shell(<Login />);
  if (!me) return shell(
    <div className="att-center att-stack" style={{ textAlign: "center", flexDirection: "column" }}>
      <p>Is login se koi employee record juda hua nahi hai. Admin se emp code link karwa lijiye.</p>
      <button className="att-btn grey sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  );

  const isApprover = ["manager", "admin"].includes(me.role);
  const tabs: [string, string][] = [["punch", "Punch"], ["leaves", "Leaves"]];
  if (isApprover) tabs.push(["team", "Team"]);

  return shell(
    <>
      <div className="att-top">
        <div className="att-flex">
          <b style={{ fontSize: 14 }}>HJS Attendance</b>
          <span className="att-muted">{me.emp_code}</span>
        </div>
        <button className="att-muted" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      {tab === "punch" && <PunchScreen me={me} />}
      {tab === "leaves" && <LeavesScreen me={me} />}
      {tab === "team" && isApprover && <TeamScreen />}

      <div className="att-nav">
        {tabs.map(([k, label]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
    </>
  );
}
