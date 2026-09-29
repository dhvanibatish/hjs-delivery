// ============================================================
// HJS Physio Desk — leads → doctor → schedule → complete → ongoing
// Chalao: physio-supabase-schema.sql (physio_doctors / physio_patients / physio_sessions)
// Route: ?physio
// ============================================================
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

/* Same project as Deliveries / Pickups / Complaints (App.tsx CONFIG).
   Attendance ka env-var wala project alag hai — physio tables yahan hain. */
const URL_ = "https://idcmfebqizovivuvsuns.supabase.co";
const KEY_ =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY21mZWJxaXpvdml2dXZzdW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NDgxODgsImV4cCI6MjA5OTMyNDE4OH0.miXziOcl5sEo8S6K1WsrHRhCbtEYRgnnUA4gAISUkmM";

const supabase = createClient(URL_, KEY_, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "hjs-physio" },
});

/* ========================= types ========================= */
type Routine =
  | { type: "daily" }
  | { type: "days"; days: number[] }
  | { type: "week"; perWeek: number };

type FollowUp = { date: string; note: string };
type Skip = { date: string; reason: string; note: string };

type Doctor = { id: string; name: string; active: boolean };

type Therapy = { id: string; name: string; grp: string | null; sort_order: number; active: boolean };

type Patient = {
  id: string;
  name: string;
  phone: string | null;
  ailment: string | null;
  source: string | null;
  status: "new" | "ongoing" | "done" | "cancelled";
  doctor_id: string | null;
  routine: Routine | null;
  start_date: string | null;
  usual_time: string | null;
  next_follow_up: string | null;
  follow_ups: FollowUp[] | null;
  skips: Skip[] | null;
  cancel_reason: string | null;
  cancel_note: string | null;
  notes: string | null;
  created_at: string;
};

type Session = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  session_date: string;
  session_time: string;
  seq: number | null;
  status: "scheduled" | "completed" | "cancelled";
  cancel_reason: string | null;
  cancel_note: string | null;
  therapies: string[] | null;
  therapy_note: string | null;
};

/* ========================= helpers ========================= */
// Bigin yahan se hata diya — wo source sirf n8n ke bharose aata hai, haath se nahi.
const SOURCES = ["Walk-in", "Existing customer", "Customer referral"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s: string, n: number) => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
const todayS = () => ymd(new Date());
const nice = (s: string) =>
  parseYmd(s).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "--");
const daysBetween = (a: string, b: string) =>
  Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000);
const createdDay = (p: Patient) => (p.created_at ? ymd(new Date(p.created_at)) : todayS());
const srcCls = (s: string | null) =>
  s === "Walk-in" ? "walk" : s === "Existing customer" ? "exist" : s === "Customer referral" ? "ref" : "bigin";

const GRP_CLS: Record<string, string> = {
  Core: "g1", Laser: "g2", Needling: "g3", Cupping: "g4",
  IASTM: "g5", Machines: "g6", Supplementary: "g7",
};
const grpKey = (g: string) => GRP_CLS[g] || "g7";

const routineLabel = (r: Routine | null) => {
  if (!r) return "Not set";
  if (r.type === "daily") return "Daily";
  if (r.type === "days") return (r.days || []).map((i) => DOW[i]).join(", ") || "Days not set";
  return `${r.perWeek || 1}x / week`;
};
const dueOn = (p: Patient, date: string) => {
  const r = p.routine || ({ type: "daily" } as Routine);
  if (r.type === "daily") return true;
  if (r.type === "days") return (r.days || []).includes(parseYmd(date).getDay());
  return false;
};

