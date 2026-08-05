// ============================================================
// HJS Attendance v2 — mobile-first, self-contained styles
// Modules: Punch · Leaves (+balance) · Regularization · Approvals
//          Team (Today / Dashboard / Staff / Reports / Payroll) · Me
// Pehle hjs_attendance_v2.sql chala lena.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL_, KEY_, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "hjs-attendance" },
});
// naye employee ka login banane ke liye — apni session ko chhedta nahi
const signupClient = createClient(URL_, KEY_, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMAIL_DOMAIN = "@hjs.local";
const IST = "en-IN";
const TZ = "Asia/Kolkata";

/* ========================= styles ========================= */
const CSS = `
.hjsatt, .hjsatt * { box-sizing: border-box; margin: 0; padding: 0; }
.hjsatt {
  position: fixed; inset: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  background: #f1f5f9; color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 15px; line-height: 1.45; -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
.hjsatt h1, .hjsatt h2, .hjsatt h3, .hjsatt h4,
.hjsatt p, .hjsatt b, .hjsatt span, .hjsatt div, .hjsatt td, .hjsatt th { color: inherit; }
.hjsatt button { font: inherit; cursor: pointer; border: 0; background: none; color: inherit; }
.hjsatt input, .hjsatt select, .hjsatt textarea {
  font-family: inherit; font-size: 16px; width: 100%; padding: 12px 13px;
  border: 1px solid #cbd5e1; border-radius: 12px; background: #fff; color: #0f172a;
  outline: none; -webkit-appearance: none; appearance: none; min-height: 46px;
}
.hjsatt select { padding-right: 34px;
  background-image: linear-gradient(45deg, transparent 50%, #64748b 50%),
                    linear-gradient(135deg, #64748b 50%, transparent 50%);
  background-position: calc(100% - 18px) 21px, calc(100% - 13px) 21px;
  background-size: 5px 5px; background-repeat: no-repeat; }
.hjsatt input[type=checkbox] { width: 20px; height: 20px; min-height: 0; accent-color: #0f766e; }
.hjsatt input:focus, .hjsatt select:focus, .hjsatt textarea:focus {
  border-color: #0f766e; box-shadow: 0 0 0 3px #ccfbf1; }
.hjsatt label { display: block; font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 6px; }

.att-wrap { max-width: 620px; margin: 0 auto;
  padding: 18px 16px calc(96px + env(safe-area-inset-bottom)); }
.att-center { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
.att-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 16px; }
.att-stack > * + * { margin-top: 13px; }
.att-muted { color: #64748b; font-size: 13px; }
.att-h1 { font-size: 21px; font-weight: 650; letter-spacing: -0.02em; color: #0f172a; }
.att-h2 { font-size: 13.5px; font-weight: 650; color: #334155; margin-bottom: 8px; }
.att-flex { display: flex; align-items: center; gap: 9px; }
.att-between { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.att-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }

.att-btn { display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; min-height: 48px; padding: 13px; border-radius: 13px;
  background: #0f766e; color: #fff; font-weight: 600; }
.att-btn:active { transform: scale(.985); }
.att-btn:disabled { opacity: .4; }
.att-btn.sm { width: auto; min-height: 40px; padding: 9px 16px; font-size: 14px; border-radius: 11px; }
.att-btn.grey { background: #e2e8f0; color: #334155; }
.att-btn.red { background: #be123c; }
.att-btn.green { background: #047857; }
.att-btn.line { background: #fff; border: 1px solid #cbd5e1; color: #334155; }
.att-btn.big { min-height: 62px; font-size: 17px; border-radius: 17px; }
.att-btn.off { background: #cbd5e1; color: #475569; }

.att-note { padding: 11px 13px; border-radius: 12px; font-size: 13.5px; }
.att-note.err { background: #ffe4e6; color: #9f1239; }
.att-note.ok { background: #d1fae5; color: #065f46; }

.att-pill { display: inline-block; padding: 3px 10px; border-radius: 999px;
  font-size: 11.5px; font-weight: 700; white-space: nowrap; }
.p-Present, .p-Approved { background: #d1fae5; color: #065f46; }
.p-Late, .p-Pending { background: #fef3c7; color: #92400e; }
.p-HalfDay { background: #ffedd5; color: #9a3412; }
.p-Absent, .p-Rejected { background: #ffe4e6; color: #9f1239; }
.p-Leave { background: #e0f2fe; color: #075985; }
.p-Off { background: #e2e8f0; color: #475569; }

.att-hero { background: #fff; border: 1px solid #e2e8f0; border-radius: 22px;
  padding: 24px 18px; text-align: center; }
.att-clock { font-variant-numeric: tabular-nums; font-size: 42px; font-weight: 650;
  letter-spacing: -0.035em; margin-top: 2px; }
.att-eyebrow { font-size: 11px; letter-spacing: .11em; text-transform: uppercase; color: #94a3b8; }
.att-inout { display: flex; justify-content: center; gap: 12px; margin-top: 9px;
  font-size: 14px; color: #475569; }

.att-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.att-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }
.att-stat { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
  padding: 11px 5px; text-align: center; }
.att-stat b { display: block; font-size: 19px; font-weight: 650; }
.att-stat span { font-size: 11px; color: #64748b; }

.att-bal { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px; }
.att-bal .n { font-size: 22px; font-weight: 650; }
.att-bal .t { font-size: 12px; color: #64748b; }
.att-bar { height: 5px; border-radius: 99px; background: #e2e8f0; margin-top: 8px; overflow: hidden; }
.att-bar i { display: block; height: 100%; background: #0f766e; border-radius: 99px; }

.att-list { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
.att-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; font-size: 14px; }
.att-row + .att-row { border-top: 1px solid #f1f5f9; }
.att-row .grow { flex: 1; min-width: 0; }
.att-row .grow p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.att-empty { padding: 16px; color: #64748b; font-size: 14px; }

.att-top { position: sticky; top: 0; z-index: 5; display: flex; align-items: center;
  justify-content: space-between; padding: 11px 16px; background: #fff;
  border-bottom: 1px solid #e2e8f0; padding-top: calc(11px + env(safe-area-inset-top)); }
.att-nav { position: fixed; left: 0; right: 0; bottom: 0; display: flex; background: #fff;
  border-top: 1px solid #e2e8f0; padding-bottom: env(safe-area-inset-bottom); }
.att-nav button { flex: 1; min-height: 54px; padding: 9px 2px; font-size: 12px;
  font-weight: 600; color: #94a3b8; position: relative; }
.att-nav button.on { color: #0f766e; box-shadow: inset 0 2px 0 #0f766e; }
.att-nav .dot { position: absolute; top: 8px; left: 50%; margin-left: 8px;
  min-width: 17px; height: 17px; line-height: 17px; border-radius: 99px;
  background: #be123c; color: #fff; font-size: 10.5px; padding: 0 4px; }

.att-seg { display: flex; gap: 3px; background: #e2e8f0; border-radius: 12px; padding: 3px;
  overflow-x: auto; }
.att-seg button { padding: 8px 13px; border-radius: 9px; font-size: 13px;
  color: #475569; white-space: nowrap; }
.att-seg button.on { background: #fff; font-weight: 600; color: #0f172a; }

.att-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; }
.att-table { width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap; }
.att-table th { text-align: left; padding: 9px 11px; background: #f8fafc; color: #64748b;
  font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; font-weight: 700; }
.att-table td { padding: 9px 11px; border-top: 1px solid #f1f5f9; font-variant-numeric: tabular-nums; }
.att-table td.name, .att-table th.name { position: sticky; left: 0; background: #fff;
  font-weight: 600; box-shadow: 1px 0 0 #f1f5f9; }
.att-table th.name { background: #f8fafc; }
.att-mark { display: inline-block; width: 21px; text-align: center; font-weight: 700; font-size: 12px; }
.m-P { color: #047857; } .m-L { color: #b45309; } .m-H { color: #c2410c; }
.m-A { color: #be123c; } .m-W, .m-F { color: #94a3b8; } .m-X { color: #0369a1; }

.att-sheet { position: fixed; inset: 0; z-index: 20; background: rgba(15,23,42,.45);
  display: flex; align-items: flex-end; justify-content: center; }
.att-sheet > div { width: 100%; max-width: 620px; background: #f1f5f9;
  border-radius: 20px 20px 0 0; padding: 18px 16px calc(20px + env(safe-area-inset-bottom));
  max-height: 90%; overflow-y: auto; }
`;

/* ========================= helpers ========================= */
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
    Approved: "p-Approved", Pending: "p-Pending", Rejected: "p-Rejected", Cancelled: "p-Off",
  };
  return `att-pill ${map[s] || "p-Off"}`;
};
const markClass = (m: string) =>
  `att-mark m-${["P", "L", "H", "A", "W", "F"].includes(m) ? m : "X"}`;
const getPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Is device par location support nahi hai"));
    navigator.geolocation.getCurrentPosition(resolve, (e) =>
      reject(new Error(e.code === 1
        ? "Location permission band hai. Settings mein allow karke dobara try kijiye."
        : "Location nahi mil rahi. Ek baar aur try kijiye.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
const downloadCsv = (rows: any[], filename: string) => {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => `"${r[c] ?? ""}"`).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
};

const Note = ({ kind = "err", children }: any) =>
  !children ? null : <div className={`att-note ${kind}`}>{children}</div>;

const Sheet = ({ title, onClose, children }: any) => (
  <div className="att-sheet" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()}>
      <div className="att-between" style={{ marginBottom: 14 }}>
        <b className="att-h1" style={{ fontSize: 18 }}>{title}</b>
        <button className="att-muted" onClick={onClose}>Close</button>
      </div>
      {children}
    </div>
  </div>
);

/* ========================= login ========================= */
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
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 className="att-h1">HJS Attendance</h1>
          <p className="att-muted" style={{ marginTop: 4 }}>Ek baar login — phir roz sirf punch.</p>
        </div>
        <div className="att-card att-stack">
          <div>
            <label>Employee code</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="HJS001"
              autoCapitalize="characters" autoCorrect="off" style={{ textTransform: "uppercase" }} />
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

/* ========================= punch ========================= */
function PunchScreen({ me }: any) {
  const [today, setToday] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [err, setErr] = useState(""); const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);
  const [regOpen, setRegOpen] = useState(false);

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
      setOk(dir === "in" ? `Punch-in ${fmtTime(row.punch_in_at)} par record ho gaya.`
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
          <div style={{ marginTop: 11 }}>
            <span className={pillClass(today.status)}>{today.status}</span>
            {today.in_geo_ok === false && (
              <span style={{ marginLeft: 8, color: "#b45309", fontSize: 13 }}>
                branch se {today.in_distance_m ?? "?"} m door
              </span>
            )}
          </div>
        )}
        <button className={`att-btn big ${done ? "off" : inOnly ? "red" : ""}`} style={{ marginTop: 18 }}
          onClick={() => punch(inOnly ? "out" : "in")} disabled={busy || done}>
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
        <div className="att-between" style={{ marginBottom: 8 }}>
          <h3 className="att-h2" style={{ margin: 0 }}>Pichhle 30 din</h3>
          <button className="att-btn sm line" onClick={() => setRegOpen(true)}>Punch bhool gaye?</button>
        </div>
        <div className="att-list">
          {recent.length === 0 && <p className="att-empty">Abhi koi record nahi. Pehla punch aaj se shuru kijiye.</p>}
          {recent.map((r) => (
            <div className="att-row" key={r.id}>
              <span style={{ width: 56, fontWeight: 600 }}>{fmtDate(r.work_date)}</span>
              <span className="grow att-muted">{fmtTime(r.punch_in_at)} – {fmtTime(r.punch_out_at)}</span>
              <span style={{ width: 60, textAlign: "right", color: "#475569" }}>{hhmm(r.worked_minutes)}</span>
              <span className={pillClass(r.status)}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>

      {regOpen && <RegularizeSheet me={me} onClose={() => setRegOpen(false)} />}
    </div>
  );
}

/* ================= regularization sheet ================= */
function RegularizeSheet({ me, onClose }: any) {
  const [form, setForm] = useState({
    work_date: istToday(), req_punch_in: "", req_punch_out: "", reason: "",
  });
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true); setMsg({ err: "", ok: "" });
    const { error } = await supabase.from("regularizations").insert({
      employee_id: me.id, work_date: form.work_date,
      req_punch_in: form.req_punch_in || null,
      req_punch_out: form.req_punch_out || null,
      reason: form.reason, status: "Pending",
    });
    if (error) setMsg({ err: "Request nahi gayi: " + error.message, ok: "" });
    else setMsg({ err: "", ok: "Request manager ko bhej di gayi." });
    setBusy(false);
  };

  return (
    <Sheet title="Missed punch — regularize" onClose={onClose}>
      <div className="att-card att-stack">
        <div>
          <label>Date</label>
          <input type="date" max={istToday()} value={form.work_date}
            onChange={(e) => setForm({ ...form, work_date: e.target.value })} />
        </div>
        <div className="att-row2">
          <div>
            <label>Punch in</label>
            <input type="time" value={form.req_punch_in}
              onChange={(e) => setForm({ ...form, req_punch_in: e.target.value })} />
          </div>
          <div>
            <label>Punch out</label>
            <input type="time" value={form.req_punch_out}
              onChange={(e) => setForm({ ...form, req_punch_out: e.target.value })} />
          </div>
        </div>
        <div>
          <label>Kya hua tha?</label>
          <textarea rows={2} placeholder="Reason" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn" onClick={submit}
          disabled={busy || !form.reason || (!form.req_punch_in && !form.req_punch_out)}>
          {busy ? "Bhej raha hoon…" : "Request bhejein"}
        </button>
      </div>
    </Sheet>
  );
}

