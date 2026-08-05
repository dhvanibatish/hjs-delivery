// ============================================================
// HJS Attendance v5 — light theme, Zoho People style layout
// Desktop: navy icon rail + top bar + sub-tab bar
// Mobile : top bar + scrollable tab row
// Multiple check-in / check-out per day (sessions).
// Chalao: hjs_attendance_v2.sql phir hjs_attendance_v3.sql
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
  background: #f0f1f4; color: #1f2328;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14.5px; line-height: 1.45; -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}
.hjsatt h1, .hjsatt h2, .hjsatt h3, .hjsatt h4, .hjsatt p, .hjsatt b,
.hjsatt span, .hjsatt div, .hjsatt td, .hjsatt th, .hjsatt li {
  color: #1f2328; font-weight: inherit; text-align: left; }
.hjsatt b { font-weight: 650; }
.hjsatt button { font: inherit; cursor: pointer; border: 0; background: transparent;
  color: #1f2328; text-align: left; }
.hjsatt input, .hjsatt select, .hjsatt textarea {
  font-family: inherit; font-size: 15px; width: 100%; padding: 10px 12px;
  border: 1px solid #d6d9de; border-radius: 8px; background: #fff; color: #1f2328;
  outline: none; -webkit-appearance: none; appearance: none; min-height: 42px; }
.hjsatt select { padding-right: 32px;
  background-image: linear-gradient(45deg, transparent 50%, #6b7280 50%),
                    linear-gradient(135deg, #6b7280 50%, transparent 50%);
  background-position: calc(100% - 17px) 19px, calc(100% - 12px) 19px;
  background-size: 5px 5px; background-repeat: no-repeat; }
.hjsatt input[type=checkbox] { width: 18px; height: 18px; min-height: 0; accent-color: #2563eb; }
.hjsatt input::placeholder, .hjsatt textarea::placeholder { color: #9ca3af; }
.hjsatt input:focus, .hjsatt select:focus, .hjsatt textarea:focus {
  border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.12); }
.hjsatt label { display: block; font-size: 12.5px; font-weight: 600; color: #6b7280; margin-bottom: 6px; }

/* ---------- rail ---------- */
.hjsatt .att-rail { width: 82px; flex-shrink: 0; background: #223354; display: flex;
  flex-direction: column; align-items: center; gap: 3px; padding: 12px 6px;
  padding-top: calc(12px + env(safe-area-inset-top)); overflow-y: auto; }
.hjsatt .att-rail::-webkit-scrollbar { display: none; }
.hjsatt .att-raillogo { width: 38px; height: 38px; border-radius: 10px; margin-bottom: 10px;
  background: linear-gradient(140deg, #38bdf8, #2563eb); display: flex; align-items: center;
  justify-content: center; font-size: 12px; font-weight: 800; color: #fff; }
.hjsatt .att-railbtn { width: 100%; padding: 9px 2px 7px; border-radius: 10px;
  display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative; }
.hjsatt .att-railbtn span { font-size: 10.5px; color: #9fb0cd; text-align: center;
  line-height: 1.25; font-weight: 500; }
.hjsatt .att-railbtn .ic { width: 34px; height: 30px; border-radius: 9px; display: flex;
  align-items: center; justify-content: center; }
.hjsatt .att-railbtn:hover .ic { background: rgba(255,255,255,.08); }
.hjsatt .att-railbtn.on .ic { background: #2563eb; }
.hjsatt .att-railbtn.on span { color: #fff; }
.hjsatt .att-railbtn .cnt { position: absolute; top: 4px; right: 14px; min-width: 17px;
  height: 17px; line-height: 17px; border-radius: 99px; background: #dc2626; color: #fff;
  font-size: 10px; font-weight: 700; text-align: center; padding: 0 4px; }

/* ---------- body ---------- */
.hjsatt .att-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.hjsatt .att-topbar { flex-shrink: 0; background: #223354; display: flex; align-items: center;
  gap: 12px; padding: 0 16px; height: 54px; padding-top: env(safe-area-inset-top);
  height: calc(54px + env(safe-area-inset-top)); }
.hjsatt .att-topbar b, .hjsatt .att-topbar span { color: #fff; }
.hjsatt .att-topbar .sub { color: #9fb0cd; font-size: 12.5px; }
.hjsatt .att-signout { border: 1px solid rgba(255,255,255,.28); border-radius: 7px;
  padding: 6px 12px; font-size: 13px; color: #fff; }

.hjsatt .att-mtabs { display: none; background: #fff; border-bottom: 1px solid #e5e7eb;
  overflow-x: auto; scrollbar-width: none; }
.hjsatt .att-mtabs::-webkit-scrollbar { display: none; }
.hjsatt .att-subbar { flex-shrink: 0; background: #fff; border-bottom: 1px solid #e5e7eb;
  display: flex; gap: 2px; padding: 0 12px; overflow-x: auto; scrollbar-width: none; }
.hjsatt .att-subbar::-webkit-scrollbar { display: none; }
.hjsatt .att-tab { padding: 12px 14px 11px; font-size: 14px; font-weight: 600; color: #5b6472;
  white-space: nowrap; flex-shrink: 0; position: relative; }
.hjsatt .att-tab.on { color: #2563eb; box-shadow: inset 0 -2px 0 #2563eb; }
.hjsatt .att-tab .cnt { display: inline-block; margin-left: 6px; min-width: 18px; height: 18px;
  line-height: 18px; border-radius: 99px; background: #dc2626; color: #fff; font-size: 10.5px;
  font-weight: 700; text-align: center; padding: 0 5px; }

.hjsatt .att-main { flex: 1; min-width: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }

@media (max-width: 899px) {
  .hjsatt .att-rail { display: none; }
  .hjsatt .att-mtabs { display: flex; }
}

/* ---------- generic ---------- */
.hjsatt .att-wrap { max-width: 1240px; margin: 0 auto; padding: 16px 14px 44px; }
.hjsatt .att-narrow { max-width: 720px; }
.hjsatt .att-center { min-height: 100%; display: flex; align-items: center;
  justify-content: center; padding: 24px 16px; }
.hjsatt .att-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 16px; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
.hjsatt .att-stack > * + * { margin-top: 12px; }
.hjsatt .att-muted { color: #6b7280; font-size: 13px; }
.hjsatt .att-h1 { font-size: 21px; font-weight: 700; letter-spacing: -0.02em; }
.hjsatt .att-h2 { font-size: 15px; font-weight: 700; margin-bottom: 9px; }
.hjsatt .att-flex { display: flex; align-items: center; gap: 9px; }
.hjsatt .att-between { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.hjsatt .att-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.hjsatt .att-cols { display: grid; gap: 13px; align-items: start; }
@media (min-width: 1000px) { .hjsatt .att-cols { grid-template-columns: 340px 1fr; } }
.hjsatt .att-col { display: flex; flex-direction: column; gap: 13px; }

.hjsatt .att-btn { display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; min-height: 42px; padding: 11px; border-radius: 8px;
  background: #2563eb; color: #fff; font-weight: 600; }
.hjsatt .att-btn:active { transform: scale(.99); }
.hjsatt .att-btn:disabled { opacity: .45; }
.hjsatt .att-btn.sm { width: auto; min-height: 36px; padding: 8px 14px; font-size: 13px; }
.hjsatt .att-btn.grey { background: #eef0f3; color: #374151; }
.hjsatt .att-btn.line { background: #fff; border: 1px solid #d6d9de; color: #374151; }
.hjsatt .att-btn.gin { background: #fff; border: 1.5px solid #16a34a; color: #16a34a; }
.hjsatt .att-btn.gout { background: #fff; border: 1.5px solid #dc2626; color: #dc2626; }
.hjsatt .att-btn.green { background: #16a34a; color: #fff; }
.hjsatt .att-btn.big { min-height: 46px; font-size: 15.5px; font-weight: 650; }

.hjsatt .att-note { padding: 10px 12px; border-radius: 8px; font-size: 13.5px; }
.hjsatt .att-note.err, .hjsatt .att-note.err span { background: #fef2f2; color: #b42318; }
.hjsatt .att-note.ok, .hjsatt .att-note.ok span { background: #ecfdf3; color: #067647; }

.hjsatt .att-pill { display: inline-block; padding: 3px 9px; border-radius: 6px;
  font-size: 11.5px; font-weight: 650; white-space: nowrap; }
.hjsatt .p-Present, .hjsatt .p-Approved { background: #ecfdf3; color: #067647; }
.hjsatt .p-Late, .hjsatt .p-Pending { background: #fffaeb; color: #b54708; }
.hjsatt .p-HalfDay { background: #fff6ed; color: #c4320a; }
.hjsatt .p-Absent, .hjsatt .p-Rejected { background: #fef3f2; color: #b42318; }
.hjsatt .p-Leave { background: #eff8ff; color: #175cd3; }
.hjsatt .p-Off { background: #f2f4f7; color: #475467; }

.hjsatt .att-av { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 13px; color: #fff; }
.hjsatt .att-av.lg { width: 82px; height: 82px; font-size: 27px; border-radius: 14px; }

/* ---------- punch card ---------- */
.hjsatt .att-punch { text-align: center; }
.hjsatt .att-punch p, .hjsatt .att-punch div, .hjsatt .att-punch span,
.hjsatt .att-punch b { text-align: center; }
.hjsatt .att-hms { display: flex; justify-content: center; align-items: center; gap: 6px;
  margin: 12px 0 4px; }
.hjsatt .att-hms i { font-style: normal; background: #f2f4f7; border-radius: 8px;
  min-width: 54px; padding: 7px 6px; font-size: 24px; font-weight: 700;
  font-variant-numeric: tabular-nums; }
.hjsatt .att-hms u { text-decoration: none; color: #98a2b3; font-size: 17px; }
.hjsatt .att-live { display: inline-block; width: 7px; height: 7px; border-radius: 50%;
  background: #16a34a; margin-right: 6px; animation: attpulse 1.6s infinite; }
@keyframes attpulse { 0%,100% { opacity: 1 } 50% { opacity: .25 } }

.hjsatt .att-sess { display: flex; align-items: center; gap: 8px; padding: 8px 0;
  font-size: 13px; border-top: 1px dashed #e5e7eb; }
.hjsatt .att-sess span, .hjsatt .att-sess b { text-align: left; }

.hjsatt .att-greet { border-radius: 10px; padding: 18px 20px; border: 1px solid #e5e7eb;
  background: linear-gradient(105deg, #eef4ff 0%, #ffffff 62%); }
.hjsatt .att-greet h3 { font-size: 18px; font-weight: 700; }
.hjsatt .att-greet p { color: #6b7280; font-size: 13.5px; margin-top: 2px; }

.hjsatt .att-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.hjsatt .att-day { border: 1px solid #e5e7eb; border-radius: 9px; padding: 9px 4px; background: #fff; }
.hjsatt .att-day.now { border-color: #2563eb; background: #f5f8ff; }
.hjsatt .att-day span, .hjsatt .att-day b { display: block; text-align: center; }
.hjsatt .att-day .dn { font-size: 10.5px; color: #6b7280; }
.hjsatt .att-day .dd { font-size: 15px; font-weight: 700; }
.hjsatt .att-day .ds { font-size: 10px; font-weight: 700; margin-top: 4px; }
.hjsatt .att-day .dh { font-size: 10px; color: #98a2b3; }

.hjsatt .att-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.hjsatt .att-grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.hjsatt .att-stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 12px 6px; }
.hjsatt .att-stat b { display: block; font-size: 20px; font-weight: 700; text-align: center; }
.hjsatt .att-stat span { display: block; font-size: 11px; color: #6b7280; text-align: center; }

.hjsatt .att-bal { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 13px; }
.hjsatt .att-bal .n { font-size: 23px; font-weight: 700; }
.hjsatt .att-bal .t { font-size: 12.5px; color: #6b7280; }
.hjsatt .att-bar { height: 6px; border-radius: 99px; background: #eef0f3; margin-top: 9px; overflow: hidden; }
.hjsatt .att-bar i { display: block; height: 100%; border-radius: 99px; background: #2563eb; }

.hjsatt .att-list { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  overflow: hidden; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
.hjsatt .att-row { display: flex; align-items: center; gap: 10px; padding: 11px 14px; font-size: 14px; }
.hjsatt .att-row + .att-row { border-top: 1px solid #f1f2f4; }
.hjsatt .att-row .grow { flex: 1; min-width: 0; }
.hjsatt .att-row .grow p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hjsatt .att-empty { padding: 16px; color: #6b7280; font-size: 14px; }
.hjsatt .att-hd { display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border-bottom: 1px solid #f1f2f4; }
.hjsatt .att-hd b { font-size: 14.5px; }

.hjsatt .att-seg { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.hjsatt .att-seg::-webkit-scrollbar { display: none; }
.hjsatt .att-seg button { padding: 8px 14px; border-radius: 7px; font-size: 13px;
  color: #475467; white-space: nowrap; background: #fff; border: 1px solid #e5e7eb; }
.hjsatt .att-seg button.on { background: #eff4ff; color: #2563eb;
  border-color: #b2ccff; font-weight: 650; }

.hjsatt .att-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; }
.hjsatt .att-table { width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap; }
.hjsatt .att-table th { padding: 9px 11px; background: #f9fafb; color: #6b7280;
  font-size: 10.5px; letter-spacing: .05em; text-transform: uppercase; font-weight: 700; }
.hjsatt .att-table td { padding: 9px 11px; border-top: 1px solid #f1f2f4;
  font-variant-numeric: tabular-nums; }
.hjsatt .att-table td.name, .hjsatt .att-table th.name { position: sticky; left: 0;
  background: #fff; font-weight: 600; box-shadow: 1px 0 0 #f1f2f4; }
.hjsatt .att-table th.name { background: #f9fafb; }
.hjsatt .att-mark { display: inline-block; width: 21px; text-align: center;
  font-weight: 700; font-size: 12px; }
.hjsatt .m-P { color: #16a34a; } .hjsatt .m-L { color: #d97706; }
.hjsatt .m-H { color: #ea580c; } .hjsatt .m-A { color: #dc2626; }
.hjsatt .m-W, .hjsatt .m-F { color: #b0b7c3; } .hjsatt .m-X { color: #2563eb; }

.hjsatt .att-sheet { position: fixed; inset: 0; z-index: 40; background: rgba(16,24,40,.45);
  display: flex; align-items: flex-end; justify-content: center; }
.hjsatt .att-sheet > div { width: 100%; max-width: 640px; background: #f7f8fa;
  border-radius: 14px 14px 0 0; padding: 16px 14px calc(18px + env(safe-area-inset-bottom));
  max-height: 92%; overflow-y: auto; }
@media (min-width: 900px) {
  .hjsatt .att-sheet { align-items: center; }
  .hjsatt .att-sheet > div { border-radius: 14px; max-height: 88%; }
}

/* ---------- attendance summary ---------- */
.hjsatt .att-daterow { display: flex; align-items: center; justify-content: space-between;
  gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.hjsatt .att-nav2 { display: flex; align-items: center; gap: 4px; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 8px; padding: 3px; }
.hjsatt .att-nav2 button { padding: 5px 11px; border-radius: 6px; color: #475467; font-size: 15px; }
.hjsatt .att-nav2 button:hover { background: #f2f4f7; }
.hjsatt .att-shiftbar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; }
.hjsatt .att-checkbtn { margin-left: auto; background: #16a34a; border-radius: 8px;
  padding: 9px 20px; min-width: 156px; }
.hjsatt .att-checkbtn.out { background: #dc2626; }
.hjsatt .att-checkbtn:disabled { opacity: .6; }
.hjsatt .att-checkbtn span { display: block; color: #fff; font-size: 12.5px; text-align: center; }
.hjsatt .att-checkbtn b { display: block; color: #fff; font-size: 15px; text-align: center;
  font-variant-numeric: tabular-nums; }
.hjsatt .att-drow { display: flex; align-items: center; gap: 12px; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 15px; margin-bottom: 8px; }
.hjsatt .att-dlab { width: 54px; flex-shrink: 0; }
.hjsatt .att-dlab span { display: block; text-align: center; font-size: 12.5px; color: #6b7280; }
.hjsatt .att-dlab b { display: block; text-align: center; font-size: 16px; }
.hjsatt .att-dlab .bdg { display: inline-block; background: #2563eb; color: #fff;
  border-radius: 6px; padding: 0 8px; font-size: 15px; }
.hjsatt .att-dt { width: 76px; flex-shrink: 0; font-size: 13.5px; color: #344054; }
.hjsatt .att-dt.r { text-align: right; }
.hjsatt .att-track { flex: 1; min-width: 60px; height: 14px; position: relative; }
.hjsatt .att-track .base { position: absolute; left: 0; right: 0; top: 6px; height: 2px;
  background: #eaecf0; border-radius: 2px; }
.hjsatt .att-track .wk { position: absolute; left: 0; right: 0; top: 6px; height: 2px; background: #fde68a; }
.hjsatt .att-track .seg { position: absolute; top: 5px; height: 4px; background: #86cd89; border-radius: 3px; }
.hjsatt .att-track .din { position: absolute; top: 3px; width: 8px; height: 8px; border-radius: 50%;
  background: #16a34a; }
.hjsatt .att-track .dout { position: absolute; top: 3px; width: 8px; height: 8px; border-radius: 50%;
  background: #dc2626; }
.hjsatt .att-track .chip { position: absolute; top: -4px; left: 50%; transform: translateX(-50%);
  background: #fff; border: 1px solid #fde68a; color: #b54708; font-size: 11px;
  padding: 0 8px; border-radius: 5px; }
.hjsatt .att-hrs { width: 88px; flex-shrink: 0; }
.hjsatt .att-hrs b { display: block; text-align: right; font-size: 15px; font-variant-numeric: tabular-nums; }
.hjsatt .att-hrs span { display: block; text-align: right; font-size: 11.5px; color: #6b7280; }
.hjsatt .att-axis { display: flex; margin: 4px 0 0 0; padding: 0 103px 0 154px; }
.hjsatt .att-axis span { flex: 1; font-size: 10.5px; color: #98a2b3;
  border-left: 1px solid #e5e7eb; padding-left: 4px; }
.hjsatt .att-sum { display: flex; flex-wrap: wrap; background: #fff; border: 1px solid #e5e7eb;
  border-radius: 10px; padding: 10px 6px; margin-top: 12px; }
.hjsatt .att-sumitem { padding: 2px 18px; border-left: 3px solid #2563eb; margin: 5px 0; }
.hjsatt .att-sumitem span { display: block; font-size: 12.5px; color: #475467; }
.hjsatt .att-sumitem b { display: block; font-size: 15px; }

/* ---------- range filter ---------- */
.hjsatt .att-range { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 9px 11px; }
.hjsatt .att-range input { width: auto; min-height: 36px; padding: 6px 9px; font-size: 13.5px; }
.hjsatt .att-range .qk { display: flex; gap: 5px; flex-wrap: wrap; }
.hjsatt .att-range .qk button { padding: 6px 11px; border-radius: 7px; font-size: 12.5px;
  border: 1px solid #e5e7eb; color: #475467; background: #fff; }
.hjsatt .att-range .qk button.on { background: #eff4ff; border-color: #b2ccff; color: #2563eb; font-weight: 650; }
.hjsatt .att-stat.clk { cursor: pointer; }
.hjsatt .att-stat.clk:hover { border-color: #b2ccff; background: #fafbff; }
.hjsatt .att-mk { display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 7px; font-weight: 700; font-size: 13px; }

/* ---------- leave summary ---------- */
.hjsatt .att-lvgrid { display: grid; gap: 11px;
  grid-template-columns: repeat(auto-fill, minmax(178px, 1fr)); }
.hjsatt .att-lv { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 15px; }
.hjsatt .att-lv h4 { font-size: 14.5px; font-weight: 650; text-align: center; }
.hjsatt .att-lvic { width: 52px; height: 52px; border-radius: 12px; margin: 15px auto;
  display: flex; align-items: center; justify-content: center; font-size: 21px; }
.hjsatt .att-lv hr { border: 0; border-top: 1px solid #eaecf0; margin: 0 0 9px; }
.hjsatt .att-lvrow { display: flex; justify-content: space-between; font-size: 13.5px; padding: 3px 0; }
.hjsatt .att-lvrow b { font-variant-numeric: tabular-nums; }

@media (max-width: 760px) {
  .hjsatt .att-track, .hjsatt .att-axis { display: none; }
  .hjsatt .att-dt { width: 72px; }
  .hjsatt .att-checkbtn { margin-left: 0; width: 100%; }
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
  return m ? `${hh}:${String(m).padStart(2, "0")} ${ap}` : `${hh}:00 ${ap}`;
};
const istToday = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: TZ })).toISOString().slice(0, 10);
const hhmm = (mins: number | null) => {
  const m = Math.max(0, Math.round(mins || 0));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};
const hms = (mins: number | null) => {
  const t = Math.max(0, Math.floor((mins || 0) * 60));
  return [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60].map((n) => String(n).padStart(2, "0"));
};
const greetWord = () => {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: TZ }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
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
const stateColor: Record<string, string> = {
  In: "#16a34a", Out: "#6b7280", Leave: "#2563eb", "Yet to check in": "#dc2626",
};

const letterOf = (st: string) => ({
  Present: "P", Late: "L", "Half Day": "H", Absent: "A", "Week Off": "W", Holiday: "F",
} as Record<string, string>)[st] || (st ? st[0] : "-");
const MK_TINT: Record<string, [string, string]> = {
  P: ["#ecfdf3", "#067647"], L: ["#fffaeb", "#b54708"], H: ["#fff6ed", "#c4320a"],
  A: ["#fef3f2", "#b42318"], W: ["#f2f4f7", "#475467"], F: ["#f2f4f7", "#475467"],
};
const monthStart = (iso: string) => iso.slice(0, 8) + "01";
const shiftMonth = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + n, 1);
  return d.toISOString().slice(0, 10);
};
const lastDayOf = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
};

function RangeBar({ range, setRange }: any) {
  const today = istToday();
  const presets: [string, () => any][] = [
    ["This month", () => ({ from: monthStart(today), to: today })],
    ["Last month", () => {
      const p = shiftMonth(monthStart(today), -1);
      return { from: p, to: lastDayOf(p) };
    }],
    ["Last 7 days", () => {
      const d = new Date(today + "T00:00:00"); d.setDate(d.getDate() - 6);
      return { from: d.toISOString().slice(0, 10), to: today };
    }],
    ["This year", () => ({ from: today.slice(0, 4) + "-01-01", to: today })],
  ];
  const match = (r: any) => presets.find(([, f]) => {
    const v = f(); return v.from === r.from && v.to === r.to;
  })?.[0];
  const active = match(range);
  return (
    <div className="att-range">
      <div className="qk">
        {presets.map(([label, f]) => (
          <button key={label} className={active === label ? "on" : ""}
            onClick={() => setRange(f())}>{label}</button>
        ))}
      </div>
      <div className="att-flex" style={{ marginLeft: "auto" }}>
        <input type="date" value={range.from} max={range.to}
          onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <span className="att-muted">to</span>
        <input type="date" value={range.to} min={range.from}
          onChange={(e) => setRange({ ...range, to: e.target.value })} />
      </div>
    </div>
  );
}

function DayListSheet({ title, rows, onClose }: any) {
  return (
    <Sheet title={title} onClose={onClose}>
      <div className="att-list">
        {!rows.length && <p className="att-empty">Nothing in this range.</p>}
        {rows.map((r: any) => {
          const L = letterOf(r.status);
          const [bg, fg] = MK_TINT[L] || ["#eff8ff", "#175cd3"];
          return (
            <div className="att-row" key={r.work_date}>
              <span style={{ width: 92, fontWeight: 650 }}>
                {new Date(r.work_date + "T00:00:00").toLocaleDateString("en-GB",
                  { day: "2-digit", month: "short" })}
              </span>
              <span className="att-mk" style={{ background: bg, color: fg }}>{L}</span>
              <span className="grow att-muted">
                {r.punch_in_at ? `${fmtTime(r.punch_in_at)} – ${fmtTime(r.punch_out_at)}` : "—"}
              </span>
              <b>{hhmm(r.worked_minutes)}</b>
            </div>
          );
        })}
      </div>
      <p className="att-muted" style={{ marginTop: 10 }}>{rows.length} day(s)</p>
    </Sheet>
  );
}

const AV_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#ea580c"];
const Avatar = ({ name, lg }: any) => {
  const n = String(name || "?");
  const initials = n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 997;
  return <div className={`att-av ${lg ? "lg" : ""}`} style={{ background: AV_COLORS[h % AV_COLORS.length] }}>{initials}</div>;
};

const ICONS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5M5 9.8V20h14V9.8",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  cal: "M8 3v3M16 3v3M3.5 9h17M4.5 5.5h15v15h-15z",
  check: "m4.5 12.5 5 5 10-11",
  users: "M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM22 20v-1.5a4 4 0 0 0-3-3.8M16.5 3.7a4 4 0 0 1 0 6.9",
  user: "M20 21v-2a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
};
const Icon = ({ n, c = "#9fb0cd", s = 19 }: any) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d={ICONS[n]} />
  </svg>
);

const getPosition = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Location isn't supported on this device"));
    navigator.geolocation.getCurrentPosition(resolve, (e) =>
      reject(new Error(e.code === 1
        ? "Location permission is blocked. Allow it in your browser settings and try again."
        : "Couldn't get your location. Please try once more.")),
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
      <div className="att-between" style={{ marginBottom: 13 }}>
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
    if (error) setErr("Wrong employee code or PIN.");
    setBusy(false);
  };

  return (
    <div className="att-center" style={{ width: "100%" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 22 }}>
          <div className="att-raillogo" style={{ marginBottom: 14 }}>HJS</div>
          <h1 className="att-h1">Attendance</h1>
          <p className="att-muted" style={{ marginTop: 3 }}>
            Sign in once. After that it's just check in and check out.
          </p>
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
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================= home ========================= */
function HomeScreen({ me }: any) {
  const [today, setToday] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [board, setBoard] = useState<any[]>([]);
  const [err, setErr] = useState(""); const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [regOpen, setRegOpen] = useState(false);
  const [range, setRange] = useState({ from: monthStart(istToday()), to: istToday() });
  const [drill, setDrill] = useState<any>(null);

  const load = async () => {
    const back = new Date(); back.setDate(back.getDate() - 40);
    const lo = [range.from, back.toISOString().slice(0, 10)].sort()[0];
    const [logs, sess, who] = await Promise.all([
      supabase.from("attendance_logs").select("*").eq("employee_id", me.id)
        .gte("work_date", lo).order("work_date", { ascending: false }),
      supabase.rpc("my_sessions", {}),
      supabase.rpc("whos_in", {}),
    ]);
    setRecent(logs.data || []);
    setToday((logs.data || []).find((r: any) => r.work_date === istToday()) || null);
    setSessions(sess.data || []);
    setBoard(who.data || []);
  };
  useEffect(() => { load(); }, [me.id, range.from, range.to]);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);

  const open = sessions.find((s) => !s.out_at);
  const workedMinutes = useMemo(() => {
    const closed = sessions.filter((s) => s.out_at).reduce((a, s) => a + (s.minutes || 0), 0);
    const live = open ? (Date.now() - new Date(open.in_at).getTime()) / 60000 : 0;
    return closed + live;
  }, [sessions, open, tick]);

  const punch = async (dir: "in" | "out") => {
    setErr(""); setOk(""); setBusy(true);
    try {
      const pos = await getPosition();
      const { error } = await supabase.rpc(dir === "in" ? "punch_in" : "punch_out", {
        p_lat: pos.coords.latitude, p_lng: pos.coords.longitude,
        p_accuracy: Math.round(pos.coords.accuracy),
      });
      if (error) throw new Error(error.message);
      setOk(dir === "in" ? "Checked in." : "Checked out. You can check in again anytime.");
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const [h, m, sec] = hms(workedMinutes);

  const inRange = useMemo(
    () => recent.filter((r) => r.work_date >= range.from && r.work_date <= range.to),
    [recent, range]);
  const stats = useMemo(() => ({
    present: inRange.filter((r) => ["Present", "Late"].includes(r.status)),
    late: inRange.filter((r) => r.status === "Late"),
    half: inRange.filter((r) => r.status === "Half Day"),
    hrs: Math.round(inRange.reduce((s, r) => s + (r.worked_minutes || 0), 0) / 60),
  }), [inRange]);

  const week = useMemo(() => {
    const t = new Date(istToday() + "T00:00:00");
    const mon = new Date(t); mon.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const log = recent.find((r: any) => r.work_date === key);
      const off = (me.week_off_days || []).includes(d.getDay());
      return {
        key, dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()], num: d.getDate(),
        isToday: key === istToday(),
        status: log?.status || (off ? "Off" : key > istToday() ? "" : "Absent"),
        mins: log?.worked_minutes,
      };
    });
  }, [recent, me]);

  const dayColor: Record<string, string> = {
    Present: "#16a34a", Late: "#d97706", "Half Day": "#ea580c",
    Absent: "#dc2626", Off: "#98a2b3",
  };
  const inNow = board.filter((p) => p.state === "In").length;

  return (
    <div className="att-wrap">
      <div className="att-cols">

        {/* ---- left ---- */}
        <div className="att-col">
          <div className="att-card att-punch">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 11 }}>
              <Avatar name={me.full_name} lg />
            </div>
            <p><b>{me.emp_code}</b> · {me.full_name}</p>
            <p className="att-muted">{me.designation || me.role}</p>
            <p style={{ marginTop: 9, fontWeight: 700, color: open ? "#16a34a" : "#dc2626" }}>
              {open && <i className="att-live" />}{open ? "In" : "Out"}
            </p>

            <div className="att-hms"><i>{h}</i><u>:</u><i>{m}</i><u>:</u><i>{sec}</i></div>

            {open && open.in_geo_ok === false && (
              <p style={{ color: "#d97706", fontSize: 12.5, marginTop: 4 }}>
                {open.in_distance_m ?? "?"} m away from your branch
              </p>
            )}

            <button className={`att-btn big ${open ? "gout" : "gin"}`} style={{ marginTop: 12 }}
              onClick={() => punch(open ? "out" : "in")} disabled={busy}>
              {busy ? "Getting location…" : open ? "Check-out" : "Check-in"}
            </button>
            <p className="att-muted" style={{ marginTop: 9, fontSize: 12 }}>
              Location is recorded with every punch
            </p>

            {sessions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {sessions.map((s, i) => (
                  <div className="att-sess" key={s.id}>
                    <span className="att-muted" style={{ width: 20 }}>{i + 1}</span>
                    <span className="grow" style={{ flex: 1 }}>
                      {fmtTime(s.in_at)} → {s.out_at ? fmtTime(s.out_at) : "running"}
                    </span>
                    <b>{s.out_at ? hhmm(s.minutes) : "—"}</b>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Note>{err}</Note>
          <Note kind="ok">{ok}</Note>

          <RangeBar range={range} setRange={setRange} />

          <div className="att-grid4">
            <div className="att-stat clk" onClick={() => setDrill({ t: "Present days", r: stats.present })}>
              <b style={{ color: "#16a34a" }}>{stats.present.length}</b><span>Present</span></div>
            <div className="att-stat clk" onClick={() => setDrill({ t: "Late days", r: stats.late })}>
              <b style={{ color: "#d97706" }}>{stats.late.length}</b><span>Late</span></div>
            <div className="att-stat clk" onClick={() => setDrill({ t: "Half days", r: stats.half })}>
              <b style={{ color: "#ea580c" }}>{stats.half.length}</b><span>Half</span></div>
            <div className="att-stat clk" onClick={() => setDrill({ t: "All worked days", r: inRange })}>
              <b style={{ color: "#2563eb" }}>{stats.hrs}</b><span>Hours</span></div>
          </div>
        </div>

        {/* ---- right ---- */}
        <div className="att-col">
          <div className="att-greet">
            <h3>{greetWord()}, {String(me.full_name).split(" ")[0]}</h3>
            <p>
              {new Date().toLocaleDateString(IST, { weekday: "long", day: "numeric", month: "long", timeZone: TZ })}
              {" · Shift "}{fmtHM(me.shift_start)} – {fmtHM(me.shift_end)}
            </p>
          </div>

          <div className="att-card">
            <div className="att-between" style={{ marginBottom: 11 }}>
              <b>Work schedule</b>
              <span className="att-muted">{hhmm(week.reduce((s, d) => s + (d.mins || 0), 0))} this week</span>
            </div>
            <div className="att-week">
              {week.map((d) => (
                <div className={`att-day ${d.isToday ? "now" : ""}`} key={d.key}>
                  <span className="dn">{d.dow}</span>
                  <b className="dd">{String(d.num).padStart(2, "0")}</b>
                  <span className="ds" style={{ color: dayColor[d.status] || "#d0d5dd" }}>
                    {d.status === "Half Day" ? "Half" : d.status || "—"}
                  </span>
                  <span className="dh">{d.mins ? hhmm(d.mins) : ""}</span>
                </div>
              ))}
            </div>
          </div>

          {/* who's in */}
          <div className="att-list">
            <div className="att-hd">
              <b>Who's in right now</b>
              <span className="att-pill p-Present">{inNow} in</span>
            </div>
            {board.map((p) => (
              <div className="att-row" key={p.emp_code}>
                <Avatar name={p.full_name} />
                <div className="grow">
                  <p><b>{p.emp_code}</b> · {p.full_name}</p>
                  <p className="att-muted">{p.designation || p.branch}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: stateColor[p.state] }}>{p.state}</p>
                  {p.first_in && (
                    <p className="att-muted" style={{ fontSize: 11.5 }}>
                      {fmtTime(p.first_in)}{p.state === "Out" ? ` – ${fmtTime(p.last_out)}` : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {!board.length && <p className="att-empty">No employees found.</p>}
          </div>

          <div className="att-list">
            <div className="att-hd">
              <b>Attendance log</b>
              <button className="att-btn sm line" onClick={() => setRegOpen(true)}>Missed a punch?</button>
            </div>
            {inRange.length === 0 && (
              <p className="att-empty">Nothing in this range yet.</p>
            )}
            {inRange.map((r) => (
              <div className="att-row" key={r.id}>
                <span style={{ width: 52, fontWeight: 650 }}>{fmtDate(r.work_date)}</span>
                <span className="grow att-muted">{fmtTime(r.punch_in_at)} – {fmtTime(r.punch_out_at)}</span>
                <span style={{ width: 58, textAlign: "right", color: "#475467" }}>{hhmm(r.worked_minutes)}</span>
                <span className={pillClass(r.status)}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {regOpen && <RegularizeSheet me={me} onClose={() => setRegOpen(false)} />}
      {drill && <DayListSheet title={drill.t} rows={drill.r} onClose={() => setDrill(null)} />}
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
    if (error) setMsg({ err: "Couldn't send: " + error.message, ok: "" });
    else setMsg({ err: "", ok: "Sent to your manager." });
    setBusy(false);
  };

  return (
    <Sheet title="Missed a punch?" onClose={onClose}>
      <div className="att-card att-stack">
        <div>
          <label>Date</label>
          <input type="date" max={istToday()} value={form.work_date}
            onChange={(e) => setForm({ ...form, work_date: e.target.value })} />
        </div>
        <div className="att-row2">
          <div>
            <label>Check-in</label>
            <input type="time" value={form.req_punch_in}
              onChange={(e) => setForm({ ...form, req_punch_in: e.target.value })} />
          </div>
          <div>
            <label>Check-out</label>
            <input type="time" value={form.req_punch_out}
              onChange={(e) => setForm({ ...form, req_punch_out: e.target.value })} />
          </div>
        </div>
        <div>
          <label>What happened</label>
          <textarea rows={2} placeholder="A short reason" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn" onClick={submit}
          disabled={busy || !form.reason || (!form.req_punch_in && !form.req_punch_out)}>
          {busy ? "Sending…" : "Send request"}
        </button>
      </div>
    </Sheet>
  );
}

/* ================= attendance summary ================= */
const mondayOf = (iso: string) => {
  const t = new Date(iso + "T00:00:00");
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  return t.toISOString().slice(0, 10);
};
const addDays = (iso: string, n: number) => {
  const t = new Date(iso + "T00:00:00"); t.setDate(t.getDate() + n);
  return t.toISOString().slice(0, 10);
};
const dmy = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
const minsOfDay = (ts: any) => {
  const d = new Date(ts);
  const p = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
  const [h, m] = p.split(":").map(Number);
  return h * 60 + m;
};
const hourLabel = (h: number) =>
  `${String(h % 12 || 12).padStart(2, "0")}${h >= 12 ? "PM" : "AM"}`;

function AttendanceScreen({ me, tab }: any) {
  if (tab === "matrix") return <div className="att-wrap"><MatrixTab me={me} /></div>;
  return <AttSummary me={me} />;
}

function AttSummary({ me }: any) {
  const [wk, setWk] = useState(mondayOf(istToday()));
  const [sess, setSess] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [hols, setHols] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const [span, setSpan] = useState(7);
  const [custom, setCustom] = useState<any>(null);

  const wkEnd = custom ? custom.to : addDays(wk, span - 1);
  const wkFrom = custom ? custom.from : wk;
  const dayCount = Math.max(1, Math.min(62,
    Math.round((new Date(wkEnd).getTime() - new Date(wkFrom).getTime()) / 86400000) + 1));

  const load = async () => {
    const [a, b, c, d] = await Promise.all([
      supabase.from("attendance_sessions").select("*").eq("employee_id", me.id)
        .gte("work_date", wkFrom).lte("work_date", wkEnd).order("in_at"),
      supabase.from("attendance_logs").select("*").eq("employee_id", me.id)
        .gte("work_date", wkFrom).lte("work_date", wkEnd),
      supabase.from("leaves").select("*").eq("employee_id", me.id).eq("status", "Approved")
        .lte("from_date", wkEnd).gte("to_date", wkFrom),
      supabase.from("holidays").select("*").gte("hol_date", wkFrom).lte("hol_date", wkEnd),
    ]);
    setSess(a.data || []); setLogs(b.data || []); setLeaves(c.data || []); setHols(d.data || []);
  };
  useEffect(() => { load(); }, [wk, span, custom, me.id]);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);

  const openSess = sess.find((x) => !x.out_at && x.work_date === istToday());
  const todayMins = useMemo(() => {
    const day = sess.filter((x) => x.work_date === istToday());
    const closed = day.filter((x) => x.out_at).reduce((a, x) => a + (x.minutes || 0), 0);
    const live = openSess ? (Date.now() - new Date(openSess.in_at).getTime()) / 60000 : 0;
    return closed + live;
  }, [sess, openSess, tick]);
  const [th, tm, ts] = hms(todayMins);

  const punch = async (dir: "in" | "out") => {
    setErr(""); setBusy(true);
    try {
      const pos = await getPosition();
      const { error } = await supabase.rpc(dir === "in" ? "punch_in" : "punch_out", {
        p_lat: pos.coords.latitude, p_lng: pos.coords.longitude,
        p_accuracy: Math.round(pos.coords.accuracy),
      });
      if (error) throw new Error(error.message);
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  // axis bounds
  const [ax0, ax1] = useMemo(() => {
    const sh = Number(String(me.shift_start).slice(0, 2));
    const eh = Number(String(me.shift_end).slice(0, 2));
    let lo = sh, hi = eh;
    sess.forEach((x) => {
      lo = Math.min(lo, Math.floor(minsOfDay(x.in_at) / 60));
      const o = x.out_at ? minsOfDay(x.out_at) : minsOfDay(new Date().toISOString());
      hi = Math.max(hi, Math.ceil(o / 60));
    });
    return [Math.max(0, lo), Math.min(24, Math.max(hi, lo + 4))];
  }, [sess, me]);

  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => {
    const key = addDays(wkFrom, i);
    const d = new Date(key + "T00:00:00");
    const list = sess.filter((x) => x.work_date === key);
    const log = logs.find((x: any) => x.work_date === key);
    const lv = leaves.find((l: any) => key >= l.from_date && key <= l.to_date);
    const hol = hols.find((h: any) => h.hol_date === key);
    const off = (me.week_off_days || []).includes(d.getDay());
    const live = list.some((x) => !x.out_at) && key === istToday();
    const mins = list.reduce((a, x) => a + (x.minutes || 0), 0)
      + (live && openSess ? (Date.now() - new Date(openSess.in_at).getTime()) / 60000 : 0);
    return {
      key, dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()], num: d.getDate(),
      isToday: key === istToday(), list, log, lv, hol, off, mins,
      first: list[0]?.in_at, last: list.filter((x) => x.out_at).slice(-1)[0]?.out_at,
    };
  }), [wkFrom, dayCount, sess, logs, leaves, hols, me, openSess, tick]);

  const pos = (t: any) => {
    const m = minsOfDay(t);
    return Math.max(0, Math.min(100, ((m - ax0 * 60) / ((ax1 - ax0) * 60)) * 100));
  };

  const summary = useMemo(() => {
    const present = days.filter((d) => ["Present", "Late"].includes(d.log?.status)).length;
    const half = days.filter((d) => d.log?.status === "Half Day").length;
    const weekend = days.filter((d) => d.off && !d.log).length;
    const holiday = days.filter((d) => d.hol && !d.off && !d.log).length;
    const paid = days.filter((d) => d.lv && !d.log).length;
    return { present, half, weekend, holiday, paid,
      payable: present + half * 0.5 + weekend + holiday + paid,
      hours: days.reduce((a, d) => a + d.mins, 0) };
  }, [days]);

  return (
    <div className="att-wrap">
      <div className="att-daterow">
        <div className="att-nav2">
          <button onClick={() => { setCustom(null); setWk(addDays(wk, -span)); }}>‹</button>
          <button style={{ fontSize: 13 }}
            onClick={() => { setCustom(null); setWk(mondayOf(istToday())); }}>Today</button>
          <button onClick={() => { setCustom(null); setWk(addDays(wk, span)); }}>›</button>
        </div>
        <b style={{ fontSize: 15 }}>{dmy(wkFrom)} — {dmy(wkEnd)}</b>
        <span className="att-muted">{hhmm(summary.hours)} worked</span>
      </div>

      <div className="att-range" style={{ marginBottom: 12 }}>
        <div className="qk">
          <button className={!custom && span === 7 ? "on" : ""}
            onClick={() => { setCustom(null); setSpan(7); setWk(mondayOf(istToday())); }}>Week</button>
          <button className={!custom && span === 14 ? "on" : ""}
            onClick={() => { setCustom(null); setSpan(14); setWk(mondayOf(istToday())); }}>Fortnight</button>
          <button className={custom && custom.from === monthStart(istToday()) ? "on" : ""}
            onClick={() => setCustom({ from: monthStart(istToday()), to: lastDayOf(istToday()) })}>
            This month</button>
          <button className={custom && custom.from === shiftMonth(monthStart(istToday()), -1) ? "on" : ""}
            onClick={() => {
              const pm = shiftMonth(monthStart(istToday()), -1);
              setCustom({ from: pm, to: lastDayOf(pm) });
            }}>Last month</button>
        </div>
        <div className="att-flex" style={{ marginLeft: "auto" }}>
          <input type="date" value={wkFrom}
            onChange={(e) => setCustom({ from: e.target.value, to: wkEnd })} />
          <span className="att-muted">to</span>
          <input type="date" value={wkEnd} min={wkFrom}
            onChange={(e) => setCustom({ from: wkFrom, to: e.target.value })} />
        </div>
      </div>

      <div className="att-shiftbar">
        <div>
          <b>General</b>
          <span className="att-muted" style={{ marginLeft: 8 }}>
            [ {fmtHM(me.shift_start)} – {fmtHM(me.shift_end)} ]
          </span>
        </div>
        <button className={`att-checkbtn ${openSess ? "out" : ""}`} disabled={busy}
          onClick={() => punch(openSess ? "out" : "in")}>
          <span>{busy ? "Getting location…" : openSess ? "Check-out" : "Check-in"}</span>
          <b>{th}:{tm}:{ts} Hrs</b>
        </button>
      </div>

      <Note>{err}</Note>

      <div style={{ marginTop: 12 }}>
        {days.map((d) => (
          <div className="att-drow" key={d.key}>
            <div className="att-dlab">
              <span>{d.isToday ? "Today" : d.dow}</span>
              {d.isToday ? <b><span className="bdg">{String(d.num).padStart(2, "0")}</span></b>
                         : <b>{String(d.num).padStart(2, "0")}</b>}
            </div>
            <div className="att-dt">{d.first ? fmtTime(d.first) : ""}</div>
            <div className="att-track">
              {(d.off || d.hol) && !d.list.length ? (
                <>
                  <div className="wk" />
                  <div className="chip">{d.hol ? d.hol.name : "Weekend"}</div>
                </>
              ) : d.lv && !d.list.length ? (
                <>
                  <div className="base" />
                  <div className="chip" style={{ borderColor: "#b2ccff", color: "#175cd3" }}>
                    {d.lv.leave_type}
                  </div>
                </>
              ) : (
                <>
                  <div className="base" />
                  {d.list.map((x: any) => {
                    const a = pos(x.in_at);
                    const b = pos(x.out_at || new Date().toISOString());
                    return (
                      <span key={x.id}>
                        <div className="seg" style={{ left: `${a}%`, width: `${Math.max(1, b - a)}%` }} />
                        <div className="din" style={{ left: `calc(${a}% - 4px)` }} />
                        {x.out_at && <div className="dout" style={{ left: `calc(${b}% - 4px)` }} />}
                      </span>
                    );
                  })}
                </>
              )}
            </div>
            <div className="att-dt r">{d.last ? fmtTime(d.last) : ""}</div>
            <div className="att-hrs">
              <b>{hhmm(d.mins).replace("h ", ":").replace("m", "")}</b>
              <span>Hrs worked</span>
            </div>
          </div>
        ))}
      </div>

      <div className="att-axis">
        {Array.from({ length: ax1 - ax0 }, (_, i) => (
          <span key={i}>{hourLabel(ax0 + i)}</span>
        ))}
      </div>

      <div className="att-sum">
        {[
          ["Payable Days", `${summary.payable} Days`, "#2563eb"],
          ["Present", `${summary.present} Days`, "#16a34a"],
          ["Half Day", `${summary.half} Day`, "#ea580c"],
          ["Paid leave", `${summary.paid} Day`, "#7c3aed"],
          ["Holidays", `${summary.holiday} Day`, "#0891b2"],
          ["Weekend", `${summary.weekend} Day`, "#d97706"],
          ["Hours", hhmm(summary.hours), "#475467"],
        ].map(([k, v, c]) => (
          <div className="att-sumitem" key={k} style={{ borderLeftColor: c }}>
            <span>{k}</span><b>{v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= monthly matrix ================= */
function MatrixTab({ me }: any) {
  const approver = ["manager", "admin"].includes(me.role);
  const [month, setMonth] = useState(istToday().slice(0, 7));
  const [rows, setRows] = useState<any[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setBusy(true);
    const from = `${month}-01`;
    const to = lastDayOf(from);
    const all = Array.from(
      { length: Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1 },
      (_, i) => addDays(from, i));
    setDates(all);

    if (approver) {
      const { data } = await supabase.rpc("muster_roll", { p_month: from });
      const byEmp: Record<string, any> = {};
      (data || []).forEach((r: any) => {
        byEmp[r.emp_code] = byEmp[r.emp_code] || { code: r.emp_code, name: r.full_name, marks: {} };
        byEmp[r.emp_code].marks[r.d] = r.mark;
      });
      setRows(Object.values(byEmp));
    } else {
      const [lg, lv, hl] = await Promise.all([
        supabase.from("attendance_logs").select("*").eq("employee_id", me.id)
          .gte("work_date", from).lte("work_date", to),
        supabase.from("leaves").select("*").eq("employee_id", me.id)
          .eq("status", "Approved").lte("from_date", to).gte("to_date", from),
        supabase.from("holidays").select("*").gte("hol_date", from).lte("hol_date", to),
      ]);
      const marks: Record<string, string> = {};
      all.forEach((d) => {
        const log = (lg.data || []).find((x: any) => x.work_date === d);
        const leave = (lv.data || []).find((x: any) => d >= x.from_date && d <= x.to_date);
        const hol = (hl.data || []).find((x: any) => x.hol_date === d);
        const off = (me.week_off_days || []).includes(new Date(d + "T00:00:00").getDay());
        marks[d] = log ? letterOf(log.status)
          : leave ? leave.leave_type
          : hol ? "F"
          : off ? "W"
          : d > istToday() ? "" : "A";
      });
      setRows([{ code: me.emp_code, name: me.full_name, marks }]);
    }
    setBusy(false);
  };
  useEffect(() => { load(); }, [month, me.id]);

  const shown = rows.filter((r) =>
    !q || `${r.name} ${r.code}`.toLowerCase().includes(q.toLowerCase()));

  const tally = (m: Record<string, string>) => {
    const v = Object.values(m);
    return {
      p: v.filter((x) => x === "P" || x === "L").length,
      a: v.filter((x) => x === "A").length,
      l: v.filter((x) => x && !["P", "L", "H", "A", "W", "F", ""].includes(x)).length,
    };
  };

  const exportCsv = () => downloadCsv(
    shown.map((r) => {
      const o: any = { Code: r.code, Name: r.name };
      dates.forEach((d) => { o[new Date(d).getDate()] = r.marks[d] || ""; });
      const t = tally(r.marks);
      o["Present"] = t.p; o["Absent"] = t.a; o["Leave"] = t.l;
      return o;
    }), `HJS_matrix_${month}.csv`);

  return (
    <>
      <div className="att-range">
        <div className="qk">
          <button onClick={() => setMonth(shiftMonth(month + "-01", -1).slice(0, 7))}>‹ Previous</button>
          <button className={month === istToday().slice(0, 7) ? "on" : ""}
            onClick={() => setMonth(istToday().slice(0, 7))}>This month</button>
          <button disabled={month >= istToday().slice(0, 7)}
            onClick={() => setMonth(shiftMonth(month + "-01", 1).slice(0, 7))}>Next ›</button>
        </div>
        <div className="att-flex" style={{ marginLeft: "auto" }}>
          <input type="month" value={month} max={istToday().slice(0, 7)}
            onChange={(e) => setMonth(e.target.value)} />
          <button className="att-btn sm" disabled={!shown.length} onClick={exportCsv}>CSV</button>
        </div>
      </div>

      {approver && (
        <input placeholder="Search by name or code" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ marginTop: 10 }} />
      )}

      <p className="att-muted" style={{ marginTop: 10 }}>
        P present · L late · H half day · A absent · W week off · F holiday · CL/SL/EL = leave
      </p>

      {busy && <p className="att-muted">Loading…</p>}

      {!busy && (
        <div className="att-scroll" style={{ marginTop: 8 }}>
          <table className="att-table">
            <thead>
              <tr>
                <th className="name">Employee</th>
                {dates.map((d) => (
                  <th key={d} style={{ textAlign: "center",
                    color: d === istToday() ? "#2563eb" : undefined }}>
                    {String(new Date(d + "T00:00:00").getDate()).padStart(2, "0")}
                  </th>
                ))}
                <th style={{ textAlign: "center" }}>P</th>
                <th style={{ textAlign: "center" }}>A</th>
                <th style={{ textAlign: "center" }}>Lv</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const t = tally(r.marks);
                return (
                  <tr key={r.code}>
                    <td className="name">{r.code} · {r.name}</td>
                    {dates.map((d) => (
                      <td key={d} style={{ textAlign: "center", padding: "7px 6px" }}>
                        <span className={markClass(r.marks[d])}>{r.marks[d] || "·"}</span>
                      </td>
                    ))}
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#16a34a" }}>{t.p}</td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#dc2626" }}>{t.a}</td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "#2563eb" }}>{t.l}</td>
                  </tr>
                );
              })}
              {!shown.length && (
                <tr><td className="name" colSpan={dates.length + 4}>No data for this month.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ========================= leave ========================= */
const LV_TINT: Record<string, [string, string]> = {
  CL: ["#eafaf0", "#16a34a"], SL: ["#eaf4ff", "#2563eb"], EL: ["#fdf2e9", "#c2410c"],
  COMP: ["#f3f0ff", "#7c3aed"], LOP: ["#fdecec", "#dc2626"],
};

function LeavesScreen({ me, tab }: any) {
  const [types, setTypes] = useState<any[]>([]);
  const [bal, setBal] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [regs, setRegs] = useState<any[]>([]);
  const [hols, setHols] = useState<any[]>([]);
  const [apply, setApply] = useState(false);

  const load = async () => {
    const [t, b, l, r, h] = await Promise.all([
      supabase.from("leave_types").select("*"),
      supabase.rpc("leave_balance", {}),
      supabase.from("leaves").select("*").eq("employee_id", me.id)
        .order("from_date", { ascending: false }).limit(80),
      supabase.from("regularizations").select("*").eq("employee_id", me.id)
        .order("work_date", { ascending: false }).limit(20),
      supabase.from("holidays").select("*").order("hol_date"),
    ]);
    setTypes(t.data || []); setBal(b.data || []); setMine(l.data || []);
    setRegs(r.data || []); setHols(h.data || []);
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id: string) => {
    await supabase.from("leaves").update({ status: "Cancelled" }).eq("id", id);
    load();
  };

  const today = istToday();
  const year = today.slice(0, 4);
  const booked = mine.filter((r) => r.status === "Approved" && r.from_date.startsWith(year))
    .reduce((a, r) => a + Number(r.days), 0);

  const upcoming = [
    ...mine.filter((r) => r.to_date >= today && r.status !== "Cancelled")
      .map((r) => ({ d: r.from_date, label: r.leave_type, sub: `${r.days} day(s)`, status: r.status, type: "leave" })),
    ...hols.filter((h) => h.hol_date >= today)
      .map((h) => ({ d: h.hol_date, label: h.name, sub: "Holiday", status: "Holiday", type: "hol" })),
  ].sort((a, b) => a.d.localeCompare(b.d)).slice(0, 8);

  const past = [
    ...mine.filter((r) => r.to_date < today)
      .map((r) => ({ d: r.from_date, label: r.leave_type, sub: `${r.days} day(s)`, status: r.status, type: "leave" })),
    ...hols.filter((h) => h.hol_date < today && h.hol_date.startsWith(year))
      .map((h) => ({ d: h.hol_date, label: h.name, sub: "Holiday", status: "Holiday", type: "hol" })),
  ].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 12);

  const dayLine = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-GB",
      { day: "2-digit", month: "short", year: "numeric", weekday: "long" });

  if (tab === "requests") {
    return (
      <div className="att-wrap att-narrow att-stack">
        <div className="att-between">
          <b className="att-h2" style={{ margin: 0 }}>My leave requests</b>
          <button className="att-btn sm" onClick={() => setApply(true)}>Apply Leave</button>
        </div>
        <div className="att-list">
          {!mine.length && <p className="att-empty">No leave requests yet.</p>}
          {mine.map((r) => (
            <div className="att-row" key={r.id}>
              <span style={{ width: 42, fontWeight: 650 }}>{r.leave_type}</span>
              <div className="grow">
                <p>{fmtDate(r.from_date)} – {fmtDate(r.to_date)} · {r.days} day(s)</p>
                <p className="att-muted">{r.reason}</p>
              </div>
              <span className={pillClass(r.status)}>{r.status}</span>
              {r.status === "Pending" && (
                <button className="att-muted" onClick={() => cancel(r.id)}>Cancel</button>
              )}
            </div>
          ))}
        </div>

        <div className="att-list">
          <div className="att-hd"><b>Regularization requests</b></div>
          {!regs.length && <p className="att-empty">No requests yet.</p>}
          {regs.map((r) => (
            <div className="att-row" key={r.id}>
              <span style={{ width: 52, fontWeight: 650 }}>{fmtDate(r.work_date)}</span>
              <span className="grow att-muted">{fmtHM(r.req_punch_in)} – {fmtHM(r.req_punch_out)}</span>
              <span className={pillClass(r.status)}>{r.status}</span>
            </div>
          ))}
        </div>

        {apply && <ApplyLeaveSheet me={me} types={types}
          onClose={() => { setApply(false); load(); }} />}
      </div>
    );
  }

  return (
    <div className="att-wrap att-stack">
      <div className="att-daterow">
        <span className="att-muted">
          Leave booked this year: <b>{booked}</b> &nbsp;|&nbsp; Pending: <b>
            {mine.filter((r) => r.status === "Pending").length}</b>
        </span>
        <b style={{ fontSize: 14.5 }}>01-Jan-{year} — 31-Dec-{year}</b>
        <button className="att-btn sm" onClick={() => setApply(true)}>Apply Leave</button>
      </div>

      <div className="att-lvgrid">
        {bal.map((b) => {
          const [bg, fg] = LV_TINT[b.leave_type] || ["#f2f4f7", "#475467"];
          return (
            <div className="att-lv" key={b.leave_type}>
              <h4>{b.name}</h4>
              <div className="att-lvic" style={{ background: bg, color: fg }}>{b.leave_type}</div>
              <hr />
              <div className="att-lvrow">
                <span className="att-muted">Available</span>
                <b style={{ color: b.remaining < 0 ? "#dc2626" : "#16a34a" }}>{b.remaining}</b>
              </div>
              <div className="att-lvrow">
                <span className="att-muted">Booked</span><b>{b.used}</b>
              </div>
              {b.pending > 0 && (
                <div className="att-lvrow">
                  <span className="att-muted">Pending</span><b style={{ color: "#b54708" }}>{b.pending}</b>
                </div>
              )}
            </div>
          );
        })}
        {!bal.length && <p className="att-empty">No balance set yet — ask your admin.</p>}
      </div>

      <div className="att-list">
        <div className="att-hd"><b>Upcoming leaves & holidays</b></div>
        {!upcoming.length && <p className="att-empty">Nothing coming up.</p>}
        {upcoming.map((r, i) => (
          <div className="att-row" key={i}>
            <span style={{ width: 175 }}>{dayLine(r.d)}</span>
            <div className="grow">
              <p><b>{r.label}</b> <span className="att-muted">· {r.sub}</span></p>
            </div>
            <span className={pillClass(r.status)}>{r.status}</span>
          </div>
        ))}
      </div>

      <div className="att-list">
        <div className="att-hd"><b>Past leaves & holidays</b></div>
        {!past.length && <p className="att-empty">Nothing yet.</p>}
        {past.map((r, i) => (
          <div className="att-row" key={i}>
            <span style={{ width: 175 }}>{dayLine(r.d)}</span>
            <div className="grow">
              <p><b>{r.label}</b> <span className="att-muted">· {r.sub}</span></p>
            </div>
            <span className={pillClass(r.status)}>{r.status}</span>
          </div>
        ))}
      </div>

      {apply && <ApplyLeaveSheet me={me} types={types}
        onClose={() => { setApply(false); load(); }} />}
    </div>
  );
}

function ApplyLeaveSheet({ me, types, onClose }: any) {
  const [form, setForm] = useState<any>({
    leave_type: types[0]?.code || "CL", from_date: istToday(),
    to_date: istToday(), half_day: false, reason: "",
  });
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => {
    const d = (new Date(form.to_date).getTime() - new Date(form.from_date).getTime()) / 86400000 + 1;
    return form.half_day ? 0.5 : Math.max(1, d);
  }, [form]);

  const submit = async () => {
    setBusy(true); setMsg({ err: "", ok: "" });
    const { error } = await supabase.from("leaves")
      .insert({ ...form, employee_id: me.id, days, status: "Pending" });
    if (error) setMsg({ err: "Couldn't submit: " + error.message, ok: "" });
    else setMsg({ err: "", ok: "Leave request sent." });
    setBusy(false);
  };

  return (
    <Sheet title="Apply Leave" onClose={onClose}>
      <div className="att-card att-stack">
        <div>
          <label>Leave type</label>
          <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
            {types.map((t: any) => (
              <option key={t.code} value={t.code}>{t.name}{t.paid ? "" : " (unpaid)"}</option>
            ))}
          </select>
        </div>
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
        <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0, color: "#374151" }}>
          <input type="checkbox" checked={form.half_day}
            onChange={(e) => setForm({ ...form, half_day: e.target.checked, to_date: form.from_date })} />
          Half day
        </label>
        <div>
          <label>Reason</label>
          <textarea rows={2} placeholder="Reason" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <div className="att-between">
          <span className="att-muted">{days} day{days === 1 ? "" : "s"}</span>
          <button className="att-btn sm" onClick={submit} disabled={busy || !form.reason}>
            {busy ? "Sending…" : "Apply"}
          </button>
        </div>
      </div>
    </Sheet>
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
    <div className="att-wrap att-narrow att-stack">
      <Note>{err}</Note>
      {total === 0 && <div className="att-list"><p className="att-empty">All clear. Nothing pending.</p></div>}

      {leaves.length > 0 && (
        <div className="att-list">
          <div className="att-hd"><b>Leave requests</b><span className="att-muted">{leaves.length}</span></div>
          {leaves.map((r) => (
            <div className="att-row" key={r.id} style={{ flexWrap: "wrap" }}>
              <Avatar name={r.employees?.full_name} />
              <div className="grow" style={{ minWidth: 150 }}>
                <p><b>{r.employees?.full_name}</b></p>
                <p className="att-muted">{r.leave_type} · {fmtDate(r.from_date)} – {fmtDate(r.to_date)} · {r.days}d</p>
                <p style={{ color: "#475467", fontSize: 13, whiteSpace: "normal" }}>{r.reason}</p>
              </div>
              <button className="att-btn sm green" disabled={busy}
                onClick={() => decideLeave(r.id, "Approved")}>Approve</button>
              <button className="att-btn sm grey" disabled={busy}
                onClick={() => decideLeave(r.id, "Rejected")}>Reject</button>
            </div>
          ))}
        </div>
      )}

      {regs.length > 0 && (
        <div className="att-list">
          <div className="att-hd"><b>Missed punch requests</b><span className="att-muted">{regs.length}</span></div>
          {regs.map((r) => (
            <div className="att-row" key={r.id} style={{ flexWrap: "wrap" }}>
              <Avatar name={r.employees?.full_name} />
              <div className="grow" style={{ minWidth: 150 }}>
                <p><b>{r.employees?.full_name}</b></p>
                <p className="att-muted">
                  {fmtDate(r.work_date)} · {fmtHM(r.req_punch_in)} – {fmtHM(r.req_punch_out)}
                </p>
                <p style={{ color: "#475467", fontSize: 13, whiteSpace: "normal" }}>{r.reason}</p>
              </div>
              <button className="att-btn sm green" disabled={busy}
                onClick={() => decideReg(r.id, "Approved")}>Approve</button>
              <button className="att-btn sm grey" disabled={busy}
                onClick={() => decideReg(r.id, "Rejected")}>Reject</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================= team ========================= */
function TodayTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [date, setDate] = useState(istToday());
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setBusy(true);
      const { data } = await supabase.rpc("whos_in", { p_date: date });
      setRows(data || []); setBusy(false);
    })();
  }, [date]);

  const inNow = rows.filter((r) => r.state === "In").length;
  const done = rows.filter((r) => r.state === "Out").length;
  const onLeave = rows.filter((r) => r.state === "Leave").length;
  const notIn = rows.filter((r) => r.state === "Yet to check in").length;
  const shown = filter ? rows.filter((r) => r.state === filter) : rows;

  return (
    <>
      <div className="att-range">
        <div className="qk">
          <button className={date === istToday() ? "on" : ""}
            onClick={() => setDate(istToday())}>Today</button>
          <button onClick={() => setDate(addDays(date, -1))}>‹ Previous</button>
          <button onClick={() => setDate(addDays(date, 1))} disabled={date >= istToday()}>Next ›</button>
        </div>
        <div className="att-flex" style={{ marginLeft: "auto" }}>
          <input type="date" max={istToday()} value={date}
            onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {busy && <p className="att-muted">Loading…</p>}

      <div className="att-grid4">
        <div className={`att-stat clk ${filter === "In" ? "on" : ""}`}
          onClick={() => setFilter(filter === "In" ? "" : "In")}>
          <b style={{ color: "#16a34a" }}>{inNow}</b><span>In now</span></div>
        <div className="att-stat clk" onClick={() => setFilter(filter === "Out" ? "" : "Out")}>
          <b style={{ color: "#6b7280" }}>{done}</b><span>Checked out</span></div>
        <div className="att-stat clk" onClick={() => setFilter(filter === "Leave" ? "" : "Leave")}>
          <b style={{ color: "#2563eb" }}>{onLeave}</b><span>On leave</span></div>
        <div className="att-stat clk"
          onClick={() => setFilter(filter === "Yet to check in" ? "" : "Yet to check in")}>
          <b style={{ color: "#dc2626" }}>{notIn}</b><span>Not in</span></div>
      </div>
      {filter && (
        <p className="att-muted">Showing {filter} ·{" "}
          <button style={{ color: "#2563eb" }} onClick={() => setFilter("")}>clear</button></p>
      )}
      <div className="att-list">
        {shown.map((r) => (
          <div className="att-row" key={r.emp_code}>
            <Avatar name={r.full_name} />
            <div className="grow">
              <p><b>{r.emp_code}</b> · {r.full_name}</p>
              <p className="att-muted">{r.designation || r.branch}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: stateColor[r.state] }}>{r.state}</p>
              <p className="att-muted" style={{ fontSize: 11.5 }}>
                {r.first_in ? `${fmtTime(r.first_in)}${r.state === "Out" ? ` – ${fmtTime(r.last_out)}` : ""}` : ""}
                {r.minutes ? ` · ${hhmm(r.minutes)}` : ""}
              </p>
            </div>
          </div>
        ))}
        {!shown.length && !busy && <p className="att-empty">Nobody in this list.</p>}
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

  if (busy) return <p className="att-muted">Loading…</p>;
  const maxT = Math.max(1, ...trend.map((d) => d.present + d.late + d.absent));

  return (
    <>
      <div className="att-list">
        <div className="att-hd"><b>Branch-wise (today)</b></div>
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
        {!branches.length && <p className="att-empty">No data yet.</p>}
      </div>

      <div className="att-card">
        <b>Last 14 days</b>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 120, marginTop: 12 }}>
          {trend.map((d) => {
            const h = ((d.present + d.late) / maxT) * 100;
            const ha = (d.absent / maxT) * 100;
            return (
              <div key={d.d} style={{ flex: 1, display: "flex", flexDirection: "column",
                justifyContent: "flex-end", height: "100%", gap: 2 }}>
                <div style={{ height: `${ha}%`, background: "#fecdca", borderRadius: "3px 3px 0 0" }} />
                <div style={{ height: `${h}%`, background: "#2563eb", borderRadius: ha ? 0 : "3px 3px 0 0" }} />
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
    </>
  );
}

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

  if (busy) return <p className="att-muted">Loading…</p>;
  const shown = rows.filter((r) =>
    !q || `${r.full_name} ${r.emp_code}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="att-flex">
        <input placeholder="Search by name or code" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        {me.role === "admin" && <button className="att-btn sm" onClick={() => setAdd(true)}>+ New</button>}
      </div>
      <div className="att-list">
        {shown.map((r) => (
          <div className="att-row" key={r.id} onClick={() => me.role === "admin" && setEdit(r)}>
            <Avatar name={r.full_name} />
            <div className="grow">
              <p><b>{r.emp_code}</b> · {r.full_name}</p>
              <p className="att-muted">
                {r.designation || r.role} · {fmtHM(r.shift_start)} – {fmtHM(r.shift_end)}
              </p>
            </div>
            {!r.active && <span className="att-pill p-Off">Inactive</span>}
            {r.field_staff && <span className="att-pill p-Leave">Field</span>}
          </div>
        ))}
        {!shown.length && <p className="att-empty">No match found.</p>}
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
        if (pin.length < 6) throw new Error("PIN must be at least 6 digits");
        const email = `${payload.emp_code.toLowerCase()}${EMAIL_DOMAIN}`;
        const { data: au, error: ae } = await signupClient.auth.signUp({ email, password: pin });
        if (ae) throw new Error("Couldn't create the login: " + ae.message);
        payload.auth_user_id = au.user?.id;
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw new Error(error.message);
        await supabase.rpc("seed_leave_balances", {});
        setMsg({ err: "", ok: `${payload.full_name} added — code ${payload.emp_code}, PIN ${pin}` });
      } else {
        const { error } = await supabase.from("employees").update(payload).eq("id", row.id);
        if (error) throw new Error(error.message);
        setMsg({ err: "", ok: "Saved." });
      }
    } catch (e: any) { setMsg({ err: e.message, ok: "" }); }
    setBusy(false);
  };

  const toggleOff = (d: number) => {
    const cur: number[] = f.week_off_days || [];
    setF({ ...f, week_off_days: cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d] });
  };

  return (
    <Sheet title={isNew ? "New employee" : f.full_name} onClose={onClose}>
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
            <label>PIN (6 digits)</label>
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
            <label>Grace (minutes)</label>
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
                    flex: 1, minHeight: 40, borderRadius: 8, fontWeight: 650,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: on ? "#2563eb" : "#eef0f3", color: on ? "#fff" : "#6b7280",
                  }}>{d}</button>
              );
            })}
          </div>
        </div>
        <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0, color: "#374151" }}>
          <input type="checkbox" checked={f.field_staff}
            onChange={(e) => setF({ ...f, field_staff: e.target.checked })} />
          Field staff (skip geo-fence)
        </label>
        {!isNew && (
          <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0, color: "#374151" }}>
            <input type="checkbox" checked={f.active}
              onChange={(e) => setF({ ...f, active: e.target.checked })} />
            Active
          </label>
        )}
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn" onClick={save} disabled={busy || !f.emp_code || !f.full_name}>
          {busy ? "Saving…" : isNew ? "Add employee" : "Save"}
        </button>
      </div>
    </Sheet>
  );
}

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

      {busy && <p className="att-muted">Loading…</p>}

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
          {!data.length && <p className="att-empty">No late marks this month. Nice.</p>}
          {data.map((r: any, i: number) => (
            <div className="att-row" key={i}>
              <span style={{ width: 52, fontWeight: 650 }}>{fmtDate(r.work_date)}</span>
              <span className="grow">{r.full_name}</span>
              <span className="att-muted">{fmtTime(r.punch_in_at)}</span>
              <span className="att-pill p-Late">{r.late_minutes}m</span>
            </div>
          ))}
        </div>
      )}

      {!busy && kind === "absence" && (
        <div className="att-list">
          {!data.length && <p className="att-empty">No data yet.</p>}
          {data.map((r: any, i: number) => (
            <div className="att-row" key={i}>
              <Avatar name={r.full_name} />
              <div className="grow">
                <p><b>{r.full_name}</b></p>
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
      {busy && <p className="att-muted">Loading…</p>}
      {!busy && (
        <div className="att-list">
          {!rows.length && <p className="att-empty">No data for this month.</p>}
          {rows.map((r: any) => (
            <div className="att-row" key={r.emp_code} style={{ display: "block" }}>
              <div className="att-between">
                <b>{r.full_name}</b>
                <b style={{ color: "#2563eb" }}>{r.payable_amount ?? "—"}</b>
              </div>
              <p className="att-muted" style={{ marginTop: 3 }}>
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

function TeamScreen({ me, tab }: any) {
  return (
    <div className="att-wrap att-stack">
      {tab === "today" && <TodayTab />}
      {tab === "dash" && <DashTab />}
      {tab === "staff" && <StaffTab me={me} />}
      {tab === "reports" && <ReportsTab />}
      {tab === "payroll" && <PayrollTab />}
    </div>
  );
}

/* ========================= profile ========================= */
function MeScreen({ me }: any) {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState({ err: "", ok: "" });

  const changePin = async () => {
    setMsg({ err: "", ok: "" });
    if (pin.length < 6) return setMsg({ err: "PIN must be at least 6 digits", ok: "" });
    const { error } = await supabase.auth.updateUser({ password: pin });
    if (error) setMsg({ err: error.message, ok: "" });
    else { setMsg({ err: "", ok: "PIN updated." }); setPin(""); }
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
    <div className="att-wrap att-narrow att-stack">
      <div className="att-card att-flex">
        <Avatar name={me.full_name} lg />
        <div>
          <h2 className="att-h1">{me.full_name}</h2>
          <p className="att-muted">{me.designation || me.role} · {me.emp_code}</p>
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
        <h3 className="att-h2" style={{ margin: 0 }}>Change PIN</h3>
        <input type="password" inputMode="numeric" placeholder="New 6 digit PIN"
          value={pin} onChange={(e) => setPin(e.target.value)} />
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn sm" onClick={changePin} disabled={!pin}>Save</button>
      </div>
    </div>
  );
}

/* ========================= shell ========================= */
export default function Attendance() {
  const [session, setSession] = useState<any>(undefined);
  const [me, setMe] = useState<any>(null);
  const [tab, setTab] = useState("home");
  const [teamTab, setTeamTab] = useState("today");
  const [leaveTab, setLeaveTab] = useState("summary");
  const [attTab, setAttTab] = useState("summary");
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
      setPending([...(l.data || []), ...(r.data || [])]
        .filter((x: any) => x.employee_id !== me.id).length);
    })();
  }, [me, tab]);

  const shell = (children: any) => (
    <div className="hjsatt"><style>{CSS}</style>{children}</div>
  );

  if (session === undefined) return shell(<div className="att-center att-muted">Loading…</div>);
  if (!session) return shell(<Login />);
  if (!me) return shell(
    <div className="att-center" style={{ flexDirection: "column", gap: 13, textAlign: "center" }}>
      <p>This login isn't linked to an employee record yet. Ask your admin to link your employee code.</p>
      <button className="att-btn grey sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  );

  const approver = ["manager", "admin"].includes(me.role);
  const nav: [string, string, string][] = [
    ["home", "Home", "home"],
    ["att", "Attendance", "clock"],
    ["leaves", "Leave Tracker", "cal"],
  ];
  if (approver) nav.push(["inbox", "Approvals", "check"], ["team", "Team", "users"]);
  nav.push(["me", "Profile", "user"]);

  const teamTabs: [string, string][] = [
    ["today", "Today"], ["dash", "Dashboard"], ["staff", "Staff"],
    ["reports", "Reports"], ["payroll", "Payroll"],
  ];
  const titles: Record<string, string> = {
    home: "My Space", att: "Attendance", leaves: "Leave Tracker",
    inbox: "Approvals", team: "Team", me: "My Profile",
  };
  const leaveTabs: [string, string][] = [["summary", "Leave Summary"], ["requests", "Leave Requests"]];

  return shell(
    <>
      <nav className="att-rail">
        <div className="att-raillogo">HJS</div>
        {nav.map(([k, label, ic]) => (
          <button key={k} className={`att-railbtn ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
            <div className="ic"><Icon n={ic} c={tab === k ? "#fff" : "#9fb0cd"} /></div>
            <span>{label}</span>
            {k === "inbox" && pending > 0 && <span className="cnt">{pending}</span>}
          </button>
        ))}
      </nav>

      <div className="att-body">
        <header className="att-topbar">
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{titles[tab]}</b>
            <span className="sub" style={{ display: "block" }}>
              {me.emp_code} · {me.full_name}
            </span>
          </div>
          <button className="att-signout" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </header>

        <div className="att-mtabs">
          {nav.map(([k, label]) => (
            <button key={k} className={`att-tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
              {label}
              {k === "inbox" && pending > 0 && <span className="cnt">{pending}</span>}
            </button>
          ))}
        </div>

        {tab === "team" && (
          <div className="att-subbar">
            {teamTabs.map(([k, l]) => (
              <button key={k} className={`att-tab ${teamTab === k ? "on" : ""}`}
                onClick={() => setTeamTab(k)}>{l}</button>
            ))}
          </div>
        )}

        {tab === "att" && (
          <div className="att-subbar">
            {[["summary", "Attendance Summary"], ["matrix", "Monthly matrix"]].map(([k, l]) => (
              <button key={k} className={`att-tab ${attTab === k ? "on" : ""}`}
                onClick={() => setAttTab(k)}>{l}</button>
            ))}
          </div>
        )}

        {tab === "leaves" && (
          <div className="att-subbar">
            {leaveTabs.map(([k, l]) => (
              <button key={k} className={`att-tab ${leaveTab === k ? "on" : ""}`}
                onClick={() => setLeaveTab(k)}>{l}</button>
            ))}
          </div>
        )}

        <main className="att-main">
          {tab === "home" && <HomeScreen me={me} />}
          {tab === "att" && <AttendanceScreen me={me} tab={attTab} />}
          {tab === "leaves" && <LeavesScreen me={me} tab={leaveTab} />}
          {tab === "inbox" && approver && <InboxScreen me={me} onCount={setPending} />}
          {tab === "team" && approver && <TeamScreen me={me} tab={teamTab} />}
          {tab === "me" && <MeScreen me={me} />}
        </main>
      </div>
    </>
  );
}
