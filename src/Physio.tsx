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

/* Login — har doctor apne PIN se sirf apna dashboard dekhe, admin sab kuch.
   PIN code mein fixed hain — app se koi (admin bhi) badal nahi sakta. Badalna ho to yahin badlo. */
type Who = { role: "admin"; pin: string } | { role: "doctor"; id: string; pin: string };
const WHO_KEY = "hjs-physio-who";
const ADMIN_PIN = "0000";
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
  ended_at?: string | null;          // treatment kab band hua
  end_reason?: string | null;        // kyun band hua (physio-end-reason.sql)
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
const monthKey = (d: string) => d.slice(0, 7);   // "2026-10"
const monthName = (k: string) =>
  new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

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
.hjsp .seg.wrap { flex-wrap:wrap; }
.hjsp .seg.wrap button { flex:0 0 auto; min-width:52px; text-align:center; }
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
.hjsp td .acts { margin-top:0; }
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
.hjsp .tadd { display:block; width:100%; margin-top:6px; padding:9px 10px; border:1px dashed var(--green);
  border-radius:9px; color:var(--green); font-weight:700; text-align:center; background:var(--green-soft); }
.hjsp .tnew { display:flex; gap:6px; align-items:center; margin-top:6px; padding-top:6px; border-top:1px solid var(--line); }
.hjsp .tnew input { flex:1; min-width:0; min-height:36px; }
.hjsp .rbar { display:grid; grid-template-columns:minmax(0,1fr) 90px 28px; gap:10px; align-items:center; padding:5px 0; font-size:14px; }
.hjsp .rbar i { display:block; height:10px; border-radius:99px; background:var(--red); opacity:.75; min-width:4px; }
.hjsp .rbar b { text-align:right; font-variant-numeric:tabular-nums; }
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
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [view, setView] = useState<"leads" | "today" | "ongoing" | "board" | "doctors" | "cal" | "roster" | "patient" | "doctor"
    | "mytoday" | "myongoing" | "access" | "ended">(() => (readWho()?.role === "doctor" ? "mytoday" : "leads"));

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
  const [asDoc, setAsDoc] = useState("");
  const [eMonth, setEMonth] = useState(todayS().slice(0, 7));   // Ended view — kaunsa mahina ("" = sab)
  const [eDoc, setEDoc] = useState("");          // admin kisi doctor ka dashboard dekh raha hai
  const [q, setQ] = useState("");
  const [day, setDay] = useState(todayS());
  const [showCx, setShowCx] = useState(false);
  const [oFilt, setOFilt] = useState<"all" | "due" | "today" | "fu">("all");
  const [oDoc, setODoc] = useState("");
  const [dSel, setDSel] = useState("");
  const [tDoc, setTDoc] = useState("");   // Schedule for today — doctor filter
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

  const toast = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(""), 2400);
  };

  /* ---------- load ---------- */
  const load = async () => {
    const [d, p, s, t, o] = await Promise.all([
      supabase.from("physio_doctors").select("*").order("name"),
      supabase.from("physio_patients").select("*").order("created_at", { ascending: false }),
      supabase.from("physio_sessions").select("*").order("session_date"),
      supabase.from("physio_therapies").select("*").eq("active", true).order("sort_order"),
      supabase.from("physio_off").select("*"),
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
    setOffs((o.data as Off[]) || []);   // table na ho to khali — baaki app chalti rahegi
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
  const isNew = (p: Patient) => p.status === "new";
  const isOngoing = (p: Patient) => p.status === "ongoing";
  const ongoingOf = (did: string) => patients.filter((p) => isOngoing(p) && p.doctor_id === did);
  // Plan ho to "12/20", warna bas "12 done"
  const doneText = (p: Patient, n: number) =>
    p.sessions_planned ? `${n}/${p.sessions_planned}` : `${n} done`;
  const skipOf = (p: Patient, date: string) => (p.skips || []).find((s) => s.date === date);

  const progress = (p: Patient) => {
    const ss = sessOf(p.id);
    const comp = ss.filter((s) => s.status === "completed");
    return {
      // Books se aaye patients ka asli count seq mein hai (jaise 12/20) — jo bada ho wahi
      done: Math.max(comp.length, ...comp.map((s) => s.seq || 0)),
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

  /* ---------- who is looking ---------- */
  const isAdmin = who?.role === "admin";
  // Doctor login ho to wahi doctor; admin preview kar raha ho to woh doctor
  const effDoc = who?.role === "doctor" ? who.id : asDoc;

  // PIN badal gaya / doctor hat gaya to purana login band
  useEffect(() => {
    if (loading || !who) return;
    const ok = who.role === "admin"
      ? who.pin === ADMIN_PIN
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
      setView("leads");
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
    setView("leads");
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

  /* ---------- roster ---------- */
  const offOn = (did: string, date: string) => offs.find((o) => o.doctor_id === did && o.off_date === date);
  const freeDocs = (date: string) => activeDocs.filter((d) => !offOn(d.id, date));
  const dayOf = (did: string, date: string) =>
    liveS.filter((s) => s.doctor_id === did && s.session_date === date);

  // Doctor off hai to us din ke booked sessions baaki doctors mein baant do (jiska load kam, usko pehle)
  const spreadDay = async (did: string, date: string) => {
    const mine = dayOf(did, date).filter((s) => s.status === "scheduled");
    if (!mine.length) return toast("No booked session that day");
    const pool = freeDocs(date).filter((d) => d.id !== did);
    if (!pool.length) return toast("Every other doctor is off that day too");
    const cnt: Record<string, number> = {};
    pool.forEach((d) => { cnt[d.id] = dayOf(d.id, date).length; });
    for (const s of mine) {
      const take = pool.slice().sort((a, b) => cnt[a.id] - cnt[b.id])[0];
      await supabase.from("physio_sessions").update({ doctor_id: take.id }).eq("id", s.id);
      cnt[take.id] += 1;
    }
    await load();
    toast(`${mine.length} session${mine.length === 1 ? "" : "s"} moved to ${pool.length === 1 ? pool[0].name : "other doctors"}`);
  };

  // Patient ki pichhli session jahan hui thi, wahi agli baar default
  const lastPlace = (pid: string): Place => (sessOf(pid).slice(-1)[0]?.place === "home" ? "home" : "clinic");

  const addSession = async (pid: string, did: string | null, date: string, time: string, place: Place = "clinic") => {
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

  const OffDlg = ({ d, date }: { d: Doctor; date: string }) => {
    const cur = offOn(d.id, date);
    const [kind, setKind] = useState<"off" | "leave">(cur?.kind || "off");
    const [note, setNote] = useState(cur?.note || "");
    const booked = dayOf(d.id, date).filter((s) => s.status === "scheduled");
    const others = freeDocs(date).filter((x) => x.id !== d.id);

    const mark = async () => {
      const ok = await run(
        () => supabase.from("physio_off")
          .upsert({ doctor_id: d.id, off_date: date, kind, note: note.trim() || null }, { onConflict: "doctor_id,off_date" }),
        `${d.name} · ${kind === "leave" ? "Leave" : "Week off"} · ${nice(date)}`
      );
      if (ok) close();
    };
    const clear = async () => {
      const ok = await run(() => supabase.from("physio_off").delete().eq("doctor_id", d.id).eq("off_date", date),
        `${d.name} is working on ${nice(date)}`);
      if (ok) close();
    };
    const markAndSpread = async () => {
      await supabase.from("physio_off")
        .upsert({ doctor_id: d.id, off_date: date, kind, note: note.trim() || null }, { onConflict: "doctor_id,off_date" });
      await spreadDay(d.id, date);
      close();
    };

    return (
      <Modal title={`${d.name} · ${nice(date)}`}>
        <p className="hint" style={{ marginBottom: 10 }}>
          {booked.length
            ? `${booked.length} session${booked.length === 1 ? "" : "s"} booked that day. Marking off can hand them to the other doctors.`
            : "Nothing booked that day."}
        </p>
        <Field label="Mark as">
          <div className="seg">
            <button className={kind === "off" ? "on" : ""} onClick={() => setKind("off")}>Week off</button>
            <button className={kind === "leave" ? "on home" : ""} onClick={() => setKind("leave")}>Leave</button>
          </div>
        </Field>
        <Field label="Note (optional)">
          <input placeholder="Family function, half day…" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {!!booked.length && (
          <p className="hint" style={{ marginBottom: 10 }}>
            {others.length
              ? `Free that day: ${others.map((x) => x.name).join(", ")}`
              : "No other doctor is free that day — sessions will stay where they are."}
          </p>
        )}
        <div className="end">
          {cur && <button className="btn ghost" style={{ marginRight: "auto" }} onClick={clear}>Working (clear)</button>}
          <button className="btn" onClick={close}>Cancel</button>
          {!!booked.length && !!others.length && (
            <button className="btn" onClick={markAndSpread}>Mark off + move {booked.length}</button>
          )}
          <button className="btn pri" onClick={mark}>Mark {kind === "leave" ? "leave" : "week off"}</button>
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
    const [did, setDid] = useState(p?.doctor_id || effDoc || "");
    const [rt, setRt] = useState<"daily" | "days" | "week">((p?.routine?.type as "daily") || "daily");
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
        .update({ doctor_id: did, status: "ongoing", routine, start_date: date, usual_time: time,
                  next_follow_up: null, sessions_planned: Number(packN) || null })
        .eq("id", pid);
      if (error) return toast("Could not start treatment");
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

  const ComingDlg = ({ p }: { p: Patient }) => {
    const [date, setDate] = useState(T);
    const [time, setTime] = useState(hhmm(p.usual_time) === "--" ? "10:00" : hhmm(p.usual_time));
    const [note, setNote] = useState("");
    const [place, setPlace] = useState<Place>(lastPlace(p.id));
    const save = async () => {
      if (!date || !time) return toast("Pick a date and time");
      await supabase.from("physio_sessions").insert({
        patient_id: p.id, doctor_id: p.doctor_id, session_date: date, session_time: time, seq: sessOf(p.id).length + 1, place,
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
        <PlacePick v={place} on={setPlace} />
        <Field label="Remarks (optional)"><input placeholder="Said he will come at 5…" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div className="end">
          <button className="btn" onClick={close}>Close</button>
          <button className="btn pri" onClick={save}>Book this slot</button>
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
            <PackPick v={packN} on={setPackN} label="How many sessions are they taking?" />
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
            <span className={`pill ${s.status}`}>{s.status === "scheduled" ? "pending" : s.status}</span>{" "}
            {isHome(s) && <span className="pill home">Home visit</span>}
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
                  <button className="btn sm ghost" onClick={() => p && setDlg(<RescheduleDlg p={p} />)}>Move</button>
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
    const s = q.trim().toLowerCase();
    const hit = (p: Patient) => `${p.name} ${p.phone || ""} ${p.ailment || ""}`.toLowerCase().includes(s);

    // Session complete hone ke 24 ghante baad lead board se hat jaati hai — search se wapas mil jaati hai
    const lastDone = (p: Patient) => sessOf(p.id).filter((x) => x.status === "completed").slice(-1)[0];
    const freshDone = (p: Patient) => {
      const c = lastDone(p);
      if (!c) return true;
      const when = c.completed_at ? new Date(c.completed_at).getTime() : parseYmd(c.session_date).getTime() + 864e5;
      return Date.now() - when < 864e5;
    };

    const leads = patients.filter(isNew);
    const todayOn = patients.filter((p) => isOngoing(p) && (sessOf(p.id).some((x) => x.session_date === T) || dueOn(p, T)));
    // Search chal rahi ho to poori history — warna sirf aaj ka kaam
    let rows = s
      ? patients.filter((p) => p.status !== "cancelled" && hit(p))
      : [...leads.filter(freshDone), ...todayOn];

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
        <div className="stats">
          <Stat n={leads.filter((p) => createdDay(p) === T).length} l="New leads today" />
          <Stat n={todayOn.length} l="Ongoing coming today" />
          <Stat n={noDoc} l="Doctor not assigned" />
          <Stat n={noTime} l="Time not scheduled" />
          <Stat n={notDone} l="Session not completed" />
          <Stat n={cx.length} l="Cancelled leads" on={showCx} onClick={() => setShowCx(!showCx)} />
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
                <button className="btn sm" onClick={() => updPatient(p.id, { status: "new" }, "Lead reopened")}>Reopen</button>
              </div>
            )) : <span className="hint">No cancelled leads</span>}
          </div>
        )}
        {!rows.length ? (
          <div className="stat">
            <span className="hint">{s ? "No patient matches that search." : "Nothing for today. Use \"+ New lead\" to add one."}</span>
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
    const dayS = liveS
      .filter((x) => x.session_date === T && mineDoc(x.doctor_id))
      .sort((a, b) => a.session_time.localeCompare(b.session_time));
    const pend = dayS.filter((x) => x.status === "scheduled");
    const done = dayS.filter((x) => x.status === "completed");
    // Routine ke hisaab se aaj aana tha, par time abhi laga nahi
    const noTime = patients.filter((p) => isOngoing(p) && mineDoc(p.doctor_id) && dueOn(p, T)
      && !sessOf(p.id).some((x) => x.session_date === T) && !skipOf(p, T))
      .sort((a, b) => a.name.localeCompare(b.name));
    const notComing = patients.filter((p) => isOngoing(p) && mineDoc(p.doctor_id) && skipOf(p, T));

    return (
      <>
        <div className="dayhead"><div className="d">Schedule for today · {nice(T)}</div></div>
        <div className="seg wrap" style={{ marginBottom: 12 }}>
          <button className={!tDoc ? "on" : ""} onClick={() => setTDoc("")}>All doctors</button>
          {activeDocs.map((d) => (
            <button key={d.id} className={tDoc === d.id ? "on" : ""} onClick={() => setTDoc(d.id)}>{d.name}</button>
          ))}
        </div>
        <div className="stats">
          <Stat n={dayS.length} l="Booked today" />
          <Stat n={pend.length} l="Pending" />
          <Stat n={done.length} l="Done" />
          <Stat n={noTime.length} l="Due, time not set" />
          <Stat n={notComing.length} l="Not coming" />
        </div>

        <h3 style={{ margin: "14px 0 8px" }}>Booked sessions</h3>
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Patient</th><th>Time</th><th>Doctor</th><th>Where</th><th>Sessions</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {dayS.map((x) => {
                const p = pat(x.patient_id);
                const d = doc(x.doctor_id);
                return (
                  <tr key={x.id}>
                    <td>
                      <button className="lnk" onClick={() => p && openPat(p.id)}>{p?.name || "(deleted)"}</button>
                      <div className="hint">{p?.phone}{p?.ailment ? ` · ${p.ailment}` : ""}</div>
                    </td>
                    <td><b style={{ fontSize: 16 }}>{hhmm(x.session_time)}</b></td>
                    <td>{d ? <button className="lnk" onClick={() => openDocView(d.id)}>{d.name}</button> : "—"}</td>
                    <td>{isHome(x) ? <span className="pill home">Home</span> : <span className="hint">Clinic</span>}</td>
                    <td>{p ? (isOngoing(p) ? doneText(p, progress(p).done) : <span className="pill bigin">New lead</span>) : "—"}</td>
                    <td><span className={`pill ${x.status}`}>{x.status === "scheduled" ? "pending" : "done"}</span></td>
                    <td>
                      {x.status === "scheduled" ? (
                        <>
                          <button className="btn sm pri" onClick={() => markSession(x, "completed")}>Complete</button>{" "}
                          {p && <button className="btn sm ghost" onClick={() => setDlg(<RescheduleDlg p={p} />)}>Move</button>}
                        </>
                      ) : (
                        <span className="pill completed">Done ✓</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!dayS.length && <tr><td colSpan={7}><span className="hint">No sessions booked for today yet.</span></td></tr>}
            </tbody>
          </table>
        </div>

        <h3 style={{ margin: "18px 0 8px" }}>Due today — time not set</h3>
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
                      <button className="btn sm pri" onClick={() => setDlg(<ComingDlg p={p} />)}>Coming</button>{" "}
                      <button className="btn sm ghost danger" onClick={() => setDlg(<NotComingDlg p={p} />)}>Not coming</button>
                    </td>
                  </tr>
                );
              })}
              {!noTime.length && <tr><td colSpan={6}><span className="hint">Everyone due today has a time.</span></td></tr>}
            </tbody>
          </table>
        </div>

        {notComing.length > 0 && (
          <>
            <h3 style={{ margin: "18px 0 8px" }}>Not coming today</h3>
            <div className="panel">
              {notComing.map((p) => {
                const sk = skipOf(p, T)!;
                return (
                  <div className="drow" key={p.id}>
                    <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                    <span className="tag fu">{sk.reason}</span>
                    {sk.note && <span className="hint">{sk.note}</span>}
                  </div>
                );
              })}
            </div>
          </>
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
                      <td><b style={{ fontSize: 16 }}>{doneText(p, pr.done)}</b></td>
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
          <Stat n={mine.length - done} l="Pending" />
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
  const RosterView = () => {
    if (!activeDocs.length) return <div className="stat"><span className="hint">No doctors yet.</span></div>;
    const days = Array.from({ length: 14 }, (_, i) => addDays(day, i));
    const offToday = activeDocs.filter((d) => offOn(d.id, T));
    return (
      <>
        <div className="dayhead">
          <div className="d">Roaster</div>
          <button className="btn sm" onClick={() => setDay(addDays(day, -7))}>‹ Prev 7 days</button>
          <button className="btn sm" onClick={() => setDay(T)}>From today</button>
          <button className="btn sm" onClick={() => setDay(addDays(day, 7))}>Next 7 days ›</button>
          <input type="date" className="btn sm" style={{ width: "auto" }} value={day} onChange={(e) => setDay(e.target.value || T)} />
        </div>
        <div className="stats">
          <Stat n={activeDocs.length - offToday.length} l="Working today" />
          <Stat n={offToday.length} l="Off today" />
          <Stat n={offToday.reduce((n, d) => n + dayOf(d.id, T).filter((s) => s.status === "scheduled").length, 0)} l="To reassign today" />
        </div>
        <p className="hint" style={{ marginBottom: 10 }}>
          Tap any box to mark week off or leave. If that doctor already has sessions that day, the dialog can hand them to the other doctors.
        </p>
        {offToday.map((d) => {
          const stuck = dayOf(d.id, T).filter((s) => s.status === "scheduled");
          if (!stuck.length) return null;
          return (
            <div className="panel" key={d.id}>
              <div className="drow">
                <b>{d.name} is off today</b>
                <span className="tag fu">{stuck.length} session{stuck.length === 1 ? "" : "s"} still on them</span>
                <button className="btn sm pri" onClick={() => spreadDay(d.id, T)}>Share out to other doctors</button>
              </div>
            </div>
          );
        })}
        <div className="tbl">
          <table className="roster">
            <thead>
              <tr>
                <th>Doctor</th>
                {days.map((dt) => (
                  <th key={dt} className={dt === T ? "today" : ""}>
                    {DOW[parseYmd(dt).getDay()]}<br /><span className="hint">{nice(dt).replace(/^\w+, /, "")}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeDocs.map((d) => (
                <tr key={d.id}>
                  <td><button className="lnk" onClick={() => openDocView(d.id)}>{d.name}</button></td>
                  {days.map((dt) => {
                    const o = offOn(d.id, dt);
                    const n = dayOf(d.id, dt).length;
                    return (
                      <td key={dt} className={dt === T ? "today" : ""}>
                        <button className={`rcell${o ? ` ${o.kind}` : ""}${o && n ? " clash" : ""}`}
                          onClick={() => setDlg(<OffDlg d={d} date={dt} />)}>
                          <div className="c">{o ? (o.kind === "leave" ? "Leave" : "Off") : n || "—"}</div>
                          <div className="k">{o ? (n ? `${n} booked!` : o.note || "free") : n ? "booked" : "no session"}</div>
                        </button>
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
          <button className="btn sm pri" onClick={() => { setAsDoc(d.id); setDay(T); setView("mytoday"); }}>Open their dashboard</button>
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
          <button className="btn sm" onClick={() => setView(effDoc ? (isOngoing(p) ? "myongoing" : "mytoday") : isOngoing(p) ? "ongoing" : "leads")}>‹ Back</button>
        </div>
        <div className="tools">
          <span className={`pill ${srcCls(p.source)}`}>{p.source}</span>
          <span className="hint">{p.phone || "no number"}{p.ailment ? ` · ${p.ailment}` : ""}</span>
          {d ? <span className="hint">Doctor: {effDoc ? <b>{d.name}</b> : <button className="lnk" onClick={() => openDocView(d.id)}>{d.name}</button>}</span>
             : <span className="hint">No doctor yet</span>}
          {isOngoing(p) ? <span className="rt">{routineLabel(p.routine)}</span>
            : <span className="pill">{isNew(p) ? "New lead" : p.status === "cancelled" ? "Cancelled" : "Finished"}</span>}
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
              <button className="btn sm" onClick={() => updPatient(p.id, { status: "new" }, "Lead reopened")}>Reopen lead</button>
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
          <button className={`btn${pr.today ? "" : " pri"}`} onClick={() => setDlg(<ScheduleDlg p={p} />)}>Book a session</button>
          {isNew(p) && <button className="btn pri" onClick={() => setDlg(<OngoingDlg p={p} />)}>Ongoing</button>}
          <button className="btn" onClick={() => setDlg(<FollowUpDlg p={p} />)}>Log follow-up</button>
          {!!next.length && <button className="btn" onClick={() => setDlg(<RescheduleDlg p={p} />)}>Reschedule</button>}
          {isNew(p) && <button className="btn ghost danger" onClick={() => setDlg(<CancelLeadDlg p={p} />)}>Cancel lead</button>}
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
    const pend = dayS.filter((s) => s.status === "scheduled");
    const done = dayS.filter((s) => s.status === "completed");
    const mineOn = ongoingOf(d.id);
    const isT = day === T;
    const dueNoTime = isT
      ? mineOn.filter((p) => dueOn(p, T) && !sessOf(p.id).some((s) => s.session_date === T) && !skipOf(p, T))
      : [];
    const notComing = isT ? mineOn.filter((p) => skipOf(p, T)) : [];
    // Lead mili hai par abhi koi session book nahi hua
    const newLeads = patients.filter((p) => isNew(p) && p.doctor_id === d.id && !sessOf(p.id).length);

    return (
      <>
        <div className="dayhead">
          <div className="d">{isT ? "Today · " : day === addDays(T, 1) ? "Tomorrow · " : ""}{nice(day)}</div>
          <button className="btn sm" onClick={() => setDay(addDays(day, -1))}>‹ Prev</button>
          <button className="btn sm" onClick={() => setDay(T)}>Today</button>
          <button className="btn sm" onClick={() => setDay(addDays(day, 1))}>Next ›</button>
          <button className="btn sm pri" onClick={() => setDlg(<NewLead />)}>+ New lead</button>
        </div>
        <div className="stats">
          <Stat n={dayS.length} l={isT ? "Booked today" : "Booked this day"} />
          <Stat n={pend.length} l="Pending" />
          <Stat n={done.length} l="Completed" />
          <Stat n={mineOn.length} l="My ongoing patients" onClick={() => setView("myongoing")} />
          <Stat n={newLeads.length} l="New leads, no time yet" />
        </div>

        <h3 style={{ margin: "14px 0 8px" }}>My sessions</h3>
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Patient</th><th>Time</th><th>Type</th><th>Where</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {dayS.map((x) => {
                const p = pat(x.patient_id);
                return (
                  <tr key={x.id}>
                    <td>
                      <button className="lnk" onClick={() => p && openPat(p.id)}>{p?.name || "(deleted)"}</button>
                      <div className="hint">{p?.phone}{p?.ailment ? ` · ${p.ailment}` : ""}</div>
                      {!!(x.therapies || []).length && <div className="thl">{(x.therapies || []).join(" · ")}</div>}
                    </td>
                    <td><b style={{ fontSize: 16 }}>{hhmm(x.session_time)}</b></td>
                    <td>
                      {p && isOngoing(p)
                        ? <><span className="pill ongoing">Ongoing</span> <span className="hint">{doneText(p, progress(p).done)}</span></>
                        : <span className={`pill ${srcCls(p?.source || null)}`}>New lead{p?.source ? ` · ${p.source}` : ""}</span>}
                    </td>
                    <td>{isHome(x) ? <span className="pill home">Home visit</span> : <span className="hint">Clinic</span>}</td>
                    <td><span className={`pill ${x.status}`}>{x.status === "scheduled" ? "pending" : "done"}</span></td>
                    <td>
                      <div className="acts">
                        {x.status === "scheduled" ? (
                          <>
                            <button className="btn sm pri" onClick={() => markSession(x, "completed")}>Complete</button>
                            {p && <button className="btn sm" onClick={() => setDlg(<RescheduleDlg p={p} />)}>Reschedule</button>}
                            {p && (isOngoing(p)
                              ? <button className="btn sm ghost danger" onClick={() => setDlg(<NotComingDlg p={p} />)}>Not coming</button>
                              : <button className="btn sm ghost danger" onClick={() => setDlg(<CancelLeadDlg p={p} />)}>Cancel</button>)}
                          </>
                        ) : (
                          <>
                            <span className="pill completed">Done ✓</span>
                            {p && isNew(p) && <button className="btn sm" onClick={() => setDlg(<OngoingDlg p={p} />)}>Ongoing</button>}
                            {p && isNew(p) && <button className="btn sm" onClick={() => setDlg(<ScheduleDlg p={p} />)}>Book again</button>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!dayS.length && <tr><td colSpan={6}><span className="hint">No sessions booked {isT ? "for today" : "this day"}.</span></td></tr>}
            </tbody>
          </table>
        </div>

        {!!dueNoTime.length && (
          <>
            <h3 style={{ margin: "18px 0 8px" }}>Due today — time not set yet</h3>
            <p className="hint" style={{ marginBottom: 8 }}>These patients usually come today. Set their time or mark them not coming.</p>
            <div className="panel">
              {dueNoTime.map((p) => (
                <div className="drow" key={p.id}>
                  <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                  <span className="hint">{p.phone}{p.ailment ? ` · ${p.ailment}` : ""}</span>
                  <span className="rt">{routineLabel(p.routine)}</span>
                  <span className="pill">{doneText(p, progress(p).done)}</span>
                  <button className="btn sm pri" onClick={() => setDlg(<ComingDlg p={p} />)}>Coming</button>
                  <button className="btn sm ghost danger" onClick={() => setDlg(<NotComingDlg p={p} />)}>Not coming</button>
                </div>
              ))}
            </div>
          </>
        )}

        {!!notComing.length && (
          <>
            <h3 style={{ margin: "18px 0 8px" }}>Not coming today</h3>
            <div className="panel">
              {notComing.map((p) => {
                const sk = skipOf(p, T)!;
                return (
                  <div className="drow" key={p.id}>
                    <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                    <span className="tag fu">{sk.reason}</span>
                    {sk.note && <span className="hint">{sk.note}</span>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!!newLeads.length && (
          <>
            <h3 style={{ margin: "18px 0 8px" }}>New leads assigned to me — no time yet</h3>
            <div className="panel">
              {newLeads.map((p) => (
                <div className="drow" key={p.id}>
                  <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                  <span className="hint">{p.phone}{p.ailment ? ` · ${p.ailment}` : ""}</span>
                  <span className={`pill ${srcCls(p.source)}`}>{p.source}</span>
                  <span className="hint">{nice(createdDay(p))}</span>
                  <button className="btn sm pri" onClick={() => setDlg(<ScheduleDlg p={p} />)}>Set date &amp; time</button>
                  <button className="btn sm" onClick={() => setDlg(<OngoingDlg p={p} />)}>Ongoing</button>
                  <button className="btn sm ghost danger" onClick={() => setDlg(<CancelLeadDlg p={p} />)}>Cancel</button>
                </div>
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  // View 2 — mere saare ongoing patients
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

  /* ========================= ended patients ========================= */
  // Jinka treatment band hua — mahine ke hisaab se kitne, kyun, kis doctor ke
  const EndedView = () => {
    const all = patients.filter((p) => p.status === "done")
      .map((p) => ({ p, e: endInfo(p) }))
      .filter((x) => !eDoc || x.p.doctor_id === eDoc)
      .sort((a, b) => b.e.date.localeCompare(a.e.date));
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = parseYmd(T); d.setDate(1); d.setMonth(d.getMonth() - (5 - i));
      return ymd(d).slice(0, 7);
    });
    const list = eMonth ? all.filter((x) => monthKey(x.e.date) === eMonth) : all;
    const count = (arr: string[]) => {
      const m: Record<string, number> = {};
      arr.forEach((k) => { m[k] = (m[k] || 0) + 1; });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    const byReason = count(list.map((x) => x.e.reason));
    const byDoc = count(list.map((x) => doc(x.p.doctor_id)?.name || "No doctor"));
    const top = Math.max(1, ...byReason.map(([, n]) => n));
    const avgDone = list.length ? Math.round(list.reduce((n, x) => n + progress(x.p).done, 0) / list.length) : 0;

    return (
      <>
        <div className="dayhead">
          <div className="d">Ended patients</div>
          <select value={eDoc} onChange={(e) => setEDoc(e.target.value)} style={{ width: "auto", minWidth: 180 }}>
            <option value="">All doctors</option>
            {activeDocs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <p className="hint" style={{ marginBottom: 10 }}>Ended patients stay saved with every session. Tap a month to see who ended and why.</p>
        <div className="stats">
          {months.map((m) => (
            <Stat key={m} n={all.filter((x) => monthKey(x.e.date) === m).length}
              l={m === T.slice(0, 7) ? `${monthName(m)} (this month)` : monthName(m)}
              on={eMonth === m} onClick={() => setEMonth(m)} />
          ))}
          <Stat n={all.length} l="All time" on={!eMonth} onClick={() => setEMonth("")} />
        </div>

        <div className="cols" style={{ marginBottom: 14 }}>
          <div className="col">
            <h3>Why they ended<em>{eMonth ? monthName(eMonth) : "All time"}</em></h3>
            <div style={{ padding: "8px 14px" }}>
              {byReason.length ? byReason.map(([r, n]) => (
                <div key={r} className="rbar">
                  <span>{r}</span>
                  <i style={{ width: `${(n / top) * 100}%` }} />
                  <b>{n}</b>
                </div>
              )) : <span className="hint">Nobody ended in this period.</span>}
            </div>
          </div>
          <div className="col">
            <h3>By doctor<em>avg {avgDone} sessions done</em></h3>
            <div style={{ padding: "8px 14px" }}>
              {byDoc.length ? byDoc.map(([d, n]) => (
                <div className="drow" key={d}><span style={{ marginRight: "auto" }}>{d}</span><b>{n}</b></div>
              )) : <span className="hint">—</span>}
            </div>
          </div>
        </div>

        <div className="tbl">
          <table>
            <thead>
              <tr><th>Patient</th><th>Doctor</th><th>Sessions</th><th>Started</th><th>Ended on</th><th>Reason</th><th>Remarks</th><th /></tr>
            </thead>
            <tbody>
              {list.map(({ p, e }) => (
                <tr key={p.id}>
                  <td>
                    <button className="lnk" onClick={() => openPat(p.id)}>{p.name}</button>
                    <div className="hint">{p.phone}{p.ailment ? ` · ${p.ailment}` : ""}</div>
                  </td>
                  <td>{doc(p.doctor_id)?.name || "—"}</td>
                  <td><b>{doneText(p, progress(p).done)}</b></td>
                  <td>{p.start_date ? nice(p.start_date) : "—"}</td>
                  <td>{nice(e.date)}</td>
                  <td><span className={`tag ${e.reason === "Not recorded" ? "" : "fu"}`}>{e.reason}</span></td>
                  <td style={{ whiteSpace: "normal", minWidth: 160 }}><span className="hint">{e.note || "—"}</span></td>
                  <td><button className="btn sm" onClick={() => setDlg(<OngoingDlg p={p} />)}>Restart</button></td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={8}><span className="hint">No ended patients {eMonth ? `in ${monthName(eMonth)}` : "yet"}.</span></td></tr>}
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
          <p className="hint" style={{ marginBottom: 12 }}>Doctors see only their own dashboard. Admin sees everything.</p>
          <div className="dpick" style={{ maxHeight: "none" }}>
            {/* Admin sabse upar */}
            <button className="dopt" onClick={() => { setLoginAs("admin"); setPinIn(""); }}>
              <b>Admin</b><span className="tag load">Full desk</span><span className="hint">›</span>
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
    const name = loginAs === "admin" ? "Admin" : doc(loginAs)?.name || "";
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

  // Admin: har doctor ka dashboard yahan se khulta hai. PIN sirf dikhte hain, badal nahi sakte.
  const AccessView = () => (
    <>
      <div className="dayhead"><div className="d">Doctor dashboards</div></div>
      <p className="hint" style={{ marginBottom: 8 }}>
        Each doctor logs in with their own PIN and sees only their sessions and ongoing patients. PINs are fixed. Admin PIN is {ADMIN_PIN}.
      </p>
      <div className="tbl">
        <table>
          <thead><tr><th>Doctor</th><th>PIN</th><th>Today</th><th>Ongoing</th><th /></tr></thead>
          <tbody>
            {activeDocs.map((d) => {
              const st = docStats(d);
              return (
                <tr key={d.id}>
                  <td><b>{d.name}</b></td>
                  <td>{pinOf(d) ? <b style={{ letterSpacing: ".1em" }}>{pinOf(d)}</b> : <span className="pill scheduled">No PIN</span>}</td>
                  <td>{st.done.length}/{st.today.length} done</td>
                  <td>{st.ongoing.length}</td>
                  <td>
                    <button className="btn sm pri" onClick={() => { setAsDoc(d.id); setDay(T); setView("mytoday"); }}>Open dashboard</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  /* ========================= shell ========================= */
  const tab = (v: typeof view, label: string) => (
    <button className={view === v || (v === "board" && view === "doctor") || (v === "leads" && view === "patient") ? "on" : ""}
      onClick={() => { setView(v); setDSel(""); }}>{label}</button>
  );

  // Doctor dashboard ke andar sirf yeh teen view
  const dv = view === "myongoing" || view === "patient" ? view : "mytoday";
  const me = doc(effDoc);
  const myTab = (v: "mytoday" | "myongoing", label: string) => (
    <button className={dv === v ? "on" : ""} onClick={() => { setView(v); if (v === "mytoday") setDay(T); }}>{label}</button>
  );

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
              <nav>
                {myTab("mytoday", "Today")}
                {myTab("myongoing", "My ongoing patients")}
              </nav>
              {isAdmin
                ? <button className="btn" onClick={() => { setAsDoc(""); setView("access"); }}>‹ Back to admin</button>
                : <button className="btn" onClick={logout}>Log out</button>}
            </>
          ) : (
            <>
              <div className="brand">HJS Physio Desk<small>{`${patients.filter(isOngoing).length} ongoing · ${patients.filter(isNew).length} open leads · Admin`}</small></div>
              <nav>
                {tab("leads", "Sessions")}
                {tab("today", "Today's schedule")}
                {tab("ongoing", "Ongoing patients")}
                {tab("board", "Day view")}
                {tab("doctors", "Doctors")}
                {tab("cal", "Calendar")}
                {tab("roster", "Roaster")}
                {tab("ended", "Ended")}
                {tab("access", "Doctor dashboards")}
              </nav>
              <button className="btn pri" onClick={() => setDlg(<NewLead />)}>+ New lead</button>
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
              : dv === "patient" ? <PatientView />
              : MyTodayView()
          )
          : view === "leads" ? <LeadsView />
          : view === "today" ? <TodayView />
          : view === "ongoing" ? <OngoingView />
          : view === "board" ? <BoardView />
          : view === "doctors" ? <DoctorsView />
          : view === "cal" ? <CalView />
          : view === "roster" ? <RosterView />
          : view === "doctor" ? <DoctorView />
          : view === "access" ? AccessView()
          : view === "ended" ? EndedView()
          : view === "patient" ? <PatientView />
          : <LeadsView />}
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
