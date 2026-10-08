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
  | { type: "week"; perWeek: number }
  | { type: "alt" };   // ek din chhod ke (alternate days)

type FollowUp = { date: string; note: string };
type Skip = { date: string; reason: string; note: string };

type Doctor = { id: string; name: string; active: boolean };

/* Login — har doctor apne PIN se sirf apna dashboard dekhe, admin sab kuch.
   Physio admin ko poora desk dikhta hai aur roz ka kaam bhi kar sakta hai,
   bas do cheezein admin ke paas rehti hain: session count haath se theek karna
   aur kisi doctor ka dashboard uski tarah kholna.
   PIN code mein fixed hain — app se koi (admin bhi) badal nahi sakta. Badalna ho to yahin badlo. */
type Who = { role: "admin"; pin: string } | { role: "manager"; pin: string } | { role: "doctor"; id: string; pin: string };
const WHO_KEY = "hjs-physio-who";
const ADMIN_PIN = "9999";
const MANAGER_PIN = "0000";   // physio admin
// Naam ka hissa → PIN (naam "Dr. Sana" ho ya "Sana", dono chalega)
const DOC_PINS: [string, string][] = [
  ["sana", "1111"], ["sabrina", "2222"], ["arshnoor", "3333"], ["aditi", "4444"],
  ["anshu", "5555"], ["shubham", "6666"], ["vaibhav", "7777"], ["prabhjot", "8888"],
];
const pinOf = (d?: { name: string }) =>
  d ? DOC_PINS.find(([k]) => d.name.toLowerCase().includes(k))?.[1] || "" : "";
const readWho = (): Who | null => {
  try {
    const r = localStorage.getItem(WHO_KEY);
    return r ? (JSON.parse(r) as Who) : null;
  } catch {
    return null;
  }
};

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
  sessions_planned: number | null;   // kitne session liye — package
  done_adjust?: number | null;       // haath se count theek kiya (physio-desk-updates.sql)
  ended_at?: string | null;          // treatment kab band hua
  end_reason?: string | null;        // kyun band hua (physio-desk-updates.sql)
  end_note?: string | null;
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
  reschedule_note: string | null;
  place: "clinic" | "home" | null;
  completed_at: string | null;
};

/* Roster — doctor kis din chhutti par hai */
type Off = {
  id: string;
  doctor_id: string;
  off_date: string;
  kind: "off" | "leave";
  note: string | null;
};

/* Clinic manager ne kisi din ke liye patient doctor ko diya —
   woh doctor patient ko call karke poochta hai aa raha hai ya nahi, aur khud book karta hai */
type Assign = {
  id: string;
  patient_id: string;
  doctor_id: string;
  assign_date: string;
  status: "pending" | "coming" | "not_coming";
  note: string | null;
  session_id: string | null;
};

/* ========================= helpers ========================= */
// Bigin bhi haath se chun sakte hain — jab n8n se lead na aayi ho par Bigin mein ho
const SOURCES = ["Walk-in", "Bigin", "Existing customer", "Customer referral"];
const PACKS = [1, 3, 5, 6, 10];   // kitne session liye — is ke alawa Custom
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
/* Session kahan hui — clinic mein ya patient ke ghar. */
type Place = "clinic" | "home";
const placeLabel = (p: string | null) => (p === "home" ? "Home visit" : "At clinic");
const isHome = (s: { place?: string | null }) => s.place === "home";
// Hafta Monday se shuru
const weekStart = (d: string) => addDays(d, -((parseYmd(d).getDay() + 6) % 7));
const monthEdges = (d: string) => {
  const x = parseYmd(d);
  return [ymd(new Date(x.getFullYear(), x.getMonth(), 1)), ymd(new Date(x.getFullYear(), x.getMonth() + 1, 0))];
};
const srcCls = (s: string | null) =>
  s === "Walk-in" ? "walk" : s === "Existing customer" ? "exist" : s === "Customer referral" ? "ref" : "bigin";

const END_REASONS = [
  "Recovered / treatment complete", "Package sessions finished", "Feeling better, stopped on own",
  "Not improving", "Cost / payment issue", "Distance / travel", "Moved to another centre",
  "Health issue / hospitalised", "Not reachable", "Other",
];

const GRP_CLS: Record<string, string> = {
  Core: "g1", Laser: "g2", Needling: "g3", Cupping: "g4",
  IASTM: "g5", Machines: "g6", Supplementary: "g7",
};
const grpKey = (g: string) => GRP_CLS[g] || "g7";