/* ========================= styles ========================= */
const CSS = `
.hjsp, .hjsp * { box-sizing: border-box; margin: 0; padding: 0; }
.hjsp {
  --bg:#EDF2F0; --panel:#fff; --ink:#16302B; --muted:#5E736E; --line:#D5E0DC;
  --green:#1F7A5C; --green-soft:#DCEFE7; --amber:#B7791F; --amber-soft:#FBEFD9;
  --red:#B4233C; --red-soft:#F8E1E5; --blue:#2A5DA8; --blue-soft:#E1EAF7;
  --plum:#6B4E9B; --plum-soft:#ECE6F5;
  position:fixed; inset:0; overflow:auto; background:var(--bg); color:var(--ink);
  color-scheme:light; text-align:left;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  font-size:15px; line-height:1.5; -webkit-font-smoothing:antialiased;
}
.hjsp h1,.hjsp h2,.hjsp h3,.hjsp b,.hjsp span,.hjsp div,.hjsp td,.hjsp th { color:inherit; text-align:left; }
.hjsp button { font:inherit; cursor:pointer; border:0; background:transparent; color:inherit; text-align:left; }
.hjsp input,.hjsp select,.hjsp textarea {
  font-family:inherit; font-size:15px; width:100%; padding:9px 11px;
  border:1px solid var(--line); border-radius:10px; background:#fff; color:var(--ink);
  outline:none; -webkit-appearance:none; appearance:none; min-height:40px; }
.hjsp select { padding-right:30px;
  background-image:linear-gradient(45deg,transparent 50%,var(--muted) 50%),linear-gradient(135deg,var(--muted) 50%,transparent 50%);
  background-position:calc(100% - 17px) 18px,calc(100% - 12px) 18px; background-size:5px 5px; background-repeat:no-repeat; }
.hjsp input[type=checkbox]{ -webkit-appearance:checkbox; appearance:checkbox; width:17px;height:17px;min-height:0;accent-color:var(--green); }
.hjsp header { position:sticky; top:0; z-index:5; background:var(--bg); border-bottom:1px solid var(--line); }
.hjsp .bar { max-width:1240px; margin:0 auto; padding:14px 18px; display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
.hjsp .brand { font-weight:800; font-size:20px; letter-spacing:-.02em; margin-right:auto; }
.hjsp .brand small { display:block; font-weight:500; font-size:12px; color:var(--muted); }
.hjsp nav { display:flex; gap:4px; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:4px; }
.hjsp nav button { padding:7px 14px; border-radius:9px; font-weight:600; color:var(--muted); white-space:nowrap; }
.hjsp nav button.on { background:var(--green); color:#fff; }
.hjsp main { max-width:1240px; margin:0 auto; padding:18px; }
.hjsp .btn { border:1px solid var(--line); background:var(--panel); padding:8px 14px; border-radius:10px; font-weight:600; white-space:nowrap; }
.hjsp .btn:hover { border-color:var(--green); }
.hjsp .btn.pri { background:var(--green); border-color:var(--green); color:#fff; }
.hjsp .btn.sm { padding:4px 10px; font-size:13px; border-radius:8px; }
.hjsp .btn.ghost { background:transparent; }
.hjsp .btn.danger { color:var(--red); border-color:var(--red); }
.hjsp .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-bottom:18px; }
.hjsp .stat { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:12px 14px; }
.hjsp .stat .n { font-size:28px; font-weight:800; letter-spacing:-.03em; }
.hjsp .stat .l { font-size:13px; color:var(--muted); }
.hjsp .stat.click { cursor:pointer; }
.hjsp .stat.on { border-color:var(--green); box-shadow:inset 0 0 0 1px var(--green); }
.hjsp .tools { display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; align-items:center; }
.hjsp .tools input, .hjsp .tools select { width:auto; min-width:180px; flex:0 1 auto; }
.hjsp .dayhead { display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
.hjsp .dayhead .d { font-size:24px; font-weight:800; letter-spacing:-.03em; margin-right:auto; }
.hjsp .tbl { overflow-x:auto; background:var(--panel); border:1px solid var(--line); border-radius:14px; }
.hjsp table { width:100%; border-collapse:collapse; font-size:14px; }
.hjsp th,.hjsp td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); white-space:nowrap; vertical-align:top; }
.hjsp th { font-size:12px; color:var(--muted); font-weight:700; }
.hjsp tr:last-child td { border-bottom:0; }
.hjsp .hint { font-size:12px; color:var(--muted); }
.hjsp .pill { display:inline-block; font-size:12px; font-weight:700; padding:2px 8px; border-radius:99px; background:var(--line); }
.hjsp .pill.bigin { background:var(--blue-soft); color:var(--blue); }
.hjsp .pill.walk { background:var(--amber-soft); color:var(--amber); }
.hjsp .pill.exist { background:var(--green-soft); color:var(--green); }
.hjsp .pill.ref { background:var(--plum-soft); color:var(--plum); }
.hjsp .pill.scheduled { background:var(--amber-soft); color:var(--amber); }
.hjsp .pill.completed { background:var(--green-soft); color:var(--green); }
.hjsp .pill.ongoing { background:var(--green-soft); color:var(--green); }
.hjsp .rt { font-size:12px; font-weight:700; padding:2px 8px; border-radius:99px; background:var(--blue-soft); color:var(--blue); }
.hjsp .tag.fu { font-size:12px; font-weight:700; padding:2px 8px; border-radius:99px; background:var(--red-soft); color:var(--red); }
.hjsp .step { display:inline-block; padding:7px 12px; border-radius:10px; font-size:13px; font-weight:700;
  border:1px solid transparent; max-width:100%; width:auto; min-height:0; }
.hjsp .step.ok { background:var(--green-soft); color:var(--green); border-color:var(--green); }
.hjsp .step.no { background:var(--red-soft); color:var(--red); border-color:var(--red); }
.hjsp .step.off { opacity:.65; font-weight:600; }
.hjsp select.step { padding-right:26px;
  background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);
  background-position:calc(100% - 15px) 16px,calc(100% - 10px) 16px; background-size:5px 5px; background-repeat:no-repeat; }
.hjsp td.arw,.hjsp th.arw { padding:0 6px; width:70px; text-align:center; }
.hjsp td.arw span { display:inline-block; font-weight:900; font-size:46px; line-height:.8; opacity:.28; }
.hjsp td.arw span.on { color:var(--green); opacity:1; }
.hjsp .dtabs { display:flex; gap:8px; overflow-x:auto; padding:2px 0 10px; margin-bottom:6px; }
.hjsp .dtab { flex:0 0 auto; border:1px solid var(--line); background:var(--panel); border-radius:99px;
  padding:7px 14px; font-weight:600; white-space:nowrap; }
.hjsp .dtab.on { background:var(--green); border-color:var(--green); color:#fff; }
.hjsp .dtab em { font-style:normal; margin-left:6px; background:var(--bg); color:var(--muted); border-radius:99px; padding:0 8px; font-size:12px; }
.hjsp .dtab.on em { background:rgba(255,255,255,.25); color:#fff; }
.hjsp .cols { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px; }
.hjsp .col { background:var(--panel); border:1px solid var(--line); border-radius:14px; overflow:hidden; }
.hjsp .col h3 { margin:0; padding:10px 14px; font-size:15px; display:flex; justify-content:space-between;
  align-items:center; border-bottom:1px solid var(--line); }
.hjsp .col h3 em { font-style:normal; font-size:12px; font-weight:600; color:var(--muted); }
.hjsp .slot { padding:10px 14px; border-bottom:1px solid var(--line); display:grid; grid-template-columns:52px 1fr; gap:8px; }
.hjsp .slot:last-child { border-bottom:0; }
.hjsp .slot .t { font-weight:700; font-size:13px; color:var(--muted); }
.hjsp .acts { display:flex; gap:6px; margin-top:6px; flex-wrap:wrap; }
.hjsp .empty { padding:18px 14px; color:var(--muted); font-size:14px; }
.hjsp .panel { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:10px 14px; margin-bottom:14px; }
.hjsp .drow { display:flex; gap:10px; align-items:center; flex-wrap:wrap; padding:5px 0; }
.hjsp .lnk { font-weight:700; text-decoration:underline; text-decoration-color:var(--line); padding:0; }
.hjsp .lnk:hover { color:var(--green); }
.hjsp .cnum { padding:4px 10px; border-radius:8px; min-width:36px; }
.hjsp .cnum:hover { background:var(--green-soft); color:var(--green); }
.hjsp .cnum.on { background:var(--green); color:#fff; }
.hjsp .dpick { display:grid; gap:8px; margin-bottom:10px; max-height:44vh; overflow:auto; }
.hjsp .dopt { display:flex; gap:10px; align-items:center; border:1px solid var(--line); border-radius:12px;
  padding:10px 12px; background:var(--bg); width:100%; }
.hjsp .dopt.on { border-color:var(--green); box-shadow:inset 0 0 0 1px var(--green); }
.hjsp .dopt b { margin-right:auto; }
.hjsp .tag { font-size:12px; font-weight:700; padding:2px 8px; border-radius:99px; background:var(--line); }
.hjsp .tag.load { background:var(--amber-soft); color:var(--amber); }
.hjsp .tag.free { background:var(--green-soft); color:var(--green); }
.hjsp .ovl { position:fixed; inset:0; background:rgba(10,25,20,.45); display:flex; align-items:center;
  justify-content:center; padding:16px; z-index:40; }
.hjsp .dlg { background:var(--panel); border-radius:16px; width:min(540px,96vw); max-height:92vh; overflow:auto;
  padding:18px 20px; box-shadow:0 20px 60px rgba(0,0,0,.25); }
.hjsp .dlg h3 { font-size:18px; margin-bottom:12px; }
.hjsp .f { display:grid; gap:4px; margin-bottom:10px; }
.hjsp .f label { font-size:13px; font-weight:600; color:var(--muted); }
.hjsp .row2 { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.hjsp .end { display:flex; justify-content:flex-end; gap:8px; margin-top:14px; flex-wrap:wrap; }
.hjsp .days { display:flex; gap:6px; flex-wrap:wrap; }
.hjsp .days label { display:flex; gap:5px; align-items:center; font-size:13px; border:1px solid var(--line);
  padding:5px 9px; border-radius:8px; font-weight:500; color:var(--ink); }
.hjsp .days input { width:auto; }
.hjsp .tbtn { display:flex; align-items:center; gap:8px; width:100%; padding:9px 11px; border:1px solid var(--line);
  border-radius:10px; background:var(--bg); font-weight:600; }
.hjsp .tbtn i { margin-left:auto; font-style:normal; color:var(--muted); transition:transform .15s; }
.hjsp .tbtn.open i { transform:rotate(180deg); }
.hjsp .tdrop { border:1px solid var(--line); border-radius:12px; padding:6px; margin-top:6px; background:var(--panel); }
.hjsp .tsearch { width:100%; margin-bottom:6px; min-height:38px; }
.hjsp .tlist { max-height:34vh; overflow:auto; }
.hjsp .tgrp { font-size:11px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; padding:8px 8px 4px; }
.hjsp .topt { display:flex; align-items:center; gap:9px; width:100%; padding:8px 10px; border-radius:9px; font-size:14px; margin-bottom:2px; }
.hjsp .topt i { width:15px; height:15px; border-radius:5px; border:1.5px solid currentColor; opacity:.5; flex:0 0 auto; }
.hjsp .topt.on i { opacity:1; background:currentColor; box-shadow:inset 0 0 0 2px var(--panel); }
.hjsp .topt.on { font-weight:700; }
.hjsp .chips { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 10px; }
.hjsp .chip { display:inline-flex; align-items:center; gap:6px; border:1px solid currentColor; border-radius:99px;
  padding:4px 6px 4px 10px; font-size:13px; font-weight:600; }
.hjsp .chip button { border:0; background:none; color:inherit; font-size:16px; line-height:1; padding:0 2px; font-weight:700; }
.hjsp .g1,.hjsp .topt.g1{color:var(--green)} .hjsp .chip.g1{background:var(--green-soft)} .hjsp .topt.g1:hover{background:var(--green-soft)}
.hjsp .g2,.hjsp .topt.g2{color:var(--amber)} .hjsp .chip.g2{background:var(--amber-soft)} .hjsp .topt.g2:hover{background:var(--amber-soft)}
.hjsp .g3,.hjsp .topt.g3{color:var(--plum)}  .hjsp .chip.g3{background:var(--plum-soft)}  .hjsp .topt.g3:hover{background:var(--plum-soft)}
.hjsp .g4,.hjsp .topt.g4{color:var(--red)}   .hjsp .chip.g4{background:var(--red-soft)}   .hjsp .topt.g4:hover{background:var(--red-soft)}
.hjsp .g5,.hjsp .topt.g5{color:var(--blue)}  .hjsp .chip.g5{background:var(--blue-soft)}  .hjsp .topt.g5:hover{background:var(--blue-soft)}
.hjsp .g6,.hjsp .topt.g6{color:#0F766E}      .hjsp .chip.g6{background:#D7F0EC}           .hjsp .topt.g6:hover{background:#D7F0EC}
.hjsp .g7,.hjsp .topt.g7{color:var(--muted)} .hjsp .chip.g7{background:var(--line)}        .hjsp .topt.g7:hover{background:var(--line)}
.hjsp .thl { font-size:12px; color:var(--muted); }
.hjsp .toast { position:fixed; left:50%; bottom:22px; transform:translateX(-50%); background:var(--ink);
  color:#fff; padding:10px 16px; border-radius:10px; font-weight:600; z-index:60; }
@media (max-width:640px){ .hjsp .row2 { grid-template-columns:1fr; } .hjsp nav { width:100%; overflow-x:auto; } }
`;