/* ========================= leaves ========================= */
function LeavesScreen({ me }: any) {
  const [types, setTypes] = useState<any[]>([]);
  const [bal, setBal] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [regs, setRegs] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    leave_type: "CL", from_date: istToday(), to_date: istToday(), half_day: false, reason: "",
  });
  const [msg, setMsg] = useState({ err: "", ok: "" });

  const load = async () => {
    const [t, b, l, r] = await Promise.all([
      supabase.from("leave_types").select("*"),
      supabase.rpc("leave_balance", {}),
      supabase.from("leaves").select("*").eq("employee_id", me.id)
        .order("from_date", { ascending: false }).limit(50),
      supabase.from("regularizations").select("*").eq("employee_id", me.id)
        .order("work_date", { ascending: false }).limit(20),
    ]);
    setTypes(t.data || []); setBal(b.data || []); setMine(l.data || []); setRegs(r.data || []);
  };
  useEffect(() => { load(); }, []);

  const days = useMemo(() => {
    const d = (new Date(form.to_date).getTime() - new Date(form.from_date).getTime()) / 86400000 + 1;
    return form.half_day ? 0.5 : Math.max(1, d);
  }, [form]);

  const apply = async () => {
    setMsg({ err: "", ok: "" });
    const { error } = await supabase.from("leaves").insert({ ...form, employee_id: me.id, days, status: "Pending" });
    if (error) setMsg({ err: "Leave submit nahi hui: " + error.message, ok: "" });
    else { setMsg({ err: "", ok: "Leave request bhej di gayi." }); setForm({ ...form, reason: "" }); load(); }
  };

  const cancel = async (id: string) => {
    await supabase.from("leaves").update({ status: "Cancelled" }).eq("id", id);
    load();
  };

  return (
    <div className="att-wrap att-stack">
      <h2 className="att-h1">Leaves</h2>

      <div>
        <h3 className="att-h2">Is saal ka balance</h3>
        <div className="att-grid2">
          {bal.map((b) => {
            const pct = b.allocated > 0 ? Math.min(100, (b.used / b.allocated) * 100) : 0;
            return (
              <div className="att-bal" key={b.leave_type}>
                <div className="att-between">
                  <span className="n">{b.remaining}</span>
                  <span className="att-muted" style={{ fontSize: 12 }}>/ {b.allocated}</span>
                </div>
                <div className="t">{b.name}</div>
                <div className="att-bar"><i style={{ width: `${pct}%` }} /></div>
                {b.pending > 0 && <div className="t" style={{ marginTop: 5 }}>{b.pending} pending</div>}
              </div>
            );
          })}
          {!bal.length && <p className="att-empty">Balance set nahi hai — admin se bolein.</p>}
        </div>
      </div>

      <div className="att-card att-stack">
        <h3 className="att-h2" style={{ margin: 0 }}>Nayi leave apply karein</h3>
        <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
          {types.map((t) => <option key={t.code} value={t.code}>{t.name}{t.paid ? "" : " (unpaid)"}</option>)}
        </select>
        <div className="att-row2">
          <div>
            <label>From</label>
            <input type="date" value={form.from_date} onChange={(e) => setForm({
              ...form, from_date: e.target.value,
              to_date: e.target.value > form.to_date ? e.target.value : form.to_date })} />
          </div>
          <div>
            <label>To</label>
            <input type="date" value={form.to_date} min={form.from_date}
              onChange={(e) => setForm({ ...form, to_date: e.target.value })} />
          </div>
        </div>
        <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0 }}>
          <input type="checkbox" checked={form.half_day}
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

      <div>
        <h3 className="att-h2">Meri leaves</h3>
        <div className="att-list">
          {!mine.length && <p className="att-empty">Abhi tak koi leave apply nahi ki.</p>}
          {mine.map((r) => (
            <div className="att-row" key={r.id}>
              <span style={{ width: 40, fontWeight: 600 }}>{r.leave_type}</span>
              <span className="grow att-muted">{fmtDate(r.from_date)} – {fmtDate(r.to_date)} · {r.days}d</span>
              <span className={pillClass(r.status)}>{r.status}</span>
              {r.status === "Pending" && (
                <button className="att-muted" onClick={() => cancel(r.id)}>Cancel</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {regs.length > 0 && (
        <div>
          <h3 className="att-h2">Meri regularization requests</h3>
          <div className="att-list">
            {regs.map((r) => (
              <div className="att-row" key={r.id}>
                <span style={{ width: 56, fontWeight: 600 }}>{fmtDate(r.work_date)}</span>
                <span className="grow att-muted">
                  {r.req_punch_in?.slice(0, 5) || "—"} – {r.req_punch_out?.slice(0, 5) || "—"}
                </span>
                <span className={pillClass(r.status)}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================= approvals inbox ========================= */
function InboxScreen({ me, onCount }: any) {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [regs, setRegs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    const [l, r] = await Promise.all([
      supabase.from("leaves").select("*, employees(full_name, emp_code)")
        .eq("status", "Pending").order("from_date"),
      supabase.from("regularizations").select("*, employees(full_name, emp_code)")
        .eq("status", "Pending").order("work_date"),
    ]);
    const L = (l.data || []).filter((x: any) => x.employee_id !== me.id);
    const R = (r.data || []).filter((x: any) => x.employee_id !== me.id);
    setLeaves(L); setRegs(R); onCount(L.length + R.length);
  };
  useEffect(() => { load(); }, []);

  const decideLeave = async (id: string, status: string) => {
    setBusy(true);
    await supabase.from("leaves").update({
      status, approved_by: me.id, approved_at: new Date().toISOString(),
    }).eq("id", id);
    await load(); setBusy(false);
  };

  const decideReg = async (id: string, status: string) => {
    setBusy(true); setErr("");
    const { error } = await supabase.rpc("decide_regularization", { p_id: id, p_status: status });
    if (error) setErr(error.message);
    await load(); setBusy(false);
  };

  const total = leaves.length + regs.length;

  return (
    <div className="att-wrap att-stack">
      <h2 className="att-h1">Approvals {total > 0 && <span className="att-muted">({total})</span>}</h2>
      <Note>{err}</Note>

      {total === 0 && <div className="att-list"><p className="att-empty">Kuch pending nahi. Sab clear hai.</p></div>}

      {leaves.length > 0 && (
        <div>
          <h3 className="att-h2">Leave requests</h3>
          <div className="att-list">
            {leaves.map((r) => (
              <div className="att-row" key={r.id} style={{ flexWrap: "wrap" }}>
                <div className="grow" style={{ minWidth: 150 }}>
                  <p style={{ fontWeight: 600 }}>{r.employees?.full_name}</p>
                  <p className="att-muted">{r.leave_type} · {fmtDate(r.from_date)} – {fmtDate(r.to_date)} · {r.days}d</p>
                  <p style={{ color: "#475569", fontSize: 13.5, whiteSpace: "normal" }}>{r.reason}</p>
                </div>
                <button className="att-btn sm green" disabled={busy}
                  onClick={() => decideLeave(r.id, "Approved")}>Approve</button>
                <button className="att-btn sm grey" disabled={busy}
                  onClick={() => decideLeave(r.id, "Rejected")}>Reject</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {regs.length > 0 && (
        <div>
          <h3 className="att-h2">Regularization requests</h3>
          <div className="att-list">
            {regs.map((r) => (
              <div className="att-row" key={r.id} style={{ flexWrap: "wrap" }}>
                <div className="grow" style={{ minWidth: 150 }}>
                  <p style={{ fontWeight: 600 }}>{r.employees?.full_name}</p>
                  <p className="att-muted">
                    {fmtDate(r.work_date)} · {r.req_punch_in?.slice(0, 5) || "—"} – {r.req_punch_out?.slice(0, 5) || "—"}
                  </p>
                  <p style={{ color: "#475569", fontSize: 13.5, whiteSpace: "normal" }}>{r.reason}</p>
                </div>
                <button className="att-btn sm green" disabled={busy}
                  onClick={() => decideReg(r.id, "Approved")}>Approve</button>
                <button className="att-btn sm grey" disabled={busy}
                  onClick={() => decideReg(r.id, "Rejected")}>Reject</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================= team ========================= */
function TeamScreen({ me }: any) {
  const [tab, setTab] = useState("today");
  const tabs: [string, string][] = [
    ["today", "Aaj"], ["dash", "Dashboard"], ["staff", "Staff"],
    ["reports", "Reports"], ["payroll", "Payroll"],
  ];
  return (
    <div className="att-wrap att-stack">
      <h2 className="att-h1">Team</h2>
      <div className="att-seg">
        {tabs.map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === "today" && <TodayTab />}
      {tab === "dash" && <DashTab />}
      {tab === "staff" && <StaffTab me={me} />}
      {tab === "reports" && <ReportsTab />}
      {tab === "payroll" && <PayrollTab />}
    </div>
  );
}

function TodayTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  if (busy) return <p className="att-muted">Load ho raha hai…</p>;
  const present = rows.filter((r) => r.log?.punch_in_at).length;

  return (
    <>
      <p className="att-muted">{present} of {rows.length} ne punch kiya hai</p>
      <div className="att-list">
        {rows.map((r) => (
          <div className="att-row" key={r.id}>
            <div className="grow">
              <p style={{ fontWeight: 600 }}>{r.full_name}</p>
              <p className="att-muted">
                {r.branches?.name || "—"} · {r.log
                  ? `${fmtTime(r.log.punch_in_at)} – ${fmtTime(r.log.punch_out_at)}` : "koi punch nahi"}
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
  );
}

function DashTab() {
  const [branches, setBranches] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      const [b, t] = await Promise.all([
        supabase.rpc("dashboard_today", {}),
        supabase.rpc("attendance_trend", { p_days: 14 }),
      ]);
      setBranches(b.data || []); setTrend(t.data || []); setBusy(false);
    })();
  }, []);

  if (busy) return <p className="att-muted">Load ho raha hai…</p>;

  const tot = branches.reduce((a, b) => ({
    total: a.total + b.total, present: a.present + b.present, late: a.late + b.late,
    on_leave: a.on_leave + b.on_leave, no_punch: a.no_punch + b.no_punch,
  }), { total: 0, present: 0, late: 0, on_leave: 0, no_punch: 0 });
  const maxT = Math.max(1, ...trend.map((d) => d.present + d.late + d.absent));

  return (
    <>
      <div className="att-grid4">
        <div className="att-stat"><b>{tot.present}</b><span>Present</span></div>
        <div className="att-stat"><b>{tot.late}</b><span>Late</span></div>
        <div className="att-stat"><b>{tot.on_leave}</b><span>Leave</span></div>
        <div className="att-stat"><b style={{ color: "#be123c" }}>{tot.no_punch}</b><span>No punch</span></div>
      </div>

      <div>
        <h3 className="att-h2">Branch-wise (aaj)</h3>
        <div className="att-list">
          {branches.map((b) => {
            const marked = b.present + b.late + b.half_day;
            const pct = b.total ? Math.round((marked / b.total) * 100) : 0;
            return (
              <div className="att-row" key={b.branch} style={{ display: "block" }}>
                <div className="att-between">
                  <b>{b.branch}</b>
                  <span className="att-muted">{marked}/{b.total} · {pct}%</span>
                </div>
                <div className="att-bar"><i style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
          {!branches.length && <p className="att-empty">Data nahi mila.</p>}
        </div>
      </div>

      <div>
        <h3 className="att-h2">Pichhle 14 din</h3>
        <div className="att-card">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 110 }}>
            {trend.map((d) => {
              const h = ((d.present + d.late) / maxT) * 100;
              const ha = (d.absent / maxT) * 100;
              return (
                <div key={d.d} style={{ flex: 1, display: "flex", flexDirection: "column",
                  justifyContent: "flex-end", height: "100%", gap: 1 }}>
                  <div style={{ height: `${ha}%`, background: "#fecdd3", borderRadius: "3px 3px 0 0" }} />
                  <div style={{ height: `${h}%`, background: "#0f766e", borderRadius: ha ? 0 : "3px 3px 0 0" }} />
                </div>
              );
            })}
          </div>
          <div className="att-between" style={{ marginTop: 9 }}>
            <span className="att-muted">{fmtDate(trend[0]?.d)}</span>
            <span className="att-muted">present · absent</span>
            <span className="att-muted">{fmtDate(trend[trend.length - 1]?.d)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- staff management ---------------- */
function StaffTab({ me }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  const load = async () => {
    const [e, b] = await Promise.all([
      supabase.from("employees").select("*, branches(name)").order("full_name"),
      supabase.from("branches").select("*").order("name"),
    ]);
    setRows(e.data || []); setBranches(b.data || []); setBusy(false);
  };
  useEffect(() => { load(); }, []);

  if (busy) return <p className="att-muted">Load ho raha hai…</p>;

  return (
    <>
      <div className="att-between">
        <p className="att-muted">{rows.filter((r) => r.active).length} active</p>
        {me.role === "admin" && <button className="att-btn sm" onClick={() => setAdd(true)}>+ Employee</button>}
      </div>
      <div className="att-list">
        {rows.map((r) => (
          <div className="att-row" key={r.id} onClick={() => me.role === "admin" && setEdit(r)}>
            <div className="grow">
              <p style={{ fontWeight: 600 }}>{r.full_name} <span className="att-muted">{r.emp_code}</span></p>
              <p className="att-muted">
                {r.branches?.name || "—"} · {r.designation || r.role} ·{" "}
                {String(r.shift_start).slice(0, 5)}–{String(r.shift_end).slice(0, 5)}
              </p>
            </div>
            {!r.active && <span className="att-pill p-Off">Inactive</span>}
            {r.field_staff && <span className="att-pill p-Leave">Field</span>}
          </div>
        ))}
      </div>
      {add && <EmployeeSheet branches={branches} onClose={() => { setAdd(false); load(); }} />}
      {edit && <EmployeeSheet branches={branches} row={edit} onClose={() => { setEdit(null); load(); }} />}
    </>
  );
}

function EmployeeSheet({ branches, row, onClose }: any) {
  const isNew = !row;
  const [f, setF] = useState<any>(row || {
    emp_code: "", full_name: "", phone: "", designation: "",
    branch_id: branches[0]?.id || null, role: "staff",
    shift_start: "10:00", shift_end: "19:00", grace_minutes: 15,
    field_staff: false, monthly_gross: "", active: true, week_off_days: [0],
  });
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true); setMsg({ err: "", ok: "" });
    try {
      const payload: any = {
        emp_code: String(f.emp_code).trim().toUpperCase(),
        full_name: String(f.full_name).trim(),
        phone: f.phone || null, designation: f.designation || null,
        branch_id: f.branch_id, role: f.role,
        shift_start: f.shift_start, shift_end: f.shift_end,
        grace_minutes: Number(f.grace_minutes) || 0,
        field_staff: f.field_staff, active: f.active,
        week_off_days: f.week_off_days,
        monthly_gross: f.monthly_gross === "" || f.monthly_gross == null ? null : Number(f.monthly_gross),
      };

      if (isNew) {
        if (pin.length < 6) throw new Error("PIN kam se kam 6 digit ka hona chahiye");
        const email = `${payload.emp_code.toLowerCase()}${EMAIL_DOMAIN}`;
        const { data: au, error: ae } = await signupClient.auth.signUp({ email, password: pin });
        if (ae) throw new Error("Login banane mein dikkat: " + ae.message);
        payload.auth_user_id = au.user?.id;
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw new Error(error.message);
        await supabase.rpc("seed_leave_balances", {});
        setMsg({ err: "", ok: `${payload.full_name} add ho gaye. Code ${payload.emp_code}, PIN ${pin}` });
      } else {
        const { error } = await supabase.from("employees").update(payload).eq("id", row.id);
        if (error) throw new Error(error.message);
        setMsg({ err: "", ok: "Save ho gaya." });
      }
    } catch (e: any) { setMsg({ err: e.message, ok: "" }); }
    setBusy(false);
  };

  const toggleOff = (d: number) => {
    const cur: number[] = f.week_off_days || [];
    setF({ ...f, week_off_days: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d] });
  };

  return (
    <Sheet title={isNew ? "Naya employee" : f.full_name} onClose={onClose}>
      <div className="att-card att-stack">
        <div className="att-row2">
          <div>
            <label>Employee code</label>
            <input value={f.emp_code} disabled={!isNew} style={{ textTransform: "uppercase" }}
              onChange={(e) => setF({ ...f, emp_code: e.target.value })} placeholder="HJS007" />
          </div>
          <div>
            <label>Name</label>
            <input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          </div>
        </div>
        {isNew && (
          <div>
            <label>PIN (6 digit)</label>
            <input value={pin} inputMode="numeric" onChange={(e) => setPin(e.target.value)} placeholder="482913" />
          </div>
        )}
        <div className="att-row2">
          <div>
            <label>Phone</label>
            <input value={f.phone || ""} inputMode="tel" onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <div>
            <label>Designation</label>
            <input value={f.designation || ""} onChange={(e) => setF({ ...f, designation: e.target.value })} />
          </div>
        </div>
        <div className="att-row2">
          <div>
            <label>Branch</label>
            <select value={f.branch_id || ""} onChange={(e) => setF({ ...f, branch_id: e.target.value })}>
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label>Role</label>
            <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div className="att-row2">
          <div>
            <label>Shift start</label>
            <input type="time" value={String(f.shift_start).slice(0, 5)}
              onChange={(e) => setF({ ...f, shift_start: e.target.value })} />
          </div>
          <div>
            <label>Shift end</label>
            <input type="time" value={String(f.shift_end).slice(0, 5)}
              onChange={(e) => setF({ ...f, shift_end: e.target.value })} />
          </div>
        </div>
        <div className="att-row2">
          <div>
            <label>Grace (min)</label>
            <input inputMode="numeric" value={f.grace_minutes}
              onChange={(e) => setF({ ...f, grace_minutes: e.target.value })} />
          </div>
          <div>
            <label>Monthly gross</label>
            <input inputMode="numeric" value={f.monthly_gross ?? ""}
              onChange={(e) => setF({ ...f, monthly_gross: e.target.value })} />
          </div>
        </div>
        <div>
          <label>Week off</label>
          <div style={{ display: "flex", gap: 5 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <button key={i} onClick={() => toggleOff(i)}
                style={{
                  flex: 1, minHeight: 40, borderRadius: 10, fontWeight: 600,
                  background: (f.week_off_days || []).includes(i) ? "#0f766e" : "#e2e8f0",
                  color: (f.week_off_days || []).includes(i) ? "#fff" : "#475569",
                }}>{d}</button>
            ))}
          </div>
        </div>
        <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0 }}>
          <input type="checkbox" checked={f.field_staff}
            onChange={(e) => setF({ ...f, field_staff: e.target.checked })} />
          Field staff (geo-fence apply na ho)
        </label>
        {!isNew && (
          <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0 }}>
            <input type="checkbox" checked={f.active}
              onChange={(e) => setF({ ...f, active: e.target.checked })} />
            Active
          </label>
        )}
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn" onClick={save} disabled={busy || !f.emp_code || !f.full_name}>
          {busy ? "Save ho raha hai…" : isNew ? "Employee add karein" : "Save"}
        </button>
      </div>
    </Sheet>
  );
}

/* ---------------- reports ---------------- */
function ReportsTab() {
  const [kind, setKind] = useState("muster");
  const [month, setMonth] = useState(istToday().slice(0, 7));
  const [data, setData] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setBusy(true);
      const fn = kind === "muster" ? "muster_roll" : kind === "late" ? "late_report" : "absence_report";
      const { data: d } = await supabase.rpc(fn, { p_month: `${month}-01` });
      setData(d || []); setBusy(false);
    })();
  }, [kind, month]);

  const muster = useMemo(() => {
    if (kind !== "muster") return null;
    const byEmp: Record<string, any> = {};
    const dates: string[] = [];
    data.forEach((r: any) => {
      if (!dates.includes(r.d)) dates.push(r.d);
      byEmp[r.emp_code] = byEmp[r.emp_code] || { name: r.full_name, marks: {} };
      byEmp[r.emp_code].marks[r.d] = r.mark;
    });
    return { rows: Object.entries(byEmp), dates: dates.sort() };
  }, [data, kind]);

  return (
    <>
      <div className="att-seg">
        {[["muster", "Muster roll"], ["late", "Late"], ["absence", "Absence"]].map(([k, l]) => (
          <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{l}</button>
        ))}
      </div>
      <div className="att-flex">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ flex: 1 }} />
        <button className="att-btn sm" disabled={!data.length}
          onClick={() => downloadCsv(data, `HJS_${kind}_${month}.csv`)}>CSV</button>
      </div>

      {busy && <p className="att-muted">Load ho raha hai…</p>}

      {!busy && kind === "muster" && muster && (
        <>
          <p className="att-muted">P present · L late · H half · A absent · W week off · F holiday</p>
          <div className="att-scroll">
            <table className="att-table">
              <thead>
                <tr>
                  <th className="name">Name</th>
                  {muster.dates.map((d) => <th key={d}>{new Date(d).getDate()}</th>)}
                </tr>
              </thead>
              <tbody>
                {muster.rows.map(([code, v]: any) => (
                  <tr key={code}>
                    <td className="name">{v.name}</td>
                    {muster.dates.map((d) => (
                      <td key={d}><span className={markClass(v.marks[d])}>{v.marks[d] || "·"}</span></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!busy && kind === "late" && (
        <div className="att-list">
          {!data.length && <p className="att-empty">Is month koi late mark nahi. Badhiya.</p>}
          {data.map((r: any, i: number) => (
            <div className="att-row" key={i}>
              <span style={{ width: 56, fontWeight: 600 }}>{fmtDate(r.work_date)}</span>
              <span className="grow">{r.full_name}</span>
              <span className="att-muted">{fmtTime(r.punch_in_at)}</span>
              <span className="att-pill p-Late">{r.late_minutes}m</span>
            </div>
          ))}
        </div>
      )}

      {!busy && kind === "absence" && (
        <div className="att-list">
          {!data.length && <p className="att-empty">Data nahi mila.</p>}
          {data.map((r: any, i: number) => (
            <div className="att-row" key={i}>
              <div className="grow">
                <p style={{ fontWeight: 600 }}>{r.full_name}</p>
                <p className="att-muted">{r.branch}</p>
              </div>
              <span className="att-pill p-Late">{r.late_marks} late</span>
              <span className="att-pill p-Absent">{r.absent_days} absent</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- payroll ---------------- */
function PayrollTab() {
  const [month, setMonth] = useState(istToday().slice(0, 7));
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setBusy(true);
      const { data } = await supabase.rpc("payroll_summary", { p_month: `${month}-01` });
      setRows(data || []); setBusy(false);
    })();
  }, [month]);

  return (
    <>
      <div className="att-flex">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ flex: 1 }} />
        <button className="att-btn sm" disabled={!rows.length}
          onClick={() => downloadCsv(rows, `HJS_payroll_${month}.csv`)}>CSV</button>
      </div>
      {busy && <p className="att-muted">Load ho raha hai…</p>}
      {!busy && (
        <div className="att-list">
          {!rows.length && <p className="att-empty">Is month ka data nahi mila.</p>}
          {rows.map((r: any) => (
            <div className="att-row" key={r.emp_code} style={{ display: "block" }}>
              <div className="att-between">
                <b>{r.full_name}</b>
                <b>{r.payable_amount ?? "—"}</b>
              </div>
              <p className="att-muted" style={{ marginTop: 3 }}>
                {r.present_days} present · {r.half_days} half · {r.paid_leaves} paid lv ·{" "}
                {r.unpaid_leaves} LOP · {r.absent_days} absent → <b>{r.payable_days} payable</b>
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ========================= me ========================= */
function MeScreen({ me }: any) {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState({ err: "", ok: "" });

  const changePin = async () => {
    setMsg({ err: "", ok: "" });
    if (pin.length < 6) return setMsg({ err: "PIN kam se kam 6 digit ka rakhein", ok: "" });
    const { error } = await supabase.auth.updateUser({ password: pin });
    if (error) setMsg({ err: error.message, ok: "" });
    else { setMsg({ err: "", ok: "PIN badal gaya." }); setPin(""); }
  };

  const info: [string, string][] = [
    ["Employee code", me.emp_code],
    ["Branch", me.branches?.name || "—"],
    ["Designation", me.designation || "—"],
    ["Role", me.role],
    ["Shift", `${String(me.shift_start).slice(0, 5)} – ${String(me.shift_end).slice(0, 5)}`],
    ["Phone", me.phone || "—"],
  ];

  return (
    <div className="att-wrap att-stack">
      <h2 className="att-h1">{me.full_name}</h2>
      <div className="att-list">
        {info.map(([k, v]) => (
          <div className="att-row" key={k}>
            <span className="grow att-muted">{k}</span>
            <b style={{ fontSize: 14 }}>{v}</b>
          </div>
        ))}
      </div>

      <div className="att-card att-stack">
        <h3 className="att-h2" style={{ margin: 0 }}>PIN badlein</h3>
        <input type="password" inputMode="numeric" placeholder="Naya 6 digit PIN"
          value={pin} onChange={(e) => setPin(e.target.value)} />
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn sm" onClick={changePin} disabled={!pin}>Save</button>
      </div>

      <button className="att-btn line" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  );
}

/* ========================= shell ========================= */
export default function Attendance() {
  const [session, setSession] = useState<any>(undefined);
  const [me, setMe] = useState<any>(null);
  const [tab, setTab] = useState("punch");
  const [pending, setPending] = useState(0);

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

  useEffect(() => {
    if (!me || !["manager", "admin"].includes(me.role)) return;
    (async () => {
      const [l, r] = await Promise.all([
        supabase.from("leaves").select("id, employee_id").eq("status", "Pending"),
        supabase.from("regularizations").select("id, employee_id").eq("status", "Pending"),
      ]);
      const n = [...(l.data || []), ...(r.data || [])].filter((x: any) => x.employee_id !== me.id).length;
      setPending(n);
    })();
  }, [me, tab]);

  const shell = (children: any) => (
    <div className="hjsatt"><style>{CSS}</style>{children}</div>
  );

  if (session === undefined) return shell(<div className="att-center att-muted">Load ho raha hai…</div>);
  if (!session) return shell(<Login />);
  if (!me) return shell(
    <div className="att-center" style={{ flexDirection: "column", gap: 14, textAlign: "center" }}>
      <p>Is login se koi employee record juda hua nahi hai. Admin se emp code link karwa lijiye.</p>
      <button className="att-btn grey sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  );

  const approver = ["manager", "admin"].includes(me.role);
  const tabs: [string, string][] = [["punch", "Punch"], ["leaves", "Leaves"]];
  if (approver) tabs.push(["inbox", "Inbox"], ["team", "Team"]);
  tabs.push(["me", "Me"]);

  return shell(
    <>
      <div className="att-top">
        <div className="att-flex">
          <b style={{ fontSize: 14 }}>HJS Attendance</b>
          <span className="att-muted">{me.emp_code}</span>
        </div>
        <span className="att-muted">{me.branches?.name || ""}</span>
      </div>

      {tab === "punch" && <PunchScreen me={me} />}
      {tab === "leaves" && <LeavesScreen me={me} />}
      {tab === "inbox" && approver && <InboxScreen me={me} onCount={setPending} />}
      {tab === "team" && approver && <TeamScreen me={me} />}
      {tab === "me" && <MeScreen me={me} />}

      <div className="att-nav">
        {tabs.map(([k, label]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {k === "inbox" && pending > 0 && <span className="dot">{pending}</span>}
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
