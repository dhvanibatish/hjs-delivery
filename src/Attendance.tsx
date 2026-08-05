// ============================================================
// HJS Attendance v4 — dark theme (Zoho People jaisa vibe)
// Desktop: left sidebar · Mobile: arrow se slide-out drawer
// Saari CSS .hjsatt ke andar scoped — baaki apps par zero asar.
// hjs_attendance_v2.sql pehle chal chuka ho.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL_, KEY_, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "hjs-attendance" },
});
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
  position: fixed; inset: 0; display: flex; overflow: hidden; text-align: left;
  background: #0a0a0c; color: #f2f3f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 15px; line-height: 1.45; letter-spacing: -0.005em;
  -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent;
}
.hjsatt h1, .hjsatt h2, .hjsatt h3, .hjsatt h4, .hjsatt p, .hjsatt b,
.hjsatt span, .hjsatt div, .hjsatt td, .hjsatt th, .hjsatt li, .hjsatt a {
  color: #f2f3f5; font-weight: inherit; text-align: left; }
.hjsatt b { font-weight: 700; }
.hjsatt button { font: inherit; cursor: pointer; border: 0; background: transparent;
  color: #f2f3f5; text-align: left; }
.hjsatt input, .hjsatt select, .hjsatt textarea {
  font-family: inherit; font-size: 16px; width: 100%; padding: 13px 14px;
  border: 1px solid #2c2e36; border-radius: 14px; background: #17181d; color: #f2f3f5;
  outline: none; -webkit-appearance: none; appearance: none; min-height: 48px; }
.hjsatt select { padding-right: 34px; color-scheme: dark;
  background-image: linear-gradient(45deg, transparent 50%, #8b8f9a 50%),
                    linear-gradient(135deg, #8b8f9a 50%, transparent 50%);
  background-position: calc(100% - 18px) 22px, calc(100% - 13px) 22px;
  background-size: 5px 5px; background-repeat: no-repeat; }
.hjsatt input[type=date], .hjsatt input[type=time], .hjsatt input[type=month] { color-scheme: dark; }
.hjsatt input[type=checkbox] { width: 21px; height: 21px; min-height: 0; accent-color: #2dd4bf; }
.hjsatt input::placeholder, .hjsatt textarea::placeholder { color: #6b7079; }
.hjsatt input:focus, .hjsatt select:focus, .hjsatt textarea:focus {
  border-color: #2dd4bf; box-shadow: 0 0 0 3px rgba(45,212,191,.16); }
.hjsatt label { display: block; font-size: 12.5px; font-weight: 600; color: #8b8f9a;
  margin-bottom: 7px; letter-spacing: .01em; }

/* ---------- layout: top tabs ---------- */
.hjsatt { flex-direction: column; }
.hjsatt .att-head { flex-shrink: 0; background: #101116; border-bottom: 1px solid #1f2027;
  padding-top: calc(10px + env(safe-area-inset-top)); }
.hjsatt .att-headtop { display: flex; align-items: center; gap: 11px; padding: 6px 15px 12px; }
.hjsatt .att-logo { width: 40px; height: 40px; border-radius: 13px; flex-shrink: 0;
  background: linear-gradient(140deg, #2dd4bf, #0ea5e9); display: flex;
  align-items: center; justify-content: center; font-weight: 800; color: #06202a; font-size: 13px; }
.hjsatt .att-headtop b { display: block; font-size: 17px; font-weight: 750; letter-spacing: -0.02em; }
.hjsatt .att-tabs { display: flex; gap: 2px; overflow-x: auto; padding: 0 9px;
  scrollbar-width: none; }
.hjsatt .att-tabs::-webkit-scrollbar { display: none; }
.hjsatt .att-tab { position: relative; padding: 10px 14px 13px; font-size: 14.5px;
  font-weight: 600; color: #8b8f9a; white-space: nowrap; flex-shrink: 0; }
.hjsatt .att-tab.on { color: #2dd4bf; box-shadow: inset 0 -2.5px 0 #2dd4bf; }
.hjsatt .att-tab .cnt { display: inline-block; margin-left: 6px; min-width: 19px; height: 19px;
  line-height: 19px; border-radius: 99px; background: #f43f5e; color: #fff; font-size: 11px;
  font-weight: 700; text-align: center; padding: 0 5px; }
.hjsatt .att-main { flex: 1; min-width: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.hjsatt .att-wrap { max-width: 660px; margin: 0 auto; padding: 16px 14px 48px; }
.hjsatt .att-center { min-height: 100%; display: flex; align-items: center;
  justify-content: center; padding: 24px 16px; }
.hjsatt .att-card { background: #17181d; border: 1px solid #23252c; border-radius: 20px; padding: 17px; }
.hjsatt .att-stack > * + * { margin-top: 13px; }
.hjsatt .att-muted { color: #8b8f9a; font-size: 13px; }
.hjsatt .att-h1 { font-size: 24px; font-weight: 750; letter-spacing: -0.025em; color: #fff; }
.hjsatt .att-h2 { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 9px; }
.hjsatt .att-flex { display: flex; align-items: center; gap: 9px; }
.hjsatt .att-between { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.hjsatt .att-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* ---------- buttons ---------- */
.hjsatt .att-btn { display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; min-height: 48px; padding: 13px; border-radius: 14px;
  background: #2dd4bf; color: #062b28; font-weight: 700; }
.hjsatt .att-btn:active { transform: scale(.985); }
.hjsatt .att-btn:disabled { opacity: .35; }
.hjsatt .att-btn.sm { width: auto; min-height: 40px; padding: 9px 16px;
  font-size: 13.5px; border-radius: 12px; }
.hjsatt .att-btn.grey { background: #262830; color: #dfe1e6; }
.hjsatt .att-btn.red { background: linear-gradient(135deg, #fb7185, #e11d48); color: #fff; }
.hjsatt .att-btn.green { background: #34d399; color: #05291d; }
.hjsatt .att-btn.line { background: transparent; border: 1px solid #2f313a; color: #dfe1e6; }
.hjsatt .att-btn.big { min-height: 66px; font-size: 18px; border-radius: 20px;
  background: linear-gradient(135deg, #2dd4bf, #0ea5e9); color: #04222b;
  box-shadow: 0 10px 30px rgba(45,212,191,.22); }
.hjsatt .att-btn.big.red { background: linear-gradient(135deg, #fb7185, #e11d48); color: #fff;
  box-shadow: 0 10px 30px rgba(225,29,72,.24); }
.hjsatt .att-btn.off { background: #23252c; color: #7b808b; box-shadow: none; }

.hjsatt .att-note { padding: 12px 14px; border-radius: 14px; font-size: 13.5px; }
.hjsatt .att-note.err, .hjsatt .att-note.err span { background: rgba(244,63,94,.13); color: #fda4af; }
.hjsatt .att-note.ok, .hjsatt .att-note.ok span { background: rgba(52,211,153,.13); color: #6ee7b7; }

.hjsatt .att-pill { display: inline-block; padding: 4px 11px; border-radius: 999px;
  font-size: 11.5px; font-weight: 700; white-space: nowrap; }
.hjsatt .p-Present, .hjsatt .p-Approved { background: rgba(52,211,153,.15); color: #34d399; }
.hjsatt .p-Late, .hjsatt .p-Pending { background: rgba(251,191,36,.15); color: #fbbf24; }
.hjsatt .p-HalfDay { background: rgba(251,146,60,.15); color: #fb923c; }
.hjsatt .p-Absent, .hjsatt .p-Rejected { background: rgba(244,63,94,.15); color: #fb7185; }
.hjsatt .p-Leave { background: rgba(96,165,250,.15); color: #60a5fa; }
.hjsatt .p-Off { background: #23252c; color: #8b8f9a; }

/* ---------- avatar ---------- */
.hjsatt .att-av { width: 40px; height: 40px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; color: #0a0a0c; }

/* ---------- punch hero ---------- */
.hjsatt .att-hero { border-radius: 24px; padding: 26px 18px 22px; text-align: center;
  background: radial-gradient(120% 120% at 50% 0%, #1c2a35 0%, #14161b 55%, #131419 100%);
  border: 1px solid #262d36; }
.hjsatt .att-hero p, .hjsatt .att-hero div, .hjsatt .att-hero span { text-align: center; }
.hjsatt .att-clock { font-variant-numeric: tabular-nums; font-size: 46px; font-weight: 750;
  letter-spacing: -0.04em; margin-top: 4px; color: #fff; }
.hjsatt .att-eyebrow { font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: #7b808b; }
.hjsatt .att-inout { display: flex; justify-content: center; gap: 14px; margin-top: 10px; font-size: 14px; }
.hjsatt .att-inout span { color: #9aa0ab; }
.hjsatt .att-inout b { color: #f2f3f5; }

.hjsatt .att-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.hjsatt .att-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.hjsatt .att-stat { background: #17181d; border: 1px solid #23252c; border-radius: 16px;
  padding: 13px 6px; text-align: center; }
.hjsatt .att-stat b { display: block; font-size: 21px; font-weight: 750; text-align: center; }
.hjsatt .att-stat span { font-size: 11px; color: #8b8f9a; text-align: center; display: block; }

.hjsatt .att-bal { background: #17181d; border: 1px solid #23252c; border-radius: 16px; padding: 14px; }
.hjsatt .att-bal .n { font-size: 25px; font-weight: 750; }
.hjsatt .att-bal .t { font-size: 12.5px; color: #8b8f9a; }
.hjsatt .att-bar { height: 6px; border-radius: 99px; background: #23252c; margin-top: 10px; overflow: hidden; }
.hjsatt .att-bar i { display: block; height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, #2dd4bf, #0ea5e9); }

.hjsatt .att-list { background: #17181d; border: 1px solid #23252c; border-radius: 20px; overflow: hidden; }
.hjsatt .att-row { display: flex; align-items: center; gap: 11px; padding: 13px 15px; font-size: 14px; }
.hjsatt .att-row + .att-row { border-top: 1px solid #202127; }
.hjsatt .att-row .grow { flex: 1; min-width: 0; }
.hjsatt .att-row .grow p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hjsatt .att-empty { padding: 18px; color: #8b8f9a; font-size: 14px; }

.hjsatt .att-seg { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 2px;
  scrollbar-width: none; }
.hjsatt .att-seg::-webkit-scrollbar { display: none; }
.hjsatt .att-seg button { padding: 9px 15px; border-radius: 12px; font-size: 13.5px;
  color: #9aa0ab; white-space: nowrap; background: #17181d; border: 1px solid #23252c; }
.hjsatt .att-seg button.on { background: rgba(45,212,191,.14); color: #2dd4bf;
  border-color: rgba(45,212,191,.3); font-weight: 700; }

.hjsatt .att-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch;
  background: #17181d; border: 1px solid #23252c; border-radius: 18px; }
.hjsatt .att-table { width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap; }
.hjsatt .att-table th { padding: 10px 11px; background: #1c1e24; color: #8b8f9a;
  font-size: 10.5px; letter-spacing: .07em; text-transform: uppercase; font-weight: 700; }
.hjsatt .att-table td { padding: 10px 11px; border-top: 1px solid #202127;
  font-variant-numeric: tabular-nums; }
.hjsatt .att-table td.name, .hjsatt .att-table th.name { position: sticky; left: 0;
  background: #17181d; font-weight: 600; box-shadow: 1px 0 0 #202127; }
.hjsatt .att-table th.name { background: #1c1e24; }
.hjsatt .att-mark { display: inline-block; width: 21px; text-align: center;
  font-weight: 700; font-size: 12px; }
.hjsatt .m-P { color: #34d399; } .hjsatt .m-L { color: #fbbf24; }
.hjsatt .m-H { color: #fb923c; } .hjsatt .m-A { color: #fb7185; }
.hjsatt .m-W, .hjsatt .m-F { color: #5c616b; } .hjsatt .m-X { color: #60a5fa; }

.hjsatt .att-sheet { position: fixed; inset: 0; z-index: 40; background: rgba(0,0,0,.65);
  display: flex; align-items: flex-end; justify-content: center; }
.hjsatt .att-sheet > div { width: 100%; max-width: 660px; background: #0f1014;
  border: 1px solid #23252c; border-bottom: 0;
  border-radius: 24px 24px 0 0; padding: 18px 15px calc(20px + env(safe-area-inset-bottom));
  max-height: 92%; overflow-y: auto; }
@media (min-width: 900px) {
  .hjsatt .att-sheet { align-items: center; }
  .hjsatt .att-sheet > div { border-radius: 24px; border-bottom: 1px solid #23252c; max-height: 88%; }
}
`;

/* ========================= helpers ========================= */
const fmtTime = (ts: any) =>
  ts ? new Date(ts).toLocaleTimeString(IST, { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TZ }) : "—";
const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleDateString(IST, { day: "2-digit", month: "short", timeZone: TZ }) : "—";
const fmtHM = (t: any) => {
  if (!t) return "—";
  const [h, m] = String(t).split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, "0")} ${ap}` : `${hh} ${ap}`;
};
const istToday = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: TZ })).toISOString().slice(0, 10);
const hhmm = (mins: number | null) => {
  if (mins == null) return "0h 00m";
  const m = Math.max(0, Math.round(mins));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
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

const AV_COLORS = ["#2dd4bf", "#60a5fa", "#fbbf24", "#fb7185", "#a78bfa", "#34d399", "#fb923c"];
const Avatar = ({ name }: any) => {
  const n = String(name || "?");
  const initials = n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 997;
  return <div className="att-av" style={{ background: AV_COLORS[h % AV_COLORS.length] }}>{initials}</div>;
};

const getPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Is device par location support nahi hai"));
    navigator.geolocation.getCurrentPosition(resolve, (e) =>
      reject(new Error(e.code === 1
        ? "Location permission band hai. Settings mein allow karke dobara koshish kijiye."
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
  !children ? null : <div className={`att-note ${kind}`}><span>{children}</span></div>;

const Sheet = ({ title, onClose, children }: any) => (
  <div className="att-sheet" onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()}>
      <div className="att-between" style={{ marginBottom: 15 }}>
        <b className="att-h1" style={{ fontSize: 19 }}>{title}</b>
        <button className="att-muted" onClick={onClose}>Band karein</button>
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
      <div style={{ width: "100%", maxWidth: 390 }}>
        <div style={{ marginBottom: 26 }}>
          <div className="att-logo" style={{ width: 48, height: 48, borderRadius: 15, fontSize: 16 }}>HJS</div>
          <h1 className="att-h1" style={{ marginTop: 16 }}>Attendance</h1>
          <p className="att-muted" style={{ marginTop: 5 }}>Ek baar login karo — phir roz sirf punch.</p>
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
            {busy ? "Ek second…" : "Andar aao"}
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
      setOk(dir === "in"
        ? `Check-in ho gaya — ${fmtTime(row.punch_in_at)}`
        : `Din poora hua — ${hhmm(row.worked_minutes)} kaam`);
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
      <div className="att-flex">
        <Avatar name={me.full_name} />
        <div>
          <h2 className="att-h1" style={{ fontSize: 21 }}>Hi, {String(me.full_name).split(" ")[0]}</h2>
          <p className="att-muted">
            {new Date().toLocaleDateString(IST, { weekday: "long", day: "numeric", month: "long", timeZone: TZ })}
          </p>
        </div>
      </div>

      <div className="att-hero">
        <p className="att-eyebrow">Aaj kitna kaam</p>
        <p className="att-clock">{hhmm(liveMinutes)}</p>
        <div className="att-inout">
          <span>In <b>{fmtTime(today?.punch_in_at)}</b></span>
          <span style={{ color: "#3a3d45" }}>·</span>
          <span>Out <b>{fmtTime(today?.punch_out_at)}</b></span>
        </div>
        {today && (
          <div style={{ marginTop: 13 }}>
            <span className={pillClass(today.status)}>{today.status}</span>
            {today.in_geo_ok === false && (
              <span style={{ marginLeft: 8, color: "#fbbf24", fontSize: 12.5 }}>
                branch se {today.in_distance_m ?? "?"} m door
              </span>
            )}
          </div>
        )}
        <button className={`att-btn big ${done ? "off" : inOnly ? "red" : ""}`} style={{ marginTop: 20 }}
          onClick={() => punch(inOnly ? "out" : "in")} disabled={busy || done}>
          {busy ? "Location le raha hoon…" : done ? "Aaj ka din complete" : inOnly ? "Check out" : "Check in"}
        </button>
        <p className="att-muted" style={{ marginTop: 10, fontSize: 12 }}>
          Punch ke saath location record hoti hai
        </p>
      </div>

      <Note>{err}</Note>
      <Note kind="ok">{ok}</Note>

      <div className="att-grid4">
        <div className="att-stat"><b style={{ color: "#34d399" }}>{stats.present}</b><span>Present</span></div>
        <div className="att-stat"><b style={{ color: "#fbbf24" }}>{stats.late}</b><span>Late</span></div>
        <div className="att-stat"><b style={{ color: "#fb923c" }}>{stats.half}</b><span>Half</span></div>
        <div className="att-stat"><b style={{ color: "#60a5fa" }}>{stats.hrs}</b><span>Ghante</span></div>
      </div>

      <div>
        <div className="att-between" style={{ marginBottom: 9 }}>
          <h3 className="att-h2" style={{ margin: 0 }}>Pichhle 30 din</h3>
          <button className="att-btn sm line" onClick={() => setRegOpen(true)}>Punch bhool gaye?</button>
        </div>
        <div className="att-list">
          {recent.length === 0 && (
            <p className="att-empty">Abhi kuch nahi hai. Aaj se shuruaat karo.</p>
          )}
          {recent.map((r) => (
            <div className="att-row" key={r.id}>
              <span style={{ width: 54, fontWeight: 700 }}>{fmtDate(r.work_date)}</span>
              <span className="grow att-muted">{fmtTime(r.punch_in_at)} – {fmtTime(r.punch_out_at)}</span>
              <span style={{ width: 58, textAlign: "right", color: "#9aa0ab" }}>{hhmm(r.worked_minutes)}</span>
              <span className={pillClass(r.status)}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>

      {regOpen && <RegularizeSheet me={me} onClose={() => setRegOpen(false)} />}
    </div>
  );
}

/* ================= regularization ================= */
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
    else setMsg({ err: "", ok: "Manager ko bhej di gayi." });
    setBusy(false);
  };

  return (
    <Sheet title="Punch bhool gaye?" onClose={onClose}>
      <div className="att-card att-stack">
        <div>
          <label>Kis din ka</label>
          <input type="date" max={istToday()} value={form.work_date}
            onChange={(e) => setForm({ ...form, work_date: e.target.value })} />
        </div>
        <div className="att-row2">
          <div>
            <label>Check in</label>
            <input type="time" value={form.req_punch_in}
              onChange={(e) => setForm({ ...form, req_punch_in: e.target.value })} />
          </div>
          <div>
            <label>Check out</label>
            <input type="time" value={form.req_punch_out}
              onChange={(e) => setForm({ ...form, req_punch_out: e.target.value })} />
          </div>
        </div>
        <div>
          <label>Kya hua tha</label>
          <textarea rows={2} placeholder="Chhoti si wajah likh do" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn" onClick={submit}
          disabled={busy || !form.reason || (!form.req_punch_in && !form.req_punch_out)}>
          {busy ? "Bhej raha hoon…" : "Request bhejo"}
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
    if (error) setMsg({ err: "Submit nahi hui: " + error.message, ok: "" });
    else { setMsg({ err: "", ok: "Leave request bhej di gayi." }); setForm({ ...form, reason: "" }); load(); }
  };

  const cancel = async (id: string) => {
    await supabase.from("leaves").update({ status: "Cancelled" }).eq("id", id);
    load();
  };

  return (
    <div className="att-wrap att-stack">
      <h2 className="att-h1">Chhuttiyan</h2>

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
                {b.pending > 0 && <div className="t" style={{ marginTop: 6 }}>{b.pending} pending</div>}
              </div>
            );
          })}
          {!bal.length && <p className="att-empty">Balance set nahi hai — admin se bolo.</p>}
        </div>
      </div>

      <div className="att-card att-stack">
        <h3 className="att-h2" style={{ margin: 0 }}>Nayi chhutti maango</h3>
        <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
          {types.map((t) => <option key={t.code} value={t.code}>{t.name}{t.paid ? "" : " (unpaid)"}</option>)}
        </select>
        <div className="att-row2">
          <div>
            <label>Kab se</label>
            <input type="date" value={form.from_date} onChange={(e) => setForm({
              ...form, from_date: e.target.value,
              to_date: e.target.value > form.to_date ? e.target.value : form.to_date })} />
          </div>
          <div>
            <label>Kab tak</label>
            <input type="date" value={form.to_date} min={form.from_date}
              onChange={(e) => setForm({ ...form, to_date: e.target.value })} />
          </div>
        </div>
        <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0, color: "#dfe1e6" }}>
          <input type="checkbox" checked={form.half_day}
            onChange={(e) => setForm({ ...form, half_day: e.target.checked, to_date: form.from_date })} />
          Aadha din
        </label>
        <textarea rows={2} placeholder="Wajah" value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <div className="att-between">
          <span className="att-muted">{days} din</span>
          <button className="att-btn sm" onClick={apply} disabled={!form.reason}>Bhejo</button>
        </div>
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
      </div>

      <div>
        <h3 className="att-h2">Meri requests</h3>
        <div className="att-list">
          {!mine.length && <p className="att-empty">Abhi tak koi chhutti nahi maangi.</p>}
          {mine.map((r) => (
            <div className="att-row" key={r.id}>
              <span style={{ width: 38, fontWeight: 700 }}>{r.leave_type}</span>
              <span className="grow att-muted">{fmtDate(r.from_date)} – {fmtDate(r.to_date)} · {r.days} din</span>
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
          <h3 className="att-h2">Regularization requests</h3>
          <div className="att-list">
            {regs.map((r) => (
              <div className="att-row" key={r.id}>
                <span style={{ width: 54, fontWeight: 700 }}>{fmtDate(r.work_date)}</span>
                <span className="grow att-muted">
                  {fmtHM(r.req_punch_in)} – {fmtHM(r.req_punch_out)}
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

/* ========================= approvals ========================= */
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

      {total === 0 && <div className="att-list"><p className="att-empty">Sab clear hai. Kuch pending nahi.</p></div>}

      {leaves.length > 0 && (
        <div>
          <h3 className="att-h2">Chhutti ki requests</h3>
          <div className="att-list">
            {leaves.map((r) => (
              <div className="att-row" key={r.id} style={{ flexWrap: "wrap" }}>
                <Avatar name={r.employees?.full_name} />
                <div className="grow" style={{ minWidth: 140 }}>
                  <p style={{ fontWeight: 700 }}>{r.employees?.full_name}</p>
                  <p className="att-muted">{r.leave_type} · {fmtDate(r.from_date)} – {fmtDate(r.to_date)} · {r.days} din</p>
                  <p style={{ color: "#9aa0ab", fontSize: 13.5, whiteSpace: "normal" }}>{r.reason}</p>
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
          <h3 className="att-h2">Missed punch requests</h3>
          <div className="att-list">
            {regs.map((r) => (
              <div className="att-row" key={r.id} style={{ flexWrap: "wrap" }}>
                <Avatar name={r.employees?.full_name} />
                <div className="grow" style={{ minWidth: 140 }}>
                  <p style={{ fontWeight: 700 }}>{r.employees?.full_name}</p>
                  <p className="att-muted">
                    {fmtDate(r.work_date)} · {fmtHM(r.req_punch_in)} – {fmtHM(r.req_punch_out)}
                  </p>
                  <p style={{ color: "#9aa0ab", fontSize: 13.5, whiteSpace: "normal" }}>{r.reason}</p>
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
        supabase.from("employees").select("id, emp_code, full_name, designation, branches(name)")
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

  if (busy) return <p className="att-muted">Ek second…</p>;
  const present = rows.filter((r) => r.log?.punch_in_at).length;

  return (
    <>
      <p className="att-muted">{rows.length} mein se {present} ne punch kiya</p>
      <div className="att-list">
        {rows.map((r) => (
          <div className="att-row" key={r.id}>
            <Avatar name={r.full_name} />
            <div className="grow">
              <p style={{ fontWeight: 700 }}>{r.emp_code} · {r.full_name}</p>
              <p className="att-muted">
                {r.log ? `${fmtTime(r.log.punch_in_at)} – ${fmtTime(r.log.punch_out_at)}`
                       : r.designation || r.branches?.name || "—"}
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

  if (busy) return <p className="att-muted">Ek second…</p>;

  const tot = branches.reduce((a, b) => ({
    total: a.total + b.total, present: a.present + b.present, late: a.late + b.late,
    on_leave: a.on_leave + b.on_leave, no_punch: a.no_punch + b.no_punch,
  }), { total: 0, present: 0, late: 0, on_leave: 0, no_punch: 0 });
  const maxT = Math.max(1, ...trend.map((d) => d.present + d.late + d.absent));

  return (
    <>
      <div className="att-grid4">
        <div className="att-stat"><b style={{ color: "#34d399" }}>{tot.present}</b><span>Present</span></div>
        <div className="att-stat"><b style={{ color: "#fbbf24" }}>{tot.late}</b><span>Late</span></div>
        <div className="att-stat"><b style={{ color: "#60a5fa" }}>{tot.on_leave}</b><span>Chhutti</span></div>
        <div className="att-stat"><b style={{ color: "#fb7185" }}>{tot.no_punch}</b><span>No punch</span></div>
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
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 120 }}>
            {trend.map((d) => {
              const h = ((d.present + d.late) / maxT) * 100;
              const ha = (d.absent / maxT) * 100;
              return (
                <div key={d.d} style={{ flex: 1, display: "flex", flexDirection: "column",
                  justifyContent: "flex-end", height: "100%", gap: 2 }}>
                  <div style={{ height: `${ha}%`, background: "#7f1d3a", borderRadius: "4px 4px 0 0" }} />
                  <div style={{ height: `${h}%`, borderRadius: ha ? 0 : "4px 4px 0 0",
                    background: "linear-gradient(180deg,#2dd4bf,#0ea5e9)" }} />
                </div>
              );
            })}
          </div>
          <div className="att-between" style={{ marginTop: 11 }}>
            <span className="att-muted">{fmtDate(trend[0]?.d)}</span>
            <span className="att-muted">present · absent</span>
            <span className="att-muted">{fmtDate(trend[trend.length - 1]?.d)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- staff ---------------- */
function StaffTab({ me }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [q, setQ] = useState("");
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

  if (busy) return <p className="att-muted">Ek second…</p>;
  const shown = rows.filter((r) =>
    !q || `${r.full_name} ${r.emp_code}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="att-flex">
        <input placeholder="Naam ya code se dhoondho" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        {me.role === "admin" && <button className="att-btn sm" onClick={() => setAdd(true)}>+ Naya</button>}
      </div>
      <div className="att-list">
        {shown.map((r) => (
          <div className="att-row" key={r.id} onClick={() => me.role === "admin" && setEdit(r)}>
            <Avatar name={r.full_name} />
            <div className="grow">
              <p style={{ fontWeight: 700 }}>{r.emp_code} · {r.full_name}</p>
              <p className="att-muted">
                {r.designation || r.role} · {fmtHM(r.shift_start)} – {fmtHM(r.shift_end)}
              </p>
            </div>
            {!r.active && <span className="att-pill p-Off">Inactive</span>}
            {r.field_staff && <span className="att-pill p-Leave">Field</span>}
          </div>
        ))}
        {!shown.length && <p className="att-empty">Koi nahi mila.</p>}
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
        if (pin.length < 6) throw new Error("PIN kam se kam 6 digit ka rakho");
        const email = `${payload.emp_code.toLowerCase()}${EMAIL_DOMAIN}`;
        const { data: au, error: ae } = await signupClient.auth.signUp({ email, password: pin });
        if (ae) throw new Error("Login banane mein dikkat: " + ae.message);
        payload.auth_user_id = au.user?.id;
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw new Error(error.message);
        await supabase.rpc("seed_leave_balances", {});
        setMsg({ err: "", ok: `${payload.full_name} add ho gaye — code ${payload.emp_code}, PIN ${pin}` });
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
            <label>Naam</label>
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
            <label>Grace (minute)</label>
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
          <label>Weekly off</label>
          <div style={{ display: "flex", gap: 5 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => {
              const on = (f.week_off_days || []).includes(i);
              return (
                <button key={i} onClick={() => toggleOff(i)}
                  style={{
                    flex: 1, minHeight: 42, borderRadius: 12, fontWeight: 700, textAlign: "center",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: on ? "#2dd4bf" : "#23252c", color: on ? "#062b28" : "#8b8f9a",
                  }}>{d}</button>
              );
            })}
          </div>
        </div>
        <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0, color: "#dfe1e6" }}>
          <input type="checkbox" checked={f.field_staff}
            onChange={(e) => setF({ ...f, field_staff: e.target.checked })} />
          Field staff (geo-fence lagu na ho)
        </label>
        {!isNew && (
          <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0, color: "#dfe1e6" }}>
            <input type="checkbox" checked={f.active}
              onChange={(e) => setF({ ...f, active: e.target.checked })} />
            Active
          </label>
        )}
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn" onClick={save} disabled={busy || !f.emp_code || !f.full_name}>
          {busy ? "Save ho raha hai…" : isNew ? "Employee add karo" : "Save karo"}
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

      {busy && <p className="att-muted">Ek second…</p>}

      {!busy && kind === "muster" && muster && (
        <>
          <p className="att-muted">P present · L late · H half · A absent · W week off · F holiday</p>
          <div className="att-scroll">
            <table className="att-table">
              <thead>
                <tr>
                  <th className="name">Naam</th>
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
          {!data.length && <p className="att-empty">Is month koi late nahi. Badhiya.</p>}
          {data.map((r: any, i: number) => (
            <div className="att-row" key={i}>
              <span style={{ width: 54, fontWeight: 700 }}>{fmtDate(r.work_date)}</span>
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
              <Avatar name={r.full_name} />
              <div className="grow">
                <p style={{ fontWeight: 700 }}>{r.full_name}</p>
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
      {busy && <p className="att-muted">Ek second…</p>}
      {!busy && (
        <div className="att-list">
          {!rows.length && <p className="att-empty">Is month ka data nahi mila.</p>}
          {rows.map((r: any) => (
            <div className="att-row" key={r.emp_code} style={{ display: "block" }}>
              <div className="att-between">
                <b>{r.full_name}</b>
                <b style={{ color: "#2dd4bf" }}>{r.payable_amount ?? "—"}</b>
              </div>
              <p className="att-muted" style={{ marginTop: 4 }}>
                {r.present_days} present · {r.half_days} half · {r.paid_leaves} paid ·{" "}
                {r.unpaid_leaves} LOP · {r.absent_days} absent → {r.payable_days} payable
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ========================= profile ========================= */
function MeScreen({ me }: any) {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState({ err: "", ok: "" });

  const changePin = async () => {
    setMsg({ err: "", ok: "" });
    if (pin.length < 6) return setMsg({ err: "PIN kam se kam 6 digit ka rakho", ok: "" });
    const { error } = await supabase.auth.updateUser({ password: pin });
    if (error) setMsg({ err: error.message, ok: "" });
    else { setMsg({ err: "", ok: "PIN badal gaya." }); setPin(""); }
  };

  const info: [string, string][] = [
    ["Employee code", me.emp_code],
    ["Branch", me.branches?.name || "—"],
    ["Designation", me.designation || "—"],
    ["Role", me.role],
    ["Shift", `${fmtHM(me.shift_start)} – ${fmtHM(me.shift_end)}`],
    ["Phone", me.phone || "—"],
  ];

  return (
    <div className="att-wrap att-stack">
      <div className="att-flex">
        <Avatar name={me.full_name} />
        <div>
          <h2 className="att-h1" style={{ fontSize: 21 }}>{me.full_name}</h2>
          <p className="att-muted">{me.designation || me.role}</p>
        </div>
      </div>

      <div className="att-list">
        {info.map(([k, v]) => (
          <div className="att-row" key={k}>
            <span className="grow att-muted">{k}</span>
            <b style={{ fontSize: 14 }}>{v}</b>
          </div>
        ))}
      </div>

      <div className="att-card att-stack">
        <h3 className="att-h2" style={{ margin: 0 }}>PIN badlo</h3>
        <input type="password" inputMode="numeric" placeholder="Naya 6 digit PIN"
          value={pin} onChange={(e) => setPin(e.target.value)} />
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn sm" onClick={changePin} disabled={!pin}>Save karo</button>
      </div>
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

  if (session === undefined) return shell(<div className="att-center att-muted">Ek second…</div>);
  if (!session) return shell(<Login />);
  if (!me) return shell(
    <div className="att-center" style={{ flexDirection: "column", gap: 14, textAlign: "center" }}>
      <p>Is login se koi employee record juda nahi hai. Admin se emp code link karwa lo.</p>
      <button className="att-btn grey sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  );

  const approver = ["manager", "admin"].includes(me.role);
  const nav: [string, string][] = [["punch", "Punch"], ["leaves", "Chhuttiyan"]];
  if (approver) nav.push(["inbox", "Approvals"], ["team", "Team"]);
  nav.push(["me", "Meri profile"]);
  const titles: Record<string, string> = {
    punch: "Punch", leaves: "Chhuttiyan", inbox: "Approvals", team: "Team", me: "Meri profile",
  };

  return shell(
    <>
      <div className="att-head">
        <div className="att-headtop">
          <div className="att-logo">HJS</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{titles[tab]}</b>
            <span className="att-muted">{me.full_name} · {me.emp_code}</span>
          </div>
          <button className="att-btn line sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
        <div className="att-tabs">
          {nav.map(([k, label]) => (
            <button key={k} className={`att-tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
              {label}
              {k === "inbox" && pending > 0 && <span className="cnt">{pending}</span>}
            </button>
          ))}
        </div>
      </div>

      <main className="att-main">
        {tab === "punch" && <PunchScreen me={me} />}
        {tab === "leaves" && <LeavesScreen me={me} />}
        {tab === "inbox" && approver && <InboxScreen me={me} onCount={setPending} />}
        {tab === "team" && approver && <TeamScreen me={me} />}
        {tab === "me" && <MeScreen me={me} />}
      </main>
    </>
  );
}