/* ========================= component ========================= */
export default function Physio() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [view, setView] = useState<"leads" | "ongoing" | "board" | "doctors" | "patient" | "doctor">("leads");
  const [q, setQ] = useState("");
  const [day, setDay] = useState(todayS());
  const [showCx, setShowCx] = useState(false);
  const [oFilt, setOFilt] = useState<"all" | "due" | "today" | "fu">("all");
  const [oDoc, setODoc] = useState("");
  const [dSel, setDSel] = useState("");
  const [dFilt, setDFilt] = useState("all");
  const [dDoc, setDDoc] = useState("");
  const [ptId, setPtId] = useState("");
  const [docId, setDocId] = useState("");
  const [dlg, setDlg] = useState<React.ReactNode>(null);

  const toast = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(""), 2400);
  };

  /* ---------- load ---------- */
  const load = async () => {
    const [d, p, s, t] = await Promise.all([
      supabase.from("physio_doctors").select("*").order("name"),
      supabase.from("physio_patients").select("*").order("created_at", { ascending: false }),
      supabase.from("physio_sessions").select("*").order("session_date"),
      supabase.from("physio_therapies").select("*").eq("active", true).order("sort_order"),
    ]);
    if (d.error || p.error || s.error) {
      toast("Load failed — check Supabase tables / grants");
      // eslint-disable-next-line no-console
      console.error(d.error || p.error || s.error);
    }
    setDoctors((d.data as Doctor[]) || []);
    setPatients((p.data as Patient[]) || []);
    setSessions((s.data as Session[]) || []);
    setTherapies((t.data as Therapy[]) || []);
    setLoading(false);
  };
  useEffect(() => {
    load();
    const ch = supabase
      .channel("physio-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "physio_patients" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "physio_sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "physio_doctors" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- derived ---------- */
  const T = todayS();
  const grpCls = (n: string) => grpKey(therapies.find((t) => t.name === n)?.grp || "");
  const activeDocs = useMemo(() => doctors.filter((d) => d.active !== false), [doctors]);
  const doc = (id: string | null) => doctors.find((d) => d.id === id);
  const pat = (id: string) => patients.find((p) => p.id === id);
  const liveS = useMemo(() => sessions.filter((s) => s.status !== "cancelled"), [sessions]);
  const sessOf = (pid: string) =>
    liveS
      .filter((s) => s.patient_id === pid)
      .sort((a, b) => (a.session_date + a.session_time).localeCompare(b.session_date + b.session_time));
  const loadOn = (did: string, date: string) =>
    liveS.filter((s) => s.doctor_id === did && s.session_date === date).length;
  const isNew = (p: Patient) => p.status === "new";
  const isOngoing = (p: Patient) => p.status === "ongoing";
  const ongoingOf = (did: string) => patients.filter((p) => isOngoing(p) && p.doctor_id === did);
  const skipOf = (p: Patient, date: string) => (p.skips || []).find((s) => s.date === date);

  const progress = (p: Patient) => {
    const ss = sessOf(p.id);
    return {
      done: ss.filter((s) => s.status === "completed").length,
      next: ss.find((s) => s.status === "scheduled" && s.session_date >= T),
      today: ss.find((s) => s.session_date === T),
      last: ss.filter((s) => s.status === "completed").slice(-1)[0],
    };
  };
  const fuDue = (p: Patient) => {
    if (!isOngoing(p)) return false;
    if (p.next_follow_up && p.next_follow_up <= T) return true;
    const pr = progress(p);
    if (pr.next) return false;
    const ref = pr.last ? pr.last.session_date : p.start_date || createdDay(p);
    const gap = p.routine && p.routine.type === "daily" ? 2 : 8;
    return daysBetween(ref, T) >= gap;
  };
  const docStats = (d: Doctor) => {
    const mine = liveS.filter((s) => s.doctor_id === d.id);
    const on = ongoingOf(d.id);
    return {
      ongoing: on,
      leads: patients.filter((p) => isNew(p) && p.doctor_id === d.id),
      pend: mine.filter((s) => s.session_date === T && s.status === "scheduled"),
      done: mine.filter((s) => s.session_date === T && s.status === "completed"),
      today: mine.filter((s) => s.session_date === T),
      up: mine
        .filter((s) => s.status === "scheduled" && s.session_date > T)
        .sort((a, b) => (a.session_date + a.session_time).localeCompare(b.session_date + b.session_time)),
      fu: on.filter(fuDue),
      dueToday: on.filter((p) => dueOn(p, T) && !sessOf(p.id).some((s) => s.session_date === T)),
    };
  };

  /* ---------- writes ---------- */
  const run = async (fn: () => PromiseLike<{ error: unknown } | void>, ok?: string) => {
    const r = await fn();
    const err = r && (r as { error: unknown }).error;
    if (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast("Could not save");
      return false;
    }
    await load();
    if (ok) toast(ok);
    return true;
  };
  const updPatient = (id: string, data: Partial<Patient>, ok?: string) =>
    run(() => supabase.from("physio_patients").update(data).eq("id", id), ok);
  const updSession = (id: string, data: Partial<Session>, ok?: string) =>
    run(() => supabase.from("physio_sessions").update(data).eq("id", id), ok);

  const assignDoc = async (pid: string, did: string) => {
    if (did === "__new") {
      const name = (window.prompt("Doctor's name") || "").trim();
      if (!name) return;
      const { data, error } = await supabase.from("physio_doctors").insert({ name }).select().single();
      if (error) return toast("Could not save doctor");
      await updPatient(pid, { doctor_id: (data as Doctor).id }, `Assigned to ${name}`);
      return;
    }
    await updPatient(pid, { doctor_id: did || null }, did ? `Assigned to ${doc(did)?.name}` : "Doctor removed");
  };

  const addSession = async (pid: string, did: string | null, date: string, time: string) => {
    const seq = sessOf(pid).length + 1;
    return run(
      () =>
        supabase
          .from("physio_sessions")
          .insert({ patient_id: pid, doctor_id: did, session_date: date, session_time: time, seq }),
      `Booked · ${nice(date)} ${time}`
    );
  };

  const markSession = (s: Session, status: "completed" | "scheduled") => {
    if (status === "completed") {
      setDlg(<CompleteDlg s={s} />);
      return Promise.resolve(true);
    }
    return updSession(s.id, { status } as Partial<Session>, "Undone");
  };

  const endOngoing = async (p: Patient) => {
    if (!window.confirm(`End treatment for ${p.name}? Future booked sessions will be cancelled.`)) return;
    const ids = sessOf(p.id)
      .filter((s) => s.status === "scheduled" && s.session_date >= T)
      .map((s) => s.id);
    if (ids.length) await supabase.from("physio_sessions").update({ status: "cancelled" }).in("id", ids);
    await updPatient(p.id, { status: "done", ended_at: new Date().toISOString() } as Partial<Patient>,
      `${p.name} removed from ongoing`);
  };

  /* ========================= dialogs ========================= */
  const close = () => setDlg(null);

  const NewLead = () => {
    const [f, setF] = useState({ name: "", phone: "", source: "Walk-in", notes: "" });
    const save = async () => {
      if (!f.name.trim()) return toast("Enter a name");
      const phone = f.phone.replace(/\D/g, "").slice(-10);
      const dup = patients.find((p) => phone && p.phone === phone && p.status !== "done");
      if (dup && !window.confirm(`${dup.name} (${dup.phone}) is already in the list. Add anyway?`)) return;
      const okDone = await run(
        () =>
          supabase.from("physio_patients").insert({
            name: f.name.trim(),
            phone,
            source: f.source,
            notes: f.notes.trim(),
            status: "new",
          }),
        "Lead saved"
      );
      if (okDone) close();
    };
    return (
      <Modal title="New lead">
        <div className="row2">
          <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Mobile"><input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <Field label="Source">
          <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Notes"><textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn pri" onClick={save}>Save lead</button>
        </div>
      </Modal>
    );
  };

  const ScheduleDlg = ({ p }: { p: Patient }) => {
    const [date, setDate] = useState(T);
    const [time, setTime] = useState(hhmm(p.usual_time) === "--" ? "10:00" : hhmm(p.usual_time));
    const [did, setDid] = useState(p.doctor_id || "");
    const save = async () => {
      if (!did) return toast("Select a doctor");
      if (!date || !time) return toast("Pick a date and time");
      if (p.doctor_id !== did) await supabase.from("physio_patients").update({ doctor_id: did }).eq("id", p.id);
      const ok = await addSession(p.id, did, date, time);
      if (ok) close();
    };
    return (
      <Modal title={`Schedule · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          Session {progress(p).done + 1} · doctor {doc(p.doctor_id)?.name || "not set"}
        </p>
        <Field label="Doctor">
          <select value={did} onChange={(e) => setDid(e.target.value)}>
            <option value="">— Select doctor —</option>
            {activeDocs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — {loadOn(d.id, date)} booked, {ongoingOf(d.id).length} ongoing
              </option>
            ))}
          </select>
        </Field>
        <div className="row2">
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Time"><input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn pri" onClick={save}>Book session</button>
        </div>
      </Modal>
    );
  };

  const RescheduleDlg = ({ p }: { p: Patient }) => {
    const ss = sessOf(p.id);
    const s = ss.filter((x) => x.status === "scheduled").slice(-1)[0] || ss.slice(-1)[0];
    const [date, setDate] = useState(s?.session_date || T);
    const [time, setTime] = useState(hhmm(s?.session_time) === "--" ? "10:00" : hhmm(s?.session_time));
    const [why, setWhy] = useState("");
    if (!s) return null;
    const save = async () => {
      if (!date || !time) return toast("Pick a date and time");
      const ok = await updSession(
        s.id,
        { session_date: date, session_time: time, reschedule_note: why || null } as Partial<Session>,
        `Moved to ${nice(date)} ${time}`
      );
      if (ok) close();
    };
    return (
      <Modal title={`Reschedule · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          Currently {nice(s.session_date)} at {hhmm(s.session_time)} with {doc(s.doctor_id)?.name || "—"}
        </p>
        <div className="row2">
          <Field label="New date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="New time"><input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Field label="Reason (optional)"><input placeholder="Patient asked to shift…" value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn pri" onClick={save}>Save new date &amp; time</button>
        </div>
      </Modal>
    );
  };

  const CancelLeadDlg = ({ p }: { p: Patient }) => {
    const [why, setWhy] = useState("");
    const [note, setNote] = useState("");
    const save = async () => {
      if (!why) return toast("Select a reason");
      if (!note.trim()) return toast("Remarks are required");
      const ids = sessOf(p.id).filter((s) => s.status === "scheduled").map((s) => s.id);
      if (ids.length) await supabase.from("physio_sessions").update({ status: "cancelled" }).in("id", ids);
      const ok = await updPatient(
        p.id,
        { status: "cancelled", cancel_reason: why, cancel_note: note.trim(), cancelled_at: new Date().toISOString() } as Partial<Patient>,
        `Lead cancelled · ${why}`
      );
      if (ok) close();
    };
    return (
      <Modal title={`Cancel lead · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          Booked sessions will be cancelled and the lead leaves the list. A reason is required.
        </p>
        <Field label="Reason *">
          <select value={why} onChange={(e) => setWhy(e.target.value)}>
            <option value="">— Select a reason —</option>
            {["Price too high", "Went to another centre", "Distance / travel", "Not interested now",
              "Not reachable", "Wrong or duplicate lead", "Health / personal reason", "Other"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Remarks *"><textarea rows={2} placeholder="What exactly did they say?" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="end">
          <button className="btn" onClick={close}>Close</button>
          <button className="btn pri" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={save}>Cancel this lead</button>
        </div>
      </Modal>
    );
  };

  const OngoingDlg = ({ p, fresh }: { p?: Patient; fresh?: boolean }) => {
    const [pick, setPick] = useState<Patient | undefined>(p);
    const [search, setSearch] = useState("");
    const [f, setF] = useState({ name: "", phone: "", source: "Walk-in" });
    const [did, setDid] = useState(p?.doctor_id || "");
    const [rt, setRt] = useState<"daily" | "days" | "week">((p?.routine?.type as "daily") || "daily");
    const [days, setDays] = useState<number[]>(
      p?.routine && p.routine.type === "days" ? p.routine.days : [1, 3, 5]
    );
    const [date, setDate] = useState(T);
    const [time, setTime] = useState(hhmm(p?.usual_time || null) === "--" ? "10:00" : hhmm(p!.usual_time));

    const results = useMemo(() => {
      const s = search.trim().toLowerCase();
      let list = patients.filter((x) => !isOngoing(x) && x.status !== "cancelled" && x.status !== "done");
      if (s) list = list.filter((x) => `${x.name} ${x.phone || ""} ${x.ailment || ""}`.toLowerCase().includes(s));
      else list = list.filter((x) => isNew(x) && (createdDay(x) === T || createdDay(x) === addDays(T, -1)));
      return list.slice(0, 6);
    }, [search, patients]);

    const save = async () => {
      if (!did) return toast("Pick a doctor");
      const routine: Routine = rt === "daily" ? { type: "daily" } : rt === "days" ? { type: "days", days } : { type: "week", perWeek: 2 };
      let pid = pick?.id;
      if (!pid) {
        if (!f.name.trim()) return toast("Enter a name or pick a lead");
        const { data, error } = await supabase
          .from("physio_patients")
          .insert({ name: f.name.trim(), phone: f.phone.replace(/\D/g, "").slice(-10), source: f.source, status: "new" })
          .select()
          .single();
        if (error) return toast("Could not save");
        pid = (data as Patient).id;
      }
      const { error } = await supabase
        .from("physio_patients")
        .update({ doctor_id: did, status: "ongoing", routine, start_date: date, usual_time: time, next_follow_up: null })
        .eq("id", pid);
      if (error) return toast("Could not start treatment");
      await supabase.from("physio_sessions").insert({ patient_id: pid, doctor_id: did, session_date: date, session_time: time, seq: 1 });
      await load();
      toast(`Ongoing with ${doc(did)?.name} · ${routineLabel(routine)}`);
      close();
      setView("ongoing");
    };

    return (
      <Modal title={fresh ? "Add ongoing patient" : `Move to ongoing · ${p?.name}`}>
        {fresh && (
          <>
            <Field label="Search lead">
              <input placeholder="Name or mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Field>
            {pick ? (
              <div className="panel" style={{ marginBottom: 10 }}>
                <div className="drow">
                  <b>{pick.name}</b>
                  <span className="hint">{pick.phone}{pick.ailment ? ` · ${pick.ailment}` : ""}</span>
                  <button className="btn sm ghost" onClick={() => setPick(undefined)}>Change</button>
                </div>
              </div>
            ) : (
              <>
                <div className="dpick" style={{ maxHeight: "24vh" }}>
                  {results.length ? results.map((r) => (
                    <button key={r.id} className="dopt" onClick={() => setPick(r)}>
                      <b>{r.name}</b>
                      <span className="tag">{r.phone || "no number"}</span>
                      <span className="tag">{createdDay(r) === T ? "Today" : createdDay(r) === addDays(T, -1) ? "Yesterday" : nice(createdDay(r))}</span>
                    </button>
                  )) : <span className="hint">No match — type the details below instead.</span>}
                </div>
                <div className="row2">
                  <Field label="Name *"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
                  <Field label="Mobile"><input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
                </div>
                <Field label="Source">
                  <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
                    {SOURCES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </>
            )}
          </>
        )}
        <Field label="Doctor"><span /></Field>
        <div className="dpick">
          {activeDocs.map((d) => {
            const st = docStats(d);
            return (
              <button key={d.id} className={`dopt${did === d.id ? " on" : ""}`} onClick={() => setDid(d.id)}>
                <b>{d.name}</b>
                <span className="tag">{st.ongoing.length} ongoing</span>
                <span className={`tag ${loadOn(d.id, date) ? "load" : "free"}`}>{loadOn(d.id, date)} on {nice(date)}</span>
                <span className="tag">{st.up.length} upcoming</span>
              </button>
            );
          })}
        </div>
        <Field label="When do they come in?">
          <select value={rt} onChange={(e) => setRt(e.target.value as "daily")}>
            <option value="daily">Daily</option>
            <option value="days">Fixed days of the week</option>
            <option value="week">1-2 times a week (book manually)</option>
          </select>
        </Field>
        {rt === "days" && (
          <Field label="Which days">
            <div className="days">
              {DOW.map((n, i) => (
                <label key={n}>
                  <input type="checkbox" checked={days.includes(i)}
                    onChange={(e) => setDays(e.target.checked ? [...days, i].sort() : days.filter((x) => x !== i))} />
                  {n}
                </label>
              ))}
            </div>
          </Field>
        )}
        <div className="row2">
          <Field label="First session date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Time"><input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn pri" onClick={save}>Start ongoing</button>
        </div>
      </Modal>
    );
  };

  const ComingDlg = ({ p }: { p: Patient }) => {
    const [date, setDate] = useState(T);
    const [time, setTime] = useState(hhmm(p.usual_time) === "--" ? "10:00" : hhmm(p.usual_time));
    const [note, setNote] = useState("");
    const save = async () => {
      if (!date || !time) return toast("Pick a date and time");
      await supabase.from("physio_sessions").insert({
        patient_id: p.id, doctor_id: p.doctor_id, session_date: date, session_time: time, seq: sessOf(p.id).length + 1,
      });
      const skips = (p.skips || []).filter((s) => s.date !== date);
      const fu = note ? [...(p.follow_ups || []), { date: T, note: `Coming ${nice(date)} ${time} — ${note}` }].slice(-20) : p.follow_ups || [];
      await supabase.from("physio_patients").update({ skips, follow_ups: fu, usual_time: time }).eq("id", p.id);
      await load();
      toast(`Booked · ${nice(date)} ${time}`);
      close();
    };
    return (
      <Modal title={`Coming in · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          Doctor {doc(p.doctor_id)?.name || "—"} · {routineLabel(p.routine)}
        </p>
        <div className="row2">
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Time"><input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Field label="Remarks (optional)"><input placeholder="Said he will come at 5…" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="end">
          <button className="btn" onClick={close}>Close</button>
          <button className="btn pri" onClick={save}>Book this slot</button>
        </div>
      </Modal>
    );
  };

  const NotComingDlg = ({ p }: { p: Patient }) => {
    const [why, setWhy] = useState("");
    const [note, setNote] = useState("");
    const [next, setNext] = useState(addDays(T, 1));
    const save = async () => {
      if (!why) return toast("Select a reason");
      if (!note.trim()) return toast("Remarks are required");
      const ids = sessOf(p.id).filter((s) => s.session_date === T && s.status === "scheduled").map((s) => s.id);
      if (ids.length)
        await supabase.from("physio_sessions")
          .update({ status: "cancelled", cancel_reason: why, cancel_note: note.trim(), cancelled_at: new Date().toISOString() })
          .in("id", ids);
      const skips = [...(p.skips || []).filter((s) => s.date !== T), { date: T, reason: why, note: note.trim() }].slice(-60);
      const fu = [...(p.follow_ups || []), { date: T, note: `Not coming — ${why} — ${note.trim()}` }].slice(-20);
      await supabase.from("physio_patients").update({ skips, follow_ups: fu, next_follow_up: next || null }).eq("id", p.id);
      await load();
      toast(`Marked not coming · ${why}`);
      close();
    };
    return (
      <Modal title={`Not coming · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>Today&apos;s visit will be marked as skipped. A reason is required.</p>
        <Field label="Reason *">
          <select value={why} onChange={(e) => setWhy(e.target.value)}>
            <option value="">— Select a reason —</option>
            {["Not reachable", "Patient unwell", "Busy / out of town", "Says will come later",
              "Money / payment issue", "Stopping treatment", "Other"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Remarks *"><textarea rows={2} placeholder="What did they say?" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Field label="Next follow-up on"><input type="date" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <div className="end">
          <button className="btn" onClick={close}>Close</button>
          <button className="btn pri" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={save}>Mark not coming</button>
        </div>
      </Modal>
    );
  };

  const CompleteDlg = ({ s }: { s: Session }) => {
    const p = pat(s.patient_id);
    const [picked, setPicked] = useState<string[]>(s.therapies || []);
    const [note, setNote] = useState(s.therapy_note || "");
    const [open, setOpen] = useState(!(s.therapies || []).length);
    const [tq, setTq] = useState("");
    const boxRef = React.useRef<HTMLDivElement | null>(null);

    const groups = useMemo(() => {
      const q = tq.trim().toLowerCase();
      const g: Record<string, Therapy[]> = {};
      therapies
        .filter((t) => !q || t.name.toLowerCase().includes(q))
        .forEach((t) => { (g[t.grp || "Other"] ||= []).push(t); });
      return Object.entries(g);
    }, [tq]);

    useEffect(() => { if (open) boxRef.current?.scrollIntoView({ block: "nearest" }); }, [open]);

    const toggle = (n: string) =>
      setPicked((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));
    const takeFirst = () => {
      const first = groups[0]?.[1]?.[0];
      if (first) { toggle(first.name); setTq(""); }
    };
    const save = async () => {
      if (!picked.length) return toast("Pick at least one therapy");
      const ok = await updSession(
        s.id,
        { status: "completed", completed_at: new Date().toISOString(), therapies: picked, therapy_note: note.trim() || null } as Partial<Session>,
        "Session complete"
      );
      if (ok) close();
    };

    return (
      <Modal title={`Session complete · ${p?.name || ""}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          {nice(s.session_date)} at {hhmm(s.session_time)} · {doc(s.doctor_id)?.name || "—"}
        </p>
        {!therapies.length && (
          <p className="hint" style={{ marginBottom: 10, color: "var(--red)" }}>
            Therapy list is empty — run physio-therapies-migration.sql.
          </p>
        )}
        {picked.length ? (
          <div className="chips">
            {picked.map((n) => (
              <span className={`chip ${grpCls(n)}`} key={n}>
                {n}<button onClick={() => toggle(n)} aria-label="Remove">×</button>
              </span>
            ))}
          </div>
        ) : (
          <p className="hint" style={{ margin: "0 0 10px" }}>Nothing picked yet — choose at least one.</p>
        )}
        <div className="f">
          <label>What was done *</label>
          <button className={`tbtn${open ? " open" : ""}`} onClick={() => { setOpen(!open); setTq(""); }}>
            <span>{picked.length ? `${picked.length} selected · add more` : "Add therapy…"}</span><i>▾</i>
          </button>
          {open && (
            <div className="tdrop" ref={boxRef}>
              <input className="tsearch" autoFocus placeholder="Type to search… (tens, laser, cup)"
                value={tq} onChange={(e) => setTq(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); takeFirst(); } }} />
              <div className="tlist">
                {groups.length ? groups.map(([g, list]) => (
                  <React.Fragment key={g}>
                    <div className={`tgrp ${grpKey(g)}`}>{g}</div>
                    {list.map((t) => (
                      <button key={t.id} className={`topt ${grpKey(g)}${picked.includes(t.name) ? " on" : ""}`}
                        onClick={() => toggle(t.name)}><i />{t.name}</button>
                    ))}
                  </React.Fragment>
                )) : <p className="hint" style={{ padding: 10 }}>No match</p>}
              </div>
            </div>
          )}
        </div>
        <Field label="Notes (optional)">
          <input placeholder="Left knee, 15 min…" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn pri" onClick={save}>
            Mark complete{picked.length ? ` (${picked.length})` : ""}
          </button>
        </div>
      </Modal>
    );
  };

  const FollowUpDlg = ({ p }: { p: Patient }) => {
    const [note, setNote] = useState("");
    const [next, setNext] = useState(p.next_follow_up || addDays(T, 2));
    const [out, setOut] = useState("open");
    const log = [...(p.follow_ups || [])].reverse();
    const save = async () => {
      const fu = [...(p.follow_ups || []), { date: T, note: note.trim() }].slice(-20);
      await updPatient(p.id, { follow_ups: fu, next_follow_up: out === "end" ? null : next } as Partial<Patient>, "Follow-up saved");
      close();
      if (out === "book") setDlg(<ScheduleDlg p={p} />);
      if (out === "end") endOngoing(p);
    };
    return (
      <Modal title={`Follow-up · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          {p.phone} · doctor {doc(p.doctor_id)?.name || "—"} · {routineLabel(p.routine)}
        </p>
        <Field label="What happened on the call">
          <textarea rows={2} placeholder="Called, will come Friday…" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="row2">
          <Field label="Next follow-up on"><input type="date" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
          <Field label="Outcome">
            <select value={out} onChange={(e) => setOut(e.target.value)}>
              <option value="open">Still ongoing</option>
              <option value="book">Book next session now</option>
              <option value="end">Stop treatment</option>
            </select>
          </Field>
        </div>
        {!!log.length && (
          <Field label="History">
            <div className="panel" style={{ margin: 0, maxHeight: 140, overflow: "auto" }}>
              {log.map((f, i) => (
                <div className="drow" key={i}><b>{nice(f.date)}</b><span>{f.note || "(no note)"}</span></div>
              ))}
            </div>
          </Field>
        )}
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn pri" onClick={save}>Save follow-up</button>
        </div>
      </Modal>
    );
  };

  /* ========================= shared bits ========================= */
  const openPat = (id: string) => { setPtId(id); setView("patient"); };
  const openDocView = (id: string) => { setDocId(id); setView("doctor"); };

  const SlotRow = ({ s }: { s: Session }) => {
    const p = pat(s.patient_id);
    return (
      <div className="slot">
        <div className="t">{hhmm(s.session_time)}</div>
        <div>
          <div style={{ fontWeight: 600 }}>
            <button className="lnk" onClick={() => p && openPat(p.id)}>{p?.name || "(deleted)"}</button>{" "}
            <span className={`pill ${s.status}`}>{s.status === "scheduled" ? "pending" : s.status}</span>
          </div>
          <div className="hint">{p?.ailment ? `${p.ailment} · ` : ""}{routineLabel(p?.routine || null)}</div>
          {!!(s.therapies || []).length && <div className="thl">{(s.therapies || []).join(" · ")}</div>}
          <div className="acts">
            {s.status === "scheduled" ? (
              <>
                <button className="btn sm pri" onClick={() => markSession(s, "completed")}>Complete</button>
                <button className="btn sm" onClick={() => p && setDlg(<RescheduleDlg p={p} />)}>Move</button>
              </>
            ) : (
              <button className="btn sm ghost" onClick={() => markSession(s, "scheduled")}>Undo</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const SList = ({ arr, showDate, showDoctor }: { arr: Session[]; showDate?: boolean; showDoctor?: boolean }) => {
    if (!arr.length) return <div className="hint" style={{ padding: "6px 2px" }}>Nothing here</div>;
    return (
      <>
        {arr.map((s) => {
          const p = pat(s.patient_id);
          const d = doc(s.doctor_id);
          return (
            <div className="drow" key={s.id}>
              {showDate && <b>{nice(s.session_date)}</b>}
              <b>{hhmm(s.session_time)}</b>
              <button className="lnk" onClick={() => p && openPat(p.id)}>{p?.name || "(deleted)"}</button>
              {showDoctor && d && <span className="pill">{d.name}</span>}
              <span className="hint">{p?.phone}{p?.ailment ? ` · ${p.ailment}` : ""}</span>
              <span className={`pill ${s.status}`}>{s.status === "scheduled" ? "pending" : s.status}</span>
              {s.status === "scheduled" ? (
                <>
                  <button className="btn sm pri" onClick={() => markSession(s, "completed")}>Complete</button>
                  <button className="btn sm ghost" onClick={() => p && setDlg(<RescheduleDlg p={p} />)}>Move</button>
                </>
              ) : (
                <button className="btn sm ghost" onClick={() => markSession(s, "scheduled")}>Undo</button>
              )}
            </div>
          );
        })}
      </>
    );
  };

  const PList = ({ arr }: { arr: Patient[] }) => {
    if (!arr.length) return <div className="hint" style={{ padding: "6px 2px" }}>Nothing here</div>;
    return (
      <>
        {arr.map((p) => {
          const pr = progress(p);
          return (
            <div className="drow" key={p.id}>
              <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
              <span className="hint">{p.phone}{p.ailment ? ` · ${p.ailment}` : ""}</span>
              {isOngoing(p) ? (
                <>
                  <span className="rt">{routineLabel(p.routine)}</span>
                  <span className="pill">{pr.done} done</span>
                </>
              ) : (
                <>
                  <span className={`pill ${srcCls(p.source)}`}>{p.source}</span>
                  <span className="hint">{nice(createdDay(p))}</span>
                </>
              )}
              {isNew(p) ? (
                <button className="btn sm pri" onClick={() => setDlg(<OngoingDlg p={p} />)}>Ongoing</button>
              ) : pr.today && pr.today.status === "scheduled" ? (
                <button className="btn sm pri" onClick={() => markSession(pr.today!, "completed")}>Done</button>
              ) : (
                <button className="btn sm pri" onClick={() => setDlg(<ScheduleDlg p={p} />)}>Schedule</button>
              )}
            </div>
          );
        })}
      </>
    );
  };

  /* ========================= views ========================= */
  const LeadsView = () => {
    const leads = patients.filter(isNew);
    const todayOn = patients.filter((p) => isOngoing(p) && (sessOf(p.id).some((s) => s.session_date === T) || dueOn(p, T)));
    let rows = [...leads, ...todayOn];
    const s = q.trim().toLowerCase();
    if (s) rows = rows.filter((p) => `${p.name} ${p.phone || ""} ${p.ailment || ""}`.toLowerCase().includes(s));

    const cell = (p: Patient) => {
      const ss = sessOf(p.id);
      const on = isOngoing(p);
      const ts = ss.find((x) => x.session_date === T);
      const done = on ? (ts && ts.status === "completed" ? ts : undefined) : ss.find((x) => x.status === "completed");
      const booked = on
        ? ts && ts.status === "scheduled" ? ts : undefined
        : ss.filter((x) => x.status === "scheduled")[0];
      return { on, done, booked, slot: booked || done };
    };
    const noDoc = rows.filter((p) => !p.doctor_id).length;
    const noTime = rows.filter((p) => p.doctor_id && !cell(p).slot).length;
    const notDone = rows.filter((p) => cell(p).booked).length;
    const cx = patients.filter((p) => p.status === "cancelled");

    // Jitna kaam ho gaya, utna neeche. Fresh leads hamesha upar.
    // 0 = doctor nahi, 1 = doctor laga, 2 = time laga, 3 = session ho gaya
    const rank = (p: Patient) => {
      const c = cell(p);
      if (c.done) return 3;
      if (c.slot) return 2;
      return p.doctor_id ? 1 : 0;
    };
    rows = rows.sort((a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at));

    return (
      <>
        <div className="stats">
          <Stat n={leads.filter((p) => createdDay(p) === T).length} l="New leads today" />
          <Stat n={todayOn.length} l="Ongoing coming today" />
          <Stat n={noDoc} l="Doctor not assigned" />
          <Stat n={noTime} l="Time not scheduled" />
          <Stat n={notDone} l="Session not completed" />
          <Stat n={cx.length} l="Cancelled leads" on={showCx} onClick={() => setShowCx(!showCx)} />
        </div>
        <div className="tools">
          <input placeholder="Search name, mobile, ailment" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
        </div>
        {showCx && (
          <div className="panel">
            {cx.length ? cx.map((p) => (
              <div className="drow" key={p.id}>
                <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                <span className="hint">{p.phone}</span>
                <span className="tag fu">{p.cancel_reason}</span>
                <span className="hint">{p.cancel_note}</span>
                <button className="btn sm" onClick={() => updPatient(p.id, { status: "new" }, "Lead reopened")}>Reopen</button>
              </div>
            )) : <span className="hint">No cancelled leads</span>}
          </div>
        )}
        {!rows.length ? (
          <div className="stat"><span className="hint">Nothing for today. Use &quot;+ New lead&quot; to add one.</span></div>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>Patient</th><th>1 · Doctor assigned</th><th className="arw" /><th>2 · Date &amp; time</th>
                  <th className="arw" /><th>3 · Completed</th><th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const c = cell(p);
                  const hasDoc = !!p.doctor_id, hasTime = !!c.slot, hasDone = !!c.done;
                  const skip = skipOf(p, T);
                  return (
                    <tr key={p.id}>
                      <td>
                        <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                        <div className="hint">{p.phone}{p.ailment ? ` · ${p.ailment}` : ""}</div>
                        <div className="hint">
                          {c.on ? (<><span className="pill ongoing">Ongoing</span> <span className="rt">{routineLabel(p.routine)}</span></>)
                                : (<><span className={`pill ${srcCls(p.source)}`}>{p.source}</span> {nice(createdDay(p))}</>)}
                        </div>
                      </td>
                      <td>
                        <select className={`step ${hasDoc ? "ok" : "no"}`} value={p.doctor_id || ""}
                          onChange={(e) => assignDoc(p.id, e.target.value)}>
                          <option value="">Not assigned</option>
                          {activeDocs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                          <option value="__new">+ New doctor…</option>
                        </select>
                      </td>
                      <td className="arw"><span className={hasDoc ? "on" : ""}>→</span></td>
                      <td>
                        {hasTime ? (
                          <button className="step ok" onClick={() => setDlg(<RescheduleDlg p={p} />)}>
                            {nice(c.slot!.session_date)} · {hhmm(c.slot!.session_time)}
                          </button>
                        ) : c.on && skip ? (
                          <span className="step no off">Not coming · {skip.reason}</span>
                        ) : c.on ? (
                          <button className="step no" onClick={() => setDlg(<ComingDlg p={p} />)}>Set today&apos;s time</button>
                        ) : (
                          <button className="step no" onClick={() => setDlg(<ScheduleDlg p={p} />)}>Set date &amp; time</button>
                        )}
                      </td>
                      <td className="arw"><span className={hasTime ? "on" : ""}>→</span></td>
                      <td>
                        {hasDone ? (
                          <button className="step ok" onClick={() => markSession(c.done!, "scheduled")}>Completed ✓</button>
                        ) : c.booked ? (
                          <button className="step no" onClick={() => markSession(c.booked!, "completed")}>Mark complete</button>
                        ) : (
                          <span className="step no off">Waiting</span>
                        )}
                      </td>
                      <td>
                        {c.on ? (
                          c.booked ? <button className="btn sm ghost danger" onClick={() => setDlg(<NotComingDlg p={p} />)}>Cancel</button> : <span className="hint">—</span>
                        ) : (
                          <button className="btn sm ghost danger" onClick={() => setDlg(<CancelLeadDlg p={p} />)}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  const OngoingView = () => {
    const all = patients.filter(isOngoing);
    const dueCount = all.filter((p) => dueOn(p, T) && !sessOf(p.id).some((s) => s.session_date === T)).length;
    let list = all;
    if (oDoc) list = list.filter((p) => p.doctor_id === oDoc);
    if (oFilt === "due") list = list.filter((p) => dueOn(p, T) && !sessOf(p.id).some((s) => s.session_date === T));
    else if (oFilt === "today") list = list.filter((p) => sessOf(p.id).some((s) => s.session_date === T));
    else if (oFilt === "fu") list = list.filter(fuDue);

    return (
      <>
        <div className="stats">
          <Stat n={all.length} l="Ongoing patients" on={oFilt === "all"} onClick={() => setOFilt("all")} />
          <Stat n={dueCount} l="Due today, not booked" on={oFilt === "due"} onClick={() => setOFilt("due")} />
          <Stat n={all.filter((p) => sessOf(p.id).some((s) => s.session_date === T)).length} l="Booked today" on={oFilt === "today"} onClick={() => setOFilt("today")} />
          <Stat n={all.filter(fuDue).length} l="Follow-up needed" on={oFilt === "fu"} onClick={() => setOFilt("fu")} />
        </div>
        <div className="tools">
          <select value={oDoc} onChange={(e) => setODoc(e.target.value)}>
            <option value="">All doctors</option>
            {activeDocs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="btn pri" onClick={() => setDlg(<OngoingDlg fresh />)}>+ Ongoing patient</button>
          {oFilt !== "all" && <button className="btn ghost" onClick={() => setOFilt("all")}>Clear filter</button>}
        </div>
        {!all.length ? (
          <div className="stat"><span className="hint">No ongoing patients yet. Use &quot;+ Ongoing patient&quot; above.</span></div>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Patient</th><th>Doctor</th><th>Routine</th><th>Sessions</th><th>Last</th>
                  <th>Coming today?</th><th>Follow-up</th><th /></tr>
              </thead>
              <tbody>
                {list.sort((a, b) => Number(fuDue(b)) - Number(fuDue(a)) || a.name.localeCompare(b.name)).map((p) => {
                  const pr = progress(p);
                  const d = doc(p.doctor_id);
                  const skip = skipOf(p, T);
                  return (
                    <tr key={p.id}>
                      <td>
                        <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                        <div className="hint">{p.phone}{p.ailment ? ` · ${p.ailment}` : ""}</div>
                      </td>
                      <td>{d ? <button className="lnk" onClick={() => openDocView(d.id)}>{d.name}</button> : "—"}</td>
                      <td><span className="rt">{routineLabel(p.routine)}</span></td>
                      <td><b style={{ fontSize: 16 }}>{pr.done}</b> <span className="hint">done</span></td>
                      <td>{pr.last ? nice(pr.last.session_date) : "—"}</td>
                      <td>
                        {pr.today ? (
                          <span className="step ok">{hhmm(pr.today.session_time)} · {pr.today.status === "completed" ? "done" : "coming"}</span>
                        ) : skip ? (
                          <span className="tag fu">Not coming · {skip.reason}</span>
                        ) : (
                          <>
                            <button className="btn sm pri" onClick={() => setDlg(<ComingDlg p={p} />)}>Coming</button>{" "}
                            <button className="btn sm ghost danger" onClick={() => setDlg(<NotComingDlg p={p} />)}>Not coming</button>
                          </>
                        )}
                        {!pr.today && pr.next && <div className="hint">Next {nice(pr.next.session_date)} {hhmm(pr.next.session_time)}</div>}
                      </td>
                      <td>{fuDue(p) ? <span className="tag fu">Needed</span> : p.next_follow_up ? nice(p.next_follow_up) : "—"}</td>
                      <td>
                        {pr.today && pr.today.status === "scheduled"
                          ? <button className="btn sm pri" onClick={() => markSession(pr.today!, "completed")}>Done</button>
                          : <button className="btn sm" onClick={() => setDlg(<ScheduleDlg p={p} />)}>Schedule</button>}{" "}
                        <button className="btn sm ghost" onClick={() => setDlg(<FollowUpDlg p={p} />)}>Follow-up</button>{" "}
                        <button className="btn sm ghost" onClick={() => endOngoing(p)}>End</button>
                      </td>
                    </tr>
                  );
                })}
                {!list.length && <tr><td colSpan={8}><span className="hint">Nothing in this filter.</span></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  const BoardView = () => {
    const rows = activeDocs.map((d) => ({ d, st: docStats(d) }));
    const allOn = patients.filter(isOngoing);
    const allFu = allOn.filter(fuDue);
    const dayS = liveS.filter((s) => s.session_date === T);
    const pick = (id: string, filt: string) => {
      setDSel(dSel === id && dFilt === filt ? "" : id);
      setDFilt(filt);
    };
    const Num = ({ n, id, filt, strong }: { n: number; id: string; filt: string; strong?: boolean }) => (
      <button className={`cnum${dSel === id && dFilt === filt ? " on" : ""}`} onClick={() => pick(id, filt)}>
        {strong ? <b>{n}</b> : n}
      </button>
    );
    const listFor = (st: ReturnType<typeof docStats>) =>
      dFilt === "ongoing" ? <PList arr={st.ongoing} />
        : dFilt === "leads" ? <PList arr={st.leads} />
        : dFilt === "fu" ? <PList arr={st.fu} />
        : dFilt === "due" ? <PList arr={st.dueToday} />
        : dFilt === "upcoming" ? <SList arr={st.up} showDate />
        : <SList arr={(dFilt === "completed" ? st.done : st.pend).slice().sort((a, b) => a.session_time.localeCompare(b.session_time))} />;

    return (
      <>
        <div className="dayhead"><div className="d">Today, {nice(T)}</div></div>
        <div className="stats">
          <Stat n={allOn.length} l="Ongoing patients" on={dSel === "*" && dFilt === "ongoing"} onClick={() => pick("*", "ongoing")} />
          <Stat n={patients.filter(isNew).length} l="New leads" on={dSel === "*" && dFilt === "leads"} onClick={() => pick("*", "leads")} />
          <Stat n={dayS.filter((s) => s.status === "scheduled").length} l="Pending today" on={dSel === "*" && dFilt === "scheduled"} onClick={() => pick("*", "scheduled")} />
          <Stat n={dayS.filter((s) => s.status === "completed").length} l="Completed today" on={dSel === "*" && dFilt === "completed"} onClick={() => pick("*", "completed")} />
          <Stat n={allFu.length} l="Follow-ups needed" on={dSel === "*" && dFilt === "fu"} onClick={() => pick("*", "fu")} />
        </div>
        {dSel === "*" && (
          <div className="panel">
            {dFilt === "ongoing" ? <PList arr={allOn} />
              : dFilt === "leads" ? <PList arr={patients.filter(isNew)} />
              : dFilt === "fu" ? <PList arr={allFu} />
              : <SList arr={dayS.filter((s) => s.status === dFilt).sort((a, b) => a.session_time.localeCompare(b.session_time))} showDoctor />}
          </div>
        )}
        <p className="hint" style={{ marginBottom: 8 }}>Click a doctor&apos;s name for their full view. Every number opens its list.</p>
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Doctor</th><th>Ongoing</th><th>New leads</th><th>Due today</th><th>Pending</th>
                <th>Complete</th><th>Upcoming</th><th>Follow-up</th></tr>
            </thead>
            <tbody>
              {rows.sort((a, b) => b.st.ongoing.length - a.st.ongoing.length).map(({ d, st }) => (
                <React.Fragment key={d.id}>
                  <tr>
                    <td><button className="lnk" onClick={() => openDocView(d.id)}>{d.name}</button></td>
                    <td><Num n={st.ongoing.length} id={d.id} filt="ongoing" strong /></td>
                    <td><Num n={st.leads.length} id={d.id} filt="leads" /></td>
                    <td><Num n={st.dueToday.length} id={d.id} filt="due" /></td>
                    <td><Num n={st.pend.length} id={d.id} filt="scheduled" /></td>
                    <td><Num n={st.done.length} id={d.id} filt="completed" /></td>
                    <td><Num n={st.up.length} id={d.id} filt="upcoming" /></td>
                    <td><Num n={st.fu.length} id={d.id} filt="fu" /></td>
                  </tr>
                  {dSel === d.id && (
                    <tr><td colSpan={8} style={{ background: "var(--bg)" }}>{listFor(st)}</td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const DoctorsView = () => {
    if (!activeDocs.length) return <div className="stat"><span className="hint">No doctors yet.</span></div>;
    const cur = activeDocs.find((d) => d.id === dDoc) || activeDocs[0];
    const mine = liveS.filter((s) => s.doctor_id === cur.id && s.session_date === day)
      .sort((a, b) => a.session_time.localeCompare(b.session_time));
    const done = mine.filter((s) => s.status === "completed").length;
    return (
      <>
        <div className="dayhead">
          <div className="d">{day === T ? "Today, " : ""}{nice(day)}</div>
          <button className="btn sm" onClick={() => setDay(addDays(day, -1))}>‹ Prev</button>
          <button className="btn sm" onClick={() => setDay(T)}>Today</button>
          <button className="btn sm" onClick={() => setDay(addDays(day, 1))}>Next ›</button>
          <input type="date" className="btn sm" style={{ width: "auto" }} value={day} onChange={(e) => setDay(e.target.value || T)} />
        </div>
        <div className="dtabs">
          {activeDocs.map((d) => (
            <button key={d.id} className={`dtab${cur.id === d.id ? " on" : ""}`} onClick={() => setDDoc(d.id)}>
              {d.name}<em>{liveS.filter((s) => s.doctor_id === d.id && s.session_date === day).length}</em>
            </button>
          ))}
        </div>
        <div className="stats">
          <Stat n={mine.length} l="Booked this day" />
          <Stat n={done} l="Completed" />
          <Stat n={mine.length - done} l="Pending" />
        </div>
        <div className="cols">
          <div className="col">
            <h3><button className="lnk" onClick={() => openDocView(cur.id)}>{cur.name}</button><em>{done}/{mine.length} done</em></h3>
            {mine.length ? mine.map((s) => <SlotRow key={s.id} s={s} />) : <div className="empty">No sessions</div>}
          </div>
        </div>
      </>
    );
  };

  const DoctorView = () => {
    const d = doc(docId);
    if (!d) { setView("board"); return null; }
    const st = docStats(d);
    const dayS = liveS.filter((s) => s.doctor_id === d.id && s.session_date === day)
      .sort((a, b) => a.session_time.localeCompare(b.session_time));
    return (
      <>
        <div className="dayhead">
          <div className="d">{d.name}</div>
          <button className="btn sm" onClick={() => setView("board")}>‹ All doctors</button>
        </div>
        <div className="stats">
          <Stat n={st.ongoing.length} l="Ongoing patients" />
          <Stat n={st.dueToday.length} l="Due today, not booked" />
          <Stat n={st.pend.length} l="Pending today" />
          <Stat n={st.done.length} l="Completed today" />
          <Stat n={st.up.length} l="Upcoming" />
          <Stat n={st.fu.length} l="Follow-ups needed" />
        </div>
        <div className="dayhead" style={{ marginTop: 18 }}>
          <div className="d" style={{ fontSize: 18 }}>{day === T ? "Today · " : ""}{nice(day)}</div>
          <button className="btn sm" onClick={() => setDay(addDays(day, -1))}>‹ Prev</button>
          <button className="btn sm" onClick={() => setDay(T)}>Today</button>
          <button className="btn sm" onClick={() => setDay(addDays(day, 1))}>Next ›</button>
          <input type="date" className="btn sm" style={{ width: "auto" }} value={day} onChange={(e) => setDay(e.target.value || T)} />
        </div>
        <div className="cols">
          <div className="col">
            <h3>{d.name}<em>{dayS.filter((s) => s.status === "completed").length}/{dayS.length} done</em></h3>
            {dayS.length ? dayS.map((s) => <SlotRow key={s.id} s={s} />) : <div className="empty">No sessions this day</div>}
          </div>
        </div>
        <h2 style={{ margin: "18px 0 8px", fontSize: 18 }}>Ongoing patients</h2>
        <div className="panel"><PList arr={st.ongoing} /></div>
        {!!st.fu.length && (<><h2 style={{ margin: "18px 0 8px", fontSize: 18 }}>Follow-ups needed</h2><div className="panel"><PList arr={st.fu} /></div></>)}
        <h2 style={{ margin: "18px 0 8px", fontSize: 18 }}>Upcoming sessions</h2>
        <div className="panel"><SList arr={st.up} showDate /></div>
      </>
    );
  };

  const PatientView = () => {
    const p = pat(ptId);
    if (!p) { setView("leads"); return null; }
    const pr = progress(p);
    const d = doc(p.doctor_id);
    const ss = sessOf(p.id);
    const past = ss.filter((s) => s.session_date < T || s.status === "completed").slice().reverse();
    const next = ss.filter((s) => s.session_date >= T && s.status === "scheduled");
    const log = [...(p.follow_ups || [])].reverse();
    return (
      <>
        <div className="dayhead">
          <div className="d">{p.name}</div>
          <button className="btn sm" onClick={() => setView(isOngoing(p) ? "ongoing" : "leads")}>‹ Back</button>
        </div>
        <div className="tools">
          <span className={`pill ${srcCls(p.source)}`}>{p.source}</span>
          <span className="hint">{p.phone || "no number"}{p.ailment ? ` · ${p.ailment}` : ""}</span>
          {d ? <span className="hint">Doctor: <button className="lnk" onClick={() => openDocView(d.id)}>{d.name}</button></span>
             : <span className="hint">No doctor yet</span>}
          {isOngoing(p) ? <span className="rt">{routineLabel(p.routine)}</span>
            : <span className="pill">{isNew(p) ? "New lead" : p.status === "cancelled" ? "Cancelled" : "Finished"}</span>}
          {p.status === "cancelled" && (
            <>
              <span className="tag fu">{p.cancel_reason}</span>
              <span className="hint">{p.cancel_note}</span>
              <button className="btn sm" onClick={() => updPatient(p.id, { status: "new" }, "Lead reopened")}>Reopen lead</button>
            </>
          )}
        </div>
        <div className="stats">
          <Stat n={pr.done} l="Sessions done" />
          <StatT v={p.start_date ? nice(p.start_date) : "—"} l="Started" />
          <StatT v={pr.last ? nice(pr.last.session_date) : "—"} l="Last session" />
          <StatT v={pr.today ? hhmm(pr.today.session_time) : pr.next ? nice(pr.next.session_date) : "—"} l={pr.today ? "Today at" : "Next session"} />
          <StatT v={fuDue(p) ? "Due" : p.next_follow_up ? nice(p.next_follow_up) : "—"} l="Follow-up" />
        </div>
        <div className="tools">
          {pr.today && pr.today.status === "scheduled" && (
            <button className="btn pri" onClick={() => markSession(pr.today!, "completed")}>Mark today complete</button>
          )}
          <button className={`btn${pr.today ? "" : " pri"}`} onClick={() => setDlg(<ScheduleDlg p={p} />)}>Book a session</button>
          {isNew(p) && <button className="btn pri" onClick={() => setDlg(<OngoingDlg p={p} />)}>Ongoing</button>}
          <button className="btn" onClick={() => setDlg(<FollowUpDlg p={p} />)}>Log follow-up</button>
          {isOngoing(p) && <button className="btn ghost" onClick={() => endOngoing(p)}>End treatment</button>}
        </div>
        <h2 style={{ margin: "18px 0 8px", fontSize: 18 }}>Upcoming sessions</h2>
        <div className="panel"><SList arr={next} showDate showDoctor /></div>
        <h2 style={{ margin: "18px 0 8px", fontSize: 18 }}>Session history</h2>
        <div className="panel">
          {past.length ? past.map((s) => (
            <div className="drow" key={s.id}>
              <b>{nice(s.session_date)}</b>
              <span className="hint">{hhmm(s.session_time)}</span>
              {doc(s.doctor_id) && <span className="pill">{doc(s.doctor_id)!.name}</span>}
              <span className={`pill ${s.status}`}>{s.status === "scheduled" ? "missed / pending" : s.status}</span>
              {s.status === "scheduled" && <button className="btn sm ghost" onClick={() => markSession(s, "completed")}>Mark done</button>}
              {!!(s.therapies || []).length && (
                <span className="thl">{(s.therapies || []).join(" · ")}{s.therapy_note ? ` — ${s.therapy_note}` : ""}</span>
              )}
            </div>
          )) : <span className="hint">No sessions yet</span>}
        </div>
        <h2 style={{ margin: "18px 0 8px", fontSize: 18 }}>Follow-up history</h2>
        <div className="panel">
          {log.length ? log.map((f, i) => (
            <div className="drow" key={i}><b>{nice(f.date)}</b><span>{f.note || "(no note)"}</span></div>
          )) : <span className="hint">No follow-ups logged</span>}
        </div>
        {!!p.notes && (<><h2 style={{ margin: "18px 0 8px", fontSize: 18 }}>Notes</h2><div className="panel"><span>{p.notes}</span></div></>)}
      </>
    );
  };

  /* ========================= shell ========================= */
  const tab = (v: typeof view, label: string) => (
    <button className={view === v || (v === "board" && view === "doctor") || (v === "leads" && view === "patient") ? "on" : ""}
      onClick={() => { setView(v); setDSel(""); }}>{label}</button>
  );

  return (
    <div className="hjsp">
      <style>{CSS}</style>
      <header>
        <div className="bar">
          <div className="brand">HJS Physio Desk<small>{loading ? "Loading…" : `${patients.filter(isOngoing).length} ongoing · ${patients.filter(isNew).length} open leads`}</small></div>
          <nav>
            {tab("leads", "Leads")}
            {tab("ongoing", "Ongoing")}
            {tab("board", "Day view")}
            {tab("doctors", "Doctors")}
          </nav>
          <button className="btn pri" onClick={() => setDlg(<NewLead />)}>+ New lead</button>
        </div>
      </header>
      <main>
        {loading ? <div className="stat"><span className="hint">Loading…</span></div>
          : view === "leads" ? <LeadsView />
          : view === "ongoing" ? <OngoingView />
          : view === "board" ? <BoardView />
          : view === "doctors" ? <DoctorsView />
          : view === "doctor" ? <DoctorView />
          : <PatientView />}
      </main>
      {dlg}
      {!!msg && <div className="toast">{msg}</div>}
    </div>
  );

  /* ========================= tiny ui ========================= */
  function Modal({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <div className="ovl" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        <div className="dlg"><h3>{title}</h3>{children}</div>
      </div>
    );
  }
  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="f"><label>{label}</label>{children}</div>;
  }
  function Stat({ n, l, on, onClick }: { n: number; l: string; on?: boolean; onClick?: () => void }) {
    return (
      <div className={`stat${onClick ? " click" : ""}${on ? " on" : ""}`} onClick={onClick}>
        <div className="n">{n}</div><div className="l">{l}</div>
      </div>
    );
  }
  function StatT({ v, l }: { v: string; l: string }) {
    return <div className="stat"><div className="n" style={{ fontSize: 19 }}>{v}</div><div className="l">{l}</div></div>;
  }
}