const routineLabel = (r: Routine | null) => {
  if (!r) return "Not set";
  if (r.type === "daily") return "Daily";
  if (r.type === "days") return (r.days || []).map((i) => DOW[i]).join(", ") || "Days not set";
  if (r.type === "alt") return "Alternate days";
  return `${r.perWeek || 1}x / week`;
};
// last = pichhli session ki date (alternate days ke liye)
const dueOnBase = (p: Patient, date: string, last?: string) => {
  const r = p.routine || ({ type: "daily" } as Routine);
  if (r.type === "daily") return true;
  if (r.type === "days") return (r.days || []).includes(parseYmd(date).getDay());
  if (r.type === "alt") {
    // Pichhli session se 2 din baad — na ho to start date se ek-chhod-ek
    if (last) return daysBetween(last, date) >= 2;
    const start = p.start_date || (p.created_at ? ymd(new Date(p.created_at)) : date);
    return Math.abs(daysBetween(start, date)) % 2 === 0;
  }
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
/* Header ka "+ New lead" — baaki buttons se alag dikhe */
.hjsp .btn.newlead { background:var(--green); border-color:var(--green); color:#fff; font-weight:800;
  padding:9px 18px; box-shadow:0 2px 10px rgba(21,128,61,.35); margin-left:4px; }
.hjsp .btn.newlead:hover { filter:brightness(1.08); }
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
/* Pehla column (patient name) freeze — side scroll karne par bhi dikhe */
.hjsp .tbl th:first-child, .hjsp .tbl td:first-child { position:sticky; left:0; z-index:2; background:var(--panel);
  box-shadow:1px 0 0 var(--line); }
.hjsp .tbl thead th:first-child { z-index:3; }
/* Naam wala column patla — lamba ailment 2 line mein wrap, baaki "…" */
.hjsp .tbl td:first-child { width:220px; min-width:180px; max-width:240px; white-space:normal; }
.hjsp .tbl td:first-child .hint { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
  overflow:hidden; word-break:break-word; }
.hjsp .hint { font-size:12px; color:var(--muted); }
.hjsp .pill { display:inline-block; font-size:12px; font-weight:700; padding:2px 8px; border-radius:99px; background:var(--line); }
.hjsp .pill.bigin { background:var(--blue-soft); color:var(--blue); }
.hjsp .pill.home, .hjsp .tag.home { background:var(--plum-soft); color:var(--plum); }
.hjsp .pill.off { background:var(--plum-soft); color:var(--plum); }
.hjsp .pill.leave { background:var(--red-soft); color:var(--red); }
/* calendar: time rows x doctor columns */
.hjsp table.grid { min-width:680px; }
.hjsp table.grid th { white-space:nowrap; }
.hjsp table.grid td, .hjsp table.grid th { vertical-align:top; padding:4px 6px; }
.hjsp td.tcol, .hjsp th.tcol { width:62px; color:var(--muted); font-weight:700; font-size:12px; white-space:nowrap; }
.hjsp td.gcell { min-width:150px; }
.hjsp td.gcell.offd { background:repeating-linear-gradient(135deg,transparent,transparent 8px,var(--plum-soft) 8px,var(--plum-soft) 16px); }
.hjsp .blk { display:block; width:100%; text-align:left; border:1px solid var(--line); border-radius:10px;
  padding:6px 8px; margin-bottom:5px; cursor:pointer; font:inherit; font-size:13px; background:var(--panel); }
.hjsp .blk:last-child { margin-bottom:0; }
.hjsp .blk.scheduled { background:var(--amber-soft); color:var(--amber); border-color:var(--amber); }
.hjsp .blk.completed { background:var(--green-soft); color:var(--green); border-color:var(--green); }
.hjsp .blk b { display:block; }
.hjsp .blk span { display:block; font-weight:600; }
.hjsp .blk small { display:block; opacity:.85; font-size:11px; }
.hjsp .blk.warn { box-shadow:inset 0 0 0 2px var(--red); }
/* --- week calendar: ek hi tarah ki saaf lines, koi outline nahi --- */
.hjsp table.week { min-width:1060px; table-layout:fixed; border-collapse:collapse; }
.hjsp table.week th, .hjsp table.week td { border:0; border-right:1px solid var(--line); border-bottom:1px solid var(--line); }
.hjsp table.week tr > *:last-child { border-right:0; }
.hjsp table.week tbody tr:last-child > * { border-bottom:0; }
.hjsp table.week thead th { background:var(--bg); border-bottom:2px solid var(--line);
  padding:8px; font-size:12px; line-height:1.3; text-align:left; white-space:nowrap; }
.hjsp table.week thead th.today { color:var(--green); }
.hjsp table.week .tcol { width:82px; background:var(--bg); border-right:2px solid var(--line);
  text-align:center; padding:8px 6px; color:var(--ink); font-size:15px; font-weight:800; white-space:nowrap; }
.hjsp table.week td.gcell { padding:4px; vertical-align:top; height:54px; }
.hjsp table.week th.today, .hjsp table.week td.today { outline:0; background:var(--bg); }
/* naam column se bahar na nikle */
.hjsp table.week .blk { width:100%; margin-bottom:4px; overflow:hidden; }
.hjsp table.week .blk b, .hjsp table.week .blk span, .hjsp table.week .blk small {
  display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
/* roster */
.hjsp table.roster { min-width:820px; }
.hjsp .rcell { width:100%; border:1px solid var(--line); border-radius:10px; padding:6px 8px; min-height:46px;
  cursor:pointer; background:var(--panel); text-align:left; font:inherit; }
.hjsp .rcell:hover { border-color:var(--green); }
.hjsp .rcell .c { font-weight:800; font-size:15px; }
.hjsp .rcell .k { font-size:11px; color:var(--muted); }
.hjsp .rcell.off { background:var(--plum-soft); color:var(--plum); border-color:transparent; }
.hjsp .rcell.leave { background:var(--red-soft); color:var(--red); border-color:transparent; }
.hjsp .rcell.off .k, .hjsp .rcell.leave .k { color:inherit; }
.hjsp .rcell.clash { box-shadow:inset 0 0 0 2px var(--red); }
.hjsp th.today, .hjsp td.today { outline:2px solid var(--green); outline-offset:-2px; }
.hjsp .seg { display:flex; gap:6px; }
.hjsp .seg button { flex:1; padding:9px 11px; border:1px solid var(--line); border-radius:10px; background:var(--bg); font-weight:600; cursor:pointer; }
.hjsp .seg button.on { background:var(--green); border-color:var(--green); color:#fff; }
.hjsp .seg button.on.home { background:var(--plum); border-color:var(--plum); }
.hjsp .seg button.on.lv { background:var(--red); border-color:var(--red); }
.hjsp .offnow { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:12px; padding-top:12px; border-top:1px solid var(--line); }
.hjsp .tag.wk { background:var(--plum-soft); color:var(--plum); }
.hjsp .savedok { margin-top:10px; padding:10px 12px; border-radius:10px; background:var(--green-soft); color:var(--green); font-weight:700; }
.hjsp .btn:disabled { opacity:.5; cursor:default; }
.hjsp .seg.wrap { flex-wrap:wrap; }
.hjsp .seg.wrap button { flex:0 0 auto; min-width:52px; text-align:center; }
.hjsp .pill.walk { background:var(--amber-soft); color:var(--amber); }
.hjsp .pill.exist { background:var(--green-soft); color:var(--green); }
.hjsp .pill.ref { background:var(--plum-soft); color:var(--plum); }
.hjsp .pill.scheduled { background:var(--amber-soft); color:var(--amber); }
.hjsp .pill.completed { background:var(--green-soft); color:var(--green); }
.hjsp .pill.cancelled { background:var(--red-soft); color:var(--red); }
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
.hjsp td .acts { margin-top:0; }
.hjsp .empty { padding:18px 14px; color:var(--muted); font-size:14px; }
.hjsp .panel { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:10px 14px; margin-bottom:14px; }
.hjsp .drow { display:flex; gap:10px; align-items:center; flex-wrap:wrap; padding:5px 0; }
.hjsp .lnk { font-weight:700; text-decoration:underline; text-decoration-color:var(--line); padding:0; }
.hjsp .lnk:hover { color:var(--green); }
.hjsp button:disabled { opacity:.4; cursor:not-allowed; }
/* My report — pivot */
.hjsp .rpivot table { width:100%; }
.hjsp .rpivot th, .hjsp .rpivot td { padding:14px 16px; vertical-align:middle; }
.hjsp .rpivot th.c, .hjsp .rpivot td.c { text-align:center; }
.hjsp .rpivot td:first-child { font-weight:700; font-size:16px; white-space:nowrap; }
.hjsp .rpivot .tot { background:var(--bg); }
.hjsp .rdot { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:10px; vertical-align:middle; }
.hjsp .rdot.g { background:var(--green); } .hjsp .rdot.r { background:var(--red); } .hjsp .rdot.b { background:var(--blue); }
.hjsp .rdot.a { background:var(--amber); } .hjsp .rdot.p { background:var(--plum); }
.hjsp .cnum.big { font-size:20px; font-weight:800; min-width:52px; padding:6px 12px; font-variant-numeric:tabular-nums; }
.hjsp .cnum.big.zero { display:inline-block; color:var(--muted); font-weight:500; opacity:.5; }
.hjsp .cnum.big.r { color:var(--red); } .hjsp .cnum.big.a { color:var(--amber); }
.hjsp .cnum.big.on { color:#fff; }
/* My report — bade card */
.hjsp .rcards { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px; margin:14px 0 14px; }
.hjsp .rcard { display:flex; flex-direction:column; gap:6px; padding:20px 20px 16px; border-radius:16px;
  border:1px solid var(--line); background:var(--panel); min-height:150px; text-align:left;
  transition:transform .12s ease, box-shadow .12s ease; }
.hjsp .rcard:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(22,48,43,.08); }
.hjsp .rcard:disabled { opacity:1; cursor:default; }
.hjsp .rcard .rl { font-size:13px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); }
.hjsp .rcard .rn { font-size:48px; line-height:1; font-weight:800; font-variant-numeric:tabular-nums; margin-top:auto; }
.hjsp .rcard .rs { font-size:13px; color:var(--muted); }
.hjsp .rcard.g { background:var(--green-soft); border-color:transparent; } .hjsp .rcard.g .rn { color:var(--green); }
.hjsp .rcard.r { background:var(--red-soft); border-color:transparent; }   .hjsp .rcard.r .rn { color:var(--red); }
.hjsp .rcard.b { background:var(--blue-soft); border-color:transparent; }  .hjsp .rcard.b .rn { color:var(--blue); }
.hjsp .rcard.a { background:var(--amber-soft); border-color:transparent; } .hjsp .rcard.a .rn { color:var(--amber); }
.hjsp .rcard.p { background:var(--plum-soft); border-color:transparent; }  .hjsp .rcard.p .rn { color:var(--plum); }
.hjsp .rcard.on { border-color:currentColor; box-shadow:0 0 0 2px var(--ink) inset; }
.hjsp .rcard:disabled .rn { opacity:.45; }
.hjsp .rlist { padding:18px 20px; }
.hjsp .rlist h3 { display:flex; align-items:baseline; gap:10px; font-size:18px; margin-bottom:10px; }
.hjsp .rlist h3 em { font-style:normal; font-size:13px; color:var(--muted); font-weight:600; }
.hjsp .rgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:4px 24px; }
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
/* therapy usage — bar grid */
.hjsp .ubar { height:10px; border-radius:99px; background:var(--line); overflow:hidden; min-width:60px; }
.hjsp .ubar i { display:block; height:100%; border-radius:99px; background:currentColor; }
.hjsp td.ucell { width:40%; vertical-align:middle; }
.hjsp .unum { font-variant-numeric:tabular-nums; white-space:nowrap; }
.hjsp .tadd { display:block; width:100%; margin-top:6px; padding:9px 10px; border:1px dashed var(--green);
  border-radius:9px; color:var(--green); font-weight:700; text-align:center; background:var(--green-soft); }
.hjsp .tnew { display:flex; gap:6px; align-items:center; margin-top:6px; padding-top:6px; border-top:1px solid var(--line); }
.hjsp .tnew input { flex:1; min-width:0; min-height:36px; }
.hjsp .gsearch { position:relative; flex:0 1 300px; min-width:200px; }
.hjsp .gsearch input { min-height:38px; }
.hjsp .gres { position:absolute; top:calc(100% + 6px); left:0; right:0; min-width:300px; z-index:30; background:var(--panel);
  border:1px solid var(--line); border-radius:12px; box-shadow:0 12px 30px rgba(0,0,0,.15); padding:4px; max-height:60vh; overflow:auto; }
.hjsp .gres button { display:flex; flex-wrap:wrap; gap:4px 8px; align-items:center; width:100%; padding:8px 10px; border-radius:9px; }
.hjsp .gres button:hover, .hjsp .gres button.sel { background:var(--green-soft); }
.hjsp .gres button b { margin-right:auto; }
.hjsp table.mytoday td { vertical-align:middle; }
.hjsp table.mytoday tr.dim td { opacity:.7; }
.hjsp table.mytoday tr.dim td:first-child { opacity:1; }
.hjsp .thl { font-size:12px; color:var(--muted); }
.hjsp .pinpage { padding:18px 20px 22px; display:grid; gap:10px; justify-items:center; text-align:center; }
.hjsp .pinpage > .btn { justify-self:start; }
.hjsp .pinpage h2 { font-size:22px; letter-spacing:-.02em; text-align:center; }
.hjsp .pinbox { position:relative; display:flex; gap:12px; justify-content:center; margin:4px 0 6px; cursor:text; }
.hjsp .pinbox input { position:absolute; inset:0; opacity:0; min-height:0; }
.hjsp .pd { width:52px; height:58px; border:1.5px solid var(--line); border-radius:12px; background:var(--bg);
  display:flex; align-items:center; justify-content:center; font-size:20px; color:var(--green); }
.hjsp .pd.on { border-color:var(--green); background:var(--green-soft); }
.hjsp .pd.cur { border-color:var(--green); box-shadow:0 0 0 3px var(--green-soft); }
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
  const [offs, setOffs] = useState<Off[]>([]);
  const [assigns, setAssigns] = useState<Assign[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [view, setView] = useState<"leads" | "today" | "ongoing" | "board" | "doctors" | "cal" | "roster" | "therapy" | "patient" | "doctor"
    | "mytoday" | "myongoing" | "myreport">(() => (readWho()?.role === "doctor" ? "mytoday" : "today"));

  const [backTo, setBackTo] = useState<typeof view | "">("");   // patient/doctor page se Back kahan jaye

  /* ---------- login ---------- */
  const [who, setWhoS] = useState<Who | null>(readWho);
  const setWho = (w: Who | null) => {
    setWhoS(w);
    try {
      if (w) localStorage.setItem(WHO_KEY, JSON.stringify(w));
      else localStorage.removeItem(WHO_KEY);
    } catch { /* private window — bas is tab tak login */ }
  };
  const [loginAs, setLoginAs] = useState("");      // "admin" ya doctor id
  const [pinIn, setPinIn] = useState("");
  const [asDoc, setAsDoc] = useState("");          // admin kisi doctor ka dashboard dekh raha hai
  const [q, setQ] = useState("");
  const [gq, setGq] = useState("");   // upar wala patient search
  const [gi, setGi] = useState(0);    // arrow se kaunsa result chuna hai
  const [day, setDay] = useState(todayS());
  const [showCx, setShowCx] = useState(false);
  const [oFilt, setOFilt] = useState<"all" | "due" | "today" | "fu">("all");
  const [oDoc, setODoc] = useState("");
  const [dSel, setDSel] = useState("");
  const [tDoc, setTDoc] = useState("");   // Schedule for today — doctor filter
  const [tDay, setTDay] = useState(todayS());   // Schedule kis din ka — kal/parso bhi dekh sakte hain
  const [tTo, setTTo] = useState("");           // khali = ek din; bhara = 1 se 5 Oct wala range
  const [tFilt, setTFilt] = useState("");       // "" = sab | late = pending | soon = upcoming | done
  /* Page ki khali jagah par click = saare filter hat jaate hain.
     Button / input / table / tile ke andar click ho to kuch nahi hota. */
  useEffect(() => {
    const off = (ev: MouseEvent) => {
      const t = ev.target as HTMLElement | null;
      if (!t || t.closest("button, a, input, select, textarea, label, .tbl, .panel, .stat, .cols, .dtabs, .ovl, table")) return;
      setTFilt("");
      setOFilt("all");
      setDSel("");
      setShowCx(false);
    };
    document.addEventListener("click", off);
    return () => document.removeEventListener("click", off);
  }, []);
  const [lDay, setLDay] = useState(todayS());   // Sessions board kis din ka
  const [oDay, setODay] = useState(todayS());   // Ongoing patients kis din ka
  const [bDay, setBDay] = useState(todayS());   // Day view kis din ka
  // Therapy report: kaunsi therapy kitni chali
  const [myMonth, setMyMonth] = useState(todayS());   // doctor ki apni report — is mahine ki koi bhi tareekh = woh mahina
  const [myPvRow, setMyPvRow] = useState("");   // My report — kaunsi row ki list khuli
  const [thFrom, setThFrom] = useState(todayS());   // Reports khulte hi sirf aaj ka
  const [thTo, setThTo] = useState(todayS());
  const [repTab, setRepTab] = useState<"therapy" | "doctor" | "leads">("therapy");
  const [repSel, setRepSel] = useState("");   // Reports — kaunsa number khula ("doctorId|column")
  const [dFilt, setDFilt] = useState("all");
  const [dDoc, setDDoc] = useState("");
  // Day view: kitne din dikhane hain aur kis patient ka
  const [dRange, setDRange] = useState<"day" | "tom" | "month" | "custom">("day");
  const [dFrom, setDFrom] = useState(todayS());
  const [dTo, setDTo] = useState(todayS());
  const [dq, setDq] = useState("");
  const [ptId, setPtId] = useState("");
  const [docId, setDocId] = useState("");
  const [dlg, setDlg] = useState<React.ReactNode>(null);
  // Roaster: kaunsa doctor, kaunsa din chuna, aur har patient ke liye us din ka doctor + time
  const [rDoc, setRDoc] = useState("");
  const [rDay, setRDay] = useState(todayS());
  const [rPick, setRPick] = useState<Record<string, { did: string; time: string }>>({});
  // Week off / leave: pehle chuno (draft), phir Save — save hone par "Saved ✓" line dikhti rehti hai
  const [rKind, setRKind] = useState<"off" | "leave" | "">("");
  const [rNote, setRNote] = useState("");
  const [rRep, setRRep] = useState(0);
  const [rSaved, setRSaved] = useState("");
  const [rBusy, setRBusy] = useState(false);
  const rReset = () => { setRPick({}); setRKind(""); setRNote(""); setRRep(0); setRSaved(""); };

  const toast = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(""), 2400);
  };

  /* ---------- load ---------- */
  const load = async () => {
    const [d, p, s, t, o, a] = await Promise.all([
      supabase.from("physio_doctors").select("*").order("name"),
      supabase.from("physio_patients").select("*").order("created_at", { ascending: false }),
      supabase.from("physio_sessions").select("*").order("session_date"),
      supabase.from("physio_therapies").select("*").eq("active", true).order("sort_order"),
      supabase.from("physio_off").select("*"),
      supabase.from("physio_assign").select("*"),
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
    setOffs((o.data as Off[]) || []);
    setAssigns((a.data as Assign[]) || []);   // physio-assign.sql na chala ho to khali   // table na ho to khali — baaki app chalti rahegi
    setLoading(false);
  };
  useEffect(() => {
    load();
    const ch = supabase
      .channel("physio-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "physio_patients" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "physio_sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "physio_doctors" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "physio_off" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "physio_assign" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- derived ---------- */
  const T = todayS();
  // ghadi — har minute tick, taki "time nikal gaya" apne aap update hota rahe
  const [nowHM, setNowHM] = useState(() => new Date().toTimeString().slice(0, 5));
  useEffect(() => {
    const t = setInterval(() => setNowHM(new Date().toTimeString().slice(0, 5)), 30000);
    return () => clearInterval(t);
  }, []);
  /* Bahar kahin bhi click karo to upar wala search band ho jaye.
     Esc dabane par search aur khula hua dialog — dono hat jate hain. */
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el?.closest?.(".gsearch")) { setGq(""); setGi(0); }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setGq(""); setGi(0); setDlg(null);
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);

  /* Session ka time nikal chuka hai? Purana din = haan, aane wala din = nahi,
     aaj hai to tabhi jab ghadi us time se aage ja chuki ho. */
  const isLate = (s: Session) =>
    s.status === "scheduled" &&
    (s.session_date < T || (s.session_date === T && !!s.session_time && hhmm(s.session_time) <= nowHM));
  const grpCls = (n: string) => grpKey(therapies.find((t) => t.name === n)?.grp || "");
  const activeDocs = useMemo(() => doctors.filter((d) => d.active !== false), [doctors]);
  const doc = (id: string | null) => doctors.find((d) => d.id === id);
  const pat = (id: string) => patients.find((p) => p.id === id);
  const liveS = useMemo(() => sessions.filter((s) => s.status !== "cancelled"), [sessions]);
  const sessOf = (pid: string) =>
    liveS
      .filter((s) => s.patient_id === pid)
      .sort((a, b) => (a.session_date + a.session_time).localeCompare(b.session_date + b.session_time));
  const isNew = (p: Patient) => p.status === "new";
  const isOngoing = (p: Patient) => p.status === "ongoing";
  const ongoingOf = (did: string) => patients.filter((p) => isOngoing(p) && p.doctor_id === did);
  // Plan ho to "12/20", warna bas "12 done"
  const doneText = (p: Patient, n: number) =>
    p.sessions_planned ? `${n}/${p.sessions_planned}` : `${n} done`;
  const skipOf = (p: Patient, date: string) => (p.skips || []).find((s) => s.date === date);

  // Session data se gina hua count (haath wala sudhaar chhod ke)
  const autoDone = (p: Patient) => {
    const comp = sessOf(p.id).filter((s) => s.status === "completed");
    // Books se aaye patients ka asli count seq mein hai (jaise 12/20) — jo bada ho wahi
    return Math.max(comp.length, ...comp.map((s) => s.seq || 0));
  };
  const dueOn = (p: Patient, date: string) => {
    const last = sessOf(p.id).filter((s) => s.status !== "cancelled" && s.session_date < date).slice(-1)[0];
    return dueOnBase(p, date, last?.session_date);
  };
  const progress = (p: Patient) => {
    const ss = sessOf(p.id);
    return {
      // Haath se badla count (done_adjust) bhi jodo — aage ki sessions us par judti rahengi
      done: Math.max(0, autoDone(p) + (p.done_adjust || 0)),
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
    const gap = p.routine?.type === "daily" ? 2 : p.routine?.type === "alt" ? 3 : 8;
    return daysBetween(ref, T) >= gap;
  };
  // on = kis din ka hisaab chahiye (default aaj)
  const docStats = (d: Doctor, on_?: string) => {
    const D = on_ || T;
    const mine = liveS.filter((s) => s.doctor_id === d.id);
    const on = ongoingOf(d.id);
    return {
      ongoing: on,
      leads: patients.filter((p) => isNew(p) && p.doctor_id === d.id),
      pend: mine.filter((s) => s.session_date === D && s.status === "scheduled"),
      done: mine.filter((s) => s.session_date === D && s.status === "completed"),
      today: mine.filter((s) => s.session_date === D),
      up: mine
        .filter((s) => s.status === "scheduled" && s.session_date > D)
        .sort((a, b) => (a.session_date + a.session_time).localeCompare(b.session_date + b.session_time)),
      fu: on.filter(fuDue),
      dueToday: on.filter((p) => dueOn(p, D) && !sessOf(p.id).some((s) => s.session_date === D)),
    };
  };

  /* ---------- who is looking ---------- */
  const isAdmin = who?.role === "admin";
  const isManager = who?.role === "manager";
  // Doctor login ho to wahi doctor; admin preview kar raha ho to woh doctor
  const effDoc = who?.role === "doctor" ? who.id : asDoc;

  // PIN badal gaya / doctor hat gaya to purana login band
  useEffect(() => {
    if (loading || !who) return;
    const ok = who.role === "admin" ? who.pin === ADMIN_PIN
      : who.role === "manager" ? who.pin === MANAGER_PIN
      : doctors.some((d) => d.id === who.id && d.active !== false && !!pinOf(d) && pinOf(d) === who.pin);
    if (!ok) {
      setWho(null);
      setAsDoc("");
      toast("Please log in again");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, doctors]);

  // v = abhi type hua PIN (4th digit aate hi seedha login)
  const tryLogin = (v: string = pinIn) => {
    const pinIn = v;
    if (!loginAs) return toast("Pick your name first");
    if (pinIn.length !== 4) return toast("Enter your 4-digit PIN");
    if (loginAs === "admin") {
      if (pinIn !== ADMIN_PIN) { setPinIn(""); return toast("Wrong PIN"); }
      setWho({ role: "admin", pin: pinIn });
      setView("today");
    } else if (loginAs === "manager") {
      if (pinIn !== MANAGER_PIN) { setPinIn(""); return toast("Wrong PIN"); }
      setWho({ role: "manager", pin: pinIn });
      setView("today");
    } else {
      const d = doctors.find((x) => x.id === loginAs);
      if (!pinOf(d)) { setPinIn(""); return toast("No PIN for this name — ask the admin"); }
      if (pinIn !== pinOf(d)) { setPinIn(""); return toast("Wrong PIN"); }
      setWho({ role: "doctor", id: d!.id, pin: pinIn });
      setView("mytoday");
      setDay(todayS());
    }
    setPinIn("");
    setLoginAs("");
  };
  // PIN mein sirf 4 ank — 4 hote hi login try
  const typePin = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 4);
    setPinIn(v);
    if (v.length === 4) window.setTimeout(() => tryLogin(v), 120);
  };
  const logout = () => {
    setWho(null);
    setAsDoc("");
    setView("today");
  };

  /* ---------- writes ---------- */
  const run = async (fn: () => PromiseLike<{ error: unknown } | void>, ok?: string) => {
    const r = await fn();
    const err = r && (r as { error: unknown }).error;
    if (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      toast((err as { code?: string }).code === "23505"
        ? "Is mobile number ki is date + time par session pehle se booked hai"
        : "Could not save");
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

  /* ---------- roster ---------- */
  const offOn = (did: string, date: string) => offs.find((o) => o.doctor_id === did && o.off_date === date);
  const dayOf = (did: string, date: string) =>
    liveS.filter((s) => s.doctor_id === did && s.session_date === date);

  // Patient ki pichhli session jahan hui thi, wahi agli baar default
  const lastPlace = (pid: string): Place => (sessOf(pid).slice(-1)[0]?.place === "home" ? "home" : "clinic");

  /* Ek patient ki ek hi date + time par do session na bane.
     Supabase se taaza check (dusre tab / dusre doctor ne abhi book kiya ho to bhi pakda jaye),
     aur "busy" se double-click wali dusri request bhi ruk jaati hai. */
  const busySlots = React.useRef(new Set<string>());
  /* Mobile number se check — same number ki koi bhi patient entry (duplicate bhi)
     same date + time par do baar book nahi hogi. */
  const mob = (v?: string | null) => (v || "").replace(/\D/g, "").slice(-10);
  const sameMobileIds = async (pid: string) => {
    const { data: me } = await supabase.from("physio_patients").select("phone").eq("id", pid).maybeSingle();
    const ph = mob((me as { phone: string | null } | null)?.phone ?? pat(pid)?.phone);
    if (ph.length !== 10) return [pid];
    const { data } = await supabase.from("physio_patients").select("id").like("phone", `%${ph}`);
    return [...new Set([pid, ...(((data as { id: string }[]) || []).map((r) => r.id))])];
  };
  const slotTaken = async (pid: string, date: string, time: string, exceptId?: string) => {
    const ids = await sameMobileIds(pid);
    const { data, error } = await supabase.from("physio_sessions").select("*")
      .in("patient_id", ids).eq("session_date", date);
    const rows = error
      ? liveS.filter((x) => ids.includes(x.patient_id) && x.session_date === date)
      : ((data as Session[]) || []);
    return rows.find((x) => x.status !== "cancelled" && x.id !== exceptId && hhmm(x.session_time) === hhmm(time));
  };
  const takenMsg = (date: string, time: string, hit?: Session) => {
    const who = hit ? pat(hit.patient_id)?.name : "";
    return `${who ? `${who} (same mobile)` : "Already booked"} · ${nice(date)} ${hhmm(time)} — pick another time`;
  };
  // Book karne se pehle: slot khali hai? Haan to lock lagao. Baad mein unlock zaroor karo.
  const lockSlot = async (pid: string, date: string, time: string, exceptId?: string) => {
    const k = `${mob(pat(pid)?.phone) || pid}|${date}|${hhmm(time)}`;   // lock bhi mobile se
    if (busySlots.current.has(k)) return null;                 // wahi slot abhi book ho raha hai
    busySlots.current.add(k);
    const hit = await slotTaken(pid, date, time, exceptId);
    if (hit) { busySlots.current.delete(k); toast(takenMsg(date, time, hit)); return null; }
    return () => busySlots.current.delete(k);
  };

  const addSession = async (pid: string, did: string | null, date: string, time: string, place: Place = "clinic") => {
    const unlock = await lockSlot(pid, date, time);
    if (!unlock) return false;
    try { return await addSessionRaw(pid, did, date, time, place); } finally { unlock(); }
  };
  const addSessionRaw = async (pid: string, did: string | null, date: string, time: string, place: Place) => {
    const seq = sessOf(pid).length + 1;
    return run(
      () =>
        supabase
          .from("physio_sessions")
          .insert({ patient_id: pid, doctor_id: did, session_date: date, session_time: time, seq, place }),
      `Booked · ${nice(date)} ${time} · ${placeLabel(place)}`
    );
  };

  const markSession = (s: Session, status: "completed" | "scheduled") => {
    if (status === "completed") {
      setDlg(<CompleteDlg s={s} />);
      return Promise.resolve(true);
    }
    // Complete hone ke baad wapas nahi — undo band
    return Promise.resolve(false);
  };

  // End = patient "done" ho jata hai — Supabase se kuch delete nahi hota, reason saath mein save
  const endOngoing = (p: Patient) => setDlg(<EndDlg p={p} />);

  // Ended patient ka reason / date — naye column ho to wahan se, warna follow-up log se
  const endInfo = (p: Patient) => {
    const log = [...(p.follow_ups || [])].reverse().find((f) => f.note.startsWith("Ended — "));
    const parts = log ? log.note.replace("Ended — ", "").split(" — ") : [];
    const last = sessOf(p.id).filter((s) => s.status === "completed").slice(-1)[0];
    return {
      date: p.ended_at ? ymd(new Date(p.ended_at)) : log?.date || last?.session_date || createdDay(p),
      reason: p.end_reason || parts[0] || "Not recorded",
      note: p.end_note || parts.slice(1).join(" — ") || "",
    };
  };

  /* ========================= dialogs ========================= */
  const close = () => setDlg(null);

  /* ---------- assign → doctor call karta hai ---------- */
  const assignOf = (pid: string, date: string) => assigns.find((a) => a.patient_id === pid && a.assign_date === date);
  // Manager: is din yeh patient is doctor ke paas. Booked session ho to woh bhi us doctor par chali jati hai.
  const assignFor = async (p: Patient, did: string, date: string, s?: Session) => {
    const { error } = await supabase.from("physio_assign").upsert(
      { patient_id: p.id, doctor_id: did, assign_date: date, status: "pending", note: null, session_id: s?.id || null },
      { onConflict: "patient_id,assign_date" });
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return toast("Could not assign — run physio-assign.sql in Supabase first");
    }
    if (s && s.doctor_id !== did) await supabase.from("physio_sessions").update({ doctor_id: did }).eq("id", s.id);
    await load();
    toast(`${p.name} → ${doc(did)?.name} · ${nice(date)} · waiting for their call`);
  };

  // Doctor: patient aa raha hai — time chuno aur book (pehle se booked ho to bas confirm)
  const CallComingDlg = ({ a }: { a: Assign }) => {
    const p = pat(a.patient_id)!;
    const booked = liveS.find((x) => x.patient_id === p.id && x.session_date === a.assign_date && x.status !== "cancelled");
    const [time, setTime] = useState(booked ? hhmm(booked.session_time) : hhmm(p.usual_time) === "--" ? "10:00" : hhmm(p.usual_time));
    const [place, setPlace] = useState<Place>(booked?.place === "home" ? "home" : lastPlace(p.id));
    const save = async () => {
      if (!time) return toast("Pick a time");
      let sid = booked?.id || null;
      if (booked) {
        if (hhmm(booked.session_time) !== time || booked.place !== place || booked.doctor_id !== a.doctor_id) {
          await supabase.from("physio_sessions").update({ session_time: time, place, doctor_id: a.doctor_id }).eq("id", booked.id);
        }
      } else {
        if (!p.doctor_id) await supabase.from("physio_patients").update({ doctor_id: a.doctor_id }).eq("id", p.id);
        const unlock = await lockSlot(p.id, a.assign_date, time);
        if (!unlock) return;
        try {
          const { data, error } = await supabase.from("physio_sessions")
            .insert({ patient_id: p.id, doctor_id: a.doctor_id, session_date: a.assign_date, session_time: time,
              seq: sessOf(p.id).length + 1, place })
            .select().single();
          if (error) return toast((error as { code?: string }).code === "23505" ? takenMsg(a.assign_date, time) : "Could not save");
          sid = (data as Session).id;
        } finally { unlock(); }
      }
      const ok = await run(() => supabase.from("physio_assign").update({ status: "coming", session_id: sid }).eq("id", a.id),
        `${p.name} coming · ${nice(a.assign_date)} ${time}`);
      if (ok) close();
    };
    return (
      <Modal title={`${p.name} is coming`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          {nice(a.assign_date)} · {p.phone || "no number"}{booked ? ` · already booked at ${hhmm(booked.session_time)}` : ""}
        </p>
        <Field label="Time"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        <PlacePick v={place} on={setPlace} />
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn pri" onClick={save}>{booked ? "Confirm" : "Book session"}</button>
        </div>
      </Modal>
    );
  };

  // Doctor: patient nahi aa raha — reason zaroori; booked session ho to cancel
  const CallNotComingDlg = ({ a }: { a: Assign }) => {
    const p = pat(a.patient_id)!;
    const booked = liveS.find((x) => x.patient_id === p.id && x.session_date === a.assign_date && x.status === "scheduled");
    const [why, setWhy] = useState("");
    const [note, setNote] = useState("");
    const save = async () => {
      if (!why) return toast("Pick a reason");
      const text = note.trim() ? `${why} — ${note.trim()}` : why;
      if (booked) {
        await supabase.from("physio_sessions")
          .update({ status: "cancelled", cancel_reason: "Not coming (confirmed on call)", cancel_note: text }).eq("id", booked.id);
      }
      const ok = await run(() => supabase.from("physio_assign").update({ status: "not_coming", note: text }).eq("id", a.id),
        `${p.name} not coming on ${nice(a.assign_date)}`);
      if (ok) close();
    };
    return (
      <Modal title={`${p.name} is not coming`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          {nice(a.assign_date)}{booked ? ` · the ${hhmm(booked.session_time)} booking will be cancelled` : ""}
        </p>
        <Field label="Reason *">
          <select value={why} onChange={(e) => setWhy(e.target.value)}>
            <option value="">— Pick a reason —</option>
            {["Not well / busy today", "Will come another day", "Not reachable", "Wants own doctor only", "Stopping treatment", "Other"]
              .map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Note"><input placeholder="What the patient said" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn pri" onClick={save}>Save</button>
        </div>
      </Modal>
    );
  };

  // Kitne session liye — 1/3/5/6/10 ya apna number
  const PackPick = ({ v, on, label }: { v: string; on: (x: string) => void; label?: string }) => {
    const [cust, setCust] = useState(!!v && !PACKS.includes(Number(v)));
    return (
      <Field label={label || "How many sessions"}>
        <div className="seg wrap">
          {PACKS.map((n) => (
            <button key={n} className={!cust && Number(v) === n ? "on" : ""}
              onClick={() => { setCust(false); on(String(n)); }}>{n}</button>
          ))}
          <button className={cust ? "on" : ""} onClick={() => { setCust(true); on(""); }}>Custom</button>
        </div>
        {cust && (
          <input type="number" min={1} max={99} placeholder="Type the number" style={{ marginTop: 6 }}
            value={v} onChange={(e) => on(e.target.value)} />
        )}
      </Field>
    );
  };

  const PlacePick = ({ v, on }: { v: Place; on: (x: Place) => void }) => (
    <Field label="Session where *">
      <div className="seg">
        <button className={v === "clinic" ? "on" : ""} onClick={() => on("clinic")}>At clinic</button>
        <button className={v === "home" ? "on home" : ""} onClick={() => on("home")}>At home</button>
      </div>
    </Field>
  );

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
        "Patient saved"
      );
      if (okDone) close();
    };
    return (
      <Modal title="New patient">
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
          <button className="btn pri" onClick={save}>Save patient</button>
        </div>
      </Modal>
    );
  };

  const ScheduleDlg = ({ p }: { p: Patient }) => {
    const [date, setDate] = useState(T);
    const [time, setTime] = useState(hhmm(p.usual_time) === "--" ? "10:00" : hhmm(p.usual_time));
    const [did, setDid] = useState(p.doctor_id || effDoc || "");
    const [place, setPlace] = useState<Place>(lastPlace(p.id));
    const save = async () => {
      if (!did) return toast("Select a doctor");
      if (!date || !time) return toast("Pick a date and time");
      const o = offOn(did, date);
      if (o && !window.confirm(`${doc(did)?.name} is on ${o.kind === "leave" ? "leave" : "week off"} on ${nice(date)}. Book anyway?`)) return;
      if (p.doctor_id !== did) await supabase.from("physio_patients").update({ doctor_id: did }).eq("id", p.id);
      const ok = await addSession(p.id, did, date, time, place);
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
            {activeDocs.map((d) => {
              const o = offOn(d.id, date);
              return (
                <option key={d.id} value={d.id}>
                  {d.name}{o ? (o.kind === "leave" ? " — ON LEAVE" : " — WEEK OFF") : ""}
                </option>
              );
            })}
          </select>
        </Field>
        <div className="row2">
          <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Time"><input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <PlacePick v={place} on={setPlace} />
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
    const [note, setNote] = useState("");
    if (!s) return null;
    const same = date === s.session_date && time === hhmm(s.session_time);
    const save = async () => {
      if (!date || !time) return toast("Pick a date and time");
      if (same) return toast("Pick a different date or time");
      if (!why) return toast("Select a reason");
      const hit = await slotTaken(s.patient_id, date, time, s.id);
      if (hit) return toast(takenMsg(date, time, hit));
      // Purana note rakhte hain, uske aage naya — poora trail dikh jaye.
      const line = `${nice(s.session_date)} ${hhmm(s.session_time)} → ${nice(date)} ${time} · ${why}${note.trim() ? `: ${note.trim()}` : ""}`;
      const ok = await updSession(
        s.id,
        { session_date: date, session_time: time,
          reschedule_note: s.reschedule_note ? `${s.reschedule_note} | ${line}` : line } as Partial<Session>,
        `Moved to ${nice(date)} ${time} · ${why}`
      );
      if (ok) close();
    };
    return (
      <Modal title={`Reschedule · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          Currently {nice(s.session_date)} at {hhmm(s.session_time)} with {doc(s.doctor_id)?.name || "—"}. A reason is required.
        </p>
        <div className="row2">
          <Field label="New date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="New time"><input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
        </div>
        <Field label="Reason *">
          <select value={why} onChange={(e) => setWhy(e.target.value)}>
            <option value="">— Select a reason —</option>
            {["Patient asked to shift", "Patient did not turn up", "Doctor not available",
              "Doctor on leave / week off", "Machine or room not free", "Clinic holiday",
              "Double booking", "Other"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Remarks"><textarea rows={2} placeholder="Anything the desk should know…" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        {!!s.reschedule_note && <p className="hint" style={{ marginTop: -4 }}>Earlier: {s.reschedule_note}</p>}
        <div className="end">
          <button className="btn" onClick={close}>Close</button>
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
        `Patient cancelled · ${why}`
      );
      if (ok) close();
    };
    return (
      <Modal title={`Cancel patient · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          Booked sessions will be cancelled and the patient leaves the list. A reason is required.
        </p>
        <Field label="Reason *">
          <select value={why} onChange={(e) => setWhy(e.target.value)}>
            <option value="">— Select a reason —</option>
            {["Price too high", "Went to another centre", "Distance / travel", "Not interested now",
              "Not reachable", "Wrong or duplicate patient", "Health / personal reason", "Other"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Remarks *"><textarea rows={2} placeholder="What exactly did they say?" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="end">
          <button className="btn" onClick={close}>Close</button>
          <button className="btn pri" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={save}>Cancel this patient</button>
        </div>
      </Modal>
    );
  };

  /* Do duplicate entry ko ek karna — dusre ke session is patient me aa jaate hain */
  const MergePatientDlg = ({ p }: { p: Patient }) => {
    const [q, setQ] = useState("");
    const [pick, setPick] = useState<Patient | null>(null);
    const [sure, setSure] = useState(false);     // confirm kiye bina merge nahi hota
    const [busy, setBusy] = useState(false);

    const hits = !q.trim() ? [] : patients
      .filter((x) => x.id !== p.id
        && `${x.name} ${x.phone || ""}`.toLowerCase().includes(q.trim().toLowerCase()))
      .slice(0, 8);

    const merge = async () => {
      if (!pick || busy) return;
      if (!sure) return toast("Pehle confirm par tick karo");
      setBusy(true);
      // 1. duplicate ke saare session is patient par kar do
      const ok1 = await run(() =>
        supabase.from("physio_sessions").update({ patient_id: p.id }).eq("patient_id", pick.id));
      if (!ok1) return setBusy(false);
      // 2. jo khaana is patient me khali hai wo duplicate se bhar do + follow-up/skip jod do
      const fill: Partial<Patient> = {
        phone: p.phone || pick.phone,
        ailment: p.ailment || pick.ailment,
        source: p.source || pick.source,
        doctor_id: p.doctor_id || pick.doctor_id,
        routine: p.routine || pick.routine,
        usual_time: p.usual_time || pick.usual_time,
        start_date: [p.start_date, pick.start_date].filter(Boolean).sort()[0] || null,
        sessions_planned: Math.max(p.sessions_planned || 0, pick.sessions_planned || 0) || null,
        follow_ups: [...(p.follow_ups || []), ...(pick.follow_ups || [])],
        skips: [...(p.skips || []), ...(pick.skips || [])],
        notes: [p.notes, pick.notes].filter(Boolean).join("\n") || null,
        // dono me se jo zyada aage hai wahi status
        status: p.status === "ongoing" || pick.status === "ongoing" ? "ongoing"
          : p.status === "new" || pick.status === "new" ? "new" : p.status,
      };
      const ok2 = await run(() => supabase.from("physio_patients").update(fill).eq("id", p.id));
      if (!ok2) return setBusy(false);
      // 3. duplicate entry hata do
      const ok = await run(() => supabase.from("physio_patients").delete().eq("id", pick.id),
        `${pick.name} is patient me mila diya`);
      setBusy(false);
      if (ok) close();
    };

    const mineN = sessOf(p.id).length;
    const theirN = pick ? sessOf(pick.id).length : 0;

    return (
      <Modal title={`Merge duplicate · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          Duplicate entry dhoondo. Uske saare session, follow-up aur notes <b>{p.name}</b> me aa jayenge
          aur duplicate entry hat jayegi. Session count dono ka jud kar aayega.
        </p>
        <Field label="Duplicate dhoondo — naam ya mobile">
          <input autoFocus placeholder="e.g. Ramesh / 98156…" value={q}
            onChange={(e) => { setQ(e.target.value); setPick(null); setSure(false); }} />
        </Field>
        {!pick && !!hits.length && (
          <div className="panel" style={{ maxHeight: 220, overflow: "auto" }}>
            {hits.map((x) => (
              <div className="drow" key={x.id}>
                <button className="lnk" onClick={() => setPick(x)}>{x.name}</button>
                <span className="hint">{x.phone || "no number"}</span>
                <span className="pill">{sessOf(x.id).length} session{sessOf(x.id).length === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        )}
        {!pick && !!q.trim() && !hits.length && <p className="hint">Koi match nahi mila.</p>}
        {pick && (
          <div className="panel">
            <div className="drow">
              <b>{p.name}</b><span className="hint">rahega — {mineN} session</span>
            </div>
            <div className="drow">
              <b>{pick.name}</b><span className="hint">hat jayega — {theirN} session is me aa jayenge</span>
              <button className="btn sm ghost" onClick={() => { setPick(null); setSure(false); }}>Change</button>
            </div>
            <div className="drow"><b>Merge ke baad: {mineN + theirN} session</b></div>
          </div>
        )}
        {pick && (
          <label className="drow" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
            <span>
              Confirm — <b>{pick.name}</b> ki entry hat jayegi aur uske {theirN} session{" "}
              <b>{p.name}</b> me aa jayenge. Yeh wapas nahi hoga.
            </span>
          </label>
        )}
        <div className="end">
          <button className="btn" onClick={close}>Close</button>
          <button className="btn pri" disabled={!pick || !sure || busy} onClick={merge}>
            {busy ? "Merging…" : "Merge karo"}
          </button>
        </div>
      </Modal>
    );
  };

  /* Patient ko hamesha ke liye hatana — sirf admin ke paas */
  const DeletePatientDlg = ({ p }: { p: Patient }) => {
    const [sure, setSure] = useState(false);
    const mine = sessOf(p.id);
    const del = async () => {
      if (!sure) return toast("Pehle tick karo");
      if (mine.length) {
        const ok1 = await run(() => supabase.from("physio_sessions").delete().eq("patient_id", p.id));
        if (!ok1) return;
      }
      const ok = await run(() => supabase.from("physio_patients").delete().eq("id", p.id), "Patient deleted");
      if (ok) { close(); setView("leads"); }
    };
    return (
      <Modal title={`Delete patient · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          Yeh patient aur iske <b>{mine.length}</b> session hamesha ke liye hat jayenge — wapas nahi aayenge,
          aur reports me bhi nahi ginne jayenge. Sirf galti se bani ya duplicate entry ke liye use karo.
          Treatment band karna ho to &quot;Cancel patient&quot; ya &quot;End treatment&quot; behtar hai.
        </p>
        <label className="drow" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
          <span>Haan, mujhe pata hai — permanently delete karo</span>
        </label>
        <div className="end">
          <button className="btn" onClick={close}>Close</button>
          <button className="btn pri" style={{ background: "var(--red)", borderColor: "var(--red)" }}
            onClick={del}>Delete permanently</button>
        </div>
      </Modal>
    );
  };

  const OngoingDlg =({ p, fresh }: { p?: Patient; fresh?: boolean }) => {
    const [pick, setPick] = useState<Patient | undefined>(p);
    const [search, setSearch] = useState("");
    const [f, setF] = useState({ name: "", phone: "", source: "Walk-in" });
    const [did, setDid] = useState(p?.doctor_id || effDoc || "");
    const [rt, setRt] = useState<"daily" | "days" | "week" | "alt">((p?.routine?.type as "daily") || "daily");
    const [days, setDays] = useState<number[]>(
      p?.routine && p.routine.type === "days" ? p.routine.days : [1, 3, 5]
    );
    const [date, setDate] = useState(T);
    const [time, setTime] = useState(hhmm(p?.usual_time || null) === "--" ? "10:00" : hhmm(p!.usual_time));
    const [place, setPlace] = useState<Place>(p ? lastPlace(p.id) : "clinic");
    const [packN, setPackN] = useState(String(p?.sessions_planned ?? ""));

    const results = useMemo(() => {
      const s = search.trim().toLowerCase();
      let list = patients.filter((x) => !isOngoing(x) && x.status !== "cancelled" && x.status !== "done");
      if (s) list = list.filter((x) => `${x.name} ${x.phone || ""} ${x.ailment || ""}`.toLowerCase().includes(s));
      else list = list.filter((x) => isNew(x) && (createdDay(x) === T || createdDay(x) === addDays(T, -1)));
      return list.slice(0, 6);
    }, [search, patients]);

    const save = async () => {
      if (!did) return toast("Pick a doctor");
      const routine: Routine = rt === "daily" ? { type: "daily" } : rt === "alt" ? { type: "alt" } : rt === "days" ? { type: "days", days } : { type: "week", perWeek: 2 };
      let pid = pick?.id;
      if (!pid) {
        if (!f.name.trim()) return toast("Enter a name or pick a patient");
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
        .update({ doctor_id: did, status: "ongoing", routine, start_date: date, usual_time: time,
                  next_follow_up: null, sessions_planned: Number(packN) || null })
        .eq("id", pid);
      if (error) return toast("Could not start treatment");
      // Lead pehle se isi date + time par booked ho to wahi session chalegi — duplicate nahi
      // Same mobile ki dusri entry ka us slot par session ho to bata do (apna lead session ho to wahi chalegi)
      const hit = await slotTaken(pid, date, time);
      if (hit && hit.patient_id !== pid) toast(takenMsg(date, time, hit));
      if (!hit)
        await supabase.from("physio_sessions").insert({ patient_id: pid, doctor_id: did, session_date: date, session_time: time, seq: 1, place });
      await load();
      toast(`Ongoing with ${doc(did)?.name} · ${routineLabel(routine)}`);
      close();
      setView(effDoc ? "myongoing" : "ongoing");
    };

    return (
      <Modal title={fresh ? "Add ongoing patient" : `Move to ongoing · ${p?.name}`}>
        {fresh && (
          <>
            <Field label="Search patient">
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
          {/* Sirf naam — kis doctor ka kitna load hai wo yahan nahi dikhana */}
          {activeDocs.map((d) => {
            const o = offOn(d.id, date);
            return (
              <button key={d.id} className={`dopt${did === d.id ? " on" : ""}`} onClick={() => setDid(d.id)}>
                <b>{d.name}</b>
                {o && <span className={`tag ${o.kind === "leave" ? "fu" : ""}`}>{o.kind === "leave" ? "On leave" : "Week off"}</span>}
              </button>
            );
          })}
        </div>
        <Field label="When do they come in?">
          <select value={rt} onChange={(e) => setRt(e.target.value as "daily")}>
            <option value="daily">Daily</option>
            <option value="alt">Alternate days</option>
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
        <PlacePick v={place} on={setPlace} />
        <PackPick v={packN} on={setPackN} label="How many sessions will they take?" />
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn pri" onClick={save}>Start ongoing</button>
        </div>
      </Modal>
    );
  };

  const ComingDlg = ({ p, on }: { p: Patient; on?: string }) => {
    const [date, setDate] = useState(on || T);
    const [time, setTime] = useState(hhmm(p.usual_time) === "--" ? "10:00" : hhmm(p.usual_time));
    const [note, setNote] = useState("");
    const [place, setPlace] = useState<Place>(lastPlace(p.id));
    const save = async () => {
      if (!date || !time) return toast("Pick a date and time");
      const unlock = await lockSlot(p.id, date, time);
      if (!unlock) return;
      let insErr: { code?: string } | null = null;
      try {
        ({ error: insErr } = await supabase.from("physio_sessions").insert({
          patient_id: p.id, doctor_id: p.doctor_id, session_date: date, session_time: time, seq: sessOf(p.id).length + 1, place,
        }));
      } finally { unlock(); }
      if (insErr) return toast(insErr.code === "23505" ? takenMsg(date, time) : "Could not save");
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
        <PlacePick v={place} on={setPlace} />
        <Field label="Remarks (optional)"><input placeholder="Said he will come at 5…" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="end">
          <button className="btn" onClick={close}>Close</button>
          <button className="btn pri" onClick={save}>Book this slot</button>
        </div>
      </Modal>
    );
  };

  /* Doctor chhod gaya — Supabase se delete nahi, sirf active = false (purana data/report bacha rahe).
     Uske chal rahe patient aur aage ki sessions kisi aur doctor ko dene padte hain. */
  const RemoveDocDlg = ({ d }: { d: Doctor }) => {
    const pts = patients.filter((p) => p.doctor_id === d.id && (p.status === "ongoing" || p.status === "new"));
    const fut = liveS.filter((x) => x.doctor_id === d.id && x.status === "scheduled" && x.session_date >= T);
    const others = activeDocs.filter((x) => x.id !== d.id);
    const [to, setTo] = useState("");
    const [sure, setSure] = useState(false);
    const [busy, setBusy] = useState(false);
    const need = pts.length + fut.length > 0;
    const save = async () => {
      if (need && !to) return toast("Pick the doctor who takes over their patients");
      if (!sure) return toast("Tick the box to confirm");
      setBusy(true);
      if (need) {
        if (pts.length) await supabase.from("physio_patients").update({ doctor_id: to }).in("id", pts.map((p) => p.id));
        if (fut.length) await supabase.from("physio_sessions").update({ doctor_id: to }).in("id", fut.map((x) => x.id));
      }
      const { error } = await supabase.from("physio_doctors").update({ active: false }).eq("id", d.id);
      setBusy(false);
      if (error) return toast("Could not remove — try again");
      await load();
      toast(`${d.name} removed${need ? ` · patients moved to ${doc(to)?.name}` : ""}`);
      close();
      setView("doctors");
    };
    return (
      <Modal title={`Remove doctor · ${d.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          Use this when the doctor has left. They disappear from the desk, doctor lists, reports and login.
          Nothing is deleted — their past sessions stay saved in the patients&apos; history.
        </p>
        {need ? (
          <>
            <p style={{ marginBottom: 8 }}>
              <b>{pts.length}</b> patient{pts.length === 1 ? "" : "s"} (ongoing or new) and <b>{fut.length}</b> upcoming
              session{fut.length === 1 ? "" : "s"} are still with {d.name}. Move them to:
            </p>
            <Field label="New doctor">
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="">— Select doctor —</option>
                {others.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </Field>
          </>
        ) : <p style={{ marginBottom: 8 }}>No ongoing patients or upcoming sessions with {d.name}.</p>}
        <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0" }}>
          <input type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} />
          Yes, {d.name} has left — remove from the desk
        </label>
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn pri" style={{ background: "var(--red)", borderColor: "var(--red)" }} disabled={busy} onClick={save}>
            Remove doctor
          </button>
        </div>
      </Modal>
    );
  };

  const EndDlg = ({ p }: { p: Patient }) => {
    const [why, setWhy] = useState("");
    const [note, setNote] = useState("");
    const future = sessOf(p.id).filter((s) => s.status === "scheduled" && s.session_date >= T);
    const save = async () => {
      if (!why) return toast("Select a reason");
      const now = new Date().toISOString();
      if (future.length)
        await supabase.from("physio_sessions")
          .update({ status: "cancelled", cancel_reason: "Treatment ended", cancel_note: why, cancelled_at: now })
          .in("id", future.map((s) => s.id));
      // Taaza follow-up log lo — Follow-up dialog se aaye ho to abhi wala note bhi rahe
      const fresh = await supabase.from("physio_patients").select("follow_ups").eq("id", p.id).single();
      const prev = ((fresh.data as { follow_ups: FollowUp[] | null } | null)?.follow_ups) || p.follow_ups || [];
      const fu = [...prev, { date: T, note: `Ended — ${why}${note.trim() ? ` — ${note.trim()}` : ""}` }].slice(-20);
      const base = { status: "done", follow_ups: fu, next_follow_up: null, ended_at: now };
      let { error } = await supabase.from("physio_patients")
        .update({ ...base, end_reason: why, end_note: note.trim() || null }).eq("id", p.id);
      // end_reason column abhi na bana ho to bhi end ho jaye — reason follow-up log mein hai
      if (error) ({ error } = await supabase.from("physio_patients").update(base).eq("id", p.id));
      if (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        return toast("Could not save");
      }
      await load();
      toast(`${p.name} · treatment ended · ${why}`);
      close();
    };
    return (
      <Modal title={`End treatment · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          {doneText(p, progress(p).done)} · {doc(p.doctor_id)?.name || "no doctor"}.
          {future.length ? ` ${future.length} booked session${future.length === 1 ? "" : "s"} will be cancelled.` : ""}
          {" "}The patient and all their sessions stay saved.
        </p>
        <Field label="Why is the treatment ending? *">
          <select value={why} onChange={(e) => setWhy(e.target.value)}>
            <option value="">— Select a reason —</option>
            {END_REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Remarks"><textarea rows={2} placeholder="What did the patient / doctor say?" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="end">
          <button className="btn" onClick={close}>Close</button>
          <button className="btn pri" style={{ background: "var(--red)", borderColor: "var(--red)" }} onClick={save}>End treatment</button>
        </div>
      </Modal>
    );
  };

  // sess diya ho to sirf wahi ek session, warna aaj ke saare scheduled
  const NotComingDlg = ({ p, sess, on }: { p: Patient; sess?: Session; on?: string }) => {
    const day0 = sess ? sess.session_date : on || T;
    const [why, setWhy] = useState("");
    const [note, setNote] = useState("");
    const [next, setNext] = useState(addDays(day0, 1));
    const save = async () => {
      if (!why) return toast("Select a reason");
      if (!note.trim()) return toast("Remarks are required");
      const ids = sess
        ? [sess.id]
        : sessOf(p.id).filter((s) => s.session_date === day0 && s.status === "scheduled").map((s) => s.id);
      if (ids.length)
        await supabase.from("physio_sessions")
          .update({ status: "cancelled", cancel_reason: why, cancel_note: note.trim(), cancelled_at: new Date().toISOString() })
          .in("id", ids);
      const skips = [...(p.skips || []).filter((s) => s.date !== day0), { date: day0, reason: why, note: note.trim() }].slice(-60);
      const fu = [...(p.follow_ups || []), { date: T, note: `Not coming ${nice(day0)} — ${why} — ${note.trim()}` }].slice(-20);
      await supabase.from("physio_patients").update({ skips, follow_ups: fu, next_follow_up: next || null }).eq("id", p.id);
      await load();
      toast(`Marked not coming · ${why}`);
      close();
    };
    return (
      <Modal title={`Not coming · ${p.name}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          {sess ? `${nice(sess.session_date)} at ${hhmm(sess.session_time)}`
            : day0 === T ? "Today's visit" : `The visit on ${nice(day0)}`} will be marked as skipped. A reason is required.
        </p>
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
    const [packN, setPackN] = useState(String(p?.sessions_planned ?? ""));
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
    // Dropdown ke bahar kahin bhi click karo to wo band ho jaye
    useEffect(() => {
      if (!open) return;
      const h = (e: MouseEvent) => {
        const el = e.target as HTMLElement | null;
        if (!el?.closest?.(".tdrop") && !el?.closest?.(".tbtn")) setOpen(false);
      };
      document.addEventListener("mousedown", h);
      return () => document.removeEventListener("mousedown", h);
    }, [open]);

    const toggle = (n: string) =>
      setPicked((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));
    // List mein na ho to haath se likh ke add — session mein save + list mein bhi aage ke liye
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const typed = tq.trim();
    const known = (n: string) => therapies.some((t) => t.name.toLowerCase() === n.toLowerCase())
      || picked.some((x) => x.toLowerCase() === n.toLowerCase());
    const exact = !!typed && known(typed);
    const addCustom = async (raw: string = tq) => {
      const typed = raw.trim();
      if (!typed) return toast("Type the therapy name");
      setAdding(false);
      setNewName("");
      if (known(typed)) {
        const t = therapies.find((x) => x.name.toLowerCase() === typed.toLowerCase());
        if (t && !picked.includes(t.name)) toggle(t.name);
        setTq("");
        return;
      }
      setPicked((cur) => [...cur, typed]);
      setTq("");
      const { error } = await supabase.from("physio_therapies")
        .insert({ name: typed, grp: "Other", sort_order: 999, active: true });
      // Table mein na bhi jaye to session mein to save hoga hi
      toast(error ? `Added "${typed}" to this session` : `Added "${typed}" — it will show in the list next time`);
    };
    const takeFirst = () => {
      const first = groups[0]?.[1]?.[0];
      if (first) { toggle(first.name); setTq(""); }
      else addCustom();
    };
    const save = async (thenOngoing?: boolean) => {
      if (!picked.length) return toast("Pick at least one therapy");
      const ok = await updSession(
        s.id,
        { status: "completed", completed_at: new Date().toISOString(), therapies: picked, therapy_note: note.trim() || null } as Partial<Session>,
        "Session complete"
      );
      if (!ok) return;
      // Session ke baad hi customer batata hai kitne lene hain
      const packed = Number(packN) || null;
      if (p && packed !== (p.sessions_planned ?? null))
        await supabase.from("physio_patients").update({ sessions_planned: packed }).eq("id", p.id);
      await load();
      // Session ke baad hi pata chalta hai ki patient roz aayega — wahin se ongoing
      if (thenOngoing && p) { setDlg(<OngoingDlg p={p} />); return; }
      close();
    };

    return (
      <Modal title={`Session complete · ${p?.name || ""}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          {nice(s.session_date)} at {hhmm(s.session_time)} · {doc(s.doctor_id)?.name || "—"} · {placeLabel(s.place)}
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
              <input className="tsearch" autoFocus placeholder="Search, or type a new therapy and press Enter"
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
                )) : <p className="hint" style={{ padding: 10 }}>Not in the list.</p>}
                {!!typed && !exact && (
                  <button className="topt g7" onClick={() => addCustom()}><i />+ Add &quot;{typed}&quot; as a new therapy</button>
                )}
              </div>
              {/* Hamesha dikhe — list mein na ho to yahin se naya therapy */}
              {adding ? (
                <div className="tnew">
                  <input autoFocus placeholder="New therapy name" value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(newName); } }} />
                  <button className="btn sm pri" onClick={() => addCustom(newName)}>Add</button>
                  <button className="btn sm ghost" onClick={() => { setAdding(false); setNewName(""); }}>Cancel</button>
                </div>
              ) : (
                <button className="tadd" onClick={() => { setAdding(true); setNewName(typed); }}>+ Add new therapy</button>
              )}
            </div>
          )}
        </div>
        {/* Therapy chunne ke baad hi — warna dropdown khulne par yeh neeche dabte hain */}
        {!!picked.length && (
          <>
            <Field label="Notes (optional)">
              <input placeholder="Left knee, 15 min…" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {/* Ongoing patient ka session count "Start ongoing" ke waqt hi le liya jaata hai — yahan dobara nahi.
                Badalna ho to patient edit mein "Sessions in the plan" se. */}
            {!(p && isOngoing(p)) && (
              <PackPick v={packN} on={setPackN} label="How many sessions are they taking?" />
            )}
          </>
        )}
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          {p && p.status !== "ongoing" && (
            <button className="btn" onClick={() => save(true)}>Complete + Ongoing</button>
          )}
          <button className="btn pri" onClick={() => save()}>
            Mark complete{picked.length ? ` (${picked.length})` : ""}
          </button>
        </div>
      </Modal>
    );
  };

  // Patient ki saari details + ongoing settings (kab aata hai, doctor, time, kitne session) badlo
  const EditPatientDlg = ({ p }: { p: Patient }) => {
    const r = p.routine;
    const [f, setF] = useState({
      name: p.name, phone: p.phone || "", ailment: p.ailment || "", source: p.source || "Walk-in", notes: p.notes || "",
    });
    const [did, setDid] = useState(p.doctor_id || "");
    const [rt, setRt] = useState<"daily" | "days" | "week" | "alt">(r?.type || "daily");
    const auto = autoDone(p);
    const [doneN, setDoneN] = useState(String(Math.max(0, auto + (p.done_adjust || 0))));
    const [days, setDays] = useState<number[]>(r && r.type === "days" ? r.days : [1, 3, 5]);
    const [perWeek, setPerWeek] = useState(String(r && r.type === "week" ? r.perWeek || 2 : 2));
    const [time, setTime] = useState(hhmm(p.usual_time) === "--" ? "" : hhmm(p.usual_time));
    const [start, setStart] = useState(p.start_date || "");
    const [packN, setPackN] = useState(String(p.sessions_planned ?? ""));
    const on = isOngoing(p);

    const save = async () => {
      if (!f.name.trim()) return toast("Name cannot be empty");
      if (rt === "days" && !days.length) return toast("Pick at least one day");
      const data: Partial<Patient> = {
        name: f.name.trim(), phone: f.phone.replace(/\D/g, "").slice(-10) || null,
        ailment: f.ailment.trim() || null, source: f.source, notes: f.notes.trim() || null,
        doctor_id: did || null, sessions_planned: Number(packN) || null,
      };
      if (on) {
        data.routine = rt === "daily" ? { type: "daily" } : rt === "alt" ? { type: "alt" } : rt === "days" ? { type: "days", days } : { type: "week", perWeek: Math.max(1, Math.min(6, Number(perWeek) || 2)) };
        data.usual_time = time || null;
        data.start_date = start || null;
      }
      const ok = await updPatient(p.id, data, `${f.name.trim()} updated`);
      if (!ok) return;
      // Sessions done haath se — farak done_adjust mein, taaki aage ki sessions judti rahein
      const want = Math.max(0, Math.round(Number(doneN)));
      const adj = Number.isFinite(want) ? want - auto : p.done_adjust || 0;
      if (doneN !== "" && adj !== (p.done_adjust || 0)) {
        const { error } = await supabase.from("physio_patients").update({ done_adjust: adj }).eq("id", p.id);
        if (error) { toast("Count not saved — run physio-desk-updates.sql in Supabase"); return; }
        await load();
        toast(`${f.name.trim()} · sessions done set to ${want}`);
      }
      close();
    };

    return (
      <Modal title={`Edit · ${p.name}`}>
        <div className="row2">
          <Field label="Name *"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Mobile"><input inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <div className="row2">
          <Field label="Problem / ailment"><input value={f.ailment} placeholder="Knee pain, back pain…" onChange={(e) => setF({ ...f, ailment: e.target.value })} /></Field>
          <Field label="Source">
            <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
              {[...new Set([...SOURCES, f.source])].map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Doctor">
          <select value={did} onChange={(e) => setDid(e.target.value)}>
            <option value="">— Not assigned —</option>
            {activeDocs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        {on && (
          <>
            <Field label="When do they come in?">
              <div className="seg">
                <button className={rt === "daily" ? "on" : ""} onClick={() => setRt("daily")}>Daily</button>
                <button className={rt === "alt" ? "on" : ""} onClick={() => setRt("alt")}>Alternate days</button>
                <button className={rt === "days" ? "on" : ""} onClick={() => setRt("days")}>Fixed days</button>
                <button className={rt === "week" ? "on" : ""} onClick={() => setRt("week")}>Times a week</button>
              </div>
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
            {rt === "week" && (
              <Field label="How many times a week">
                <div className="seg wrap">
                  {["1", "2", "3", "4", "5", "6"].map((n) => (
                    <button key={n} className={perWeek === n ? "on" : ""} onClick={() => setPerWeek(n)}>{n}x</button>
                  ))}
                </div>
              </Field>
            )}
            <div className="row2">
              <Field label="Usual time"><input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
              <Field label="Started on"><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            </div>
          </>
        )}
        {isAdmin ? (
          <div className="row2">
            <Field label="Sessions done (change if the count is wrong)">
              <input type="number" min={0} max={999} value={doneN} onChange={(e) => setDoneN(e.target.value)} />
            </Field>
            <div className="f"><label>&nbsp;</label>
              <span className="hint" style={{ paddingTop: 8 }}>Counted from sessions: {auto}{p.done_adjust ? ` · corrected by ${p.done_adjust > 0 ? "+" : ""}${p.done_adjust}` : ""}</span>
            </div>
          </div>
        ) : (
          <p className="hint" style={{ margin: "0 0 10px" }}>
            Sessions done: <b>{Math.max(0, auto + (p.done_adjust || 0))}</b> — counted from sessions.
            Only the admin can correct this count.
          </p>
        )}
        <PackPick v={packN} on={setPackN} label="Sessions in the plan" />
        <Field label="Notes"><textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="end">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn pri" onClick={save}>Save changes</button>
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
  // Jahan se click kiya tha wahi yaad rakho — Back usi view par wapas le jayega
  const openPat = (id: string) => { setBackTo(view); setPtId(id); setView("patient"); };
  const openDocView = (id: string) => { setBackTo(view); setDocId(id); setView("doctor"); };
  const goBack = (fallback: typeof view) =>
    setView(backTo && backTo !== "patient" && backTo !== "doctor" ? backTo : fallback);

  // Har view ke upar ek jaisi date patti — Prev / Today / Tomorrow / Next + picker
  const DayNav = ({ d, set, label, extra }: { d: string; set: (x: string) => void; label?: string; extra?: React.ReactNode }) => (
    <div className="dayhead">
      <div className="d">
        {label ? `${label} · ` : ""}
        {d === T ? "Today" : d === addDays(T, 1) ? "Tomorrow" : d === addDays(T, -1) ? "Yesterday" : ""}
        {d === T || d === addDays(T, 1) || d === addDays(T, -1) ? ", " : ""}{nice(d)}
      </div>
      <button className="btn sm" onClick={() => set(addDays(d, -1))}>‹ Prev</button>
      <button className={`btn sm${d === T ? " pri" : ""}`} onClick={() => set(T)}>Today</button>
      <button className={`btn sm${d === addDays(T, 1) ? " pri" : ""}`} onClick={() => set(addDays(T, 1))}>Tomorrow</button>
      <button className="btn sm" onClick={() => set(addDays(d, 1))}>Next ›</button>
      <input type="date" className="btn sm" style={{ width: "auto" }} value={d}
        onChange={(e) => set(e.target.value || T)} />
      {extra}
    </div>
  );

  const SlotRow = ({ s }: { s: Session }) => {
    const p = pat(s.patient_id);
    return (
      <div className="slot">
        <div className="t">{hhmm(s.session_time)}</div>
        <div>
          <div style={{ fontWeight: 600 }}>
            <button className="lnk" onClick={() => p && openPat(p.id)}>{p?.name || "(deleted)"}</button>{" "}
            <span className={`pill ${s.status}`}>{s.status === "scheduled" ? "pending" : s.status}</span>{" "}
            {isHome(s) && <span className="pill home">Home visit</span>}
          </div>
          <div className="hint">{p?.ailment ? `${p.ailment} · ` : ""}{routineLabel(p?.routine || null)}</div>
          {!!(s.therapies || []).length && <div className="thl">{(s.therapies || []).join(" · ")}</div>}
          <div className="acts">
            {s.status === "scheduled" ? (
              <>
                <button className="btn sm pri" onClick={() => markSession(s, "completed")}>Complete</button>
                <button className="btn sm" onClick={() => p && setDlg(<RescheduleDlg p={p} />)}>Reschedule</button>
                <button className="btn sm ghost danger" onClick={() => p && setDlg(<NotComingDlg p={p} sess={s} />)}>Not coming</button>
              </>
            ) : (
              <span className="pill completed">Done ✓</span>
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
              {isHome(s) && <span className="pill home">Home</span>}
              <span className={`pill ${s.status}`}>{s.status === "scheduled" ? "pending" : s.status}</span>
              {s.status === "scheduled" ? (
                <>
                  <button className="btn sm pri" onClick={() => markSession(s, "completed")}>Complete</button>
                  <button className="btn sm ghost" onClick={() => p && setDlg(<RescheduleDlg p={p} />)}>Reschedule</button>
                  <button className="btn sm ghost danger" onClick={() => p && setDlg(<NotComingDlg p={p} sess={s} />)}>Not coming</button>
                </>
              ) : (
                <span className="pill completed">Done ✓</span>
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
                  <span className="pill">{doneText(p, pr.done)}</span>
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
    const D = lDay;
    const word = D === T ? "today" : D === addDays(T, 1) ? "tomorrow" : nice(D);
    const s = q.trim().toLowerCase();
    const hit = (p: Patient) => `${p.name} ${p.phone || ""} ${p.ailment || ""}`.toLowerCase().includes(s);

    // Complete hui lead sirf usi din ke board par dikhe jis din ki session thi.
    // Kal ki pending aaj complete karo to wo kal ke board par "Completed" jayegi, aaj ke par nahi
    // (pehle completed_at = abhi ka time dekh ke 24 ghante aaj ke board par dikhti thi).
    // Search se poori history milti rehti hai.
    const lastDone = (p: Patient) => sessOf(p.id).filter((x) => x.status === "completed").slice(-1)[0];
    const freshDone = (p: Patient) => {
      const ss = sessOf(p.id);
      if (!lastDone(p)) return true;                                   // abhi tak koi session complete nahi
      return ss.some((x) => x.session_date === D || x.status === "scheduled"); // us din ki session ya koi booked baaki
    };

    const leads = patients.filter(isNew);
    const todayOn = patients.filter((p) => isOngoing(p) && (sessOf(p.id).some((x) => x.session_date === D) || dueOn(p, D)));
    // Search chal rahi ho to poori history — warna sirf aaj ka kaam
    let rows = s
      ? patients.filter((p) => p.status !== "cancelled" && hit(p))
      : [...leads.filter(freshDone), ...todayOn];

    const cell = (p: Patient) => {
      const ss = sessOf(p.id);
      const on = isOngoing(p);
      const ts = ss.find((x) => x.session_date === D);
      if (on) {
        const done = ts && ts.status === "completed" ? ts : undefined;
        const booked = ts && ts.status === "scheduled" ? ts : undefined;
        return { on, done, booked, slot: booked || done };
      }
      // Lead: jo din dekh rahe ho usi din ki session se tick lagta hai.
      // Kal ki session late complete karo to aaj wali "Completed" nahi ho jaati.
      const dayS = ss.filter((x) => x.session_date === D);
      if (dayS.length) {
        const booked = dayS.find((x) => x.status === "scheduled");
        const done = booked ? undefined : dayS.find((x) => x.status === "completed");
        return { on, done, booked, slot: booked || done };
      }
      // Us din koi session nahi — pehli booked (pending ya aage wali), warna aakhri complete (search ke liye)
      const booked = ss.find((x) => x.status === "scheduled");
      const done = booked ? undefined : lastDone(p);
      return { on, done, booked, slot: booked || done };
    };
    const noDoc = rows.filter((p) => !p.doctor_id).length;
    const noTime = rows.filter((p) => p.doctor_id && !cell(p).slot).length;
    const notDone = rows.filter((p) => cell(p).booked).length;
    const cx = patients.filter((p) => p.status === "cancelled");

    // Jitna kaam ho gaya, utna neeche. Doctor lagane se row hilti nahi —
    // wahin rehti hai taaki turant time laga sako. Time lagne par hi neeche jaati hai.
    // 0 = time nahi laga, 1 = time laga, 2 = session ho gaya
    const rank = (p: Patient) => {
      const c = cell(p);
      if (c.done) return 2;
      return c.slot ? 1 : 0;
    };
    rows = rows.sort((a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at));

    return (
      <>
        <DayNav d={D} set={setLDay} label="Sessions" />
        <div className="stats">
          <Stat n={leads.filter((p) => createdDay(p) === D).length} l={`New patients ${word}`} />
          <Stat n={todayOn.length} l={`Ongoing coming ${word}`} />
          <Stat n={noDoc} l="Doctor not assigned" />
          <Stat n={noTime} l="Time not scheduled" />
          <Stat n={notDone} l="Session not completed" />
          <Stat n={cx.length} l="Cancelled patients" on={showCx} onClick={() => setShowCx(!showCx)} />
        </div>
        <div className="tools">
          <input placeholder="Search any patient — name, mobile, ailment" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 220 }} />
          {!!s && <button className="btn sm ghost" onClick={() => setQ("")}>Clear</button>}
        </div>
        {!!s && (
          <p className="hint" style={{ margin: "-4px 0 12px" }}>
            Searching everyone, including past patients. Use <b>Book again</b> or <b>Ongoing</b> if they have come back.
          </p>
        )}
        {showCx && (
          <div className="panel">
            {cx.length ? cx.map((p) => (
              <div className="drow" key={p.id}>
                <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                <span className="hint">{p.phone}</span>
                <span className="tag fu">{p.cancel_reason}</span>
                <span className="hint">{p.cancel_note}</span>
                <button className="btn sm" onClick={() => updPatient(p.id, { status: "new" }, "Patient reopened")}>Reopen</button>
              </div>
            )) : <span className="hint">No cancelled patients</span>}
          </div>
        )}
        {!rows.length ? (
          <div className="stat">
            <span className="hint">{s ? "No patient matches that search." : "Nothing for today."}</span>
          </div>
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
                  const skip = skipOf(p, D);
                  return (
                    <tr key={p.id}>
                      <td>
                        <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                        <div className="hint">{p.phone}{p.ailment ? ` · ${p.ailment}` : ""}</div>
                        <div className="hint">
                          {c.on ? (<><span className="pill ongoing">Ongoing</span> <span className="rt">{routineLabel(p.routine)}</span></>)
                                : (<><span className={`pill ${srcCls(p.source)}`}>{p.source}</span> {nice(createdDay(p))}</>)}
                        </div>
                        {/* Bas itna: kitne session ho chuke */}
                        <div className="hint" style={{ marginTop: 4 }}>
                          <b>{doneText(p, progress(p).done)}</b>
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
                            {isHome(c.slot!) ? " · Home" : ""}
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
                          <span className="step ok">Completed ✓</span>
                        ) : c.booked ? (
                          <button className="step no" onClick={() => markSession(c.booked!, "completed")}>Mark complete</button>
                        ) : (
                          <span className="step no off">Waiting</span>
                        )}
                      </td>
                      <td>
                        <div className="acts">
                          {/* Booked session hai to hi time badal sakte hain */}
                          {c.booked && (
                            <button className="btn sm ghost" onClick={() => setDlg(<RescheduleDlg p={p} />)}>Reschedule</button>
                          )}
                          {/* Purana patient phir se aaya — dobara book karo */}
                          {!c.on && hasDone && !c.booked && (
                            <button className="btn sm pri" onClick={() => setDlg(<ScheduleDlg p={p} />)}>Book again</button>
                          )}
                          {/* Ongoing ka button har lead par — roz aana ho to yahin se */}
                          {!c.on && <button className="btn sm" onClick={() => setDlg(<OngoingDlg p={p} />)}>Ongoing</button>}
                          {c.on ? (
                            c.booked ? <button className="btn sm ghost danger" onClick={() => setDlg(<NotComingDlg p={p} />)}>Cancel</button> : <span className="hint">—</span>
                          ) : p.status === "done" ? (
                            <span className="pill">Finished</span>
                          ) : (
                            <button className="btn sm ghost danger" onClick={() => setDlg(<CancelLeadDlg p={p} />)}>Cancel</button>
                          )}
                        </div>
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

  /* ---------- Schedule for today: aaj kaun, kis time, kis doctor ke paas ---------- */
  const TodayView = () => {
    const mineDoc = (id: string | null) => !tDoc || id === tDoc;
    const D = tDay;                                  // jo din abhi dekh rahe hain
    const isToday = D === T, isTom = D === addDays(T, 1), isYday = D === addDays(T, -1);
    const word = isToday ? "today" : isTom ? "tomorrow" : isYday ? "yesterday" : "";
    const head = isToday ? "Schedule for today" : isTom ? "Schedule for tomorrow"
      : isYday ? "Schedule for yesterday" : "Schedule";

    // range on ho to D se D2 tak — warna sirf D
    const range = !!tTo && tTo !== D;
    const [from, to] = range ? (tTo > D ? [D, tTo] : [tTo, D]) : [D, D];

    const dayS = liveS
      .filter((x) => x.session_date >= from && x.session_date <= to && mineDoc(x.doctor_id))
      .sort((a, b) => (a.session_date + a.session_time).localeCompare(b.session_date + b.session_time));
    // Pending = jiska time nikal chuka aur abhi tak complete nahi hua.
    // Jiska time aana baaki hai wo "Upcoming" hai — subha subha sab pending nahi dikhega.
    const late = dayS.filter(isLate);
    const soon = dayS.filter((x) => x.status === "scheduled" && !isLate(x));
    const done = dayS.filter((x) => x.status === "completed");
    const shown = tFilt === "late" ? late : tFilt === "soon" ? soon : tFilt === "done" ? done : dayS;
    // Routine ke hisaab se us din aana tha, par time abhi laga nahi — sirf ek din wale view me
    const noTime = range ? [] : patients.filter((p) => isOngoing(p) && mineDoc(p.doctor_id) && dueOn(p, D)
      && !sessOf(p.id).some((x) => x.session_date === D) && !skipOf(p, D))
      .sort((a, b) => a.name.localeCompare(b.name));
    // range me har skip apni date ke saath
    const skipRows = patients
      .filter((p) => isOngoing(p) && mineDoc(p.doctor_id))
      .flatMap((p) => (p.skips || []).filter((k) => k.date >= from && k.date <= to).map((k) => ({ p, k })))
      .sort((a, b) => b.k.date.localeCompare(a.k.date));

    return (
      <>
        <div className="dayhead">
          <div className="d">{range ? `Schedule · ${nice(from)} — ${nice(to)}` : `${head} · ${nice(D)}`}</div>
          {!range && (
            <>
              <button className="btn sm" onClick={() => setTDay(addDays(D, -1))}>‹ Prev</button>
              <button className={`btn sm${isToday ? " pri" : ""}`} onClick={() => setTDay(T)}>Today</button>
              <button className={`btn sm${isTom ? " pri" : ""}`} onClick={() => setTDay(addDays(T, 1))}>Tomorrow</button>
              <button className="btn sm" onClick={() => setTDay(addDays(D, 1))}>Next ›</button>
            </>
          )}
          <input type="date" className="btn sm" style={{ width: "auto" }} value={D}
            onChange={(e) => setTDay(e.target.value || T)} />
          {range ? (
            <>
              <span className="hint">to</span>
              <input type="date" className="btn sm" style={{ width: "auto" }} value={tTo}
                onChange={(e) => setTTo(e.target.value)} />
              <button className="btn sm" onClick={() => setTTo("")}>Single day</button>
            </>
          ) : (
            <button className="btn sm" onClick={() => { setTDay(addDays(D, -4)); setTTo(D); }}>Date range</button>
          )}
        </div>
        <div className="seg wrap" style={{ marginBottom: 12 }}>
          <button className={!tDoc ? "on" : ""} onClick={() => setTDoc("")}>All doctors</button>
          {activeDocs.map((d) => (
            <button key={d.id} className={tDoc === d.id ? "on" : ""} onClick={() => setTDoc(d.id)}>{d.name}</button>
          ))}
        </div>
        <div className="stats">
          <Stat n={dayS.length} l={range ? "Booked in range" : `Booked ${word}`.trim()}
            on={tFilt === ""} onClick={() => setTFilt("")} />
          <Stat n={late.length} l="Pending" on={tFilt === "late"} onClick={() => setTFilt(tFilt === "late" ? "" : "late")} />
          <Stat n={soon.length} l="Upcoming" on={tFilt === "soon"} onClick={() => setTFilt(tFilt === "soon" ? "" : "soon")} />
          <Stat n={done.length} l="Done" on={tFilt === "done"} onClick={() => setTFilt(tFilt === "done" ? "" : "done")} />
          {range
            ? <Stat n={dayS.filter(isHome).length} l="Home visits" />
            : <Stat n={noTime.length} l="Due, time not set" />}
          <Stat n={skipRows.length} l="Not coming" />
        </div>

        <h3 style={{ margin: "14px 0 8px" }}>
          {tFilt === "late" ? "Pending — time nikal gaya" : tFilt === "soon" ? "Upcoming sessions"
            : tFilt === "done" ? "Completed sessions" : "Booked sessions"}
          {tFilt && <button className="btn sm ghost" style={{ marginLeft: 8 }} onClick={() => setTFilt("")}>Show all</button>}
        </h3>
        <div className="tbl">
          <table>
            <thead>
              <tr>{range && <th>Date</th>}<th>Patient</th><th>Time</th><th>Doctor</th><th>Where</th><th>Sessions</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {shown.map((x) => {
                const p = pat(x.patient_id);
                const d = doc(x.doctor_id);
                return (
                  <tr key={x.id}>
                    {range && <td><b>{nice(x.session_date)}</b></td>}
                    <td>
                      <button className="lnk" onClick={() => p && openPat(p.id)}>{p?.name || "(deleted)"}</button>
                      <div className="hint">{p?.phone}{p?.ailment ? ` · ${p.ailment}` : ""}</div>
                    </td>
                    <td><b style={{ fontSize: 16 }}>{hhmm(x.session_time)}</b></td>
                    <td>{d ? <button className="lnk" onClick={() => openDocView(d.id)}>{d.name}</button> : "—"}</td>
                    <td>{isHome(x) ? <span className="pill home">Home</span> : <span className="hint">Clinic</span>}</td>
                    <td>{p ? (isOngoing(p) ? doneText(p, progress(p).done) : <span className="pill bigin">New patient</span>) : "—"}</td>
                    <td>
                      <span className={`pill ${x.status === "scheduled" && !isLate(x) ? "" : x.status}`}>
                        {x.status === "completed" ? "done" : isLate(x) ? "pending" : "upcoming"}
                      </span>
                    </td>
                    <td>
                      {x.status === "scheduled" ? (
                        <>
                          <button className="btn sm pri" onClick={() => markSession(x, "completed")}>Complete</button>{" "}
                          {p && <button className="btn sm ghost" onClick={() => setDlg(<RescheduleDlg p={p} />)}>Reschedule</button>}{" "}
                          {p && <button className="btn sm ghost danger" onClick={() => setDlg(<NotComingDlg p={p} sess={x} />)}>Not coming</button>}
                        </>
                      ) : (
                        <span className="pill completed">Done ✓</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!shown.length && (
                <tr><td colSpan={range ? 8 : 7}>
                  <span className="hint">
                    {tFilt === "late" ? "Abhi koi pending nahi — jiska time nikla hai wo sab complete hai."
                      : tFilt === "soon" ? "Aage koi session nahi."
                      : tFilt === "done" ? "Abhi tak koi session complete nahi hua."
                      : `No sessions booked for ${range ? `${nice(from)} — ${nice(to)}` : word || nice(D)} yet.`}
                  </span>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!range && (
          <>
            <h3 style={{ margin: "18px 0 8px" }}>Due {word || `on ${nice(D)}`} — time not set</h3>
            <div className="tbl">
              <table>
                <thead>
                  <tr><th>Patient</th><th>Doctor</th><th>Routine</th><th>Sessions</th><th>Last</th><th /></tr>
                </thead>
                <tbody>
                  {noTime.map((p) => {
                    const pr = progress(p);
                    const d = doc(p.doctor_id);
                    return (
                      <tr key={p.id}>
                        <td>
                          <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                          <div className="hint">{p.phone}{p.ailment ? ` · ${p.ailment}` : ""}</div>
                        </td>
                        <td>{d ? d.name : "—"}</td>
                        <td><span className="rt">{routineLabel(p.routine)}</span></td>
                        <td>{doneText(p, pr.done)}</td>
                        <td>{pr.last ? nice(pr.last.session_date) : "—"}</td>
                        <td>
                          <button className="btn sm pri" onClick={() => setDlg(<ComingDlg p={p} on={D} />)}>Coming</button>{" "}
                          <button className="btn sm ghost danger" onClick={() => setDlg(<NotComingDlg p={p} on={D} />)}>Not coming</button>
                        </td>
                      </tr>
                    );
                  })}
                  {!noTime.length && <tr><td colSpan={6}><span className="hint">Everyone due {word || `on ${nice(D)}`} has a time.</span></td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {skipRows.length > 0 && (
          <>
            <h3 style={{ margin: "18px 0 8px" }}>
              Not coming {range ? `· ${nice(from)} — ${nice(to)}` : word || `on ${nice(D)}`}
            </h3>
            <div className="panel">
              {skipRows.map(({ p, k }) => (
                <div className="drow" key={`${p.id}-${k.date}`}>
                  {range && <b>{nice(k.date)}</b>}
                  <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                  <span className="tag fu">{k.reason}</span>
                  {k.note && <span className="hint">{k.note}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  const OngoingView = () => {
    const D = oDay;
    const word = D === T ? "today" : D === addDays(T, 1) ? "tomorrow" : nice(D);
    const all = patients.filter(isOngoing);
    const dueCount = all.filter((p) => dueOn(p, D) && !sessOf(p.id).some((s) => s.session_date === D)).length;
    let list = all;
    if (oDoc) list = list.filter((p) => p.doctor_id === oDoc);
    if (oFilt === "due") list = list.filter((p) => dueOn(p, D) && !sessOf(p.id).some((s) => s.session_date === D));
    else if (oFilt === "today") list = list.filter((p) => sessOf(p.id).some((s) => s.session_date === D));
    else if (oFilt === "fu") list = list.filter(fuDue);

    return (
      <>
        <DayNav d={D} set={setODay} label="Ongoing" />
        <div className="stats">
          <Stat n={all.length} l="Ongoing patients" on={oFilt === "all"} onClick={() => setOFilt("all")} />
          <Stat n={dueCount} l={`Due ${word}, not booked`} on={oFilt === "due"} onClick={() => setOFilt("due")} />
          <Stat n={all.filter((p) => sessOf(p.id).some((s) => s.session_date === D)).length} l={`Booked ${word}`} on={oFilt === "today"} onClick={() => setOFilt("today")} />
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
                  <th>Coming {word}?</th><th>Follow-up</th><th /></tr>
              </thead>
              <tbody>
                {list.sort((a, b) => Number(fuDue(b)) - Number(fuDue(a)) || a.name.localeCompare(b.name)).map((p) => {
                  const pr = progress(p);
                  const d = doc(p.doctor_id);
                  const skip = skipOf(p, D);
                  const onD = sessOf(p.id).find((x) => x.session_date === D);   // us din ki session
                  return (
                    <tr key={p.id}>
                      <td>
                        <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                        <div className="hint">{p.phone}{p.ailment ? ` · ${p.ailment}` : ""}</div>
                      </td>
                      <td>{d ? <button className="lnk" onClick={() => openDocView(d.id)}>{d.name}</button> : "—"}</td>
                      <td><span className="rt">{routineLabel(p.routine)}</span></td>
                      <td><b style={{ fontSize: 16 }}>{doneText(p, pr.done)}</b></td>
                      <td>{pr.last ? nice(pr.last.session_date) : "—"}</td>
                      <td>
                        {onD ? (
                          <span className="step ok">{hhmm(onD.session_time)} · {onD.status === "completed" ? "done" : "coming"}</span>
                        ) : skip ? (
                          <span className="tag fu">Not coming · {skip.reason}</span>
                        ) : (
                          <>
                            <button className="btn sm pri" onClick={() => setDlg(<ComingDlg p={p} on={D} />)}>Coming</button>{" "}
                            <button className="btn sm ghost danger" onClick={() => setDlg(<NotComingDlg p={p} on={D} />)}>Not coming</button>
                          </>
                        )}
                        {!onD && pr.next && <div className="hint">Next {nice(pr.next.session_date)} {hhmm(pr.next.session_time)}</div>}
                      </td>
                      <td>{fuDue(p) ? <span className="tag fu">Needed</span> : p.next_follow_up ? nice(p.next_follow_up) : "—"}</td>
                      <td>
                        {onD && onD.status === "scheduled"
                          ? <button className="btn sm pri" onClick={() => markSession(onD, "completed")}>Done</button>
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
    const D = bDay;
    const word = D === T ? "today" : D === addDays(T, 1) ? "tomorrow" : nice(D);
    const rows = activeDocs.map((d) => ({ d, st: docStats(d, D) }));
    const allOn = patients.filter(isOngoing);
    const allFu = allOn.filter(fuDue);
    const dayS = liveS.filter((s) => s.session_date === D);
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
        <DayNav d={D} set={setBDay} />
        <div className="stats">
          <Stat n={allOn.length} l="Ongoing patients" on={dSel === "*" && dFilt === "ongoing"} onClick={() => pick("*", "ongoing")} />
          <Stat n={patients.filter(isNew).length} l="New patients" on={dSel === "*" && dFilt === "leads"} onClick={() => pick("*", "leads")} />
          <Stat n={dayS.filter((s) => s.status === "scheduled").length} l={`Pending ${word}`} on={dSel === "*" && dFilt === "scheduled"} onClick={() => pick("*", "scheduled")} />
          <Stat n={dayS.filter((s) => s.status === "completed").length} l={`Completed ${word}`} on={dSel === "*" && dFilt === "completed"} onClick={() => pick("*", "completed")} />
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
              <tr><th>Doctor</th><th>Ongoing</th><th>New patients</th><th>Due {word}</th><th>Pending</th>
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

    // Kaunsi tareekhein dikhani hain
    const [from, to] =
      dRange === "tom" ? [addDays(T, 1), addDays(T, 1)]
        : dRange === "month" ? monthEdges(day)
        : dRange === "custom" ? [dFrom <= dTo ? dFrom : dTo, dFrom <= dTo ? dTo : dFrom]
        : [day, day];
    const oneDay = from === to;
    const pq = dq.trim().toLowerCase();

    const inRange = (s: Session) => s.session_date >= from && s.session_date <= to;
    const matches = (s: Session) => {
      if (!pq) return true;
      const p = pat(s.patient_id);
      return `${p?.name || ""} ${p?.phone || ""} ${p?.ailment || ""}`.toLowerCase().includes(pq);
    };
    const pool = liveS.filter((s) => inRange(s) && matches(s));
    const mine = pool.filter((s) => s.doctor_id === cur.id)
      .sort((a, b) => (a.session_date + a.session_time).localeCompare(b.session_date + b.session_time));
    const done = mine.filter((s) => s.status === "completed").length;
    const homes = mine.filter(isHome).length;
    const byDate = [...new Set(mine.map((s) => s.session_date))];

    const rangeBtn = (k: typeof dRange, label: string) => (
      <button className={`btn sm${dRange === k ? " pri" : ""}`}
        onClick={() => { setDRange(k); if (k === "day") setDay(T); }}>{label}</button>
    );

    return (
      <>
        <div className="dayhead">
          <div className="d">
            {oneDay ? `${from === T ? "Today, " : from === addDays(T, 1) ? "Tomorrow, " : ""}${nice(from)}`
              : `${nice(from)} — ${nice(to)}`}
          </div>
          {rangeBtn("day", "Day")}
          {rangeBtn("tom", "Tomorrow")}
          {rangeBtn("month", "Month")}
          {rangeBtn("custom", "Custom")}
        </div>
        <div className="tools">
          {dRange === "day" && (
            <>
              <button className="btn sm" onClick={() => setDay(addDays(day, -1))}>‹ Prev</button>
              <button className="btn sm" onClick={() => setDay(T)}>Today</button>
              <button className="btn sm" onClick={() => setDay(addDays(day, 1))}>Next ›</button>
              <input type="date" className="btn sm" style={{ width: "auto", flex: "none" }} value={day} onChange={(e) => setDay(e.target.value || T)} />
            </>
          )}
          {dRange === "month" && (
            <>
              <button className="btn sm" onClick={() => setDay(addDays(monthEdges(day)[0], -1))}>‹ Prev month</button>
              <button className="btn sm" onClick={() => setDay(T)}>This month</button>
              <button className="btn sm" onClick={() => setDay(addDays(monthEdges(day)[1], 1))}>Next month ›</button>
            </>
          )}
          {dRange === "custom" && (
            <>
              <input type="date" className="btn sm" style={{ width: "auto", flex: "none" }} value={dFrom} onChange={(e) => setDFrom(e.target.value || T)} />
              <span className="hint">to</span>
              <input type="date" className="btn sm" style={{ width: "auto", flex: "none" }} value={dTo} onChange={(e) => setDTo(e.target.value || T)} />
            </>
          )}
          <input placeholder="Filter by patient — name or mobile" value={dq} onChange={(e) => setDq(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          {!!pq && <button className="btn sm ghost" onClick={() => setDq("")}>Clear</button>}
        </div>
        <div className="dtabs">
          {activeDocs.map((d) => (
            <button key={d.id} className={`dtab${cur.id === d.id ? " on" : ""}`} onClick={() => setDDoc(d.id)}>
              {d.name}<em>{pool.filter((s) => s.doctor_id === d.id).length}</em>
            </button>
          ))}
        </div>
        <div className="stats">
          <Stat n={mine.length} l={oneDay ? "Booked this day" : "Booked in range"} />
          <Stat n={done} l="Completed" />
          <Stat n={mine.filter(isLate).length} l="Pending" />
          <Stat n={mine.filter((s) => s.status === "scheduled" && !isLate(s)).length} l="Upcoming" />
          <Stat n={homes} l="Home visits" />
        </div>
        <div className="cols">
          {oneDay ? (
            <div className="col">
              <h3><button className="lnk" onClick={() => openDocView(cur.id)}>{cur.name}</button><em>{done}/{mine.length} done</em></h3>
              {mine.length ? mine.map((s) => <SlotRow key={s.id} s={s} />) : <div className="empty">No sessions</div>}
            </div>
          ) : byDate.length ? (
            byDate.map((dt) => {
              const list = mine.filter((s) => s.session_date === dt);
              return (
                <div className="col" key={dt}>
                  <h3>{dt === T ? "Today · " : ""}{nice(dt)}<em>{list.filter((x) => x.status === "completed").length}/{list.length} done</em></h3>
                  {list.map((s) => <SlotRow key={s.id} s={s} />)}
                </div>
              );
            })
          ) : (
            <div className="col"><div className="empty">No sessions in this range</div></div>
          )}
        </div>
      </>
    );
  };

  /* Calendar — ek din, time rows x doctor columns */
  /* Calendar — poora hafta: upar din, side mein 8am se 8pm ghanta-ghanta */
  const CalView = () => {
    if (!activeDocs.length) return <div className="stat"><span className="hint">No doctors yet.</span></div>;
    const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart(day), i));
    const ds = liveS.filter((s) => s.session_date >= week[0] && s.session_date <= week[6]
      && (!dDoc || s.doctor_id === dDoc));
    const hours = Array.from({ length: 12 }, (_, i) => 8 + i);   // 8 … 19 (8pm tak)
    const hourOf = (t: string) => {
      const h = Number(hhmm(t).slice(0, 2));
      return h < 8 ? 8 : h > 19 ? 19 : h;                        // bahar ka time kinare wale khaane mein
    };
    const lbl = (h: number) => `${h > 12 ? h - 12 : h} ${h < 12 ? "AM" : "PM"}`;

    return (
      <>
        <div className="dayhead">
          <div className="d">{nice(week[0])} — {nice(week[6])}</div>
          <button className="btn sm" onClick={() => setDay(addDays(day, -7))}>‹ Prev week</button>
          <button className="btn sm" onClick={() => setDay(T)}>This week</button>
          <button className="btn sm" onClick={() => setDay(addDays(day, 7))}>Next week ›</button>
          <input type="date" className="btn sm" style={{ width: "auto" }} value={day} onChange={(e) => setDay(e.target.value || T)} />
        </div>
        <div className="tools">
          <select value={dDoc} onChange={(e) => setDDoc(e.target.value)} style={{ minWidth: 190 }}>
            <option value="">All doctors</option>
            {activeDocs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <span className="hint">{dDoc ? doc(dDoc)?.name : "Every doctor"} · 8 AM to 8 PM</span>
        </div>
        <div className="stats">
          <Stat n={ds.length} l="Sessions this week" />
          <Stat n={ds.filter((s) => s.status === "completed").length} l="Completed" />
          <Stat n={ds.filter(isHome).length} l="Home visits" />
          <Stat n={ds.filter((s) => s.session_date === T).length} l="Today" />
        </div>
        <div className="tbl">
          <table className="grid week">
            <thead>
              <tr>
                <th className="tcol">Time</th>
                {week.map((dt) => {
                  const offd = activeDocs.filter((d) => offOn(d.id, dt));
                  return (
                    <th key={dt} className={dt === T ? "today" : ""}>
                      {DOW[parseYmd(dt).getDay()]}<br />
                      <span className="hint">{nice(dt).replace(/^\w+, /, "")}</span>
                      {!!offd.length && (
                        <div className="hint" style={{ fontWeight: 500 }}>
                          {offd.length === activeDocs.length ? "all off" : `${offd.length} off`}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h}>
                  <td className="tcol">{lbl(h)}</td>
                  {week.map((dt) => {
                    const cellS = ds.filter((s) => s.session_date === dt && hourOf(s.session_time) === h)
                      .sort((a, b) => a.session_time.localeCompare(b.session_time));
                    return (
                      <td key={dt} className={`gcell${dt === T ? " today" : ""}`}>
                        {cellS.map((s) => {
                          const p = pat(s.patient_id);
                          const d = doc(s.doctor_id);
                          const o = d && offOn(d.id, dt);
                          return (
                            <button key={s.id} className={`blk ${s.status}${o ? " warn" : ""}`} onClick={() => p && openPat(p.id)}>
                              <b>{d?.name || "No doctor"}</b>
                              <span>{hhmm(s.session_time)} · {p?.name || "(deleted)"}</span>
                              <small>{isHome(s) ? "Home visit" : "At clinic"}{s.status === "completed" ? " · done" : ""}{o ? " · doctor off!" : ""}</small>
                            </button>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  /* Roster — kaun kis din chhutti par, aur uske session kisko jayenge */
  /* Doctor wise — kis doctor ne kitne session kiye aur kin patients ke */
  /* Report tables mein naam nahi — sirf number. Number click karo to usi row ke neeche list khulti hai. */
  const repLine = (q: Patient, extra: string) => (
    <div key={q.id} style={{ padding: "3px 0", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline" }}>
      <button className="lnk" onClick={() => openPat(q.id)}>{q.name}</button>
      <span className="hint">· {extra}</span>
    </div>
  );
  const repSess = (x: Session) => {
    const q = pat(x.patient_id);
    return q ? <React.Fragment key={x.id}>{repLine(q, `${nice(x.session_date)} ${hhmm(x.session_time)}`)}</React.Fragment> : null;
  };
  // n = number, k = "doctorId|column"; red = laal number (pending / drop-out)
  const RepNum = ({ n, k, red }: { n: number; k: string; red?: boolean }) => {
    if (!n) return <span className="cnum hint" style={{ display: "inline-block" }}>0</span>;
    const on = repSel === k;
    return (
      <button className={`cnum${on ? " on" : ""}`} style={red && !on ? { color: "var(--red)" } : undefined}
        onClick={() => setRepSel(on ? "" : k)}><b>{n}</b></button>
    );
  };

  /* Doctor wise — kis doctor ne kitne session kiye */
  const DoctorReport = (from: string, to: string) => {
    const inRange = liveS.filter((x) => x.session_date >= from && x.session_date <= to);
    const done = inRange.filter((x) => x.status === "completed");
    const sortS = (a: Session, b: Session) => (a.session_date + a.session_time).localeCompare(b.session_date + b.session_time);

    const rows = activeDocs
      .map((d) => {
        const mine = done.filter((x) => x.doctor_id === d.id).sort(sortS);
        const byPat: Record<string, number> = {};
        mine.forEach((x) => { byPat[x.patient_id] = (byPat[x.patient_id] || 0) + 1; });
        const pats = Object.entries(byPat)
          .map(([id, n]) => ({ p: pat(id), n }))
          .filter((r) => !!r.p)
          .sort((a, b) => b.n - a.n || (a.p!.name || "").localeCompare(b.p!.name || ""));
        const late = inRange.filter((x) => x.doctor_id === d.id && isLate(x)).sort(sortS);
        return { d, mine, pats, late };
      })
      .filter((r) => r.mine.length || r.late.length)
      .sort((a, b) => b.mine.length - a.mine.length || a.d.name.localeCompare(b.d.name));

    const totalDone = rows.reduce((n, r) => n + r.mine.length, 0);
    const totalPats = new Set(done.filter((x) => activeDocs.some((d) => d.id === x.doctor_id)).map((x) => x.patient_id)).size;

    return (
      <>
        <div className="stats">
          <Stat n={totalDone} l="Sessions done" />
          <Stat n={totalPats} l="Patients seen" />
          <Stat n={rows.reduce((n, r) => n + r.late.length, 0)} l="Pending (time passed)" />
        </div>
        {!rows.length ? (
          <div className="stat"><span className="hint">Nothing in this range.</span></div>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Doctor</th><th>Patients seen</th><th>Sessions done</th><th>Pending</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const [sd, col] = repSel.split("|");
                  return (
                    <React.Fragment key={r.d.id}>
                      <tr>
                        <td><button className="lnk" onClick={() => openDocView(r.d.id)}>{r.d.name}</button></td>
                        <td><RepNum n={r.pats.length} k={`${r.d.id}|pats`} /></td>
                        <td><RepNum n={r.mine.length} k={`${r.d.id}|done`} /></td>
                        <td><RepNum n={r.late.length} k={`${r.d.id}|late`} red /></td>
                      </tr>
                      {sd === r.d.id && (
                        <tr><td colSpan={4} style={{ background: "var(--bg)" }}>
                          {col === "pats"
                            ? r.pats.map(({ p: q, n }) => repLine(q!, `${n} session${n === 1 ? "" : "s"}`))
                            : (col === "done" ? r.mine : r.late).map(repSess)}
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint" style={{ marginTop: 10 }}>
          Number par click karo to uski list khulti hai. Pending = jiska time nikal gaya par complete nahi hua.
        </p>
      </>
    );
  };

  /* Patients & drop-outs — har doctor ke paas kitne naye patient aaye aur kitno ka treatment band hua */
  const LeadsReport = (from: string, to: string) => {
    const inR = (d: string) => d >= from && d <= to;
    const newL = patients.filter((p) => inR(createdDay(p)));
    const drops = patients.filter((p) => p.status === "done" && inR(endInfo(p).date));
    // Sirf jo doctor abhi kaam kar rahe hain — chhod chuke doctor yahan nahi dikhte
    const docRows = activeDocs
      .map((d) => ({
        d,
        mineNew: newL.filter((p) => p.doctor_id === d.id),
        drops: drops.filter((p) => p.doctor_id === d.id)
          .sort((a, b) => endInfo(b).date.localeCompare(endInfo(a).date)),
        on: patients.filter((p) => p.status === "ongoing" && p.doctor_id === d.id)
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((r) => r.mineNew.length || r.drops.length || r.on.length)
      .sort((a, b) => b.mineNew.length - a.mineNew.length || a.d.name.localeCompare(b.d.name));
    const noDoc = newL.filter((p) => !p.doctor_id);

    return (
      <>
        <div className="stats">
          <Stat n={docRows.reduce((n, r) => n + r.mineNew.length, 0) + noDoc.length} l="New patients" />
          <Stat n={noDoc.length} l="Patients with no doctor" />
          <Stat n={docRows.reduce((n, r) => n + r.drops.length, 0)} l="Drop-outs (treatment ended)" />
        </div>
        {!docRows.length ? (
          <div className="stat"><span className="hint">Nothing in this range.</span></div>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Doctor</th><th>New patients</th><th>Drop-outs</th><th>Ongoing now</th></tr>
              </thead>
              <tbody>
                {docRows.map((r) => {
                  const [sd, col] = repSel.split("|");
                  return (
                    <React.Fragment key={r.d.id}>
                      <tr>
                        <td><button className="lnk" onClick={() => openDocView(r.d.id)}>{r.d.name}</button></td>
                        <td><RepNum n={r.mineNew.length} k={`${r.d.id}|newp`} /></td>
                        <td><RepNum n={r.drops.length} k={`${r.d.id}|drops`} red /></td>
                        <td><RepNum n={r.on.length} k={`${r.d.id}|on`} /></td>
                      </tr>
                      {sd === r.d.id && (
                        <tr><td colSpan={4} style={{ background: "var(--bg)" }}>
                          {col === "newp" ? r.mineNew.map((q) => repLine(q, nice(createdDay(q))))
                            : col === "drops" ? r.drops.map((q) => {
                                const e = endInfo(q);
                                return repLine(q, `${nice(e.date)} · ${e.reason} · ${doneText(q, progress(q).done)}`);
                              })
                            : r.on.map((q) => repLine(q, `${routineLabel(q.routine)} · ${doneText(q, progress(q).done)}`))}
                        </td></tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint" style={{ marginTop: 10 }}>
          Number par click karo to patient dikhenge. New patients = jo is range mein aaya, jis doctor par abhi assigned hai.
          Drop-out = jiska treatment (End) is range mein band hua. Ongoing now = aaj chal rahe patient.
        </p>
      </>
    );
  };

  /* ---------- Reports: therapy kitni chali, aur doctor wise kaam ---------- */
  const ReportsView = () => {
    const [from, to] = thFrom <= thTo ? [thFrom, thTo] : [thTo, thFrom];
    const done = liveS.filter((x) => x.status === "completed"
      && x.session_date >= from && x.session_date <= to);

    // ek session mein kai therapy ho sakti hain — har ek alag se gini jaati hai
    const count: Record<string, number> = {};
    done.forEach((x) => (x.therapies || []).forEach((n) => { count[n] = (count[n] || 0) + 1; }));
    const rows = Object.entries(count).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const top = rows[0]?.[1] || 1;            // sabse lambi bar
    const totalUses = rows.reduce((n, [, c]) => n + c, 0);
    const noLog = done.filter((x) => !(x.therapies || []).length).length;

    const quick = (d: number, label: string) => (
      <button className={`btn sm${from === addDays(T, -d + 1) && to === T ? " pri" : ""}`}
        onClick={() => { setThFrom(addDays(T, -d + 1)); setThTo(T); }}>{label}</button>
    );
    const pct = (c: number) => (totalUses ? Math.round((c / totalUses) * 100) : 0);

    return (
      <>
        <div className="dayhead">
          <div className="d">
            {repTab === "therapy" ? "Therapy use" : repTab === "doctor" ? "Doctor wise sessions" : "Patients & drop-outs"} ·{" "}
            {from === to ? `${from === T ? "Today, " : ""}${nice(from)}` : `${nice(from)} — ${nice(to)}`}
          </div>
          {quick(1, "Today")}
          {quick(7, "7 days")}
          {quick(30, "30 days")}
          {quick(90, "90 days")}
          <input type="date" className="btn sm" style={{ width: "auto" }} value={thFrom}
            onChange={(e) => setThFrom(e.target.value || T)} />
          <span className="hint">to</span>
          <input type="date" className="btn sm" style={{ width: "auto" }} value={thTo}
            onChange={(e) => setThTo(e.target.value || T)} />
        </div>
        <div className="seg" style={{ marginBottom: 10, maxWidth: 600 }}>
          <button className={repTab === "therapy" ? "on" : ""} onClick={() => setRepTab("therapy")}>Therapy / product use</button>
          <button className={repTab === "doctor" ? "on" : ""}
            onClick={() => setRepTab("doctor")}>Doctor wise sessions</button>
          <button className={repTab === "leads" ? "on" : ""}
            onClick={() => setRepTab("leads")}>Patients &amp; drop-outs</button>
        </div>
        {repTab === "doctor" ? DoctorReport(from, to) : repTab === "leads" ? LeadsReport(from, to) : (
          <>
        <div className="stats">
          <Stat n={done.length} l="Sessions completed" />
          <Stat n={totalUses} l="Therapies given" />
          <StatT v={rows[0] ? rows[0][0] : "—"} l="Most used" />
          <StatT v={done.length ? (totalUses / done.length).toFixed(1) : "—"} l="Per session" />
          <Stat n={noLog} l="Sessions with nothing logged" />
        </div>

        {!rows.length ? (
          <div className="stat">
            <span className="hint">No therapy logged in this range. Pick a wider date range, or check that sessions are being completed with a therapy.</span>
          </div>
        ) : (
          <>
            <div className="tbl">
              <table>
                <thead>
                  <tr><th>Therapy</th><th className="ucell">Share</th><th>Times</th><th>%</th></tr>
                </thead>
                <tbody>
                  {rows.map(([n, c]) => (
                    <tr key={n}>
                      <td><b>{n}</b></td>
                      <td className="ucell g1">
                        <div className="ubar"><i style={{ width: `${Math.max(3, (c / top) * 100)}%` }} /></div>
                      </td>
                      <td className="unum"><b style={{ fontSize: 16 }}>{c}</b></td>
                      <td className="unum hint">{pct(c)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              Every therapy written on a session is counted on its own, so &quot;Therapies given&quot; can be
              larger than the number of sessions. The % is a share of that total.
            </p>
          </>
        )}
          </>
        )}
      </>
    );
  };

  /* Roaster — simple: doctor chuno + date chuno → week off / leave lagao →
     neeche us doctor ke patient, har patient ko us din ke liye doctor assign karo.
     Patient ka apna doctor (doctor_id) nahi badalta — sirf us din ki session ka doctor badalta hai. */
  const RosterView = () => {
    if (!activeDocs.length) return <div className="stat"><span className="hint">No doctors yet.</span></div>;
    const d = activeDocs.find((x) => x.id === rDoc) || activeDocs[0];
    const sel = rDay;
    const o = offOn(d.id, sel);

    const kindName = (k: string) => (k === "leave" ? "Leave" : "Week off");
    const kind = rKind || o?.kind || "";                 // abhi kya chuna hua dikhe
    const note = rKind ? rNote : rNote || o?.note || "";
    const changed = !!kind && (!o || kind !== o.kind || note.trim() !== (o.note || "") || (kind === "off" && rRep > 0));
    const saveOff = async () => {
      if (!kind) return toast("Pick Week off or Leave first");
      setRBusy(true);
      const dates = [sel, ...Array.from({ length: kind === "off" ? rRep : 0 }, (_, i) => addDays(sel, 7 * (i + 1)))];
      const ok = await run(() => supabase.from("physio_off")
        .upsert(dates.map((dt) => ({ doctor_id: d.id, off_date: dt, kind, note: note.trim() || null })),
          { onConflict: "doctor_id,off_date" }));
      setRBusy(false);
      if (!ok) return setRSaved("");
      setRKind(""); setRNote(""); setRRep(0);
      setRSaved(`${d.name} · ${kindName(kind)} · ${nice(sel)}${dates.length > 1
        ? ` and the next ${dates.length - 1} ${DOW[parseYmd(sel).getDay()]}s` : ""}`);
    };
    const removeOff = async () => {
      if (!o) return;
      setRBusy(true);
      const ok = await run(() => supabase.from("physio_off").delete().eq("doctor_id", d.id).eq("off_date", sel));
      setRBusy(false);
      if (!ok) return;
      setRKind(""); setRNote(""); setRRep(0);
      setRSaved(`${kindName(o.kind)} removed — ${d.name} is working on ${nice(sel)}`);
    };

    // Us din kis patient ki kaunsi session hai (kisi bhi doctor ke saath)
    const sessOn = (pid: string) =>
      liveS.filter((x) => x.patient_id === pid && x.session_date === sel)
        .sort((a, b) => a.session_time.localeCompare(b.session_time))[0];

    // Is doctor ke patient + jo is din is doctor ke paas cover mein aaye hain
    const own = patients.filter((p) => p.doctor_id === d.id && (isOngoing(p) || isNew(p)));
    const covering = liveS
      .filter((x) => x.doctor_id === d.id && x.session_date === sel && !own.some((p) => p.id === x.patient_id))
      .map((x) => pat(x.patient_id))
      .filter((p): p is Patient => !!p);
    const rank = (p: Patient) => {
      const s = sessOn(p.id);
      const a = assignOf(p.id, sel);
      if (o && s && s.doctor_id === d.id && s.status === "scheduled" && !a) return 0;   // off doctor par booked — pehle
      if (!s && !a && (isNew(p) || dueOn(p, sel))) return 1;                           // aana hai, kisi ko diya nahi
      if (a?.status === "pending") return 2;                                            // doctor ki call baaki
      if (s && s.status === "scheduled") return 3;
      if (s || a) return 4;
      return 5;
    };
    const list = [...own, ...covering]
      .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i)
      .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

    // Dropdown mein kaunsa doctor dikhe: haath se chuna → assign wala → booked session wala → apna doctor
    const pickOf = (p: Patient) => {
      if (rPick[p.id]) return rPick[p.id].did;
      const a = assignOf(p.id, sel);
      if (a) return a.doctor_id;
      const s = sessOn(p.id);
      if (s && !(o && s.doctor_id === d.id)) return s.doctor_id || "";
      return o ? "" : p.doctor_id || d.id;
    };
    const assignNow = async (p: Patient) => {
      const did = pickOf(p);
      if (!did) return toast("Pick a doctor for this day");
      const x = offOn(did, sel);
      if (x && !window.confirm(`${doc(did)?.name} is on ${x.kind === "leave" ? "leave" : "week off"} on ${nice(sel)}. Assign anyway?`)) return;
      const s = sessOn(p.id);
      await assignFor(p, did, sel, s && s.status === "scheduled" ? s : undefined);
      setRPick((m) => { const n = { ...m }; delete n[p.id]; return n; });
    };

    const stuck = list.filter((p) => rank(p) === 0);
    const toBook = list.filter((p) => rank(p) === 1);
    const waiting = list.filter((p) => assignOf(p.id, sel)?.status === "pending");
    const awayToday = activeDocs.filter((x) => offOn(x.id, sel));
    const dayCnt = (did: string) => dayOf(did, sel).filter((y) => y.status !== "cancelled").length;

    return (
      <>
        <div className="dayhead">
          <div className="d">Roaster</div>
        </div>

        <div className="panel">
          <div className="row2" style={{ alignItems: "end" }}>
            <Field label="Doctor">
              <select value={d.id} onChange={(e) => { setRDoc(e.target.value); rReset(); }}>
                {activeDocs.map((x) => {
                  const xo = offOn(x.id, sel);
                  return <option key={x.id} value={x.id}>{x.name}{xo ? (xo.kind === "leave" ? " — on leave" : " — week off") : ""}</option>;
                })}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={sel} onChange={(e) => { setRDay(e.target.value || T); rReset(); }} />
            </Field>
          </div>
          <div className="drow" style={{ marginTop: 4 }}>
            <button className="btn sm" onClick={() => { setRDay(T); rReset(); }}>Today</button>
            <button className="btn sm" onClick={() => { setRDay(addDays(T, 1)); rReset(); }}>Tomorrow</button>
            <span className="hint">{nice(sel)}{sel === T ? " (today)" : ""}</span>
          </div>

          {/* Abhi Supabase mein kya saved hai */}
          <div className="offnow">
            <span className="hint">Saved for {nice(sel)}:</span>
            {o ? <span className={`tag ${o.kind === "leave" ? "fu" : "wk"}`}>{kindName(o.kind)}{o.note ? ` · ${o.note}` : ""}</span>
              : <span className="tag free">Working — no week off / leave</span>}
          </div>

          <div className="f" style={{ marginTop: 10 }}>
            <label>Mark {d.name} on {nice(sel)} as</label>
            <div className="seg" style={{ maxWidth: 360 }}>
              <button className={kind === "off" ? "on home" : ""} onClick={() => { setRKind("off"); setRSaved(""); }}>Week off</button>
              <button className={kind === "leave" ? "on lv" : ""} onClick={() => { setRKind("leave"); setRRep(0); setRSaved(""); }}>Leave</button>
            </div>
          </div>
          {!!kind && (
            <div className="row2">
              <Field label="Note (optional)">
                <input placeholder="Family function, half day…" value={note}
                  onChange={(e) => { if (!rKind) setRKind(kind as "off" | "leave"); setRNote(e.target.value); setRSaved(""); }} />
              </Field>
              {kind === "off" && (
                <Field label={`Repeat every ${DOW[parseYmd(sel).getDay()]}`}>
                  <select value={rRep} onChange={(e) => { if (!rKind) setRKind("off"); setRRep(Number(e.target.value)); setRSaved(""); }}>
                    <option value={0}>Only this day</option>
                    <option value={4}>This + next 4 weeks</option>
                    <option value={8}>This + next 8 weeks</option>
                    <option value={12}>This + next 12 weeks</option>
                  </select>
                </Field>
              )}
            </div>
          )}
          <div className="drow" style={{ marginTop: 4 }}>
            <button className="btn pri" disabled={!changed || rBusy} onClick={saveOff}>
              {rBusy ? "Saving…" : o && !changed ? "Saved" : `Save ${kind ? kindName(kind).toLowerCase() : ""}`.trim()}
            </button>
            {o && (
              <button className="btn ghost danger" disabled={rBusy} onClick={removeOff}>Remove {kindName(o.kind).toLowerCase()}</button>
            )}
            {rKind && <button className="btn ghost" onClick={() => { setRKind(""); setRNote(""); setRRep(0); }}>Undo choice</button>}
          </div>
          {!!rSaved && <div className="savedok">✓ Saved — {rSaved}</div>}
          {!!awayToday.length && (
            <p className="hint" style={{ marginTop: 8 }}>
              Off on {nice(sel)}: {awayToday.map((x) => `${x.name} (${offOn(x.id, sel)!.kind === "leave" ? "leave" : "week off"})`).join(", ")}
            </p>
          )}
        </div>

        {o && !!stuck.length && (
          <div className="panel" style={{ borderColor: "var(--red)" }}>
            <div className="drow">
              <b style={{ color: "var(--red)" }}>{stuck.length} patient{stuck.length === 1 ? "" : "s"} booked with {d.name} on {nice(sel)}</b>
              <span className="hint">Pick a doctor for each below and tap Assign — that doctor calls the patient.</span>
            </div>
          </div>
        )}

        <div className="stats">
          <Stat n={list.length} l={`Patients of ${d.name}`} />
          <Stat n={stuck.length} l="Need another doctor" />
          <Stat n={toBook.length} l="Due, not assigned" />
          <Stat n={waiting.length} l="Waiting for doctor's call" />
        </div>

        {!list.length ? (
          <div className="stat"><span className="hint">{d.name} has no ongoing or new patients.</span></div>
        ) : (
          <div className="tbl">
            <table>
              <thead>
                <tr><th>Patient</th><th>Plan</th><th>On {nice(sel)}</th><th>Doctor for this day</th><th>Call status</th><th></th></tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const s = sessOn(p.id);
                  const a = assignOf(p.id, sel);
                  const did = pickOf(p);
                  const due = isNew(p) || dueOn(p, sel);
                  const needs = rank(p) === 0;
                  const done = s?.status === "completed";
                  const same = !!a && a.doctor_id === did && !rPick[p.id];
                  return (
                    <tr key={p.id} style={needs ? { background: "var(--red-soft)" } : undefined}>
                      <td>
                        <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                        <div className="hint">{p.phone}</div>
                        {p.doctor_id !== d.id && <div className="hint">Own doctor {doc(p.doctor_id)?.name || "not set"}</div>}
                        {isNew(p) && <div><span className="tag load">New</span></div>}
                      </td>
                      <td className="hint">{isNew(p) ? "Not started" : `${routineLabel(p.routine)} · ${doneText(p, progress(p).done)}`}</td>
                      <td>
                        {s ? (
                          <span className={`tag ${done ? "free" : needs ? "fu" : ""}`}>
                            {done ? "Done" : "Booked"} {hhmm(s.session_time)}
                            {s.doctor_id !== d.id ? ` · ${doc(s.doctor_id)?.name || "no doctor"}` : ""}
                          </span>
                        ) : due ? <span className="tag fu">Due</span> : <span className="hint">Not due</span>}
                      </td>
                      <td>
                        {done ? <span className="hint">{doc(s!.doctor_id)?.name}</span> : (
                          <select value={did} style={{ minWidth: 180 }}
                            onChange={(e) => setRPick((m) => ({ ...m, [p.id]: { did: e.target.value, time: "" } }))}>
                            <option value="">— Pick doctor —</option>
                            {activeDocs.map((x) => {
                              const xo = offOn(x.id, sel);
                              return (
                                <option key={x.id} value={x.id}>
                                  {x.name}{xo ? (xo.kind === "leave" ? " — on leave" : " — week off") : ` (${dayCnt(x.id)})`}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </td>
                      <td>
                        {!a ? <span className="hint">—</span>
                          : a.status === "pending" ? (isAdmin
                            // Admin yahin se us doctor ka dashboard khol sakta hai
                            ? <button className="tag load" title="Open their dashboard"
                                onClick={() => { setAsDoc(a.doctor_id); setDay(sel); setView("mytoday"); }}>{doc(a.doctor_id)?.name} to call ›</button>
                            : <span className="tag load">{doc(a.doctor_id)?.name} to call</span>)
                          : a.status === "coming" ? <span className="tag free">Coming{s ? ` · ${hhmm(s.session_time)}` : ""}</span>
                          : <span className="tag fu" title={a.note || ""}>Not coming{a.note ? ` · ${a.note}` : ""}</span>}
                      </td>
                      <td>
                        {!done && !same && (
                          <button className="btn sm pri" onClick={() => assignNow(p)}>{a ? "Re-assign" : "Assign"}</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint" style={{ marginTop: 10 }}>
          Assign gives the patient to that doctor for this day only — the patient keeps their own doctor.
          The doctor sees them under &quot;Patients to call&quot;, calls to check if they are coming, and books the time.
          The number next to each doctor is how many sessions they already have that day.
        </p>
      </>
    );
  };

  const DoctorView = () => {
    const d = doc(docId);
    if (!d) { setView("doctors"); return null; }
    const st = docStats(d);
    const dayS = liveS.filter((s) => s.doctor_id === d.id && s.session_date === day)
      .sort((a, b) => a.session_time.localeCompare(b.session_time));
    return (
      <>
        <div className="dayhead">
          <div className="d">{d.name}</div>
          {isAdmin && (
            <button className="btn sm pri" onClick={() => { setAsDoc(d.id); setDay(T); setView("mytoday"); }}>Open their dashboard</button>
          )}
          {(isAdmin || isManager) && (
            <button className="btn sm ghost danger" onClick={() => setDlg(<RemoveDocDlg d={d} />)}>Remove doctor</button>
          )}
          <button className="btn sm" onClick={() => goBack("doctors")}>‹ Back</button>
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
          <button className="btn sm"
            onClick={() => goBack(effDoc ? (isOngoing(p) ? "myongoing" : "mytoday") : isOngoing(p) ? "ongoing" : "leads")}>‹ Back</button>
        </div>
        <div className="tools">
          <span className={`pill ${srcCls(p.source)}`}>{p.source}</span>
          <span className="hint">{p.phone || "no number"}{p.ailment ? ` · ${p.ailment}` : ""}</span>
          {d ? <span className="hint">Doctor: {effDoc ? <b>{d.name}</b> : <button className="lnk" onClick={() => openDocView(d.id)}>{d.name}</button>}</span>
             : <span className="hint">No doctor yet</span>}
          {isOngoing(p) ? <span className="rt">{routineLabel(p.routine)}</span>
            : <span className="pill">{isNew(p) ? "New patient" : p.status === "cancelled" ? "Cancelled" : "Finished"}</span>}
          {p.status === "done" && (
            <>
              <span className="tag fu">Ended {nice(endInfo(p).date)} · {endInfo(p).reason}</span>
              {endInfo(p).note && <span className="hint">{endInfo(p).note}</span>}
              <button className="btn sm" onClick={() => setDlg(<OngoingDlg p={p} />)}>Restart treatment</button>
            </>
          )}
          {p.status === "cancelled" && (
            <>
              <span className="tag fu">{p.cancel_reason}</span>
              <span className="hint">{p.cancel_note}</span>
              <button className="btn sm" onClick={() => updPatient(p.id, { status: "new" }, "Patient reopened")}>Reopen patient</button>
            </>
          )}
        </div>
        <div className="stats">
          <StatT v={doneText(p, pr.done)} l="Sessions" />
          <StatT v={p.sessions_planned ? String(p.sessions_planned) : "—"} l="Sessions taken" />
          <StatT v={p.start_date ? nice(p.start_date) : "—"} l="Started" />
          <StatT v={pr.last ? nice(pr.last.session_date) : "—"} l="Last session" />
          <StatT v={pr.today ? hhmm(pr.today.session_time) : pr.next ? nice(pr.next.session_date) : "—"} l={pr.today ? "Today at" : "Next session"} />
          <StatT v={fuDue(p) ? "Due" : p.next_follow_up ? nice(p.next_follow_up) : "—"} l="Follow-up" />
        </div>
        <div className="tools">
          {pr.today && pr.today.status === "scheduled" && (
            <button className="btn pri" onClick={() => markSession(pr.today!, "completed")}>Mark today complete</button>
          )}
          <button className="btn" onClick={() => setDlg(<EditPatientDlg p={p} />)}>Edit details</button>
          <button className={`btn${pr.today ? "" : " pri"}`} onClick={() => setDlg(<ScheduleDlg p={p} />)}>Book a session</button>
          {isNew(p) && <button className="btn pri" onClick={() => setDlg(<OngoingDlg p={p} />)}>Ongoing</button>}
          <button className="btn" onClick={() => setDlg(<FollowUpDlg p={p} />)}>Log follow-up</button>
          {!!next.length && <button className="btn" onClick={() => setDlg(<RescheduleDlg p={p} />)}>Reschedule</button>}
          {isNew(p) && <button className="btn ghost danger" onClick={() => setDlg(<CancelLeadDlg p={p} />)}>Cancel patient</button>}
          {isOngoing(p) && <button className="btn ghost" onClick={() => endOngoing(p)}>End treatment</button>}
          {/* Duplicate milana — admin aur physio admin dono kar sakte hain */}
          {(isAdmin || isManager) && (
            <button className="btn ghost" onClick={() => setDlg(<MergePatientDlg p={p} />)}>Merge duplicate</button>
          )}
          {/* Delete sirf admin ko — physio admin aur doctor ke paas nahi */}
          {isAdmin && (
            <button className="btn ghost danger" onClick={() => setDlg(<DeletePatientDlg p={p} />)}>Delete patient</button>
          )}
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
              <span className={`pill ${isHome(s) ? "home" : ""}`}>{placeLabel(s.place)}</span>
              <span className={`pill ${s.status}`}>{s.status === "scheduled" ? "missed / pending" : s.status}</span>
              {s.status === "scheduled" && <button className="btn sm ghost" onClick={() => markSession(s, "completed")}>Mark done</button>}
              {!!(s.therapies || []).length && (
                <span className="thl">{(s.therapies || []).join(" · ")}{s.therapy_note ? ` — ${s.therapy_note}` : ""}</span>
              )}
              {!!s.reschedule_note && <span className="thl">Rescheduled: {s.reschedule_note}</span>}
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

  /* ========================= doctor dashboard ========================= */
  /* Note: yeh views function ki tarah call hote hain (MyTodayView()), component ki tarah nahi —
     taaki typing karte waqt input ka focus na jaye. Inke andar hooks mat daalna. */

  // View 1 — aaj ka kaam: is doctor ke session (lead + ongoing), due-but-no-time, naye leads
  const MyTodayView = () => {
    const d = doc(effDoc);
    if (!d) return <div className="stat"><span className="hint">Doctor not found.</span></div>;
    const dayS = liveS.filter((s) => s.doctor_id === d.id && s.session_date === day)
      .sort((a, b) => a.session_time.localeCompare(b.session_time));
    const pend = dayS.filter(isLate);                                   // time nikal gaya, complete nahi
    const soon = dayS.filter((s) => s.status === "scheduled" && !isLate(s));  // abhi aana baaki
    const done = dayS.filter((s) => s.status === "completed");
    const mineOn = ongoingOf(d.id);
    const isT = day === T;
    // Sirf do cheezein: aaj aane wale ongoing (jinka time laga hai) aur mujhe mile naye leads
    // Ongoing patients alag, naye leads alag
    const onS = dayS.filter((x) => { const p = pat(x.patient_id); return !!p && isOngoing(p); });
    const leadS = dayS.filter((x) => !onS.includes(x));
    // Lead mili hai par abhi koi session book nahi hua
    const newLeads = patients.filter((p) => isNew(p) && p.doctor_id === d.id && !sessOf(p.id).length);
    // Manager se mile: call baaki (aaj ya aage ke) sab, aur is din ke jinka jawab aa gaya
    const toCall = assigns
      .filter((a) => a.doctor_id === d.id && (a.status === "pending" ? a.assign_date >= T || a.assign_date === day : a.assign_date === day))
      .sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || a.assign_date.localeCompare(b.assign_date));

    const lastVisit = (p?: Patient) => {
      const l = p ? sessOf(p.id).filter((s) => s.status === "completed" && s.session_date < day).slice(-1)[0] : undefined;
      return l ? nice(l.session_date) : "—";
    };
    const nameCell = (p: Patient | undefined, extra?: React.ReactNode) => (
      <td>
        <button className="lnk" onClick={() => p && openPat(p.id)}>{p?.name || "(deleted)"}</button>
        <div className="hint">{p?.phone}{p?.ailment ? ` · ${p.ailment}` : ""}</div>
        {extra}
      </td>
    );
    const therapyLine = (x: Session) =>
      !!(x.therapies || []).length && <div className="thl">{(x.therapies || []).join(" · ")}</div>;
    const whereCell = (x: Session) =>
      <td>{isHome(x) ? <span className="pill home">Home visit</span> : <span className="hint">Clinic</span>}</td>;
    const statusCell = (x: Session) =>
      <td>
        <span className={`pill ${x.status === "scheduled" && !isLate(x) ? "" : x.status}`}>
          {x.status === "completed" ? "Done ✓" : isLate(x) ? "Pending" : "Upcoming"}
        </span>
      </td>;
    const empty = (n: number, t: string) => !n && <tr><td colSpan={8}><span className="hint">{t}</span></td></tr>;

    return (
      <>
        <div className="dayhead">
          <div className="d">{isT ? "Today · " : day === addDays(T, 1) ? "Tomorrow · " : ""}{nice(day)}</div>
          <button className="btn sm" onClick={() => setDay(addDays(day, -1))}>‹ Prev</button>
          <button className={`btn sm${isT ? " pri" : ""}`} onClick={() => setDay(T)}>Today</button>
          <button className={`btn sm${day === addDays(T, 1) ? " pri" : ""}`} onClick={() => setDay(addDays(T, 1))}>Tomorrow</button>
          <button className="btn sm" onClick={() => setDay(addDays(day, 1))}>Next ›</button>
          <input type="date" className="btn sm" style={{ width: "auto" }} value={day}
            onChange={(e) => setDay(e.target.value || T)} />
          {/* "+ New lead" abhi hata diya — wapas chahiye to yeh line khol do
          <button className="btn sm pri" onClick={() => setDlg(<NewLead />)}>+ New patient</button> */}
        </div>
        <div className="stats">
          <Stat n={dayS.length} l={isT ? "Booked today" : "Booked this day"} />
          <Stat n={pend.length} l="Pending" />
          <Stat n={soon.length} l="Upcoming" />
          <Stat n={done.length} l="Completed" />
          <Stat n={mineOn.length} l="My ongoing patients" onClick={() => setView("myongoing")} />
        </div>

        {/* 0 — Clinic manager ne diye patient: call karo, aa rahe hain to book */}
        {!!toCall.length && (
          <>
            <h3 style={{ margin: "6px 0 8px" }}>Patients to call</h3>
            <p className="hint" style={{ marginBottom: 8 }}>
              The clinic manager gave you these patients. Call them, ask if they are coming, then book or mark not coming.
            </p>
            <div className="tbl" style={{ marginBottom: 14 }}>
              <table className="mytoday">
                <thead>
                  <tr><th>Patient</th><th>For</th><th>Own doctor</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {toCall.map((a) => {
                    const p = pat(a.patient_id);
                    if (!p) return null;
                    const bk = liveS.find((x) => x.patient_id === p.id && x.session_date === a.assign_date && x.status !== "cancelled");
                    return (
                      <tr key={a.id} style={a.status === "pending" ? undefined : { opacity: 0.7 }}>
                        {nameCell(p)}
                        <td><b>{a.assign_date === T ? "Today" : nice(a.assign_date)}</b>
                          {bk && <div className="hint">booked {hhmm(bk.session_time)}</div>}</td>
                        <td className="hint">{p.doctor_id === d.id ? "You" : doc(p.doctor_id)?.name || "—"}</td>
                        <td>
                          {a.status === "pending" ? <span className="pill bigin">Call pending</span>
                            : a.status === "coming" ? <span className="pill completed">Coming ✓</span>
                            : <span className="pill cancelled" title={a.note || ""}>Not coming</span>}
                        </td>
                        <td>
                          {a.status === "pending" && (
                            <div className="acts">
                              <button className="btn sm pri" onClick={() => setDlg(<CallComingDlg a={a} />)}>Coming — book</button>
                              <button className="btn sm ghost danger" onClick={() => setDlg(<CallNotComingDlg a={a} />)}>Not coming</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 1 — Naye leads */}
        <h3 style={{ margin: "6px 0 8px" }}>New patients assigned to me</h3>
        <div className="tbl">
          <table className="mytoday">
            <thead>
              <tr><th>Patient</th><th>Time</th><th>Source</th><th>Where</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {leadS.map((x) => {
                const p = pat(x.patient_id);
                return (
                  <tr key={x.id}>
                    {nameCell(p, therapyLine(x))}
                    <td><b style={{ fontSize: 16 }}>{hhmm(x.session_time)}</b></td>
                    <td><span className={`pill ${srcCls(p?.source || null)}`}>{p?.source || "—"}</span></td>
                    {whereCell(x)}
                    {statusCell(x)}
                    <td>
                      <div className="acts">
                        {x.status === "scheduled" ? (
                          <>
                            <button className="btn sm pri" onClick={() => markSession(x, "completed")}>Complete</button>
                            {p && <button className="btn sm" onClick={() => setDlg(<RescheduleDlg p={p} />)}>Reschedule</button>}
                            {p && <button className="btn sm ghost danger" onClick={() => setDlg(<CancelLeadDlg p={p} />)}>Cancel</button>}
                          </>
                        ) : p && isNew(p) ? (
                          <>
                            <button className="btn sm" onClick={() => setDlg(<OngoingDlg p={p} />)}>Ongoing</button>
                            <button className="btn sm" onClick={() => setDlg(<ScheduleDlg p={p} />)}>Book again</button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {newLeads.map((p) => (
                <tr key={`patient-${p.id}`}>
                  {nameCell(p)}
                  <td><span className="hint">Not set</span></td>
                  <td><span className={`pill ${srcCls(p.source)}`}>{p.source || "—"}</span></td>
                  <td><span className="hint">—</span></td>
                  <td><span className="pill bigin">Time not set</span></td>
                  <td>
                    <div className="acts">
                      <button className="btn sm pri" onClick={() => setDlg(<ScheduleDlg p={p} />)}>Set date &amp; time</button>
                      <button className="btn sm" onClick={() => setDlg(<OngoingDlg p={p} />)}>Ongoing</button>
                      <button className="btn sm ghost danger" onClick={() => setDlg(<CancelLeadDlg p={p} />)}>Cancel</button>
                    </div>
                  </td>
                </tr>
              ))}
              {empty(leadS.length + newLeads.length, `No new patients ${isT ? "today" : "this day"}.`)}
            </tbody>
          </table>
        </div>

        {/* 2 — Ongoing patients: booked, follow-up pending, not coming */}
        <h3 style={{ margin: "18px 0 8px" }}>Ongoing patients coming {isT ? "today" : "this day"}</h3>
        <div className="tbl">
          <table className="mytoday">
            <thead>
              <tr><th>Patient</th><th>Time</th><th>Routine</th><th>Sessions</th><th>Last visit</th><th>Where</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {onS.map((x) => {
                const p = pat(x.patient_id)!;
                return (
                  <tr key={x.id}>
                    {nameCell(p, therapyLine(x))}
                    <td><b style={{ fontSize: 16 }}>{hhmm(x.session_time)}</b></td>
                    <td><span className="rt">{routineLabel(p.routine)}</span></td>
                    <td><b>{doneText(p, progress(p).done)}</b></td>
                    <td>{lastVisit(p)}</td>
                    {whereCell(x)}
                    {statusCell(x)}
                    <td>
                      {x.status === "scheduled" && (
                        <div className="acts">
                          <button className="btn sm pri" onClick={() => markSession(x, "completed")}>Complete</button>
                          <button className="btn sm" onClick={() => setDlg(<RescheduleDlg p={p} />)}>Reschedule</button>
                          <button className="btn sm ghost danger" onClick={() => setDlg(<NotComingDlg p={p} />)}>Not coming</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {empty(onS.length, `No ongoing patient coming ${isT ? "today" : "this day"} yet.`)}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  // View 2 — mere saare ongoing patients
  /* Doctor ki apni report — kitne session kiye / baaki / aage, aur kitni leads aayi, kitne drop-out */
  const MyReportView = () => {
    const did = effDoc;
    const [from, to] = monthEdges(myMonth);               // poora mahina, 1 se aakhri tareekh
    const thisMonth = from === monthEdges(T)[0];
    const monthName = parseYmd(from).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const inR = (d: string) => d >= from && d <= to;
    const mineS = liveS.filter((x) => x.doctor_id === did && inR(x.session_date));
    const done = mineS.filter((x) => x.status === "completed");
    const late = mineS.filter(isLate);

    const mine = patients.filter((p) => p.doctor_id === did);
    const newL = mine.filter((p) => inR(createdDay(p)));
    const drops = mine.filter((p) => p.status === "done" && inR(endInfo(p).date))
      .sort((a, b) => endInfo(b).date.localeCompare(endInfo(a).date));

    const sRow = (x: Session) => (
      <div key={x.id} style={{ padding: "3px 0", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline" }}>
        <button className="lnk" onClick={() => openPat(x.patient_id)}>{pat(x.patient_id)?.name || "—"}</button>
        <span className="hint"> · {from === to ? "" : `${nice(x.session_date)} `}{hhmm(x.session_time)}</span>
      </div>
    );
    const pRow = (q: Patient, extra: string) => (
      <div key={q.id} style={{ padding: "3px 0", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline" }}>
        <button className="lnk" onClick={() => openPat(q.id)}>{q.name}</button>
        <span className="hint"> · {extra}</span>
      </div>
    );
    // Rows = kya gina (session done, pending, …); date upar se chuni jaati hai
    const sortS = (a: Session, b: Session) => (a.session_date + a.session_time).localeCompare(b.session_date + b.session_time);
    // [key, heading, (unused), rang, khaali ho to kya likhe]
    const MY_ROWS: [string, string, boolean, string, string][] = [
      ["done", "Sessions done", false, "g", "No sessions yet"],
      ["late", "Sessions pending", true, "r", "Nothing pending"],
      ["newp", "New patients", false, "b", "No new patients"],
      ["drops", "Drop-outs", true, "a", "No drop-outs"],
      ["on", "Ongoing now", false, "p", "No ongoing patients"],
    ];
    // Mahine ke hafte: 1–7, 8–14, 15–21, 22–28, 29–aakhri
    const mon = parseYmd(from).toLocaleDateString("en-IN", { month: "short" });
    const lastDay = Number(to.slice(8, 10));
    const weeks = [1, 8, 15, 22, 29].filter((d) => d <= lastDay).map((d, i) => {
      const e = Math.min(d + 6, lastDay);
      const f = `${from.slice(0, 8)}${String(d).padStart(2, "0")}`;
      const t2 = `${from.slice(0, 8)}${String(e).padStart(2, "0")}`;
      return { key: `w${i + 1}`, label: `${d}–${e} ${mon}`, from: f, to: t2 };
    });
    // kis cheez ki kaunsi tareekh gini jaaye
    const dateOf = (k: string, x: Session | Patient) =>
      k === "done" || k === "late" ? (x as Session).session_date
        : k === "newp" ? createdDay(x as Patient)
        : k === "drops" ? endInfo(x as Patient).date : T;
    const cell = (k: string, f: string, t2: string) =>
      k === "on" ? rowData.on : rowData[k].filter((x) => { const d = dateOf(k, x); return d >= f && d <= t2; });
    const rowData: Record<string, (Session | Patient)[]> = {
      done: done.slice().sort(sortS),
      late: late.slice().sort(sortS),
      newp: newL,
      drops,
      on: mine.filter(isOngoing).sort((a, b) => a.name.localeCompare(b.name)),
    };

    return (
      <>
        <div className="dayhead">
          <div className="d">My report · {monthName}{thisMonth ? " (this month)" : ""}</div>
          <button className="btn sm" onClick={() => { setMyMonth(addDays(from, -1)); setMyPvRow(""); }}>‹ Prev month</button>
          <button className={`btn sm${thisMonth ? " pri" : ""}`} onClick={() => { setMyMonth(T); setMyPvRow(""); }}>This month</button>
          <button className="btn sm" disabled={thisMonth} onClick={() => { setMyMonth(addDays(to, 1)); setMyPvRow(""); }}>Next month ›</button>
        </div>

        {/* Pivot — rows: kya gina, columns: mahine ke hafte + total. Har number click karo to neeche list. */}
        <div className="tbl rpivot">
          <table>
            <thead>
              <tr>
                <th>{monthName}</th>
                {weeks.map((w) => <th key={w.key} className="c">{w.label}</th>)}
                <th className="c tot">Total</th>
              </tr>
            </thead>
            <tbody>
              {MY_ROWS.map(([k, label, , tone]) => (
                <tr key={k}>
                  <td><span className={`rdot ${tone}`} />{label}</td>
                  {[...weeks, { key: "all", label: "Total", from, to }].map((w) => {
                    const tot = w.key === "all";
                    if (k === "on" && !tot) return <td key={w.key} className="c"><span className="hint">—</span></td>;
                    const n = cell(k, w.from, w.to).length;
                    const id = `${k}|${w.key}`;
                    const open = myPvRow === id;
                    return (
                      <td key={w.key} className={`c${tot ? " tot" : ""}`}>
                        {n ? (
                          <button className={`cnum big ${tone}${open ? " on" : ""}`}
                            onClick={() => setMyPvRow(open ? "" : id)}>{n}</button>
                        ) : <span className="cnum big zero">0</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ margin: "8px 0 12px" }}>Click any number to see its list. Click it again to close.</p>
        {myPvRow && (() => {
          const [k, wk] = myPvRow.split("|");
          const w = wk === "all" ? { label: monthName, from, to } : weeks.find((x) => x.key === wk)!;
          const list = cell(k, w.from, w.to);
          if (!list.length) return null;
          const label = MY_ROWS.find((r) => r[0] === k)?.[1] || "";
          return (
            <div className="panel rlist">
              <h3>{label} · {w.label}<em>{list.length}</em></h3>
              <div className="rgrid">
                {k === "done" || k === "late"
                  ? (list as Session[]).map(sRow)
                  : k === "newp"
                  ? (list as Patient[]).map((q) => pRow(q, `Joined ${nice(createdDay(q))}`))
                  : k === "drops"
                  ? (list as Patient[]).map((q) => {
                      const e = endInfo(q);
                      return pRow(q, `${nice(e.date)} · ${e.reason} · ${doneText(q, progress(q).done)}`);
                    })
                  : (list as Patient[]).map((q) => pRow(q, `${routineLabel(q.routine)} · ${doneText(q, progress(q).done)}`))}
              </div>
            </div>
          );
        })()}
      </>
    );
  };

  const MyOngoingView = () => {
    const d = doc(effDoc);
    if (!d) return <div className="stat"><span className="hint">Doctor not found.</span></div>;
    const all = ongoingOf(d.id);
    const comingToday = all.filter((p) => sessOf(p.id).some((s) => s.session_date === T));
    const dueNotBooked = all.filter((p) => dueOn(p, T) && !sessOf(p.id).some((s) => s.session_date === T) && !skipOf(p, T));
    const list = all.slice().sort((a, b) => {
      const ta = progress(a).today?.session_time || "99", tb = progress(b).today?.session_time || "99";
      return ta.localeCompare(tb) || a.name.localeCompare(b.name);
    });

    return (
      <>
        <div className="dayhead">
          <div className="d">My ongoing patients</div>
          <button className="btn sm pri" onClick={() => setDlg(<OngoingDlg fresh />)}>+ Ongoing patient</button>
        </div>
        <div className="stats">
          <Stat n={all.length} l="Ongoing patients" />
          <Stat n={comingToday.length} l="Booked today" />
          <Stat n={dueNotBooked.length} l="Due today, no time yet" />
          <Stat n={all.filter(fuDue).length} l="Follow-up needed" />
        </div>
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Patient</th><th>Routine</th><th>Sessions</th><th>Last</th><th>Coming today?</th><th>Next</th><th>Follow-up</th><th /></tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const pr = progress(p);
                const skip = skipOf(p, T);
                return (
                  <tr key={p.id}>
                    <td>
                      <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                      <div className="hint">{p.phone}{p.ailment ? ` · ${p.ailment}` : ""}</div>
                    </td>
                    <td><span className="rt">{routineLabel(p.routine)}</span></td>
                    <td><b style={{ fontSize: 16 }}>{doneText(p, pr.done)}</b></td>
                    <td>{pr.last ? nice(pr.last.session_date) : "—"}</td>
                    <td>
                      {pr.today ? (
                        <span className={`step ${pr.today.status === "completed" ? "ok" : "no"}`}>
                          {hhmm(pr.today.session_time)} · {pr.today.status === "completed" ? "done" : "coming"}
                        </span>
                      ) : skip ? (
                        <span className="tag fu">Not coming · {skip.reason}</span>
                      ) : (
                        <>
                          <button className="btn sm pri" onClick={() => setDlg(<ComingDlg p={p} />)}>Coming</button>{" "}
                          <button className="btn sm ghost danger" onClick={() => setDlg(<NotComingDlg p={p} />)}>Not coming</button>
                        </>
                      )}
                    </td>
                    <td>{pr.next && pr.next.session_date > T ? `${nice(pr.next.session_date)} ${hhmm(pr.next.session_time)}` : "—"}</td>
                    <td>{fuDue(p) ? <span className="tag fu">Needed</span> : p.next_follow_up ? nice(p.next_follow_up) : "—"}</td>
                    <td>
                      <div className="acts">
                        {pr.today && pr.today.status === "scheduled" ? (
                          <>
                            <button className="btn sm pri" onClick={() => markSession(pr.today!, "completed")}>Done</button>
                            <button className="btn sm" onClick={() => setDlg(<RescheduleDlg p={p} />)}>Reschedule</button>
                          </>
                        ) : (
                          <button className="btn sm" onClick={() => setDlg(<ScheduleDlg p={p} />)}>Schedule</button>
                        )}
                        <button className="btn sm ghost" onClick={() => setDlg(<FollowUpDlg p={p} />)}>Follow-up</button>
                        <button className="btn sm ghost" onClick={() => endOngoing(p)}>End</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!list.length && <tr><td colSpan={8}><span className="hint">No ongoing patients with you right now.</span></td></tr>}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  /* ========================= login + PINs ========================= */
  // Page 1: naam chuno → Page 2: sirf PIN (4 ank)
  const LoginView = () => {
    if (!loginAs) return (
      <div style={{ maxWidth: 520, margin: "6vh auto 0" }}>
        <div className="panel" style={{ padding: "18px 20px" }}>
          <h2 style={{ fontSize: 20, marginBottom: 4 }}>Who is logging in?</h2>
          <p className="hint" style={{ marginBottom: 12 }}>
            Doctors see only their own dashboard. Admin and the physio admin see every doctor.
          </p>
          <div className="dpick" style={{ maxHeight: "none" }}>
            {/* Admin sabse upar */}
            <button className="dopt" onClick={() => { setLoginAs("admin"); setPinIn(""); }}>
              <b>Admin</b><span className="tag load">Full desk</span><span className="hint">›</span>
            </button>
            <button className="dopt" onClick={() => { setLoginAs("manager"); setPinIn(""); }}>
              <b>Physio admin</b><span className="tag free">All doctors</span><span className="hint">›</span>
            </button>
            {activeDocs.map((d) => (
              <button key={d.id} className="dopt" onClick={() => { setLoginAs(d.id); setPinIn(""); }}>
                <b>{d.name}</b><span className="hint">›</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
    const name = loginAs === "admin" ? "Admin" : loginAs === "manager" ? "Physio admin" : doc(loginAs)?.name || "";
    return (
      <div style={{ maxWidth: 380, margin: "6vh auto 0" }}>
        <div className="panel pinpage">
          <button className="btn sm ghost" onClick={() => { setLoginAs(""); setPinIn(""); }}>‹ Change name</button>
          <h2>{name}</h2>
          <p className="hint">Enter your 4-digit PIN</p>
          <label className="pinbox">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`pd${pinIn.length > i ? " on" : ""}${pinIn.length === i ? " cur" : ""}`}>
                {pinIn.length > i ? "●" : ""}
              </span>
            ))}
            <input id="pin" type="password" inputMode="numeric" autoComplete="off" autoFocus maxLength={4}
              aria-label="PIN" value={pinIn} onChange={(e) => typePin(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") tryLogin(); }} />
          </label>
        </div>
      </div>
    );
  };

  /* ========================= shell ========================= */
  const tab = (v: typeof view, label: string) => (
    <button className={view === v || (v === "doctors" && view === "doctor") || (v === "leads" && view === "patient") ? "on" : ""}
      onClick={() => {
        setView(v); setDSel("");
        // har tab aaj se hi khule
        if (v === "today") { setTDay(todayS()); setTTo(""); }
        if (v === "leads") setLDay(todayS());
        if (v === "ongoing") setODay(todayS());
        if (v === "board") setBDay(todayS());
      }}>{label}</button>
  );

  // Doctor dashboard ke andar sirf yeh teen view
  const dv = view === "myongoing" || view === "myreport" || view === "patient" ? view : "mytoday";
  const me = doc(effDoc);
  const myTab = (v: "mytoday" | "myongoing" | "myreport", label: string) => (
    <button className={dv === v ? "on" : ""} onClick={() => { setView(v); if (v === "mytoday") setDay(T); }}>{label}</button>
  );

  // Upar ka search — kisi bhi patient ko naam / mobile se dhoondo, khol ke edit karo
  const SearchBox = () => {
    const t = gq.trim().toLowerCase();
    const hits = t
      ? patients.filter((p) => `${p.name} ${p.phone || ""} ${p.ailment || ""}`.toLowerCase().includes(t)).slice(0, 8)
      : [];
    const tag = (p: Patient) => isOngoing(p) ? "Ongoing" : isNew(p) ? "New patient" : p.status === "done" ? "Ended" : "Cancelled";
    return (
      <div className="gsearch">
        <input id="gsearch" placeholder="Search patient — name or mobile" value={gq} autoComplete="off"
          onChange={(e) => { setGq(e.target.value); setGi(0); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setGq(""); return; }
            if (!hits.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setGi((i) => (i + 1) % hits.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setGi((i) => (i - 1 + hits.length) % hits.length); }
            else if (e.key === "Enter") { e.preventDefault(); const h = hits[Math.min(gi, hits.length - 1)]; setGq(""); setGi(0); openPat(h.id); }
          }} />
        {!!t && (
          <div className="gres">
            {hits.length ? hits.map((p, i) => (
              <button key={p.id} className={i === Math.min(gi, hits.length - 1) ? "sel" : ""}
                onMouseEnter={() => setGi(i)} onClick={() => { setGq(""); setGi(0); openPat(p.id); }}>
                <b>{p.name}</b>
                <span className="hint">{p.phone || "no number"}{p.ailment ? ` · ${p.ailment}` : ""}</span>
                <span className={`pill ${isOngoing(p) ? "ongoing" : isNew(p) ? "bigin" : ""}`}>{tag(p)}</span>
                <span className="hint">{doc(p.doctor_id)?.name || ""}</span>
              </button>
            )) : <div className="hint" style={{ padding: 10 }}>No patient found</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="hjsp">
      <style>{CSS}</style>
      <header>
        <div className="bar">
          {loading ? (
            <div className="brand">HJS Physio Desk<small>Loading…</small></div>
          ) : !who ? (
            <div className="brand">HJS Physio Desk<small>Log in to continue</small></div>
          ) : effDoc ? (
            <>
              <div className="brand">{me?.name || "Doctor"}<small>
                {isAdmin ? "Admin viewing this doctor's dashboard" : "HJS Physio Desk · my dashboard"}
              </small></div>
              {SearchBox()}
              <nav>
                {myTab("mytoday", "My today schedule")}
                {myTab("myongoing", "My ongoing patients")}
                {myTab("myreport", "My report")}
              </nav>
              {/* New lead sirf doctor ke today schedule par */}
              {dv === "mytoday" && (
                <button className="btn newlead" onClick={() => setDlg(<NewLead />)}>+ New patient</button>
              )}
              {isAdmin
                ? <button className="btn" onClick={() => { setAsDoc(""); setView("doctors"); }}>‹ Back to admin</button>
                : <button className="btn" onClick={logout}>Log out</button>}
            </>
          ) : (
            <>
              <div className="brand">HJS Physio Desk<small>
                {`${patients.filter(isOngoing).length} ongoing · ${patients.filter(isNew).length} new patients · ${isManager ? "Physio admin" : "Admin"}`}
              </small></div>
              {SearchBox()}
              <nav>
                {tab("today", "Today's schedule")}
                {tab("leads", "Sessions")}
                {tab("ongoing", "Ongoing patients")}
                {/* Day view abhi ke liye band — wapas chahiye to bas yeh line khol do */}
                {/* {tab("board", "Day view")} */}
                {tab("doctors", "Doctors")}
                {tab("cal", "Calendar")}
                {tab("roster", "Roaster")}
                {/* Reports admin aur physio admin dono ko */}
                {(isAdmin || isManager) && tab("therapy", "Reports")}
              </nav>
              {/* New lead sirf Today's schedule aur Sessions par */}
              {(view === "today" || view === "leads") && (
                <button className="btn newlead" onClick={() => setDlg(<NewLead />)}>+ New patient</button>
              )}
              <button className="btn" onClick={logout}>Log out</button>
            </>
          )}
        </div>
      </header>
      <main>
        {loading ? <div className="stat"><span className="hint">Loading…</span></div>
          : !who ? LoginView()
          : effDoc ? (
            dv === "myongoing" ? MyOngoingView()
              : dv === "myreport" ? MyReportView()
              : dv === "patient" ? PatientView()
              : MyTodayView()
          )
          : view === "leads" ? LeadsView()
          : view === "today" ? TodayView()
          : view === "ongoing" ? OngoingView()
          : view === "board" ? BoardView()
          : view === "doctors" ? DoctorsView()
          : view === "cal" ? CalView()
          : view === "roster" ? RosterView()
          : view === "therapy" ? (isAdmin || isManager ? ReportsView() : TodayView())
          : view === "doctor" ? DoctorView()
          : view === "patient" ? PatientView()
          : LeadsView()}
      </main>
      {dlg}
      {!!msg && <div className="toast">{msg}</div>}
    </div>
  );

  /* ========================= tiny ui ========================= */
  function Modal({ title, children }: { title: string; children: React.ReactNode }) {
    // mousedown par check — warna andar ka dropdown band hone se layout khisak jata hai
    // aur click overlay par gir kar poora dialog band kar deta tha
    return (
      <div className="ovl" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
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
