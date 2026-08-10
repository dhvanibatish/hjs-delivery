// ============================================================
// HJS Attendance v5 — light theme, Zoho People style layout
// Desktop: navy icon rail + top bar + sub-tab bar
// Mobile : top bar + scrollable tab row
// Multiple check-in / check-out per day (sessions).
// Chalao: hjs_attendance_v2.sql phir hjs_attendance_v3.sql
// ============================================================
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const URL_ = import.meta.env.VITE_SUPABASE_URL;
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(URL_, KEY_, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "hjs-attendance" },
});
const IST = "en-IN";
const TZ = "Asia/Kolkata";

/* ========================= styles ========================= */
const CSS = `
.hjsatt, .hjsatt * { box-sizing: border-box; margin: 0; padding: 0; }
.hjsatt {
  position: fixed; inset: 0; display: flex; overflow: hidden; text-align: left;
  background: #f0f1f4; color: #1f2328; color-scheme: light;
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
/* checkbox pe bhi appearance:none tick uda deta hai — native wapas */
.hjsatt input[type=checkbox] {
  -webkit-appearance: checkbox; appearance: checkbox;
  width: 17px; height: 17px; min-height: 0; padding: 0; margin: 0;
  accent-color: #2563eb; cursor: pointer; flex-shrink: 0; }
.hjsatt input[type=radio] {
  -webkit-appearance: radio; appearance: radio;
  width: 17px; height: 17px; min-height: 0; padding: 0; margin: 0;
  accent-color: #2563eb; cursor: pointer; flex-shrink: 0; }

/* date / month / time — native icon wapas, apne rang mein */
.hjsatt input[type=date], .hjsatt input[type=month], .hjsatt input[type=time] {
  -webkit-appearance: none; appearance: none;
  min-width: 148px; cursor: pointer; }
.hjsatt input[type=month] { min-width: 128px; }
.hjsatt input[type=time] { min-width: 108px; }

.hjsatt input[type=date]::-webkit-calendar-picker-indicator,
.hjsatt input[type=month]::-webkit-calendar-picker-indicator,
.hjsatt input[type=time]::-webkit-calendar-picker-indicator {
  margin-left: 8px; padding: 2px; cursor: pointer; opacity: 1;
  filter: invert(32%) sepia(87%) saturate(2000%) hue-rotate(212deg) brightness(95%); }
.hjsatt input[type=date]::-webkit-calendar-picker-indicator:hover,
.hjsatt input[type=month]::-webkit-calendar-picker-indicator:hover,
.hjsatt input[type=time]::-webkit-calendar-picker-indicator:hover {
  background: #eff4ff; border-radius: 4px; }

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
.hjsatt .att-railbtn span { font-size: 10.5px; color: #cbd7ea; text-align: center;
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
.hjsatt .att-body { flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden; }
.hjsatt .att-main { flex: 1; min-width: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.hjsatt .att-topbar { flex-shrink: 0; background: #223354; display: flex; align-items: center;
  gap: 12px; padding: 0 16px; height: 54px; padding-top: env(safe-area-inset-top);
  height: calc(54px + env(safe-area-inset-top)); }
.hjsatt .att-topbar b, .hjsatt .att-topbar span { color: #fff; }
.hjsatt .att-topbar .sub { color: #9fb0cd; font-size: 12.5px; }
.hjsatt .att-signout { border: 1px solid rgba(255,255,255,.28); border-radius: 7px;
  padding: 6px 12px; font-size: 13px; color: #fff; }

.hjsatt .att-scope { flex-shrink: 0; background: #223354; display: flex; gap: 2px;
  padding: 0 14px; overflow-x: auto; scrollbar-width: none; }
.hjsatt .att-scope::-webkit-scrollbar { display: none; }
.hjsatt .att-scopebtn { padding: 12px 14px 13px; font-size: 14.5px; font-weight: 600;
  color: #cbd7ea; white-space: nowrap; flex-shrink: 0; }
.hjsatt .att-scopebtn.on { color: #fff; box-shadow: inset 0 -2.5px 0 #fff; }
.hjsatt .att-scopebtn .cnt { display: inline-block; margin-left: 6px; min-width: 18px; height: 18px;
  line-height: 18px; border-radius: 99px; background: #dc2626; color: #fff; font-size: 10.5px;
  font-weight: 700; text-align: center; padding: 0 5px; }
.hjsatt .att-topbar { height: auto; padding-bottom: 0; }

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

@media (max-width: 899px) {
  /* iOS: fixed shell + inner scroll atakta hai -> normal page scroll */
  .hjsatt { position: static; overflow: visible; min-height: 100dvh;
    display: block; overscroll-behavior-y: contain; }
  .hjsatt .att-rail { display: none; }
  .hjsatt .att-body { display: block; overflow: visible; }
  .hjsatt .att-main { overflow: visible; }
  .hjsatt .att-mtabs { display: flex; position: sticky; top: 0; z-index: 12; }
  .hjsatt .att-card, .hjsatt .att-list { box-shadow: none; }
  .hjsatt .att-tcard { width: 240px; }
}

/* phone pe hover effects band — scroll pe repaint kam */
@media (hover: none) {
  .hjsatt .att-etable tr:hover td { background: inherit; }
  .hjsatt .att-grp:hover { background: #fff; }
  .hjsatt .att-tcard:hover { border-color: #d0d5dd; }
  .hjsatt .att-railbtn:hover .ic { background: transparent; }
}

/* ---------- generic ---------- */
.hjsatt .att-wrap { max-width: 1240px; margin: 0 auto; padding: 16px 14px 44px; }
.hjsatt .att-narrow { max-width: 720px; }
.hjsatt .att-center { flex: 1; width: 100%; min-height: 100%; display: flex;
  align-items: center; justify-content: center; padding: 24px 16px; }
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
.hjsatt .att-codewrap { position: relative; }
.hjsatt .att-codewrap input { letter-spacing: 0.55em; font-size: 20px; text-align: center;
  padding-right: 46px; }
.hjsatt .att-eye { position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center;
  justify-content: center; }
.hjsatt .att-eye:hover { background: #f2f4f7; }
.hjsatt .att-pin { display: inline-flex; align-items: center; gap: 3px; font-size: 11.5px;
  padding: 2px 7px; border-radius: 6px; background: #f2f4f7; color: #475467; }
.hjsatt .att-pin.ok { background: #ecfdf3; color: #067647; }
.hjsatt .att-pin.far { background: #fffaeb; color: #b54708; }
.hjsatt .att-pin.none { background: #fef3f2; color: #b42318; }
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
.hjsatt .att-scroll::-webkit-scrollbar { height: 7px; }
.hjsatt .att-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
.hjsatt .att-scroll::-webkit-scrollbar-track { background: #f1f2f4; }
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
.hjsatt .att-row.clk { cursor: pointer; }
.hjsatt .att-day.clk { cursor: pointer; width: 100%; }
.hjsatt .att-day.clk:hover { border-color: #b2ccff; background: #fafbff; }
.hjsatt .att-row.clk:hover { background: #fafbff; }
@media (hover: none) { .hjsatt .att-row.clk:hover { background: transparent; } }
.hjsatt .att-stat.clk:hover { border-color: #b2ccff; background: #fafbff; }
.hjsatt .att-mk { display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 7px; font-weight: 700; font-size: 13px; }
.hjsatt .att-mx th, .hjsatt .att-mx td { font-size: 14px; padding: 11px 10px; }
.hjsatt .att-mx th { font-size: 11.5px; }
.hjsatt .att-mx .att-mark { width: 30px; font-size: 15px; font-weight: 800; }
.hjsatt .att-mx td.name, .hjsatt .att-mx th.name { min-width: 190px; font-size: 14.5px; }
.hjsatt .att-mx tr.tot td { border-top: 0; padding: 0 10px 12px; }
.hjsatt .att-totchips { display: flex; gap: 7px; flex-wrap: wrap; }
.hjsatt .att-totchips span { font-size: 12px; font-weight: 650; padding: 3px 10px;
  border-radius: 6px; white-space: nowrap; }

/* ---------- calendar ---------- */
.hjsatt .att-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.hjsatt .att-caldow { font-size: 11px; font-weight: 700; color: #6b7280; text-align: center;
  padding-bottom: 4px; text-transform: uppercase; letter-spacing: .05em; }
.hjsatt .att-calday { min-height: 82px; border: 1px solid #e5e7eb; border-radius: 9px;
  padding: 7px 8px; background: #fff; }
.hjsatt .att-calday.pad { background: #fafbfc; border-style: dashed; }
.hjsatt .att-calday.now { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.1); }
.hjsatt .att-calday .n { font-size: 13px; font-weight: 700; }
.hjsatt .att-calday .st { font-size: 11px; font-weight: 700; margin-top: 6px; }
.hjsatt .att-calday .hr { font-size: 10.5px; color: #6b7280; }
@media (max-width: 720px) {
  .hjsatt .att-calday { min-height: 62px; padding: 5px; }
  .hjsatt .att-calday .st { font-size: 9.5px; }
  .hjsatt .att-calday .hr { display: none; }
}

/* ---------- people cards ---------- */
.hjsatt .att-people { display: grid; gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
.hjsatt .att-pcard { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 14px; display: flex; gap: 11px; align-items: flex-start; }
.hjsatt .att-pcard .nm { font-weight: 700; font-size: 14px; }
.hjsatt .att-pcard .dz { font-size: 12.5px; color: #6b7280; }
.hjsatt .att-pcard a { font-size: 12px; color: #2563eb; word-break: break-all; }

.hjsatt .att-pname { color: #2563eb; cursor: pointer; }
.hjsatt .att-pname:hover { text-decoration: underline; }

.hjsatt .att-balhd { display: flex; align-items: flex-start; justify-content: space-between;
  gap: 8px; }
.hjsatt .att-baledit { width: 28px; height: 28px; border-radius: 8px; border: 1px solid #e5e7eb;
  background: #fff; color: #98a2b3; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center; }
.hjsatt .att-baledit:hover { color: #2563eb; border-color: #b2ccff; background: #f5f8ff; }

.hjsatt .att-mx th.tot, .hjsatt .att-mx td.tot { min-width: 42px; text-align: center;
  font-weight: 700; background: #fafbfc; border-left: 1px solid #eaecf0; }
.hjsatt .att-mx th.tot { font-size: 11px; color: #475467; }
.hjsatt .att-mx td.tot { font-size: 13px; }
.hjsatt .att-mx th.pay, .hjsatt .att-mx td.pay { background: #eff4ff; color: #1849a9;
  min-width: 62px; }

.hjsatt .att-ltype { flex-shrink: 0; font-size: 11px; font-weight: 700; letter-spacing: .03em;
  padding: 4px 9px; border-radius: 6px; background: #eff4ff; color: #1849a9;
  white-space: nowrap; align-self: flex-start; }

/* ---------- reports ---------- */
.hjsatt .att-dayrow { width: 100%; display: grid; align-items: center;
  grid-template-columns: 52px 62px 1fr 78px; gap: 16px;
  padding: 14px 16px; border-bottom: 1px solid #f4f5f6; text-align: left; }
.hjsatt .att-dayrow:last-child { border-bottom: 0; }
.hjsatt .att-dayrow:hover { background: #fafbff; }
.hjsatt .att-dayrow.off { opacity: .55; }

.hjsatt .att-dayrow .dt { text-align: center; }
.hjsatt .att-dayrow .dt b { display: block; font-size: 18px; line-height: 1.1;
  font-variant-numeric: tabular-nums; }
.hjsatt .att-dayrow .dt i { display: block; font-style: normal; font-size: 10.5px;
  color: #98a2b3; text-transform: uppercase; letter-spacing: .04em; margin-top: 1px; }

.hjsatt .att-dayrow .mid { min-width: 0; }
.hjsatt .att-dayrow .mid b { display: block; font-size: 14px; line-height: 1.35;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hjsatt .att-dayrow .mid span { display: block; font-size: 12.5px; color: #6b7280;
  font-variant-numeric: tabular-nums; white-space: nowrap; margin-top: 2px;
  overflow: hidden; text-overflow: ellipsis; }

.hjsatt .att-mark.wide { display: block; width: 100%; padding: 5px 4px;
  border-radius: 7px; font-size: 12px; letter-spacing: .01em;
  text-align: center; overflow: hidden; }
/* SHORT / HALF jaise lambe code chhote font mein, par usi jagah mein */
.hjsatt .att-mark.wide.long { font-size: 9.5px; font-weight: 800; letter-spacing: 0; }

.hjsatt .att-dayrow .hrs { font-size: 14px; font-weight: 700; white-space: nowrap;
  font-variant-numeric: tabular-nums; color: #344054; text-align: right; }
.hjsatt .att-dayrow .hrs.none { color: #d0d5dd; font-weight: 500; }

@media (max-width: 480px) {
  .hjsatt .att-dayrow { grid-template-columns: 42px 52px 1fr 66px;
    gap: 10px; padding: 12px 12px; }
  .hjsatt .att-dayrow .dt b { font-size: 16px; }
  .hjsatt .att-dayrow .mid b { font-size: 13.5px; }
  .hjsatt .att-dayrow .mid span { font-size: 12px; }
  .hjsatt .att-dayrow .hrs { font-size: 13px; }
  .hjsatt .att-mark.wide { padding: 4px 2px; font-size: 11px; }
  .hjsatt .att-mark.wide.long { font-size: 8.5px; }
}
.hjsatt .att-stat.clk { cursor: pointer; }
.hjsatt .att-stat.clk:hover { border-color: #b2ccff; background: #fafbff; }
@media (hover: none) { .hjsatt .att-dayrow:hover { background: #fff; } }

.hjsatt .att-stats { display: grid; gap: 9px;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); }
.hjsatt .att-rephd { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 14px; }
.hjsatt .att-repmonth { width: auto; min-width: 160px; }
.hjsatt .att-legend { display: flex; gap: 14px; flex-wrap: wrap; align-items: center;
  font-size: 12.5px; color: #475467; padding: 2px 2px 0; }
.hjsatt .att-legend span { display: inline-flex; align-items: center; gap: 5px; }
.hjsatt .att-legend i { font-style: normal; font-weight: 700; font-size: 11px;
  width: 20px; height: 20px; border-radius: 6px; display: inline-flex;
  align-items: center; justify-content: center; }
.hjsatt .att-legend .m-P { background: #ecfdf3; color: #067647; }
.hjsatt .att-legend .m-L { background: #fffaeb; color: #b54708; }
.hjsatt .att-legend .m-H { background: #fff4ed; color: #c4320a; }
.hjsatt .att-legend .m-A { background: #fef3f2; color: #b42318; }
.hjsatt .att-legend .m-W { background: #f2f4f7; color: #667085; }
.hjsatt .att-legend .m-F { background: #ecfdff; color: #0e7090; }

@media (max-width: 720px) {
  .hjsatt .att-rephd { flex-direction: column; align-items: stretch; }
  .hjsatt .att-repmonth { width: 100%; }
  .hjsatt .att-rephd .att-btn { width: 100%; }
  .hjsatt .att-legend { gap: 9px; font-size: 11.5px; }
}

/* ---------- daily verification ---------- */
.hjsatt .att-vhero { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 18px 20px; display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.hjsatt .att-vhero h2 { font-size: 19px; font-weight: 700; }
.hjsatt .att-vhero .dt { color: #6b7280; font-size: 13.5px; margin-top: 2px; }
.hjsatt .att-vprog { flex: 1; min-width: 190px; }
.hjsatt .att-vbar { height: 8px; border-radius: 99px; background: #eef0f3; overflow: hidden;
  margin-top: 8px; }
.hjsatt .att-vbar i { display: block; height: 100%; background: #16a34a; border-radius: 99px;
  transition: width .3s; }
.hjsatt .att-vteam { display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  border-bottom: 1px solid #eaecf0; }
.hjsatt .att-vteam b { font-size: 14.5px; }
.hjsatt .att-vwrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
.hjsatt .att-vwrap > .att-vteam:first-child { border-radius: 12px 12px 0 0; }
.hjsatt .att-vwrap > .att-vrow:last-child { border-radius: 0 0 12px 12px; }
.hjsatt .att-vrow { display: flex; align-items: center; gap: 12px; padding: 13px 16px;
  border-bottom: 1px solid #f4f5f6; flex-wrap: wrap; }
.hjsatt .att-vrow .who { display: flex; align-items: center; gap: 11px;
  flex: 1 1 190px; min-width: 0; }
.hjsatt .att-vrow .when { text-align: right; margin-left: auto; }
@media (max-width: 620px) {
  .hjsatt .att-vrow { align-items: flex-start; padding: 12px 13px; }
  .hjsatt .att-vrow .who { flex: 1 1 100%; }
  .hjsatt .att-vrow .when { text-align: left; margin-left: 43px; }
  .hjsatt .att-vrow .att-btn,
  .hjsatt .att-vrow .att-vtag { margin-left: auto; }
}
.hjsatt .att-vrow:last-child { border-bottom: 0; }
.hjsatt .att-vrow.ok { background: #f6fef9; box-shadow: inset 3px 0 0 #16a34a; }
.hjsatt .att-vrow.hold { background: #fffcf5; box-shadow: inset 3px 0 0 #d97706; }
.hjsatt .att-vrow.cut { background: #fffbfa; box-shadow: inset 3px 0 0 #b42318; }
.hjsatt .att-vrow.cut .nm { color: #667085; text-decoration: line-through; }
.hjsatt .att-pencil { width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e5e7eb;
  background: #fff; color: #667085; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center; }
.hjsatt .att-pencil:hover { background: #f5f8ff; color: #2563eb; border-color: #b2ccff; }
.hjsatt .att-vtime { font-variant-numeric: tabular-nums; font-weight: 650; font-size: 13.5px;
  color: #344054; white-space: nowrap; }
.hjsatt .att-vempty { text-align: center; padding: 44px 20px; color: #667085; }
.hjsatt .att-vempty .big { font-size: 34px; margin-bottom: 8px; }
.hjsatt .att-menu { position: relative; }
.hjsatt .att-pop.up { top: auto; bottom: 34px; }
.hjsatt .att-dots { width: 30px; height: 30px; border-radius: 8px; border: 1px solid #e5e7eb;
  background: #fff; color: #667085; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center; }
.hjsatt .att-dots:hover { background: #f5f6f8; color: #344054; }
.hjsatt .att-pop { position: absolute; right: 0; top: 34px; z-index: 60; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 10px 26px rgba(16,24,40,.14);
  min-width: 190px; overflow: hidden; }
.hjsatt .att-pop button { display: block; width: 100%; text-align: left; padding: 10px 13px;
  font-size: 13.5px; color: #344054; }
.hjsatt .att-pop button:hover { background: #f5f6f8; }
.hjsatt .att-pop button.danger { color: #b42318; }
.hjsatt .att-pop .sep { height: 1px; background: #eaecf0; }
.hjsatt .att-vtag { font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 99px; }

/* ---------- selection bar + detail ---------- */
.hjsatt .att-selbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  background: #eff4ff; border: 1px solid #b2ccff; border-radius: 10px; padding: 10px 13px; }
.hjsatt .att-selbar b { color: #1849a9; }
.hjsatt .att-etable td.cb, .hjsatt .att-etable th.cb { width: 38px; text-align: center; padding: 8px; }
.hjsatt .att-etable tr.sel td { background: #f5f8ff; }
.hjsatt .att-etable td.link { color: #2563eb; font-weight: 650; cursor: pointer; }
.hjsatt .att-etable td.link:hover { text-decoration: underline; }
.hjsatt .att-dl { display: grid; grid-template-columns: 150px 1fr; gap: 6px 14px; font-size: 14px; }
.hjsatt .att-dl dt { color: #6b7280; font-size: 13px; }
.hjsatt .att-dl dd { font-weight: 600; }

/* ---------- employee list table ---------- */
.hjsatt .att-etable { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.hjsatt .att-etable th { text-align: left; padding: 11px 12px; background: #f9fafb;
  color: #475467; font-size: 12px; font-weight: 650; white-space: nowrap;
  border-bottom: 1px solid #e5e7eb; cursor: pointer; }
.hjsatt .att-etable th:hover { background: #f2f4f7; }
.hjsatt .att-etable td { padding: 11px 12px; border-bottom: 1px solid #f1f2f4; white-space: nowrap; }
.hjsatt .att-etable tr:hover td { background: #fafbff; }
.hjsatt .att-etable td.first, .hjsatt .att-etable th.first { position: sticky; left: 0;
  background: #fff; font-weight: 650; box-shadow: 1px 0 0 #f1f2f4; }
.hjsatt .att-etable th.first { background: #f9fafb; }
.hjsatt .att-arrow2 { color: #98a2b3; font-size: 10px; margin-left: 4px; }

/* ---------- org chart with real connectors ---------- */
.hjsatt .att-tw { overflow: auto; -webkit-overflow-scrolling: touch; padding: 6px 2px 16px; }
.hjsatt .att-node { display: flex; align-items: center; }
.hjsatt .att-tcard { display: flex; gap: 10px; align-items: center; background: #fff;
  border: 1px solid #d0d5dd; border-radius: 8px; padding: 10px 12px; width: 264px;
  flex-shrink: 0; text-align: left; }
.hjsatt .att-tcard.can { cursor: pointer; }
.hjsatt .att-tcard.can:hover { border-color: #2563eb; }
.hjsatt .att-tcard.on { border-color: #2563eb; background: #f5f8ff; }
.hjsatt .att-tcard .nm { font-weight: 650; font-size: 14px; display: block; }
.hjsatt .att-tcard .dz { font-size: 12.5px; color: #6b7280; display: block; }
.hjsatt .att-tbadge { background: #2563eb; color: #fff; font-size: 11px; font-weight: 700;
  border-radius: 5px; padding: 2px 7px; flex-shrink: 0; }
.hjsatt .att-tbadge.grey { background: #eef0f3; color: #475467; }

/* parent -> children connector */
.hjsatt .att-stub { width: 22px; height: 1px; background: #d0d5dd; flex-shrink: 0; }
.hjsatt .att-kids { display: flex; flex-direction: column; justify-content: center; }
.hjsatt .att-kid { display: flex; align-items: center; position: relative; padding: 5px 0; }
/* vertical spine */
.hjsatt .att-kid:before { content: ""; position: absolute; left: 0; width: 1px;
  background: #d0d5dd; top: 0; bottom: 0; }
.hjsatt .att-kid:first-child:before { top: 50%; }
.hjsatt .att-kid:last-child:before { bottom: 50%; }
.hjsatt .att-kid:only-child:before { display: none; }
/* horizontal stub into each child */
.hjsatt .att-kid:after { content: ""; position: absolute; left: 0; top: 50%;
  width: 22px; height: 1px; background: #d0d5dd; }
.hjsatt .att-kid > * { margin-left: 22px; }

/* ---------- reporting tree ---------- */
.hjsatt .att-rt { margin-left: 16px; padding-left: 14px; border-left: 1px solid #e5e7eb; }
.hjsatt .att-rtrow { display: flex; align-items: center; gap: 9px; padding: 7px 0; }
.hjsatt .att-rtrow .cnt2 { font-size: 11px; background: #eff4ff; color: #2563eb;
  padding: 1px 7px; border-radius: 5px; font-weight: 650; }

/* ---------- collapsible group ---------- */
.hjsatt .att-grp { width: 100%; display: flex; align-items: center; gap: 10px;
  padding: 13px 14px; background: #fff; }
.hjsatt .att-grp:hover { background: #fafbfc; }
.hjsatt .att-grp .t { font-weight: 700; font-size: 14.5px; }
.hjsatt .att-grp .chev { color: #475467; font-size: 15px; width: 18px; text-align: center;
  line-height: 1; transition: transform .15s; }
.hjsatt .att-grp:hover .chev { color: #2563eb; }
.hjsatt .att-mini { display: flex; gap: 5px; flex-wrap: wrap; }
.hjsatt .att-mini span { font-size: 11px; font-weight: 650; padding: 2px 7px; border-radius: 5px; }

/* ---------- org tree ---------- */
.hjsatt .att-tree { display: flex; flex-direction: column; gap: 10px; }
.hjsatt .att-tnode { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; }
.hjsatt .att-thead { display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  border-bottom: 1px solid #f1f2f4; }
.hjsatt .att-thead .nm { font-weight: 700; font-size: 15px; }
.hjsatt .att-tmem { display: flex; align-items: center; gap: 10px; padding: 9px 14px 9px 26px;
  border-top: 1px solid #f6f7f8; position: relative; }
.hjsatt .att-tmem:before { content: ""; position: absolute; left: 14px; top: 0; bottom: 50%;
  width: 1px; background: #e5e7eb; }
.hjsatt .att-tmem:after { content: ""; position: absolute; left: 14px; top: 50%;
  width: 7px; height: 1px; background: #e5e7eb; }
.hjsatt .att-tmem .dz { font-size: 12px; color: #6b7280; }
.hjsatt .att-chip { font-size: 11px; font-weight: 650; padding: 2px 8px; border-radius: 5px;
  background: #eff4ff; color: #2563eb; }

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
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// "14:30" mein minute jodo -> "15:30"
const addMins = (hm: string, mins: number) => {
  const [h, m] = String(hm).split(":").map(Number);
  const t = (h * 60 + m + mins + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

// abhi ka time HH:MM, IST mein
const nowHM = () =>
  new Date().toLocaleTimeString("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

const istToday = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
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
  return ymd(d);
};
const lastDayOf = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + 1, 0);
  return ymd(d);
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
      return { from: ymd(d), to: today };
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
  pencil: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
};
const Icon = ({ n, c = "#9fb0cd", s = 19 }: any) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c}
    strokeWidth={n === "dots" ? 2.6 : 1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d={ICONS[n]} />
  </svg>
);

const mapUrl = (lat: any, lng: any) => `https://www.google.com/maps?q=${lat},${lng}`;

const Pin = ({ lat, lng, dist, ok, label }: any) => {
  if (lat == null || lng == null)
    return <span className="att-pin none">no location</span>;
  return (
    <a className={`att-pin ${ok === false ? "far" : "ok"}`} href={mapUrl(lat, lng)}
      target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
      title={`${lat.toFixed(5)}, ${lng.toFixed(5)}`}>
      ◉ {label || (dist == null ? "map" : `${dist} m`)}
    </a>
  );
};

const isMobile = () =>
  /Android|iPhone|iPad|iPod|Windows Phone|webOS|Mobile/i.test(navigator.userAgent)
  || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900);

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

const once = (opts: PositionOptions): Promise<GeolocationPosition> =>
  new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, opts));

const GPS_HELP = () => isIOS()
  ? "Turn on Settings → Privacy & Security → Location Services, and allow location for your browser."
  : "Pull down the notification shade and turn on Location, then tap Check-in again.";

// Pehle network/wifi wali fast location (GPS band ho tab bhi chalti hai),
// phir GPS se refine. Isse zyadatar bar pehli hi koshish mein mil jati hai.
const getPosition = async (): Promise<GeolocationPosition> => {
  if (!navigator.geolocation) throw new Error("Location isn't supported on this device");

  try {
    const perm: any = (navigator as any).permissions
      && await (navigator as any).permissions.query({ name: "geolocation" });
    if (perm && perm.state === "denied")
      throw new Error("PERM");
  } catch (e: any) {
    if (e?.message === "PERM")
      throw new Error("Location is blocked for this site. Allow it in your browser settings, then try again.");
  }

  // 1) fast, low accuracy, thoda purana fix bhi chalega
  try {
    return await once({ enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 });
  } catch (e: any) {
    if (e?.code === 1)
      throw new Error("Location permission is blocked. Allow it for this site, then try again.");
  }

  // 2) GPS se, zyada time dekar
  try {
    return await once({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  } catch (e: any) {
    if (e?.code === 1)
      throw new Error("Location permission is blocked. Allow it for this site, then try again.");
  }

  // 3) aakhri koshish — kuch bhi mil jaye
  try {
    return await once({ enableHighAccuracy: false, timeout: 25000, maximumAge: 600000 });
  } catch {
    throw new Error("Location is off. " + GPS_HELP());
  }
};

const downloadCsv = (rows: any[], filename: string) => {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => `"${r[c] ?? ""}"`).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename;
  a.click();
};

// Har second sirf ye chhota component re-render hota hai, poori screen nahi.
function LiveClock({ startedAt, baseMinutes = 0, boxes = true }: any) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => tick((x: number) => x + 1), 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  const mins = baseMinutes +
    (startedAt ? (Date.now() - new Date(startedAt).getTime()) / 60000 : 0);
  const [h, m, sec] = hms(mins);
  if (!boxes) return <>{h}:{m}:{sec}</>;
  return <div className="att-hms"><i>{h}</i><u>:</u><i>{m}</i><u>:</u><i>{sec}</i></div>;
}

const Note = ({ kind = "err", children }: any) =>
  !children ? null : <div className={`att-note ${kind}`}><span>{children}</span></div>;

function Section({ title, sub, chips, count, children, open: o0 }: any) {
  const [open, setOpen] = useState(!!o0);
  return (
    <div className="att-list">
      <button className="att-grp" onClick={() => setOpen(!open)}>
        <span className="chev">{open ? "\u25be" : "\u25b8"}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="t" style={{ display: "block" }}>{title}</span>
          {sub && <span className="att-muted" style={{ display: "block" }}>{sub}</span>}
        </span>
        {chips && <span className="att-mini">{chips}</span>}
        {count != null && <span className="att-chip">{count}</span>}
      </button>
      {open && children}
    </div>
  );
}

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
const EyeIcon = ({ off }: any) => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#667085"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="m4 4 16 16" />}
  </svg>
);

function CodeInput({ value, onChange, show, setShow, autoFocus, onEnter, placeholder }: any) {
  return (
    <div className="att-codewrap">
      <input
        type={show ? "text" : "password"}
        inputMode="numeric" autoComplete="off" autoFocus={autoFocus}
        value={value} placeholder={placeholder || "••••"}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
      />
      <button className="att-eye" type="button" onClick={() => setShow(!show)}
        aria-label={show ? "Hide code" : "Show code"} title={show ? "Hide code" : "Show code"}>
        <EyeIcon off={show} />
      </button>
    </div>
  );
}

// 4-digit code ko Supabase ke minimum password length tak pad karte hain.
const codeToPassword = (code: string) => `hjs-${code}-att`;

function Login() {
  const [stage, setStage] = useState<"email" | "set" | "enter" | "new" | "forgot">("email");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [empCode, setEmpCode] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [code2, setCode2] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  const checkEmail = async () => {
    setErr(""); setOk(""); setBusy(true);
    const e = email.trim().toLowerCase();
    const { data, error } = await supabase.rpc("email_status", { p_email: e });
    if (error) setErr(error.message);
    else if (data === "not_found") setStage("new");
    else setStage(data === "ready" ? "enter" : "set");
    setBusy(false);
  };

  const claim = async () => {
    const { error } = await supabase.rpc("claim_employee");
    if (error) { setErr(error.message); await supabase.auth.signOut(); return false; }
    return true;
  };

  const createCode = async () => {
    setErr("");
    if (code.length !== 4) return setErr("Code must be exactly 4 digits.");
    if (code !== code2) return setErr("Both codes don't match.");
    setBusy(true);
    const e = email.trim().toLowerCase();
    const pw = codeToPassword(code);

    const up = await supabase.auth.signUp({ email: e, password: pw });
    let session = up.data?.session || null;

    if (!session) {
      // user pehle se maujood ho sakta hai, ya signUp ne session nahi di
      const si = await supabase.auth.signInWithPassword({ email: e, password: pw });
      session = si.data?.session || null;
      if (!session) {
        setBusy(false);
        if (up.error && /already/i.test(up.error.message))
          setStage("forgot");
          return setErr("This email already has a code. Confirm your date of birth " +
                        "or ask your admin to reset it.");
        if (up.error) return setErr(up.error.message);
        return setErr(
          "Couldn't start your session. In Supabase, Authentication \u2192 Email \u2192 turn off " +
          "\u2018Confirm email\u2019, delete this half-made user, then try again."
        );
      }
    }
    const okNow = await claim();
    if (okNow) setOk("Code saved.");
    setBusy(false);
  };

  // naya banda: account bana ke Pending state mein chala jayega
  const registerNew = async () => {
    setErr("");
    if (!name.trim()) return setErr("Please enter your full name.");
    if (code.length !== 4) return setErr("Code must be exactly 4 digits.");
    if (code !== code2) return setErr("Both codes don't match.");
    setBusy(true);
    const e = email.trim().toLowerCase();
    const pw = codeToPassword(code);

    const up = await supabase.auth.signUp({ email: e, password: pw });
    let session = up.data?.session || null;
    if (!session) {
      const si = await supabase.auth.signInWithPassword({ email: e, password: pw });
      session = si.data?.session || null;
      if (!session) {
        setBusy(false);
        if (up.error && /already/i.test(up.error.message))
          return setErr("This email already has an account. Go back and sign in.");
        return setErr(up.error?.message
          || "Couldn't start your session. Ask your admin to check email settings.");
      }
    }
    const { error } = await supabase.rpc("register_self", {
      p_full_name: name.trim(),
      p_phone: phone.trim() || null,
    });
    if (error) {
      setErr(error.message);
      await supabase.auth.signOut();
      setBusy(false);
      return;
    }
    // record ban gaya — poora reload, warna app purani state pe
    // atka rehta hai aur dobara naam maangta hai
    window.location.reload();
  };

  const signIn = async () => {
    setErr("");
    if (code.length !== 4) return setErr("Enter your 4-digit code.");
    setBusy(true);
    const e = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: e, password: codeToPassword(code),
    });
    if (error) setErr("Wrong code. Try again, or use \u2018Forgot code\u2019.");
    else await claim();
    setBusy(false);
  };

  // DOB se verify karke wahin naya code
  const selfReset = async () => {
    setErr(""); setOk("");
    if (!dob) return setErr("Please enter your date of birth.");
    if (code.length !== 4) return setErr("Code must be exactly 4 digits.");
    if (code !== code2) return setErr("Both codes don't match.");
    setBusy(true);

    const { data, error } = await supabase.rpc("self_reset_code", {
      p_email: email.trim().toLowerCase(), p_dob: dob, p_code: code,
    });
    setBusy(false);

    if (error) return setErr(error.message);
    if (data === "no_match")
      return setErr("That date of birth doesn't match our records. Ask your admin to reset it for you.");
    if (data === "locked")
      return setErr("Too many wrong tries. Wait 30 minutes, or ask your admin.");
    if (data === "no_account")
      return setErr("You haven't set a code before. Go back and sign in normally.");
    if (data === "bad_code") return setErr("Code must be exactly 4 digits.");

    // ho gaya -> usi code se andar
    const { error: e2 } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), password: codeToPassword(code),
    });
    if (e2) { setOk("Code changed. Now sign in with it."); setStage("enter"); setCode(""); setCode2(""); }
  };

  const forgotByMail = async () => {
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) setErr(error.message);
    else setOk("Reset link sent to your email. Open it, set a new password, then sign in with those 4 digits.");
    setBusy(false);
  };

  const back = () => { setStage("email"); setCode(""); setCode2(""); setErr(""); setOk(""); };

  return (
    <div className="att-center" style={{ width: "100%" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ marginBottom: 22 }}>
          <div className="att-raillogo" style={{ marginBottom: 14 }}>HJS</div>
          <h1 className="att-h1">Attendance</h1>
          <p className="att-muted" style={{ marginTop: 3 }}>
            {stage === "email" ? "Sign in with your work email."
              : stage === "set" ? "Set a 4-digit code you'll remember."
              : stage === "new" ? "New here? Create your account."
              : stage === "forgot" ? "Let's get you a new code."
              : "Enter your 4-digit code."}
          </p>
        </div>

        <div className="att-card att-stack">
          {stage === "email" && (
            <>
              <div>
                <label>Email</label>
                <input type="email" value={email} inputMode="email" autoCapitalize="none"
                  autoCorrect="off" placeholder="name@gmail.com"
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && checkEmail()} />
              </div>
              <Note>{err}</Note>
              <button className="att-btn" onClick={checkEmail}
                disabled={busy || !email.includes("@")}>
                {busy ? "Checking…" : "Continue"}
              </button>
            </>
          )}

          {stage === "forgot" && (
            <>
              <p className="att-muted">{email}</p>
              <p className="att-muted" style={{ whiteSpace: "normal" }}>
                Confirm your date of birth and pick a new code. If your date of birth
                isn't on file, ask your admin to reset it instead.
              </p>
              <div>
                <label>Your date of birth</label>
                <input type="date" value={dob} max={istToday()} autoFocus
                  onChange={(e) => setDob(e.target.value)} />
              </div>
              <div>
                <label>New 4-digit code</label>
                <CodeInput value={code} onChange={setCode} show={show} setShow={setShow} />
              </div>
              <div>
                <label>Confirm code</label>
                <CodeInput value={code2} onChange={setCode2} show={show} setShow={setShow}
                  onEnter={selfReset} />
              </div>
              <Note>{err}</Note>
              <Note kind="ok">{ok}</Note>
              <button className="att-btn" onClick={selfReset}
                disabled={busy || !dob || code.length !== 4 || code2.length !== 4}>
                {busy ? "Checking…" : "Set my new code"}
              </button>
              <button className="att-muted" onClick={() => { setStage("enter"); setErr(""); }}>
                Back
              </button>
            </>
          )}

          {stage === "new" && (
            <>
              <p className="att-muted">{email}</p>
              <div className="att-note ok">
                <span>
                  This email isn't on our list yet. Create your account and an admin
                  will approve it — you can't check in until then.
                </span>
              </div>
              <div>
                <label>Your full name</label>
                <input value={name} placeholder="Full name" autoFocus
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label>Mobile <span className="att-muted">(optional)</span></label>
                <input value={phone} placeholder="98765 43210"
                  onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label>Create your 4-digit code</label>
                <CodeInput value={code} onChange={setCode} show={show} setShow={setShow} />
              </div>
              <div>
                <label>Confirm code</label>
                <CodeInput value={code2} onChange={setCode2} show={show} setShow={setShow}
                  onEnter={registerNew} />
              </div>
              <Note>{err}</Note>
              <button className="att-btn" onClick={registerNew}
                disabled={busy || !name.trim() || code.length !== 4 || code2.length !== 4}>
                {busy ? "Creating…" : "Create my account"}
              </button>
              <button className="att-muted" onClick={back}>Use a different email</button>
            </>
          )}

          {stage === "set" && (
            <>
              <p className="att-muted">{email}</p>
              <div>
                <label>Create your 4-digit code</label>
                <CodeInput value={code} onChange={setCode} show={show} setShow={setShow} autoFocus />
              </div>
              <div>
                <label>Confirm code</label>
                <CodeInput value={code2} onChange={setCode2} show={show} setShow={setShow}
                  onEnter={createCode} />
              </div>
              <Note>{err}</Note>
              <button className="att-btn" onClick={createCode}
                disabled={busy || code.length !== 4 || code2.length !== 4}>
                {busy ? "Saving…" : "Save code and sign in"}
              </button>
              <div className="att-between">
                <button className="att-muted" onClick={back}>Use a different email</button>
                <button className="att-muted" disabled={busy}
                  onClick={() => { setErr(""); setOk(""); setCode(""); setCode2("");
                                   setStage("forgot"); }}>Forgot code?</button>
              </div>
            </>
          )}

          {stage === "enter" && (
            <>
              <p className="att-muted">{email}</p>
              <div>
                <label>4-digit code</label>
                <CodeInput value={code} onChange={setCode} show={show} setShow={setShow}
                  autoFocus onEnter={signIn} />
              </div>
              <Note>{err}</Note>
              <Note kind="ok">{ok}</Note>
              <button className="att-btn" onClick={signIn} disabled={busy || code.length !== 4}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
              <div className="att-between">
                <button className="att-muted" onClick={back}>Different email</button>
                <button className="att-muted" disabled={busy}
                  onClick={() => { setErr(""); setOk(""); setCode(""); setCode2("");
                                   setStage("forgot"); }}>Forgot code?</button>
              </div>
            </>
          )}
        </div>

        <p className="att-muted" style={{ marginTop: 12, textAlign: "center" }}>
          You stay signed in on this device until you sign out.
        </p>
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
  const [regOpen, setRegOpen] = useState(false);
  const [range, setRange] = useState({ from: monthStart(istToday()), to: istToday() });
  const [drill, setDrill] = useState<any>(null);
  const [mgr, setMgr] = useState<any[]>([]);
  const [pickDay, setPickDay] = useState<any>(null);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [pickLeave, setPickLeave] = useState<any>(null);

  // kisi ke "Leave" pe click -> uski aaj wali leave nikaal ke dikhao
  const openLeaveFor = async (p: any) => {
    const { data } = await supabase.rpc("on_leave", { p_date: istToday() });
    const row = (data || []).find((x: any) => x.emp_code === p.emp_code);
    if (row) setPickLeave({ ...row, id: row.leave_id, emp: row });
  };
  const [peers, setPeers] = useState<any[]>([]);

  const load = async () => {
    const back = new Date(); back.setDate(back.getDate() - 40);
    const lo = [range.from, ymd(back)].sort()[0];
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
    const [m, pr, lvs] = await Promise.all([
      supabase.rpc("my_manager"), supabase.rpc("my_peers"),
      supabase.from("leaves").select("*").eq("employee_id", me.id)
        .eq("status", "Approved").gte("to_date", addDays(istToday(), -10)),
    ]);
    setMyLeaves(lvs.data || []);
    setMgr(m.data || []);
    setPeers(pr.data || []);
  };
  useEffect(() => { load(); }, [me.id, range.from, range.to]);
  const open = sessions.find((s) => !s.out_at);
  const closedMinutes = useMemo(
    () => sessions.filter((s) => s.out_at).reduce((a, s) => a + (s.minutes || 0), 0),
    [sessions]);

  const punch = async (dir: "in" | "out") => {
    setErr(""); setOk(""); setBusy(true);
    try {
      // Check-in par location zaroori hai, check-out par nahi.
      let args: any = { p_lat: null, p_lng: null, p_accuracy: null };
      if (dir === "in") {
        const pos = await getPosition();
        args = { p_lat: pos.coords.latitude, p_lng: pos.coords.longitude,
                 p_accuracy: Math.round(pos.coords.accuracy) };
      }
      const { error } = await supabase.rpc(dir === "in" ? "punch_in" : "punch_out", args);
      if (error) throw new Error(error.message);
      setOk(dir === "in" ? "Checked in." : "Checked out. You can check in again anytime.");
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

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
      const key = ymd(d);
      const log = recent.find((r: any) => r.work_date === key);
      const lv = myLeaves.find((x: any) => key >= x.from_date && key <= x.to_date);
      const off = (me.week_off_days || []).includes(d.getDay());
      const status = log?.status
        || (lv ? lv.leave_type : off ? "Off" : key > istToday() ? "" : "Absent");
      return {
        key, dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()], num: d.getDate(),
        isToday: key === istToday(),
        status,
        mark: log ? ({ Present: "P", Late: "L", "Half Day": "H" }[log.status as string] || "P")
              : lv ? lv.leave_type : off ? "W" : key > istToday() ? "" : "A",
        mins: log?.worked_minutes,
        log, lv,
      };
    });
  }, [recent, me, myLeaves]);

  const dayColor: Record<string, string> = {
    Present: "#16a34a", Late: "#d97706", "Half Day": "#ea580c",
    Absent: "#dc2626", Off: "#98a2b3",
  };
  const peerCodes = new Set(peers.map((p: any) => p.emp_code));
  const myTeam = board.filter((p) => peerCodes.has(p.emp_code) || p.emp_code === me.emp_code);
  const inNow = myTeam.filter((p) => p.state === "In").length;

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

            <LiveClock startedAt={open?.in_at} baseMinutes={closedMinutes} />

            {open && (
              <p style={{ marginTop: 6 }}>
                <Pin lat={open.in_lat} lng={open.in_lng} ok={open.in_geo_ok}
                  label={open.in_distance_m != null
                    ? `${open.in_distance_m} m from branch`
                    : "location saved · open map"} />
              </p>
            )}

            <button className={`att-btn big ${open ? "gout" : "gin"}`} style={{ marginTop: 12 }}
              onClick={() => punch(open ? "out" : "in")}
              disabled={busy || (!open && !isMobile())}>
              {busy ? (open ? "Checking out…" : "Getting location…") : open ? "Check-out" : "Check-in"}
            </button>
            <p className="att-muted" style={{ marginTop: 9, fontSize: 12 }}>
              {!open && !isMobile()
                ? "Check-in works only on your phone. Check-out can be done from anywhere."
                : "Location is recorded with every punch"}
            </p>

            {sessions.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {sessions.map((s, i) => (
                  <div className="att-sess" key={s.id}>
                    <span className="att-muted" style={{ width: 18 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      {fmtTime(s.in_at)} → {s.out_at ? fmtTime(s.out_at) : "running"}
                    </span>
                    <Pin lat={s.in_lat} lng={s.in_lng} dist={s.in_distance_m} ok={s.in_geo_ok} />
                    <b style={{ width: 56, textAlign: "right" }}>{s.out_at ? hhmm(s.minutes) : "—"}</b>
                  </div>
                ))}
              </div>
            )}
          </div>

          {err && (
            <div className="att-note err">
              <span>{err}</span>
              <button className="att-btn sm line" style={{ marginTop: 9 }}
                onClick={() => punch(open ? "out" : "in")} disabled={busy}>
                Try again
              </button>
            </div>
          )}
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

          {mgr.length > 0 && (
            <div className="att-list">
              <div className="att-hd">
                <b>{mgr.length > 1 ? "Reporting managers" : "Reporting manager"}</b>
              </div>
              {mgr.map((x: any) => (
                <div className="att-row" key={x.emp_code}>
                  <Avatar name={x.full_name} />
                  <div className="grow">
                    <p><PName code={x.emp_code}><b>{x.emp_code}</b> · {x.full_name}</PName></p>
                    <p className="att-muted">
                      {x.designation || "—"}{x.is_co_manager ? " · also reports here" : ""}
                    </p>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: stateColor[x.state] }}>
                    {x.state}
                  </span>
                </div>
              ))}
            </div>
          )}

          {peers.length > 0 && (
            <div className="att-list">
              <div className="att-hd">
                <b>My team</b><span className="att-chip">{peers.length}</span>
              </div>
              {peers.slice(0, 8).map((p) => (
                <div className="att-row" key={p.emp_code}>
                  <Avatar name={p.full_name} />
                  <div className="grow">
                    <p><PName code={p.emp_code}><b>{p.full_name}</b></PName></p>
                    <p className="att-muted">{p.designation || "—"}</p>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: stateColor[p.state] }}>
                    {p.state}
                  </span>
                </div>
              ))}
            </div>
          )}
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
                <button className={`att-day clk ${d.isToday ? "now" : ""}`} key={d.key}
                  onClick={() => setPickDay(d)}>
                  <span className="dn">{d.dow}</span>
                  <b className="dd">{String(d.num).padStart(2, "0")}</b>
                  <span className="ds" style={{ color: dayColor[d.status] || "#d0d5dd" }}>
                    {d.status === "Half Day" ? "Half" : d.status || "—"}
                  </span>
                  <span className="dh">{d.mins ? hhmm(d.mins) : ""}</span>
                </button>
              ))}
            </div>
          </div>

          {/* who's in — sirf apni team, poora board Team tab mein */}
          <div className="att-list">
            <div className="att-hd">
              <b>Who's in right now</b>
              <span className="att-pill p-Present">{inNow} in</span>
            </div>
            {myTeam.slice(0, 12).map((p) => (
              <div className={`att-row ${p.state === "Leave" ? "clk" : ""}`} key={p.emp_code}
                onClick={() => p.state === "Leave" && openLeaveFor(p)}>
                <Avatar name={p.full_name} />
                <div className="grow">
                  <p><PName code={p.emp_code}><b>{p.emp_code}</b> · {p.full_name}</PName></p>
                  <p className="att-muted">{p.designation || p.team}</p>
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
            {!myTeam.length && <p className="att-empty">No teammates to show.</p>}
            {myTeam.length > 12 && (
              <p className="att-empty">+{myTeam.length - 12} more · open Team for the full board</p>
            )}
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

      {pickDay && (
        <DaySheet me={me} onClose={() => setPickDay(null)}
          d={{ d: pickDay.key, mark: pickDay.mark || "",
               label: pickDay.status || "Nothing recorded",
               log: pickDay.log, lv: pickDay.lv }} />
      )}

      {pickLeave && (
        <LeaveSheet lv={pickLeave} who={me} onClose={() => setPickLeave(null)} />
      )}
    </div>
  );
}

/* ================= regularization ================= */
function RegularizeSheet({ me, onClose }: any) {
  const [form, setForm] = useState({
    work_date: istToday(),
    req_punch_in: String(me?.shift_start || "10:00").slice(0, 5),
    req_punch_out: nowHM(),
    reason: "",
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
          <input type="date" max={istToday()} min={addDays(istToday(), -15)}
            value={form.work_date}
            onChange={(e) => setForm({ ...form, work_date: e.target.value })} />
          <p className="att-muted" style={{ marginTop: 6 }}>
            Only the last 15 days can be regularized.
          </p>
        </div>
        <div className="att-row2">
          <div>
            <label>Check-in</label>
            <input type="time" lang="en-US" value={form.req_punch_in}
              onChange={(e) => setForm({ ...form, req_punch_in: e.target.value })} />
          </div>
          <div>
            <label>Check-out</label>
            <input type="time" lang="en-US" value={form.req_punch_out}
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
        {form.req_punch_in && form.req_punch_out && form.req_punch_out <= form.req_punch_in && (
          <Note>Check-out time must be after check-in time.</Note>
        )}
        <button className="att-btn" onClick={submit}
          disabled={busy || !form.reason.trim() || (!form.req_punch_in && !form.req_punch_out)
            || (!!form.req_punch_in && !!form.req_punch_out && form.req_punch_out <= form.req_punch_in)}>
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
  return ymd(t);
};
const addDays = (iso: string, n: number) => {
  const t = new Date(iso + "T00:00:00"); t.setDate(t.getDate() + n);
  return ymd(t);
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
  if (tab === "calendar") return <CalendarTab me={me} />;
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
  const openSess = sess.find((x) => !x.out_at && x.work_date === istToday());
  const todayClosed = useMemo(
    () => sess.filter((x) => x.work_date === istToday() && x.out_at)
              .reduce((a, x) => a + (x.minutes || 0), 0),
    [sess]);

  const punch = async (dir: "in" | "out") => {
    setErr(""); setBusy(true);
    try {
      let args: any = { p_lat: null, p_lng: null, p_accuracy: null };
      if (dir === "in") {
        const pos = await getPosition();
        args = { p_lat: pos.coords.latitude, p_lng: pos.coords.longitude,
                 p_accuracy: Math.round(pos.coords.accuracy) };
      }
      const { error } = await supabase.rpc(dir === "in" ? "punch_in" : "punch_out", args);
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
  }), [wkFrom, dayCount, sess, logs, leaves, hols, me, openSess]);

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
        <button className={`att-checkbtn ${openSess ? "out" : ""}`}
          disabled={busy || (!openSess && !isMobile())}
          title={!openSess && !isMobile() ? "Check-in works only on a phone" : ""}
          onClick={() => punch(openSess ? "out" : "in")}>
          <span>{busy ? (openSess ? "Checking out…" : "Getting location…") : openSess ? "Check-out" : "Check-in"}</span>
          <b><LiveClock startedAt={openSess?.in_at} baseMinutes={todayClosed} boxes={false} /> Hrs</b>
        </button>
        {!openSess && !isMobile() && (
          <span className="att-muted" style={{ width: "100%" }}>
            Check-in works only on your phone. Check-out can be done from anywhere.
          </span>
        )}
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
    const n = (x: string) => v.filter((y) => y === x).length;
    return {
      p: n("P") + n("L"), present: n("P"), late: n("L"), half: n("H"),
      a: n("A"), w: n("W"), f: n("F"),
      l: v.filter((x) => x && !["P", "L", "H", "A", "W", "F", ""].includes(x)).length,
      byLeave: v.filter((x) => x && !["P", "L", "H", "A", "W", "F", ""].includes(x))
        .reduce((o: Record<string, number>, x) => ({ ...o, [x]: (o[x] || 0) + 1 }), {}),
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
          <table className="att-table att-mx">
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
                const chips: [string, number, string, string][] = [
                  ["Present", t.present, "#ecfdf3", "#067647"],
                  ["Late", t.late, "#fffaeb", "#b54708"],
                  ["Half day", t.half, "#fff6ed", "#c4320a"],
                  ["Absent", t.a, "#fef3f2", "#b42318"],
                  ["Week off", t.w, "#f2f4f7", "#475467"],
                  ["Holiday", t.f, "#f2f4f7", "#475467"],
                  ...Object.entries(t.byLeave).map(
                    ([k, v]) => [k, v, "#eff8ff", "#175cd3"] as [string, number, string, string]),
                ];
                return (
                  <>
                    <tr key={r.code}>
                      <td className="name">
                        <PName id={r.id} code={r.code}>{r.code} · {r.name}</PName>
                      </td>
                      {dates.map((d) => (
                        <td key={d} style={{ textAlign: "center" }}>
                          <span className={markClass(r.marks[d])}>{r.marks[d] || "·"}</span>
                        </td>
                      ))}
                      <td style={{ textAlign: "center", fontWeight: 700, color: "#16a34a" }}>{t.p}</td>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "#dc2626" }}>{t.a}</td>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "#2563eb" }}>{t.l}</td>
                    </tr>
                    <tr className="tot" key={r.code + "-t"}>
                      <td className="name" colSpan={dates.length + 4}>
                        <div className="att-totchips">
                          {chips.filter(([, v]) => v > 0).map(([k, v, bg, fg]) => (
                            <span key={k} style={{ background: bg, color: fg }}>{k} {v}</span>
                          ))}
                          {!chips.some(([, v]) => v > 0) && (
                            <span style={{ background: "#f2f4f7", color: "#667085" }}>No marks yet</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  </>
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

/* ================= calendar ================= */
function CalendarTab({ me }: any) {
  const [month, setMonth] = useState(istToday().slice(0, 7));
  const [logs, setLogs] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [hols, setHols] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      setBusy(true);
      const from = `${month}-01`, to = lastDayOf(from);
      const [a, l, h] = await Promise.all([
        supabase.from("attendance_logs").select("*").eq("employee_id", me.id)
          .gte("work_date", from).lte("work_date", to),
        supabase.from("leaves").select("*").eq("employee_id", me.id)
          .eq("status", "Approved").lte("from_date", to).gte("to_date", from),
        supabase.from("holidays").select("*").gte("hol_date", from).lte("hol_date", to),
      ]);
      setLogs(a.data || []); setLeaves(l.data || []); setHols(h.data || []); setBusy(false);
    })();
  }, [month, me.id]);

  const first = new Date(`${month}-01T00:00:00`);
  const pad = (first.getDay() + 6) % 7;           // Monday-first
  const total = Number(lastDayOf(`${month}-01`).slice(-2));
  const cells: (string | null)[] = [
    ...Array(pad).fill(null),
    ...Array.from({ length: total }, (_, i) => addDays(`${month}-01`, i)),
  ];

  const info = (key: string) => {
    const log = logs.find((x: any) => x.work_date === key);
    const lv = leaves.find((x: any) => key >= x.from_date && key <= x.to_date);
    const hol = hols.find((x: any) => x.hol_date === key);
    const off = (me.week_off_days || []).includes(new Date(key + "T00:00:00").getDay());
    if (log) return { label: log.status, mins: log.worked_minutes,
      color: { Present: "#16a34a", Late: "#d97706", "Half Day": "#ea580c" }[log.status as string] || "#475467" };
    if (lv) return { label: lv.leave_type, color: "#2563eb" };
    if (hol) return { label: hol.name, color: "#0891b2" };
    if (off) return { label: "Week off", color: "#98a2b3" };
    if (key > istToday()) return { label: "", color: "#d0d5dd" };
    return { label: "Absent", color: "#dc2626" };
  };

  const tot = logs.reduce((a: number, r: any) => a + (r.worked_minutes || 0), 0);

  return (
    <div className="att-wrap att-stack">
      <div className="att-range">
        <div className="qk">
          <button onClick={() => setMonth(shiftMonth(month + "-01", -1).slice(0, 7))}>‹ Previous</button>
          <button className={month === istToday().slice(0, 7) ? "on" : ""}
            onClick={() => setMonth(istToday().slice(0, 7))}>This month</button>
          <button disabled={month >= istToday().slice(0, 7)}
            onClick={() => setMonth(shiftMonth(month + "-01", 1).slice(0, 7))}>Next ›</button>
        </div>
        <div className="att-flex" style={{ marginLeft: "auto" }}>
          <span className="att-muted">{hhmm(tot)} worked</span>
          <input type="month" value={month} max={istToday().slice(0, 7)}
            onChange={(e) => setMonth(e.target.value)} />
        </div>
      </div>

      {busy && <p className="att-muted">Loading…</p>}

      {!busy && (
        <div className="att-card">
          <div className="att-cal" style={{ marginBottom: 6 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div className="att-caldow" key={d}>{d}</div>
            ))}
          </div>
          <div className="att-cal">
            {cells.map((key, i) => {
              if (!key) return <div className="att-calday pad" key={`p${i}`} />;
              const v = info(key);
              return (
                <div className={`att-calday ${key === istToday() ? "now" : ""}`} key={key}>
                  <div className="n">{key.slice(-2)}</div>
                  <div className="st" style={{ color: v.color }}>{v.label}</div>
                  {v.mins ? <div className="hr">{hhmm(v.mins)}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= organization ================= */
function PersonCard({ p }: any) {
  return (
    <div className="att-pcard">
      <Avatar name={p.full_name} />
      <div style={{ minWidth: 0 }}>
        <p className="nm"><PName code={p.emp_code} id={p.id}>{p.full_name}</PName></p>
        <p className="dz">{p.emp_code} · {p.designation || "—"}</p>
        <p className="dz">{p.team}</p>
        {p.email && <a href={`mailto:${p.email}`}>{p.email}</a>}
        {p.phone && <p className="dz">{p.phone}</p>}
        {p.state && (
          <p style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4, color: stateColor[p.state] }}>
            {p.state}
          </p>
        )}
      </div>
    </div>
  );
}

function MergeSheet({ keepPerson, onClose }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ err: "", ok: "" });

  useEffect(() => {
    supabase.rpc("directory", {}).then(({ data }) =>
      setRows((data || []).filter((r: any) => r.id !== keepPerson.id)));
  }, []);

  // ek jaisa pehla naam upar
  const first = String(keepPerson.full_name || "").trim().split(" ")[0].toLowerCase();
  const likely = rows.filter((r) =>
    String(r.full_name).trim().split(" ")[0].toLowerCase() === first);
  const others = rows.filter((r) => !likely.includes(r));
  const dup = rows.find((r) => r.id === pick);

  const run = async () => {
    setBusy(true); setMsg({ err: "", ok: "" });
    const { data, error } = await supabase.rpc("merge_employees", {
      p_keep: keepPerson.id, p_merge: pick,
    });
    if (error) setMsg({ err: error.message, ok: "" });
    else { setMsg({ err: "", ok: String(data) }); setTimeout(onClose, 1400); }
    setBusy(false);
  };

  return (
    <Sheet title="Merge a duplicate record" onClose={onClose}>
      <div className="att-card att-stack">
        <p className="att-muted" style={{ whiteSpace: "normal" }}>
          Keeping <b>{keepPerson.full_name}</b> ({keepPerson.emp_code}) — their department,
          manager and employee code stay exactly as they are. The duplicate's login, email
          and any attendance it collected move across, then the duplicate is deleted.
        </p>

        <div>
          <label>Which record is the duplicate?</label>
          <select value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">— pick the record to remove —</option>
            {likely.length > 0 && (
              <optgroup label="Same first name">
                {likely.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.emp_code} · {r.full_name}{r.email ? ` · ${r.email}` : ""}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Everyone else">
              {others.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.emp_code} · {r.full_name}{r.email ? ` · ${r.email}` : ""}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {dup && (
          <div className="att-note err">
            <span>
              <b>{dup.emp_code} · {dup.full_name}</b> will be deleted.
              {dup.email ? ` Its email (${dup.email}) and login move to ${keepPerson.full_name}.` : ""}
              {" "}This can't be undone.
            </span>
          </div>
        )}

        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn" onClick={run} disabled={busy || !pick}>
          {busy ? "Merging…" : "Merge and delete the duplicate"}
        </button>
      </div>
    </Sheet>
  );
}

function PersonSheet({ p, canEdit, onClose, onDeleted }: any) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const [confirmDel, setConfirmDel] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [lists, setLists] = useState<any>(null);

  const [merge, setMerge] = useState(false);

  const openEdit = async () => {
    setBusy(true);
    const [emp, b, t, d] = await Promise.all([
      supabase.from("employees").select("*").eq("id", p.id).single(),
      supabase.from("branches").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
      supabase.from("designations").select("*").eq("active", true).order("sort_order").order("name"),
      ]);
    const people = await supabase.from("employees").select("id, emp_code, full_name").order("full_name");
    setLists({ branches: b.data || [], teams: t.data || [], desigs: d.data || [],
               people: people.data || [] });
    setEdit(emp.data);
    setBusy(false);
  };

  const rows: [string, any][] = [
    ["Employee ID", p.emp_code],
    ["Full name", p.full_name],
    ["Designation", p.designation],
    ["Department", p.team],
    ["Reporting manager", p.manager_name],
    ["Also reports to", p.co_manager_name],
    ["Email", p.email],
    ["Mobile", p.phone],
    ["Employment type", p.employment_type],
    ["Employee status", p.employee_status],
    ["Account", p.approval_status],
    ["Source of hire", p.source_of_hire],
    ["Date of joining", p.date_of_joining ? fmtDate(p.date_of_joining) : null],
    ["Date of birth", p.date_of_birth ? fmtDate(p.date_of_birth) : null],
    ["Today", p.state],
  ];

  const [newCode, setNewCode] = useState("");

  const resetCode = async () => {
    setBusy(true); setMsg({ err: "", ok: "" }); setNewCode("");
    const { data, error } = await supabase.rpc("admin_reset_code", {
      p_emp: p.id, p_code: null,
    });
    if (error) setMsg({ err: error.message, ok: "" });
    else if (data === "no_account") {
      setMsg({ err: "",
        ok: `${p.full_name} hasn't signed up yet. They'll set their own code the first time.` });
    } else {
      setNewCode(String(data));
    }
    setBusy(false);
  };

  const remove = async (hard: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("delete_employee", { p_emp: p.id, p_hard: hard });
    if (error) setMsg({ err: error.message, ok: "" });
    else { onDeleted(); onClose(); }
    setBusy(false);
  };

  return (
    <Sheet title={p.full_name} onClose={onClose}>
      <div className="att-card">
        <div className="att-flex" style={{ marginBottom: 14 }}>
          <Avatar name={p.full_name} lg />
          <div>
            <p style={{ fontSize: 17, fontWeight: 700 }}>{p.full_name}</p>
            <p className="att-muted">{p.emp_code} · {p.designation || "—"}</p>
            <p style={{ fontWeight: 700, fontSize: 13, marginTop: 4, color: stateColor[p.state] }}>
              {p.state}
            </p>
          </div>
        </div>
        <dl className="att-dl">
          {rows.map(([k, v]) => (
            <React.Fragment key={k}>
              <dt>{k}</dt>
              <dd>{v || <span className="att-muted">—</span>}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>

      {canEdit && (
        <div className="att-card" style={{ marginTop: 12 }}>
          <Note>{msg.err}</Note>
          <Note>{msg.err}</Note>
          <Note kind="ok">{msg.ok}</Note>

          {newCode && (
            <div className="att-note ok" style={{ marginBottom: 12 }}>
              <span>
                New code for <b>{p.full_name}</b>:
                <b style={{ fontSize: 22, letterSpacing: 4, display: "block", margin: "6px 0" }}>
                  {newCode}
                </b>
                Tell them this code. They sign in with {p.email} and this code.
                Nobody can see it again once you close this.
              </span>
            </div>
          )}

          {!confirmDel ? (
            <div className="att-flex" style={{ flexWrap: "wrap" }}>
              <button className="att-btn sm" disabled={busy} onClick={openEdit}>Edit details</button>
              {p.email && (
                <button className="att-btn sm line" disabled={busy} onClick={resetCode}
                  title="They forgot their 4-digit code">Reset their code</button>
              )}
              <button className="att-btn sm line" disabled={busy}
                onClick={() => setMerge(true)}>Merge duplicate</button>
              <button className="att-btn sm line" disabled={busy}
                onClick={() => remove(false)}>Deactivate</button>
              <button className="att-btn sm line" style={{ color: "#b42318", borderColor: "#fecdca" }}
                disabled={busy} onClick={() => setConfirmDel(true)}>Delete permanently</button>
            </div>
          ) : (
            <div className="att-note err">
              <span>This wipes {p.full_name}'s attendance and leave history too.</span>
              <div className="att-flex" style={{ marginTop: 10 }}>
                <button className="att-btn sm" style={{ background: "#b42318" }}
                  disabled={busy} onClick={() => remove(true)}>Yes, delete</button>
                <button className="att-btn sm grey" onClick={() => setConfirmDel(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {edit && lists && (
        <EmployeeSheet row={edit} branches={lists.branches} teams={lists.teams}
          desigs={lists.desigs} people={lists.people}
          onClose={() => { setEdit(null); onDeleted(); }} />
      )}

      {merge && (
        <MergeSheet keepPerson={p} onClose={() => { setMerge(false); onDeleted(); }} />
      )}
    </Sheet>
  );
}

function BulkSheet({ ids, names, onClose }: any) {
  const [field, setField] = useState("field_staff");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const [lists, setLists] = useState<any>({ teams: [], branches: [], desigs: [], people: [] });
  const [boolVal, setBoolVal] = useState(true);
  const [uuidVal, setUuidVal] = useState("");
  const [textVal, setTextVal] = useState("");
  const [timeVal, setTimeVal] = useState(nowHM());

  useEffect(() => {
    (async () => {
      const [t, b, d, p] = await Promise.all([
        supabase.from("teams").select("id, name").order("name"),
        supabase.from("branches").select("id, name").order("name"),
        supabase.from("designations").select("name").eq("active", true)
          .order("sort_order").order("name"),
        supabase.from("employees").select("id, emp_code, full_name")
          .eq("active", true).order("full_name"),
      ]);
      setLists({ teams: t.data || [], branches: b.data || [],
                 desigs: d.data || [], people: p.data || [] });
    })();
  }, []);

  const FIELDS: [string, string, string][] = [
    ["field_staff",       "Field staff (skip geo-fence)", "bool"],
    ["team",              "Department",                   "team"],
    ["branch",            "Branch / location",            "branch"],
    ["reports_to",        "Reporting manager",            "person"],
    ["designation",       "Designation",                  "desig"],
    ["employment_type",   "Employment type",              "text"],
    ["shift_start",       "Shift start time",             "time"],
    ["shift_end",         "Shift end time",               "time"],
    ["show_verify_panel", "Daily check panel",            "bool"],
    ["active",            "Active / inactive",            "bool"],
  ];
  const kind = FIELDS.find((f) => f[0] === field)?.[2] || "text";
  const label = FIELDS.find((f) => f[0] === field)?.[1] || "";

  const ready = kind === "bool" || kind === "time"
    || (kind === "text" ? !!textVal.trim() : !!uuidVal || !!textVal);

  const apply = async () => {
    setBusy(true); setMsg({ err: "", ok: "" });
    const { data, error } = await supabase.rpc("bulk_update_employees", {
      p_ids: ids,
      p_field: field,
      p_text: (kind === "desig" || kind === "text") ? textVal.trim() : null,
      p_uuid: ["team", "branch", "person"].includes(kind) ? (uuidVal || null) : null,
      p_bool: kind === "bool" ? boolVal : null,
      p_time: kind === "time" ? timeVal : null,
    });
    if (error) setMsg({ err: error.message, ok: "" });
    else { setMsg({ err: "", ok: `${data} people updated.` }); setTimeout(onClose, 800); }
    setBusy(false);
  };

  return (
    <Sheet title={`Edit ${ids.length} people`} onClose={onClose}>
      <div className="att-card att-stack">
        <p className="att-muted" style={{ whiteSpace: "normal" }}>
          {names.slice(0, 6).join(", ")}
          {names.length > 6 ? ` and ${names.length - 6} more` : ""}
        </p>

        <div>
          <label>What do you want to change?</label>
          <select value={field} onChange={(e) => {
            setField(e.target.value); setUuidVal(""); setTextVal("");
          }}>
            {FIELDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>

        <div>
          <label>{label}</label>

          {kind === "bool" && (
            <select value={boolVal ? "y" : "n"} onChange={(e) => setBoolVal(e.target.value === "y")}>
              <option value="y">
                {field === "active" ? "Active"
                  : field === "field_staff" ? "Yes — skip the geo-fence"
                  : "Show the panel"}
              </option>
              <option value="n">
                {field === "active" ? "Inactive"
                  : field === "field_staff" ? "No — geo-fence applies"
                  : "Hide the panel"}
              </option>
            </select>
          )}

          {kind === "team" && (
            <select value={uuidVal} onChange={(e) => setUuidVal(e.target.value)}>
              <option value="">— pick a department —</option>
              {lists.teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}

          {kind === "branch" && (
            <select value={uuidVal} onChange={(e) => setUuidVal(e.target.value)}>
              <option value="">— pick a branch —</option>
              {lists.branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}

          {kind === "person" && (
            <select value={uuidVal} onChange={(e) => setUuidVal(e.target.value)}>
              <option value="">— pick a manager —</option>
              {lists.people.map((p: any) => (
                <option key={p.id} value={p.id}>{p.emp_code} · {p.full_name}</option>
              ))}
            </select>
          )}

          {kind === "desig" && (
            <select value={textVal} onChange={(e) => setTextVal(e.target.value)}>
              <option value="">— pick a designation —</option>
              {lists.desigs.map((d: any) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          )}

          {kind === "text" && (
            <input value={textVal} placeholder="Permanent / Trainee / Intern"
              onChange={(e) => setTextVal(e.target.value)} />
          )}

          {kind === "time" && (
            <input type="time" lang="en-US" value={timeVal} onChange={(e) => setTimeVal(e.target.value)} />
          )}
        </div>

        {field === "active" && !boolVal && (
          <div className="att-note err">
            <span>These {ids.length} people will disappear from every list and won't be
            able to check in. Their history stays — you can switch them back on later.</span>
          </div>
        )}

        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn" onClick={apply} disabled={busy || !ready}>
          {busy ? "Applying…" : `Apply to ${ids.length} people`}
        </button>
      </div>
    </Sheet>
  );
}

function DirectoryTab({ me }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("");
  const [sort, setSort] = useState<{ k: string; asc: boolean }>({ k: "emp_code", asc: true });
  const [busy, setBusy] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<any>(null);
  const [bulk, setBulk] = useState(false);
  const canEdit = me?.role === "admin";

  const load = async () => {
    const { data } = await supabase.rpc("directory", {});
    setRows(data || []); setBusy(false); setSel(new Set());
  };
  useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    const n = new Set(sel);
    n.has(id) ? n.delete(id) : n.add(id);
    setSel(n);
  };

  const bulkRemove = async (hard: boolean) => {
    for (const id of Array.from(sel)) {
      await supabase.rpc("delete_employee", { p_emp: id, p_hard: hard });
    }
    load();
  };

  if (busy) return <p className="att-muted">Loading…</p>;

  const teams = Array.from(new Set(rows.map((r) => r.team))).sort();
  const cols: [string, string][] = [
    ["emp_code", "Employee ID"], ["first_name", "First Name"], ["last_name", "Last Name"],
    ["email", "Email address"], ["phone", "Mobile"], ["team", "Department"],
    ["designation", "Designation"], ["employment_type", "Employment Type"],
    ["employee_status", "Employee Status"], ["source_of_hire", "Source of Hire"],
    ["date_of_joining", "Date of Joining"], ["manager_name", "Reporting Manager"],
    ["date_of_birth", "Date of Birth"], ["state", "Today"],
  ];

  const shown = rows
    .filter((r) => !team || r.team === team)
    .filter((r) => !q || cols.some(([k]) =>
      String(r[k] || "").toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => {
      const x = String(a[sort.k] || ""), y = String(b[sort.k] || "");
      return (sort.asc ? 1 : -1) * x.localeCompare(y, undefined, { numeric: true });
    });

  const flip = (k: string) =>
    setSort(sort.k === k ? { k, asc: !sort.asc } : { k, asc: true });

  return (
    <>
      <div className="att-flex" style={{ flexWrap: "wrap" }}>
        <input placeholder="Search anything" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <select value={team} onChange={(e) => setTeam(e.target.value)} style={{ width: "auto" }}>
          <option value="">All departments</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="att-btn sm" disabled={!shown.length}
          onClick={() => downloadCsv(shown.map((r) => {
            const o: any = {}; cols.forEach(([k, l]) => { o[l] = r[k] ?? ""; }); return o;
          }), "HJS_employees.csv")}>CSV</button>
      </div>

      {sel.size > 0 && (
        <div className="att-selbar">
          <b>{sel.size} selected</b>
          <button className="att-btn sm line" onClick={() => setSel(new Set())}>Clear</button>
          <div style={{ marginLeft: "auto" }} className="att-flex">
            <button className="att-btn sm line" onClick={() => downloadCsv(
              shown.filter((r) => sel.has(r.id)).map((r) => {
                const o: any = {}; cols.forEach(([k, l]) => { o[l] = r[k] ?? ""; }); return o;
              }), "HJS_selected.csv")}>Export selected</button>
            {canEdit && (
              <>
                <button className="att-btn sm" onClick={() => setBulk(true)}>Edit selected</button>
                <button className="att-btn sm line" onClick={() => bulkRemove(false)}>Deactivate</button>
                <button className="att-btn sm line" style={{ color: "#b42318", borderColor: "#fecdca" }}
                  onClick={() => { if (confirm(`Delete ${sel.size} people permanently? This wipes their attendance too.`)) bulkRemove(true); }}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <p className="att-muted">Total record count: {shown.length}</p>

      <div className="att-scroll">
        <table className="att-etable">
          <thead>
            <tr>
              <th className="cb">
                <input type="checkbox"
                  checked={shown.length > 0 && shown.every((r) => sel.has(r.id))}
                  onChange={(e) => setSel(e.target.checked
                    ? new Set(shown.map((r) => r.id)) : new Set())} />
              </th>
              {cols.map(([k, label], i) => (
                <th key={k} className={i === 0 ? "first" : ""} onClick={() => flip(k)}>
                  {label}
                  {sort.k === k && <span className="att-arrow2">{sort.asc ? "\u25b2" : "\u25bc"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.emp_code} className={sel.has(r.id) ? "sel" : ""}>
                <td className="cb">
                  <input type="checkbox" checked={sel.has(r.id)}
                    onChange={() => toggle(r.id)} />
                </td>
                <td className="first link" onClick={() => setOpen(r)}>{r.emp_code}</td>
                <td className="link" onClick={() => setOpen(r)}>{r.first_name || r.full_name}</td>
                <td>{r.last_name || "—"}</td>
                <td>{r.email
                  ? <a href={`mailto:${r.email}`} style={{ color: "#2563eb" }}>{r.email}</a>
                  : <span className="att-muted">—</span>}</td>
                <td>{r.phone
                  ? <a href={`tel:${r.phone}`} style={{ color: "#2563eb" }}>{r.phone}</a>
                  : <span className="att-muted">—</span>}</td>
                <td>{r.team}</td>
                <td>{r.designation || "—"}</td>
                <td>{r.employment_type || "—"}</td>
                <td>{r.employee_status || "—"}</td>
                <td>{r.source_of_hire || "—"}</td>
                <td>{r.date_of_joining ? fmtDate(r.date_of_joining) : "—"}</td>
                <td>{r.manager_name || "—"}</td>
                <td>{r.date_of_birth ? fmtDate(r.date_of_birth) : "—"}</td>
                <td><span style={{ fontWeight: 650, color: stateColor[r.state] }}>{r.state}</span></td>
              </tr>
            ))}
            {!shown.length && (
              <tr><td className="first" colSpan={cols.length + 1}>No match found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <PersonSheet p={open} canEdit={canEdit}
        onClose={() => setOpen(null)} onDeleted={load} />}

      {bulk && (
        <BulkSheet
          ids={Array.from(sel)}
          names={rows.filter((r) => sel.has(r.id)).map((r) => r.full_name)}
          onClose={() => { setBulk(false); load(); }} />
      )}
    </>
  );
}

function DeptTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("directory", {});
      setRows(data || []); setBusy(false);
    })();
  }, []);

  if (busy) return <p className="att-muted">Loading…</p>;
  const shown = rows.filter((r) => !q ||
    `${r.full_name} ${r.emp_code} ${r.designation || ""} ${r.team}`
      .toLowerCase().includes(q.toLowerCase()));

  const teams: Record<string, Record<string, any[]>> = {};
  shown.forEach((r) => {
    const t = r.team, d = r.designation || "Unassigned";
    teams[t] = teams[t] || {};
    (teams[t][d] = teams[t][d] || []).push(r);
  });

  return (
    <>
      <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      {Object.keys(teams).sort().map((tn) => {
        const byD = teams[tn];
        const n = Object.values(byD).reduce((a, x) => a + x.length, 0);
        return (
          <Section key={tn} title={tn} count={n} open={!!q || Object.keys(teams).length <= 3}>
            <div style={{ padding: "6px 12px 12px" }}>
              {Object.keys(byD).sort().map((dg) => (
                <div key={dg} style={{ marginTop: 10 }}>
                  <div className="att-between" style={{ marginBottom: 6 }}>
                    <b style={{ fontSize: 13.5 }}>{dg}</b>
                    <span className="att-chip">{byD[dg].length}</span>
                  </div>
                  {byD[dg].map((p: any) => (
                    <div className="att-row" key={p.emp_code} style={{ padding: "8px 0" }}>
                      <Avatar name={p.full_name} />
                      <div className="grow">
                        <p><PName id={p.id} code={p.emp_code}><b>{p.emp_code}</b> · {p.full_name}</PName></p>
                        <p className="att-muted">{p.phone || p.email || "—"}</p>
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: stateColor[p.state] }}>
                        {p.state}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Section>
        );
      })}
    </>
  );
}

function TreeCard({ p, open, canOpen, onClick, count }: any) {
  return (
    <button className={`att-tcard ${canOpen ? "can" : ""} ${open ? "on" : ""}`}
      onClick={canOpen ? onClick : undefined}>
      <Avatar name={p.name} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="nm">
          {p.code ? <PName id={p.pid} code={p.code}>{p.name}</PName> : p.name}
        </span>
        <span className="dz">{p.sub}</span>
      </span>
      {count > 0 && (
        <span className={`att-tbadge ${open ? "" : "grey"}`}>
          {open ? "\u2212" : "+"} {count}
        </span>
      )}
    </button>
  );
}

// Asli org chart: parent se uske apne bachchon tak hi line jaati hai
function OrgNode({ node, childrenOf, countOf, toCard, depth, openAll }: any) {
  const kids = childrenOf(node);
  const [open, setOpen] = useState(depth < 1);
  useEffect(() => {
    if (openAll === undefined) return;
    setOpen(openAll ? true : depth < 1);
  }, [openAll]);
  return (
    <div className="att-node">
      <TreeCard p={toCard(node)} count={kids.length} canOpen={kids.length > 0}
        open={open && kids.length > 0} onClick={() => setOpen(!open)} />
      {open && kids.length > 0 && (
        <>
          <span className="att-stub" />
          <div className="att-kids">
            {kids.map((k: any) => (
              <div className="att-kid" key={k.id}>
                <OrgNode node={k} childrenOf={childrenOf} countOf={countOf}
                  toCard={toCard} depth={depth + 1} openAll={openAll} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OrgChart({ roots, childrenOf, countOf, toCard, openAll }: any) {
  return (
    <div className="att-tw">
      <div className="att-kids">
        {roots.map((r: any) => (
          <div className="att-kid" key={r.id} style={{ paddingBottom: 14 }}>
            <OrgNode node={r} childrenOf={childrenOf} countOf={countOf}
              toCard={toCard} depth={0} openAll={openAll} />
          </div>
        ))}
        {!roots.length && <p className="att-empty">Nothing to show.</p>}
      </div>
    </div>
  );
}

function EmpTreeTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);
  const [all, setAll] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("directory", {});
      setRows(data || []); setBusy(false);
    })();
  }, []);

  if (busy) return <p className="att-muted">Loading…</p>;

  const kids: Record<string, any[]> = {};
  rows.forEach((r) => {
    const k = r.reports_to || "root";
    (kids[k] = kids[k] || []).push(r);
    // co-manager ke neeche bhi wahi banda dikhega
    if (r.co_manager_id) {
      (kids[r.co_manager_id] = kids[r.co_manager_id] || []).push({ ...r, _co: true });
    }
  });
  const deep = (id: string, seen = new Set<string>()): number =>
    (kids[id] || []).reduce((a, c) => {
      if (seen.has(c.id)) return a;
      seen.add(c.id);
      return a + 1 + deep(c.id, seen);
    }, 0);

  if (q) {
    const hits = rows.filter((r) =>
      `${r.full_name} ${r.emp_code} ${r.designation || ""} ${r.team}`
        .toLowerCase().includes(q.toLowerCase()));
    return (
      <>
        <input placeholder="Search anyone" value={q} onChange={(e) => setQ(e.target.value)} />
        <p className="att-muted">{hits.length} found · clear the search to see the tree</p>
        <div className="att-people">
          {hits.map((p) => <PersonCard p={p} key={p.emp_code} />)}
        </div>
      </>
    );
  }

  const idSet = new Set(rows.map((r) => r.id));
  // jinka manager list mein nahi hai wo bhi top pe dikhne chahiye
  const roots = rows.filter((r) => !r.reports_to || !idSet.has(r.reports_to));

  return (
    <>
      <div className="att-flex">
        <input placeholder="Search anyone" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <button className="att-btn sm line" onClick={() => setAll(true)}>Expand all</button>
        <button className="att-btn sm line" onClick={() => setAll(false)}>Collapse</button>
      </div>
      <p className="att-muted">
        {rows.length} people · {roots.length} at the top · click + to open a card
      </p>
      <OrgChart openAll={all}
        roots={roots}
        childrenOf={(n: any) => kids[n.id] || []}
        countOf={(n: any) => deep(n.id)}
        toCard={(n: any) => ({
          name: n.full_name, code: n.emp_code, pid: n.id,
          sub: `${n.emp_code} · ${n.designation || "—"}${n._co ? " · also reports here" : ""}`,
        })}
      />
    </>
  );
}

function PeopleTab() {
  const [bd, setBd] = useState<any[]>([]);
  const [nh, setNh] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      const [b, n] = await Promise.all([
        supabase.rpc("birthdays", { p_days: 45 }),
        supabase.rpc("new_hires", { p_days: 90 }),
      ]);
      setBd(b.data || []); setNh(n.data || []); setBusy(false);
    })();
  }, []);

  if (busy) return <p className="att-muted">Loading…</p>;

  return (
    <>
      <div className="att-list">
        <div className="att-hd"><b>Upcoming birthdays</b><span className="att-muted">next 45 days</span></div>
        {!bd.length && (
          <p className="att-empty">No birthdays in the next 45 days.</p>
        )}
        {bd.map((r: any) => (
          <div className="att-row" key={r.emp_code}>
            <Avatar name={r.full_name} />
            <div className="grow">
              <p><PName code={r.emp_code}><b>{r.full_name}</b></PName>
                <span className="att-muted"> {r.emp_code}</span></p>
              <p className="att-muted">{r.designation || "—"} · {r.team}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontWeight: 700, fontSize: 13 }}>
                {new Date(r.bday + "T00:00:00").toLocaleDateString("en-GB",
                  { day: "2-digit", month: "short" })}
              </p>
              <p className="att-muted" style={{ fontSize: 11.5 }}>
                {r.days_away === 0 ? "today" : `in ${r.days_away} day${r.days_away === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="att-list">
        <div className="att-hd"><b>New hires</b><span className="att-muted">last 90 days</span></div>
        {!nh.length && (
          <p className="att-empty">Nobody joined in the last 90 days.</p>
        )}
        {nh.map((r: any) => (
          <div className="att-row" key={r.emp_code}>
            <Avatar name={r.full_name} />
            <div className="grow">
              <p><PName code={r.emp_code}><b>{r.full_name}</b></PName>
                <span className="att-muted"> {r.emp_code}</span></p>
              <p className="att-muted">{r.designation || "—"} · {r.team}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ fontWeight: 700, fontSize: 13 }}>{fmtDate(r.joined)}</p>
              <p className="att-muted" style={{ fontSize: 11.5 }}>{r.days_ago} days ago</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function NoticeTab({ me }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });
  const [add, setAdd] = useState(false);
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const canPost = ["admin", "manager"].includes(me.role);

  const load = async () => {
    const { data } = await supabase.rpc("announcement_feed", { p_limit: 40 });
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);

  const post = async () => {
    const { error } = await supabase.from("announcements")
      .insert({ ...form, posted_by: me.id });
    if (error) setMsg({ err: error.message, ok: "" });
    else { setMsg({ err: "", ok: "Posted." }); setForm({ title: "", body: "", pinned: false }); setAdd(false); load(); }
  };

  const remove = async (id: string) => {
    await supabase.from("announcements").update({ active: false }).eq("id", id);
    load();
  };

  return (
    <>
      {canPost && (
        <div className="att-between">
          <p className="att-muted">{rows.length} posts</p>
          <button className="att-btn sm" onClick={() => setAdd(true)}>+ New post</button>
        </div>
      )}
      <Note>{msg.err}</Note>
      <Note kind="ok">{msg.ok}</Note>

      {rows.map((r: any) => (
        <div className="att-card" key={r.id}>
          <div className="att-between">
            <b style={{ fontSize: 15.5 }}>
              {r.pinned && <span className="att-chip" style={{ marginRight: 7 }}>pinned</span>}
              {r.title}
            </b>
            {canPost && <button className="att-muted" onClick={() => remove(r.id)}>Remove</button>}
          </div>
          {r.body && <p style={{ marginTop: 7, whiteSpace: "pre-wrap", color: "#344054" }}>{r.body}</p>}
          <p className="att-muted" style={{ marginTop: 9 }}>
            {r.author} · {new Date(r.created_at).toLocaleDateString("en-GB",
              { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
      ))}
      {!rows.length && <div className="att-list"><p className="att-empty">Nothing posted yet.</p></div>}

      {add && (
        <Sheet title="New post" onClose={() => setAdd(false)}>
          <div className="att-card att-stack">
            <div>
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label>Message</label>
              <textarea rows={5} value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0, color: "#374151" }}>
              <input type="checkbox" checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
              Pin to top
            </label>
            <button className="att-btn" onClick={post} disabled={!form.title.trim()}>Post</button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function PeersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("my_peers");
      setRows(data || []); setBusy(false);
    })();
  }, []);
  if (busy) return <p className="att-muted">Loading…</p>;
  const shown = rows.filter((r) => !q ||
    `${r.full_name} ${r.emp_code} ${r.designation || ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="att-muted">{shown.length} people</p>
      <div className="att-people">
        {shown.map((p) => <PersonCard p={p} key={p.emp_code} />)}
      </div>
      {!shown.length && <div className="att-list"><p className="att-empty">Nobody here.</p></div>}
    </>
  );
}

function MyRegsTab({ me }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const load = async () => {
    const { data } = await supabase.from("regularizations").select("*")
      .eq("employee_id", me.id).order("work_date", { ascending: false }).limit(60);
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);
  return (
    <>
      <div className="att-between">
        <p className="att-muted">{rows.length} requests</p>
        <button className="att-btn sm" onClick={() => setOpen(true)}>Missed a punch?</button>
      </div>
      <div className="att-list">
        {!rows.length && <p className="att-empty">No requests yet.</p>}
        {rows.map((r) => (
          <div className="att-row" key={r.id}>
            <span style={{ width: 54, fontWeight: 700 }}>{fmtDate(r.work_date)}</span>
            <div className="grow">
              <p>{fmtHM(r.req_punch_in)} – {fmtHM(r.req_punch_out)}</p>
              <p className="att-muted">{r.reason}</p>
            </div>
            <span className={pillClass(r.status)}>{r.status}</span>
          </div>
        ))}
      </div>
      {open && <RegularizeSheet me={me} onClose={() => { setOpen(false); load(); }} />}
    </>
  );
}

function TeamLeavesTab({ me }: any) {
  const [pickLeave, setPickLeave] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [emps, setEmps] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    (async () => {
      const [l, e] = await Promise.all([
        supabase.from("leaves").select("*").order("from_date", { ascending: false }).limit(200),
        supabase.from("employees").select("id, emp_code, full_name, designation"),
      ]);
      const by: Record<string, any> = {};
      (e.data || []).forEach((x: any) => { by[x.id] = x; });
      setEmps(by);
      setRows((l.data || []).filter((x: any) => x.employee_id !== me.id));
      setBusy(false);
    })();
  }, []);
  if (busy) return <p className="att-muted">Loading…</p>;
  return (
    <div className="att-list">
      <div className="att-hd"><b>Team leaves</b><span className="att-muted">{rows.length}</span></div>
      {!rows.length && <p className="att-empty">Nothing here.</p>}
      {rows.map((r) => (
        <div className="att-row clk" key={r.id}
          onClick={() => setPickLeave({ ...r, emp: emps[r.employee_id] })}>
          <Avatar name={emps[r.employee_id]?.full_name} />
          <div className="grow">
            <p><PName id={r.employee_id}><b>{emps[r.employee_id]?.full_name || "—"}</b></PName></p>
            <p className="att-muted">
              {r.leave_type} · {fmtDate(r.from_date)}
              {r.from_date !== r.to_date ? ` – ${fmtDate(r.to_date)}` : ""}
              {r.from_time ? ` · ${fmtHM(r.from_time)} – ${fmtHM(r.to_time)}` : ""}
              {" · "}{r.days}d
            </p>
          </div>
          <span className={pillClass(r.status)}>{r.status}</span>
        </div>
      ))}
      {pickLeave && (
        <LeaveSheet lv={pickLeave} who={me} onClose={() => setPickLeave(null)} />
      )}
    </div>
  );
}

function HolidaysTab({ me }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState({ hol_date: istToday(), name: "" });
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const isAdmin = me.role === "admin";
  const load = async () => {
    const { data } = await supabase.from("holidays").select("*").order("hol_date");
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    const { error } = await supabase.from("holidays").insert(f);
    if (error) setMsg({ err: error.message, ok: "" });
    else { setMsg({ err: "", ok: "Added." }); setF({ ...f, name: "" }); load(); }
  };
  const del = async (id: string) => {
    await supabase.from("holidays").delete().eq("id", id); load();
  };
  const year = istToday().slice(0, 4);
  const shown = rows.filter((r) => String(r.hol_date).startsWith(year));
  return (
    <>
      {isAdmin && (
        <div className="att-card att-stack">
          <b>Add a holiday</b>
          <div className="att-row2">
            <input type="date" value={f.hol_date}
              onChange={(e) => setF({ ...f, hol_date: e.target.value })} />
            <input placeholder="Name" value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })} />
          </div>
          <Note>{msg.err}</Note>
          <Note kind="ok">{msg.ok}</Note>
          <button className="att-btn sm" onClick={add} disabled={!f.name.trim()}>Add</button>
        </div>
      )}
      <div className="att-list">
        <div className="att-hd"><b>Holidays {year}</b><span className="att-muted">{shown.length}</span></div>
        {!shown.length && <p className="att-empty">No holidays added yet.</p>}
        {shown.map((r) => (
          <div className="att-row" key={r.id}>
            <span style={{ width: 100, fontWeight: 700 }}>
              {new Date(r.hol_date + "T00:00:00").toLocaleDateString("en-GB",
                { day: "2-digit", month: "short", weekday: "short" })}
            </span>
            <span className="grow">{r.name}</span>
            {isAdmin && <button className="att-muted" onClick={() => del(r.id)}>Remove</button>}
          </div>
        ))}
      </div>
    </>
  );
}

function OrgScreen({ me, tab }: any) {
  return (
    <div className="att-wrap att-stack">
      {tab === "directory" && <DirectoryTab me={me} />}
      {tab === "dept" && <DeptTab />}
      {tab === "tree" && <EmpTreeTab />}
      {tab === "people" && <PeopleTab />}
      {tab === "notice" && <NoticeTab me={me} />}
    </div>
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
  const [editBal, setEditBal] = useState<any>(null);
  const [pickLeave, setPickLeave] = useState<any>(null);
  const isAdmin = me.role === "admin";
  const who = me;

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
      .map((r) => ({ d: r.from_date, label: r.leave_type, sub: `${r.days} day(s)`,
                     status: r.status, type: "leave", leave: r })),
    ...hols.filter((h) => h.hol_date >= today)
      .map((h) => ({ d: h.hol_date, label: h.name, sub: "Holiday", status: "Holiday", type: "hol" })),
  ].sort((a, b) => a.d.localeCompare(b.d)).slice(0, 8);

  const past = [
    ...mine.filter((r) => r.to_date < today)
      .map((r) => ({ d: r.from_date, label: r.leave_type, sub: `${r.days} day(s)`,
                     status: r.status, type: "leave", leave: r })),
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
            <div className="att-row clk" key={r.id} style={{ flexWrap: "wrap" }}
              onClick={() => setPickLeave(r)}>
              <span className="att-ltype">{r.leave_type}</span>
              <div className="grow" style={{ minWidth: 130 }}>
                <p>
                  {fmtDate(r.from_date)}
                  {r.from_date !== r.to_date ? ` – ${fmtDate(r.to_date)}` : ""}
                  <span className="att-muted"> · {r.days}d</span>
                </p>
                {r.from_time && (
                  <p className="att-muted">{fmtHM(r.from_time)} – {fmtHM(r.to_time)}</p>
                )}
                {r.reason && (
                  <p className="att-muted" style={{ whiteSpace: "normal" }}>{r.reason}</p>
                )}
              </div>
              <span className={pillClass(r.status)}>{r.status}</span>
              {r.status === "Pending" && (
                <button className="att-muted"
                  onClick={(e) => { e.stopPropagation(); cancel(r.id); }}>Cancel</button>
              )}
            </div>
          ))}
        </div>

        <div className="att-list">
          <div className="att-hd"><b>Regularization requests</b></div>
          {!regs.length && <p className="att-empty">No requests yet.</p>}
          {regs.map((r) => (
            <div className="att-row" key={r.id} style={{ flexWrap: "wrap" }}>
              <span style={{ width: 58, fontWeight: 650, flexShrink: 0 }}>
                {fmtDate(r.work_date)}
              </span>
              <span className="grow att-muted" style={{ minWidth: 120 }}>
                {fmtHM(r.req_punch_in)} – {fmtHM(r.req_punch_out)}
              </span>
              <span className={pillClass(r.status)}>{r.status}</span>
            </div>
          ))}
        </div>

        {apply && <ApplyLeaveSheet me={me} types={types}
          onClose={() => { setApply(false); load(); }} />}

        {pickLeave && <LeaveSheet lv={pickLeave} who={me}
          onClose={() => setPickLeave(null)} onChanged={load} />}
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
              <div className="att-balhd">
                <h4>{b.name}</h4>
                {isAdmin && (
                  <button className="att-baledit" title="Set allotment"
                    onClick={() => setEditBal(b)}>
                    <Icon n="pencil" c="currentColor" s={14} />
                  </button>
                )}
              </div>
              <div className="att-lvic" style={{ background: bg, color: fg }}>{b.leave_type}</div>
              <hr />
              <div className="att-lvrow">
                <span className="att-muted">Allotted</span><b>{b.allocated}</b>
              </div>
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

      {editBal && (
        <BalanceSheet b={editBal} who={who || me} year={year}
          onClose={() => { setEditBal(null); load(); }} />
      )}

      {pickLeave && (
        <LeaveSheet lv={pickLeave} who={me}
          onClose={() => setPickLeave(null)} onChanged={load} />
      )}

      <div className="att-list">
        <div className="att-hd"><b>Upcoming leaves & holidays</b></div>
        {!upcoming.length && <p className="att-empty">Nothing coming up.</p>}
        {upcoming.map((r, i) => (
          <div className={`att-row ${r.leave ? "clk" : ""}`} key={i}
            onClick={() => r.leave && setPickLeave(r.leave)}>
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
          <div className={`att-row ${r.leave ? "clk" : ""}`} key={i}
            onClick={() => r.leave && setPickLeave(r.leave)}>
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

const LEAVE_RULES: Record<string, {
  single?: boolean; fixedDays?: number; reasonReq?: boolean;
  pastDays: number; futureDays: number; note: string;
}> = {
  SL:    { reasonReq: true, pastDays: 30, futureDays: 7,
           note: "Can be applied up to 30 days back. Reason is required." },
  CL:    { reasonReq: true, pastDays: 0, futureDays: 365,
           note: "Apply in advance — backdated casual leave isn't allowed." },
  EL:    { reasonReq: true, pastDays: 0, futureDays: 365,
           note: "Apply in advance — backdated earned leave isn't allowed." },
  SHORT: { single: true, fixedDays: 0.25, reasonReq: true, pastDays: 7, futureDays: 30,
           note: "Single day only, counts as a quarter day. Reason is required." },
  HALF:  { single: true, fixedDays: 0.5, reasonReq: true, pastDays: 7, futureDays: 30,
           note: "Single day only, counts as half a day. Reason is required." },
};

function ApplyLeaveSheet({ me, types, onClose }: any) {
  const today = istToday();
  const [form, setForm] = useState<any>({
    leave_type: types[0]?.code || "", from_date: today, to_date: today, reason: "",
    from_time: nowHM(), to_time: addMins(nowHM(), 60),
  });
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const [busy, setBusy] = useState(false);

  // types der se aayein to pehla apne aap chun lo
  useEffect(() => {
    if (!form.leave_type && types.length) {
      setForm((f: any) => ({ ...f, leave_type: types[0].code }));
    }
  }, [types]);

  const rule = LEAVE_RULES[form.leave_type]
    || { pastDays: 30, futureDays: 365, note: "", single: false, fixedDays: 0, reasonReq: true };
  const needsTime = ["SHORT", "HALF"].includes(form.leave_type);
  const minDate = addDays(today, -rule.pastDays);
  const maxDate = addDays(today, rule.futureDays);

  // type badalte hi dates ko rule ke andar le aao
  const setType = (code: string) => {
    const r = LEAVE_RULES[code]
      || { pastDays: 30, futureDays: 365, note: "", single: false, fixedDays: 0, reasonReq: false };
    const lo = addDays(today, -r.pastDays);
    const hi = addDays(today, r.futureDays);
    let f = form.from_date < lo ? lo : form.from_date > hi ? hi : form.from_date;
    let t = r.single ? f : form.to_date;
    if (t < f) t = f;
    if (t > hi) t = hi;
    setForm({ ...form, leave_type: code, from_date: f, to_date: t });
  };

  const setFrom = (v: string) => {
    const t = rule.single || v > form.to_date ? v : form.to_date;
    setForm({ ...form, from_date: v, to_date: t });
  };

  const days = useMemo(() => {
    if (rule.fixedDays) return rule.fixedDays;
    const d = (new Date(form.to_date).getTime() - new Date(form.from_date).getTime()) / 86400000 + 1;
    return Math.max(1, Math.round(d));
  }, [form, rule]);

  const problem = useMemo(() => {
    if (form.to_date < form.from_date) return "To date can't be before the from date.";
    if (form.from_date < minDate || form.to_date > maxDate)
      return `For ${form.leave_type}, pick a date between ${fmtDate(minDate)} and ${fmtDate(maxDate)}.`;
    if (rule.single && form.to_date !== form.from_date)
      return "This leave type is for a single day only.";
    if (!form.reason.trim()) return "Please write why you need this leave.";
    if (days > 60) return "One request can't be longer than 60 days.";
    return "";
  }, [form, rule, days, minDate, maxDate]);

  const submit = async () => {
    if (problem) { setMsg({ err: problem, ok: "" }); return; }
    setBusy(true); setMsg({ err: "", ok: "" });
    const { error } = await supabase.from("leaves").insert({
      employee_id: me.id, leave_type: form.leave_type,
      from_date: form.from_date, to_date: form.to_date,
      from_time: needsTime ? form.from_time : null,
      to_time:   needsTime ? form.to_time   : null,
      half_day: form.leave_type === "HALF", days,
      reason: form.reason.trim(), status: "Pending",
    });
    if (error) setMsg({ err: error.message.replace(/^.*?:\s*/, ""), ok: "" });
    else setMsg({ err: "", ok: "Leave request sent for approval." });
    setBusy(false);
  };

  return (
    <Sheet title="Apply Leave" onClose={onClose}>
      <div className="att-card att-stack">
        <div>
          <label>Leave type</label>
          <select value={form.leave_type} onChange={(e) => setType(e.target.value)}>
            {!types.length && <option value="">No leave types set up yet</option>}
            {types.map((t: any) => (
              <option key={t.code} value={t.code}>{t.name}{t.paid ? "" : " (unpaid)"}</option>
            ))}
          </select>
          {rule.note && (
            <p className="att-muted" style={{ marginTop: 6 }}>{rule.note}</p>
          )}
        </div>

        <div className="att-row2">
          <div>
            <label>{rule.single ? "Date" : "From"}</label>
            <input type="date" value={form.from_date} min={minDate} max={maxDate}
              onChange={(e) => setFrom(e.target.value)} />
          </div>
          {!rule.single && (
            <div>
              <label>To</label>
              <input type="date" value={form.to_date} min={form.from_date} max={maxDate}
                onChange={(e) => setForm({ ...form, to_date: e.target.value })} />
            </div>
          )}
        </div>

        {needsTime && (
          <div className="att-row2">
            <div>
              <label>From time</label>
              <input type="time" lang="en-US" value={form.from_time}
                onChange={(e) => setForm({
                  ...form, from_time: e.target.value,
                  to_time: e.target.value >= form.to_time
                    ? addMins(e.target.value, 60) : form.to_time,
                })} />
            </div>
            <div>
              <label>To time</label>
              <input type="time" lang="en-US" value={form.to_time} min={form.from_time}
                onChange={(e) => setForm({ ...form, to_time: e.target.value })} />
            </div>
          </div>
        )}

        <div>
          <label>Reason <span style={{ color: "#dc2626" }}>*</span></label>
          <textarea rows={2} value={form.reason}
            placeholder="Why do you need this leave?"
            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>

        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <div className="att-between">
          <span className="att-muted">
            {days} day{days === 1 ? "" : "s"}
            {rule.fixedDays ? " (counted)" : ""}
          </span>
          <button className="att-btn sm" onClick={submit} disabled={busy || !!problem}>
            {busy ? "Sending…" : "Apply"}
          </button>
        </div>
        {problem && !msg.err && <p className="att-muted">{problem}</p>}
      </div>
    </Sheet>
  );
}

/* ========================= approvals ========================= */
function InboxScreen({ me, onCount, mode = "pending" }: any) {
  const [pickLeave, setPickLeave] = useState<any>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [regs, setRegs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [status, setStatus] = useState("All");
  const [range, setRange] = useState({
    from: addDays(istToday(), -90), to: addDays(istToday(), 90),
  });

  const history = mode === "history";

  const load = async () => {
    const [l, r, emps] = await Promise.all([
      history
        ? supabase.from("leaves").select("*").order("from_date", { ascending: false }).limit(500)
        : supabase.from("leaves").select("*").eq("status", "Pending").order("from_date"),
      history
        ? supabase.from("regularizations").select("*").order("work_date", { ascending: false }).limit(500)
        : supabase.from("regularizations").select("*").eq("status", "Pending").order("work_date"),
      supabase.from("employees").select("id, emp_code, full_name, designation"),
    ]);
    if (l.error) setErr(l.error.message);
    const byId: Record<string, any> = {};
    (emps.data || []).forEach((e: any) => { byId[e.id] = e; });
    const attach = (x: any) => ({ ...x, emp: byId[x.employee_id] });
    // RLS pehle hi scope kar deti hai (manager -> apni team, admin -> sab)
    const keep = (x: any) => me.role === "admin" || x.employee_id !== me.id;
    const L = (l.data || []).filter(keep).map(attach);
    const R = (r.data || []).filter(keep).map(attach);
    setLeaves(L); setRegs(R);
    if (!history) onCount(L.length + R.length);
  };
  useEffect(() => { load(); }, [mode]);

  const decideLeave = async (id: string, st: string) => {
    setBusy(true);
    await supabase.from("leaves").update({
      status: st, approved_by: me.id, approved_at: new Date().toISOString(),
    }).eq("id", id);
    await load(); setBusy(false);
  };

  const decideReg = async (id: string, st: string) => {
    setBusy(true); setErr("");
    const { error } = await supabase.rpc("decide_regularization", { p_id: id, p_status: st });
    if (error) setErr(error.message);
    await load(); setBusy(false);
  };

  const inRange = (d: string) => d >= range.from && d <= range.to;
  const stOk = (x: any) => status === "All" || x.status === status;
  const shownL = leaves.filter((x) => stOk(x) && inRange(x.from_date));
  const shownR = regs.filter((x) => stOk(x) && inRange(x.work_date));
  const total = shownL.length + shownR.length;

  const Actions = ({ r, kind }: any) =>
    r.status !== "Pending" ? (
      <div style={{ textAlign: "right" }}>
        <span className={pillClass(r.status)}>{r.status}</span>
        {r.approved_at && (
          <p className="att-muted" style={{ fontSize: 11.5, marginTop: 3 }}>
            {fmtDate(r.approved_at)}
          </p>
        )}
      </div>
    ) : (
      <>
        <button className="att-btn sm green" disabled={busy}
          onClick={(e) => { e.stopPropagation();
            kind === "leave" ? decideLeave(r.id, "Approved") : decideReg(r.id, "Approved"); }}>
          Approve
        </button>
        <button className="att-btn sm grey" disabled={busy}
          onClick={(e) => { e.stopPropagation();
            kind === "leave" ? decideLeave(r.id, "Rejected") : decideReg(r.id, "Rejected"); }}>
          Reject
        </button>
      </>
    );

  return (
    <div className="att-wrap att-stack">
      <Note>{err}</Note>

      {history && (
        <div className="att-range">
          <div className="qk">
            {["All", "Pending", "Approved", "Rejected", "Cancelled"].map((k) => (
              <button key={k} className={status === k ? "on" : ""} onClick={() => setStatus(k)}>{k}</button>
            ))}
          </div>
          <div className="att-flex" style={{ marginLeft: "auto" }}>
            <input type="date" value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })} />
            <span className="att-muted">to</span>
            <input type="date" value={range.to} min={range.from}
              onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </div>
        </div>
      )}

      {history && (
        <div className="att-between">
          <p className="att-muted">{total} requests</p>
          <button className="att-btn sm line" disabled={!total}
            onClick={() => downloadCsv([
              ...shownL.map((r) => ({ Type: "Leave", Employee: r.emp?.full_name,
                Code: r.emp?.emp_code, Kind: r.leave_type, From: r.from_date, To: r.to_date,
                Days: r.days, Reason: r.reason, Status: r.status })),
              ...shownR.map((r) => ({ Type: "Regularization", Employee: r.emp?.full_name,
                Code: r.emp?.emp_code, Kind: "Missed punch", From: r.work_date, To: r.work_date,
                Days: "", Reason: r.reason, Status: r.status })),
            ], `HJS_approvals_${range.from}_${range.to}.csv`)}>CSV</button>
        </div>
      )}

      {total === 0 && (
        <div className="att-list">
          <p className="att-empty">
            {history ? "Nothing in this range." : "All clear. Nothing pending."}
          </p>
        </div>
      )}

      {shownL.length > 0 && (
        <div className="att-list">
          <div className="att-hd"><b>Leave requests</b><span className="att-muted">{shownL.length}</span></div>
          {shownL.map((r) => (
            <div className="att-row clk" key={r.id} style={{ flexWrap: "wrap" }}
              onClick={() => setPickLeave(r)}>
              <Avatar name={r.emp?.full_name} />
              <div className="grow" style={{ minWidth: 150 }}>
                <p><PName id={r.employee_id} code={r.emp?.emp_code}>
                    <b>{r.emp?.emp_code} · {r.emp?.full_name}</b></PName>
                  {r.employee_id === me.id && (
                    <span className="att-pill p-Late" style={{ marginLeft: 7 }}>your own</span>)}
                </p>
                <p className="att-muted">
                  {r.leave_type} · {fmtDate(r.from_date)}
                  {r.from_date !== r.to_date ? ` – ${fmtDate(r.to_date)}` : ""}
                  {r.from_time ? ` · ${fmtHM(r.from_time)} – ${fmtHM(r.to_time)}` : ""}
                  {" · "}{r.days}d
                </p>
                <p style={{ color: "#475467", fontSize: 13, whiteSpace: "normal" }}>{r.reason}</p>
              </div>
              <Actions r={r} kind="leave" />
            </div>
          ))}
        </div>
      )}

      {pickLeave && (
        <LeaveSheet lv={pickLeave} who={me}
          onClose={() => setPickLeave(null)} onChanged={load} />
      )}

      {shownR.length > 0 && (
        <div className="att-list">
          <div className="att-hd"><b>Missed punch requests</b><span className="att-muted">{shownR.length}</span></div>
          {shownR.map((r) => (
            <div className="att-row" key={r.id} style={{ flexWrap: "wrap" }}>
              <Avatar name={r.emp?.full_name} />
              <div className="grow" style={{ minWidth: 150 }}>
                <p><PName id={r.employee_id} code={r.emp?.emp_code}>
                    <b>{r.emp?.emp_code} · {r.emp?.full_name}</b></PName>
                  {r.employee_id === me.id && (
                    <span className="att-pill p-Late" style={{ marginLeft: 7 }}>your own</span>)}
                </p>
                <p className="att-muted">
                  {fmtDate(r.work_date)} · {fmtHM(r.req_punch_in)} – {fmtHM(r.req_punch_out)}
                </p>
                <p style={{ color: "#475467", fontSize: 13, whiteSpace: "normal" }}>{r.reason}</p>
              </div>
              <Actions r={r} kind="reg" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JoinersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    const { data, error } = await supabase.rpc("pending_registrations");
    if (error) setErr(error.message);
    setRows(data || []); setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const decide = async (id: string, ok: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("decide_registration", { p_emp: id, p_approve: ok });
    if (error) setErr(error.message);
    await load(); setBusy(false);
  };

  return (
    <>
      <Note>{err}</Note>
      <p className="att-muted">
        Anyone can create an account from the sign-in link. They land here until you approve them.
      </p>
      <div className="att-list">
        {!rows.length && !busy && <p className="att-empty">No one waiting right now.</p>}
        {rows.map((r) => (
          <div className="att-row" key={r.id} style={{ flexWrap: "wrap" }}>
            <Avatar name={r.full_name} />
            <div className="grow" style={{ minWidth: 170 }}>
              <p><PName id={r.id} code={r.emp_code}><b>{r.full_name}</b></PName>
                <span className="att-muted"> {r.emp_code}</span></p>
              <p className="att-muted">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
              <p className="att-muted" style={{ fontSize: 11.5 }}>
                signed up {r.registered_at ? fmtDate(r.registered_at) : "—"}
              </p>
            </div>
            <button className="att-btn sm green" disabled={busy}
              onClick={() => decide(r.id, true)}>Approve</button>
            <button className="att-btn sm grey" disabled={busy}
              onClick={() => decide(r.id, false)}>Reject</button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ========================= team ========================= */
function TodayTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [date, setDate] = useState(istToday());
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setBusy(true);
      const [{ data }, sess] = await Promise.all([
        supabase.rpc("whos_in", { p_date: date }),
        supabase.from("attendance_sessions")
          .select("employee_id, in_at, in_lat, in_lng, in_distance_m, in_geo_ok")
          .eq("work_date", date).order("in_at"),
      ]);
      const emps = await supabase.from("employees").select("id, emp_code");
      const codeById: Record<string, string> = {};
      (emps.data || []).forEach((e: any) => { codeById[e.id] = e.emp_code; });
      const firstByCode: Record<string, any> = {};
      (sess.data || []).forEach((x: any) => {
        const c = codeById[x.employee_id];
        if (c && !firstByCode[c]) firstByCode[c] = x;
      });
      setRows((data || []).map((r: any) => ({ ...r, punch: firstByCode[r.emp_code] })));
      setBusy(false);
    })();
  }, [date]);

  const inNow = rows.filter((r) => r.state === "In").length;
  const done = rows.filter((r) => r.state === "Out").length;
  const onLeave = rows.filter((r) => r.state === "Leave").length;
  const notIn = rows.filter((r) => r.state === "Yet to check in").length;
  const shown = rows
    .filter((r) => !filter || r.state === filter)
    .filter((r) => !q || `${r.full_name} ${r.emp_code} ${r.designation || ""} ${r.team || ""}`
      .toLowerCase().includes(q.toLowerCase()));

  const groups: Record<string, any[]> = {};
  shown.forEach((r) => { (groups[r.team || "—"] = groups[r.team || "—"] || []).push(r); });
  const teamNames = Object.keys(groups).sort();

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
      <div className="att-flex">
        <input placeholder="Search name, code, team" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        {filter && <button className="att-btn sm line" onClick={() => setFilter("")}>Clear {filter}</button>}
      </div>

      {teamNames.map((tn) => {
        const g = groups[tn];
        const gi = g.filter((x) => x.state === "In").length;
        const gn = g.filter((x) => x.state === "Yet to check in").length;
        return (
          <Section key={tn} title={tn} count={g.length} open={!!q || teamNames.length <= 3}
            chips={<>
              <span style={{ background: "#ecfdf3", color: "#067647" }}>{gi} in</span>
              {gn > 0 && <span style={{ background: "#fef3f2", color: "#b42318" }}>{gn} not in</span>}
            </>}>
            {g.map((r) => (
              <div className="att-row" key={r.emp_code}>
                <Avatar name={r.full_name} />
                <div className="grow">
                  <p><PName id={r.id} code={r.emp_code}><b>{r.emp_code}</b> · {r.full_name}</PName></p>
                  <p className="att-muted">{r.designation || "—"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontWeight: 700, fontSize: 13, color: stateColor[r.state] }}>{r.state}</p>
                  <p className="att-muted" style={{ fontSize: 11.5 }}>
                    {r.first_in ? `${fmtTime(r.first_in)}${r.state === "Out" ? ` – ${fmtTime(r.last_out)}` : ""}` : ""}
                    {r.minutes ? ` · ${hhmm(r.minutes)}` : ""}
                  </p>
                  {r.punch && (
                    <p style={{ marginTop: 3 }}>
                      <Pin lat={r.punch.in_lat} lng={r.punch.in_lng}
                        dist={r.punch.in_distance_m} ok={r.punch.in_geo_ok} />
                    </p>
                  )}
                </div>
              </div>
            ))}
          </Section>
        );
      })}
      {!shown.length && !busy && (
        <div className="att-list"><p className="att-empty">Nobody in this list.</p></div>
      )}
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
  const [teams, setTeams] = useState<any[]>([]);
  const [desigs, setDesigs] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [mgD, setMgD] = useState(false);

  const load = async () => {
    const [e, b, t, d] = await Promise.all([
      supabase.from("employees").select("*, branches(name), teams(name)").order("full_name"),
      supabase.from("branches").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
      supabase.from("designations").select("*").eq("active", true)
        .order("sort_order").order("name"),
    ]);
    setRows(e.data || []); setBranches(b.data || []);
    setTeams(t.data || []); setDesigs(d.data || []); setBusy(false);
  };
  useEffect(() => { load(); }, []);

  if (busy) return <p className="att-muted">Loading…</p>;
  const shown = rows.filter((r) =>
    !q || `${r.full_name} ${r.emp_code} ${r.designation || ""} ${r.teams?.name || ""}`
      .toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="att-flex">
        <input placeholder="Search by name or code" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        {me.role === "admin" && (
          <>
            <button className="att-btn sm line" onClick={() => setMgD(true)}>Designations</button>
            <button className="att-btn sm" onClick={() => setAdd(true)}>+ New</button>
          </>
        )}
      </div>
      <div className="att-list">
        {shown.map((r) => (
          <div className="att-row" key={r.id}
            style={{ cursor: me.role === "admin" ? "pointer" : "default" }}
            onClick={() => me.role === "admin" && setEdit(r)}>
            <Avatar name={r.full_name} />
            <div className="grow">
              <p><PName id={r.id} code={r.emp_code}><b>{r.emp_code}</b> · {r.full_name}</PName></p>
              <p className="att-muted">
                {r.designation || r.role}
                {r.teams?.name ? ` · ${r.teams.name}` : ""}
                {" · "}{fmtHM(r.shift_start)} – {fmtHM(r.shift_end)}
              </p>
            </div>
            {!r.email && <span className="att-pill p-Absent">no email</span>}
            {!r.auth_user_id && <span className="att-pill p-Late">code pending</span>}
            {!r.active && <span className="att-pill p-Off">Inactive</span>}
            {r.field_staff && <span className="att-pill p-Leave">Field</span>}
          </div>
        ))}
        {!shown.length && <p className="att-empty">No match found.</p>}
      </div>
      {add && <EmployeeSheet branches={branches} teams={teams} desigs={desigs} people={rows}
        onClose={() => { setAdd(false); load(); }} />}
      {edit && <EmployeeSheet branches={branches} teams={teams} desigs={desigs} people={rows}
        row={edit} onClose={() => { setEdit(null); load(); }} />}
      {mgD && <DesignationSheet onClose={() => { setMgD(false); load(); }} />}
    </>
  );
}

function EmployeeSheet({ branches, teams, desigs, people, row, onClose }: any) {
  const isNew = !row;
  const [f, setF] = useState<any>(row || {
    emp_code: "", full_name: "", first_name: "", last_name: "",
    email: "", phone: "", designation: "", nickname: "",
    employment_type: "", employee_status: "Active", source_of_hire: "",
    branch_id: branches[0]?.id || null, team_id: null, reports_to: null,
    co_manager_id: null, role: "staff",
    shift_start: "10:00", shift_end: "19:00", grace_minutes: 15,
    field_staff: false, monthly_gross: "", active: true, week_off_days: [0],
    show_verify_panel: true,
  });
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const [busy, setBusy] = useState(false);

  const [confirmDel, setConfirmDel] = useState(false);

  const removeEmp = async (hard: boolean) => {
    if (!row) return;
    setBusy(true); setMsg({ err: "", ok: "" });
    const { error } = await supabase.rpc("delete_employee", { p_emp: row.id, p_hard: hard });
    if (error) setMsg({ err: error.message, ok: "" });
    else { setMsg({ err: "", ok: hard ? "Employee deleted." : "Employee deactivated." });
           setTimeout(onClose, 900); }
    setBusy(false);
  };

  const resetCode = async () => {
    if (!row) return;
    setBusy(true); setMsg({ err: "", ok: "" });
    const { error } = await supabase.rpc("reset_employee_code", { p_emp: row.id });
    if (error) setMsg({ err: error.message, ok: "" });
    else setMsg({ err: "", ok: "Code cleared. They can set a new one on their next sign in." });
    setBusy(false);
  };

  const save = async () => {
    setBusy(true); setMsg({ err: "", ok: "" });
    try {
      const payload: any = {
        emp_code: String(f.emp_code).trim().toUpperCase(),
        full_name: String(f.full_name).trim(),
        first_name: (f.first_name || "").trim() || String(f.full_name).trim().split(" ")[0],
        last_name: (f.last_name || "").trim()
          || String(f.full_name).trim().split(" ").slice(1).join(" ") || null,
        email: String(f.email || "").trim().toLowerCase() || null,
        phone: f.phone || null, designation: f.designation || null,
        branch_id: f.branch_id || null,
        team_id: f.team_id || null,
        reports_to: f.reports_to || null,
        co_manager_id: f.co_manager_id || null,
        role: f.role,
        shift_start: f.shift_start, shift_end: f.shift_end,
        grace_minutes: Number(f.grace_minutes) || 0,
        date_of_birth: f.date_of_birth || null,
        date_of_joining: f.date_of_joining || null,
        employment_type: f.employment_type || null,
        employee_status: f.employee_status || null,
        source_of_hire: f.source_of_hire || null,
        nickname: f.nickname || null,
        field_staff: f.field_staff, active: f.active,
        show_verify_panel: f.show_verify_panel !== false,
        week_off_days: f.week_off_days,
        monthly_gross: f.monthly_gross === "" || f.monthly_gross == null ? null : Number(f.monthly_gross),
      };
      if (isNew) {
        if (!payload.email || !payload.email.includes("@"))
          throw new Error("A work email is required — they sign in with it");
        const { error } = await supabase.from("employees").insert(payload);
        if (error) throw new Error(error.message);
        await supabase.rpc("seed_leave_balances", {});
        setMsg({ err: "",
          ok: `${payload.full_name} added. Tell them to open the app, enter ${payload.email} and set their own 4-digit code.` });
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
            <input value={f.emp_code} style={{ textTransform: "uppercase" }}
              onChange={(e) => setF({ ...f, emp_code: e.target.value })} placeholder="HJS007" />
          </div>
          <div>
            <label>Full name</label>
            <input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          </div>
        </div>
        <div className="att-row2">
          <div>
            <label>First name</label>
            <input value={f.first_name || ""}
              onChange={(e) => setF({ ...f, first_name: e.target.value })} />
          </div>
          <div>
            <label>Last name</label>
            <input value={f.last_name || ""}
              onChange={(e) => setF({ ...f, last_name: e.target.value })} />
          </div>
        </div>
        <div>
          <label>Work email {isNew && <span style={{ color: "#dc2626" }}>*</span>}</label>
          <input type="email" value={f.email || ""} inputMode="email" autoCapitalize="none"
            placeholder="name@gmail.com"
            onChange={(e) => setF({ ...f, email: e.target.value })} />
          <p className="att-muted" style={{ marginTop: 6 }}>
            {isNew
              ? "They sign in with this email and set their own 4-digit code the first time."
              : row?.auth_user_id ? "Code is set." : "Code not set yet — they'll create one on first sign in."}
          </p>
        </div>
        {!isNew && row?.auth_user_id && (
          <button className="att-btn line sm" onClick={resetCode} disabled={busy}>
            Reset their 4-digit code
          </button>
        )}
        <div className="att-row2">
          <div>
            <label>Phone</label>
            <input value={f.phone || ""} inputMode="tel" onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </div>
          <div>
            <label>Designation</label>
            <select value={f.designation || ""}
              onChange={(e) => setF({ ...f, designation: e.target.value })}>
              <option value="">— select —</option>
              {(desigs || []).map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
              {f.designation && !(desigs || []).some((d: any) => d.name === f.designation) && (
                <option value={f.designation}>{f.designation}</option>
              )}
            </select>
          </div>
        </div>
        <div className="att-row2">
          <div>
            <label>Team</label>
            <select value={f.team_id || ""}
              onChange={(e) => setF({ ...f, team_id: e.target.value || null })}>
              <option value="">— none —</option>
              {(teams || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label>Reports to</label>
            <select value={f.reports_to || ""}
              onChange={(e) => setF({ ...f, reports_to: e.target.value || null })}>
              <option value="">— none —</option>
              {(people || []).filter((x: any) => x.id !== row?.id).map((x: any) => (
                <option key={x.id} value={x.id}>{x.emp_code} · {x.full_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label>Also reports to <span className="att-muted">(second manager, optional)</span></label>
          <select value={f.co_manager_id || ""}
            onChange={(e) => setF({ ...f, co_manager_id: e.target.value || null })}>
            <option value="">— none —</option>
            {(people || []).filter((x: any) => x.id !== row?.id).map((x: any) => (
              <option key={x.id} value={x.id}>{x.emp_code} · {x.full_name}</option>
            ))}
          </select>
        </div>
        <div className="att-row2">
          <div>
            <label>Branch (for geo-fence)</label>
            <select value={f.branch_id || ""}
              onChange={(e) => setF({ ...f, branch_id: e.target.value || null })}>
              <option value="">— none —</option>
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
            <input type="time" lang="en-US" value={String(f.shift_start).slice(0, 5)}
              onChange={(e) => setF({ ...f, shift_start: e.target.value })} />
          </div>
          <div>
            <label>Shift end</label>
            <input type="time" lang="en-US" value={String(f.shift_end).slice(0, 5)}
              onChange={(e) => setF({ ...f, shift_end: e.target.value })} />
          </div>
        </div>
        <div className="att-row2">
          <div>
            <label>Employment type</label>
            <select value={f.employment_type || ""}
              onChange={(e) => setF({ ...f, employment_type: e.target.value || null })}>
              <option value="">— not set —</option>
              <option>Permanent</option>
              <option>Trainee</option>
              <option>Intern</option>
              <option>Probation</option>
              <option>Contract</option>
              <option>Consultant</option>
              <option>Team member</option>
            </select>
          </div>
          <div>
            <label>Employee status</label>
            <select value={f.employee_status || ""}
              onChange={(e) => setF({ ...f, employee_status: e.target.value || null })}>
              <option value="">— not set —</option>
              <option>Active</option>
              <option>Probation</option>
              <option>Notice period</option>
              <option>On leave</option>
              <option>Details pending</option>
            </select>
          </div>
        </div>
        <div className="att-row2">
          <div>
            <label>Source of hire</label>
            <select value={f.source_of_hire || ""}
              onChange={(e) => setF({ ...f, source_of_hire: e.target.value || null })}>
              <option value="">— not set —</option>
              <option>Direct</option>
              <option>Referral</option>
              <option>Advertisement</option>
              <option>Consultancy</option>
              <option>Campus</option>
            </select>
          </div>
          <div>
            <label>Nick name</label>
            <input value={f.nickname || ""}
              onChange={(e) => setF({ ...f, nickname: e.target.value || null })} />
          </div>
        </div>
        <div className="att-row2">
          <div>
            <label>Date of birth</label>
            <input type="date" value={f.date_of_birth || ""}
              onChange={(e) => setF({ ...f, date_of_birth: e.target.value || null })} />
          </div>
          <div>
            <label>Joining date</label>
            <input type="date" value={f.date_of_joining || ""}
              onChange={(e) => setF({ ...f, date_of_joining: e.target.value || null })} />
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
          Field staff — skip the geo-fence
        </label>
        <label className="att-flex" style={{ fontWeight: 400, marginBottom: 0, color: "#374151" }}>
          <input type="checkbox" checked={f.show_verify_panel !== false}
            onChange={(e) => setF({ ...f, show_verify_panel: e.target.checked })} />
          Show the daily "who turned up" panel on their home screen
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

        {!isNew && (
          <div style={{ borderTop: "1px solid #eaecf0", paddingTop: 13, marginTop: 4 }}>
            {!confirmDel ? (
              <div className="att-flex">
                <button className="att-btn sm line" disabled={busy || !f.active}
                  onClick={() => removeEmp(false)}>Deactivate</button>
                <button className="att-btn sm line" style={{ color: "#b42318", borderColor: "#fecdca" }}
                  disabled={busy} onClick={() => setConfirmDel(true)}>Delete permanently</button>
              </div>
            ) : (
              <div className="att-note err">
                <span>
                  This wipes {f.full_name}'s attendance, leaves and everything else. Deactivating
                  keeps the record and the history — that's usually what you want.
                </span>
                <div className="att-flex" style={{ marginTop: 10 }}>
                  <button className="att-btn sm" style={{ background: "#b42318" }}
                    disabled={busy} onClick={() => removeEmp(true)}>Yes, delete</button>
                  <button className="att-btn sm grey" onClick={() => setConfirmDel(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function DesignationSheet({ onClose }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState({ err: "", ok: "" });

  const load = async () => {
    const { data } = await supabase.from("designations").select("*")
      .order("sort_order").order("name");
    setRows(data || []);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("designations")
      .insert({ name: name.trim(), sort_order: 100 });
    if (error) setMsg({ err: error.message, ok: "" });
    else { setName(""); setMsg({ err: "", ok: "Added." }); load(); }
  };

  const toggle = async (r: any) => {
    await supabase.from("designations").update({ active: !r.active }).eq("id", r.id);
    load();
  };

  return (
    <Sheet title="Designations" onClose={onClose}>
      <div className="att-card att-stack">
        <div className="att-flex">
          <input placeholder="New designation" value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()} style={{ flex: 1 }} />
          <button className="att-btn sm" onClick={add} disabled={!name.trim()}>Add</button>
        </div>
        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <p className="att-muted">These show up in the designation dropdown.</p>
      </div>
      <div className="att-list" style={{ marginTop: 12 }}>
        {rows.map((r) => (
          <div className="att-row" key={r.id}>
            <span className="grow">{r.name}</span>
            {!r.active && <span className="att-pill p-Off">hidden</span>}
            <button className="att-muted" onClick={() => toggle(r)}>
              {r.active ? "Hide" : "Show"}
            </button>
          </div>
        ))}
        {!rows.length && <p className="att-empty">None yet.</p>}
      </div>
    </Sheet>
  );
}

function OrgTab() {
  const [teams, setTeams] = useState<any[]>([]);
  const [emps, setEmps] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, e] = await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase.rpc("directory", {}),
      ]);
      setTeams(t.data || []); setEmps(e.data || []); setBusy(false);
    })();
  }, []);

  if (busy) return <p className="att-muted">Loading…</p>;

  const membersOf = (teamId: string) => emps.filter((e) => e.team_id === teamId);
  // level 1 = teams, level 2 = members
  const roots = teams.map((t) => ({ ...t, _kind: "team" }));

  if (q) {
    const hits = emps.filter((r) =>
      `${r.full_name} ${r.emp_code} ${r.designation || ""} ${r.team}`
        .toLowerCase().includes(q.toLowerCase()));
    return (
      <>
        <input placeholder="Search team or person" value={q} onChange={(e) => setQ(e.target.value)} />
        <p className="att-muted">{hits.length} found</p>
        <div className="att-people">
          {hits.map((p) => <PersonCard p={p} key={p.emp_code} />)}
        </div>
      </>
    );
  }

  return (
    <>
      <input placeholder="Search team or person" value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="att-muted">{teams.length} teams · click the + on a team to see its people</p>
      <OrgChart
        roots={roots}
        childrenOf={(n: any) => (n._kind === "team" ? membersOf(n.id) : [])}
        countOf={(n: any) => (n._kind === "team" ? membersOf(n.id).length : 0)}
        toCard={(n: any) => n._kind === "team"
          ? { name: n.name, sub: `${membersOf(n.id).length} people` }
          : { name: n.full_name, code: n.emp_code, pid: n.id,
              sub: `${n.emp_code} · ${n.designation || "—"}` }}
      />
    </>
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
    // har bande ka apna total
    Object.values(byEmp).forEach((v: any) => {
      const t: Record<string, number> = {};
      Object.values(v.marks).forEach((m: any) => {
        if (!m) return;
        t[m] = (t[m] || 0) + 1;
      });
      v.t = t;
      // payable = present + late + (half x 0.5) + paid leave
      v.payable = (t.P || 0) + (t.L || 0) + (t.H || 0) * 0.5
        + Object.keys(t).filter((k) => !["P", "L", "H", "A", "W", "F"].includes(k))
            .reduce((a, k) => a + (k === "HALF" ? t[k] * 0.5 : k === "SHORT" ? t[k] * 0.25 : t[k]), 0);
    });
    return { rows: Object.entries(byEmp), dates: dates.sort() };
  }, [data, kind]);

  return (
    <>
      <div className="att-rephd">
        <div className="att-seg" style={{ flex: 1 }}>
          {[["muster", "Muster roll"], ["late", "Late"], ["absence", "Absence"]].map(([k, l]) => (
            <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>{l}</button>
          ))}
        </div>
        <input type="month" value={month} max={istToday().slice(0, 7)}
          onChange={(e) => setMonth(e.target.value)} className="att-repmonth" />
        <button className="att-btn sm" disabled={!data.length}
          onClick={() => downloadCsv(
            kind === "muster" && muster
              ? muster.rows.map(([code, v]: any) => {
                  const o: any = { Code: code, Name: v.name };
                  muster.dates.forEach((d) => { o[new Date(d).getDate()] = v.marks[d] || ""; });
                  o.Present = v.t.P || 0; o.Late = v.t.L || 0; o.Half = v.t.H || 0;
                  o.Absent = v.t.A || 0;
                  o.Leave = Object.keys(v.t)
                    .filter((k) => !["P","L","H","A","W","F"].includes(k))
                    .reduce((a: number, k) => a + v.t[k], 0);
                  o["Week off"] = v.t.W || 0; o.Holiday = v.t.F || 0;
                  o.Payable = v.payable;
                  return o;
                })
              : data,
            `HJS_${kind}_${month}.csv`)}>CSV</button>
      </div>

      {busy && <p className="att-muted">Loading…</p>}

      {!busy && kind === "muster" && muster && (
        <>
          <div className="att-legend">
            <span><i className="m-P">P</i> present</span>
            <span><i className="m-L">L</i> late</span>
            <span><i className="m-H">H</i> half</span>
            <span><i className="m-A">A</i> absent</span>
            <span><i className="m-W">W</i> week off</span>
            <span><i className="m-F">F</i> holiday</span>
            <span className="att-muted">Payable = present + late + half×0.5 + paid leave</span>
          </div>
          <div className="att-scroll">
            <table className="att-table att-mx">
              <thead>
                <tr>
                  <th className="name">Name</th>
                  {muster.dates.map((d) => <th key={d}>{new Date(d).getDate()}</th>)}
                  <th className="tot">P</th>
                  <th className="tot">L</th>
                  <th className="tot">H</th>
                  <th className="tot">A</th>
                  <th className="tot">Leave</th>
                  <th className="tot">W</th>
                  <th className="tot">F</th>
                  <th className="tot pay">Payable</th>
                </tr>
              </thead>
              <tbody>
                {muster.rows.map(([code, v]: any) => (
                  <tr key={code}>
                    <td className="name"><PName code={code}>{v.name}</PName></td>
                    {muster.dates.map((d) => (
                      <td key={d}><span className={markClass(v.marks[d])}>{v.marks[d] || "·"}</span></td>
                    ))}
                    <td className="tot" style={{ color: "#16a34a" }}>{v.t.P || 0}</td>
                    <td className="tot" style={{ color: "#d97706" }}>{v.t.L || 0}</td>
                    <td className="tot" style={{ color: "#ea580c" }}>{v.t.H || 0}</td>
                    <td className="tot" style={{ color: "#dc2626" }}>{v.t.A || 0}</td>
                    <td className="tot" style={{ color: "#2563eb" }}>
                      {Object.keys(v.t).filter((k) => !["P","L","H","A","W","F"].includes(k))
                        .reduce((a, k) => a + v.t[k], 0)}
                    </td>
                    <td className="tot att-muted">{v.t.W || 0}</td>
                    <td className="tot att-muted">{v.t.F || 0}</td>
                    <td className="tot pay">{v.payable}</td>
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
              <span className="grow"><PName code={r.emp_code}>{r.full_name}</PName></span>
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
                <p><PName code={r.emp_code}><b>{r.full_name}</b></PName></p>
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
  const [q, setQ] = useState("");

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
      <input placeholder="Search name, code, team" value={q}
        onChange={(e) => setQ(e.target.value)} />

      {busy && <p className="att-muted">Loading…</p>}
      {!busy && (() => {
        const shown = rows.filter((r: any) => !q ||
          `${r.full_name} ${r.emp_code} ${r.team || ""}`.toLowerCase().includes(q.toLowerCase()));
        const groups: Record<string, any[]> = {};
        shown.forEach((r: any) => {
          const k = r.team || "—";
          (groups[k] = groups[k] || []).push(r);
        });
        const names = Object.keys(groups).sort();
        if (!shown.length) return <div className="att-list"><p className="att-empty">No data for this month.</p></div>;
        return names.map((tn) => {
          const g = groups[tn];
          const total = g.reduce((a: number, r: any) => a + Number(r.payable_amount || 0), 0);
          return (
            <Section key={tn} title={tn} count={g.length} open={!!q || names.length <= 3}
              sub={total ? `₹ ${total.toLocaleString("en-IN")} payable` : "salary not set"}>
              {g.map((r: any) => (
                <div className="att-row" key={r.emp_code} style={{ display: "block" }}>
                  <div className="att-between">
                    <b><PName code={r.emp_code}>{r.emp_code} · {r.full_name}</PName></b>
                    <b style={{ color: r.monthly_gross ? "#2563eb" : "#98a2b3" }}>
                      {r.monthly_gross
                        ? `₹ ${Number(r.payable_amount).toLocaleString("en-IN")}`
                        : "salary not set"}
                    </b>
                  </div>
                  <p className="att-muted" style={{ marginTop: 4 }}>
                    Counted {r.counted_days} of {r.month_days} days ·{" "}
                    {r.present_days} present · {r.half_days} half · {r.paid_leaves} paid leave ·{" "}
                    <span style={{ color: "#b42318" }}>{r.absent_days} absent</span>
                  </p>
                  <p className="att-muted" style={{ marginTop: 2 }}>
                    Payable <b>{r.payable_days}</b> days
                    {r.monthly_gross ? ` × ₹${r.per_day}/day` : ""}
                  </p>
                </div>
              ))}
            </Section>
          );
        });
      })()}
    </>
  );
}

function TeamScreen({ me, tab }: any) {
  const approver = ["manager", "admin"].includes(me.role);
  return (
    <div className="att-wrap att-stack">
      {(tab === "today" || !approver) && <TodayTab />}
      {approver && tab === "dash" && <DashTab />}
      {approver && tab === "staff" && <StaffTab me={me} />}
      {approver && tab === "reports" && <ReportsTab />}
      {approver && tab === "payroll" && <PayrollTab />}
    </div>
  );
}

/* ========================= profile ========================= */
function MeScreen({ me }: any) {
  const info: [string, string][] = [
    ["Employee code", me.emp_code],
    ["Email", me.email || "—"],
    ["Team", me.teams?.name || "—"],
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

      <p className="att-muted">
        To change your 4-digit code, sign out and use "Forgot code?" on the sign-in screen.
      </p>
    </div>
  );
}

function BalanceSheet({ b, who, year, onClose }: any) {
  const [val, setVal] = useState(String(b.allocated ?? 0));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const [scope, setScope] = useState<"one" | "team" | "all">("one");
  const [teams, setTeams] = useState<any[]>([]);
  const [teamId, setTeamId] = useState("");

  useEffect(() => {
    supabase.from("teams").select("id, name").order("name")
      .then(({ data }) => setTeams(data || []));
  }, []);

  const save = async () => {
    const num = Number(val);
    if (isNaN(num) || num < 0) return setMsg({ err: "Enter a number, 0 or more.", ok: "" });
    setBusy(true); setMsg({ err: "", ok: "" });

    const { error } = scope === "one"
      ? await supabase.rpc("set_leave_balance", {
          p_emp: who.id, p_type: b.leave_type, p_allotted: num, p_year: year })
      : await supabase.rpc("set_leave_balance_bulk", {
          p_type: b.leave_type, p_allotted: num,
          p_team: scope === "team" ? (teamId || null) : null, p_year: year });

    if (error) setMsg({ err: error.message, ok: "" });
    else { setMsg({ err: "", ok: "Saved." }); setTimeout(onClose, 700); }
    setBusy(false);
  };

  return (
    <Sheet title={`${b.name} allotment`} onClose={onClose}>
      <div className="att-card att-stack">
        <p className="att-muted">
          How many <b>{b.name.toLowerCase()}</b> days for {year}. Booked days stay as they
          are — only the allotment changes, and Available recalculates itself.
        </p>

        <div>
          <label>Days allotted</label>
          <input type="number" min="0" step="0.5" value={val} autoFocus
            onChange={(e) => setVal(e.target.value)} />
        </div>

        <div>
          <label>Apply to</label>
          <select value={scope} onChange={(e) => setScope(e.target.value as any)}>
            <option value="one">Just {who.full_name}</option>
            <option value="team">A whole team</option>
            <option value="all">Everyone in the company</option>
          </select>
        </div>

        {scope === "team" && (
          <div>
            <label>Team</label>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">— pick a team —</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {scope === "all" && (
          <div className="att-note err">
            <span>This overwrites the {b.name.toLowerCase()} allotment for every active
            employee, including anyone you've already set individually.</span>
          </div>
        )}

        <Note>{msg.err}</Note>
        <Note kind="ok">{msg.ok}</Note>
        <button className="att-btn" onClick={save}
          disabled={busy || (scope === "team" && !teamId)}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </Sheet>
  );
}

function LeaveSheet({ lv, who, onClose, onChanged }: any) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ err: "", ok: "" });
  const [emp, setEmp] = useState<any>(null);
  const [confirm, setConfirm] = useState(false);
  const ctx = usePerson();

  useEffect(() => {
    if (!lv.employee_id) return;
    supabase.from("employees")
      .select("emp_code, full_name, designation, email, phone")
      .eq("id", lv.employee_id).maybeSingle()
      .then(({ data }) => setEmp(data));
  }, [lv.employee_id]);

  const mine = lv.employee_id === who?.id;
  const canCancel = mine && lv.status === "Pending";

  const cancel = async () => {
    setBusy(true); setMsg({ err: "", ok: "" });
    const { error } = await supabase.from("leaves")
      .update({ status: "Cancelled" }).eq("id", lv.id);
    if (error) setMsg({ err: error.message, ok: "" });
    else { onChanged && onChanged(); onClose(); }
    setBusy(false);
  };

  const one = lv.from_date === lv.to_date;

  return (
    <Sheet title="Leave details" onClose={onClose}>
      <div className="att-card att-stack">
        <div className="att-between">
          <span className="att-ltype" style={{ fontSize: 13, padding: "5px 12px" }}>
            {lv.leave_name || lv.leave_type}
          </span>
          <span className={pillClass(lv.status)}>{lv.status}</span>
        </div>

        {emp && !mine && (
          <div className="att-row" style={{ padding: 0, borderBottom: 0 }}>
            <Avatar name={emp.full_name} />
            <div className="grow">
              <p><PName id={lv.employee_id} code={emp.emp_code}>
                <b>{emp.full_name}</b></PName></p>
              <p className="att-muted">{emp.emp_code} · {emp.designation || "—"}</p>
            </div>
          </div>
        )}

        <dl className="att-dl">
          <dt>{one ? "Date" : "From"}</dt>
          <dd>{fmtDate(lv.from_date)}</dd>
          {!one && (<><dt>To</dt><dd>{fmtDate(lv.to_date)}</dd></>)}
          {lv.from_time && (<><dt>Time</dt>
            <dd>{fmtHM(lv.from_time)} – {fmtHM(lv.to_time)}</dd></>)}
          <dt>Days counted</dt>
          <dd>{lv.days}</dd>
          <dt>Reason</dt>
          <dd style={{ whiteSpace: "normal" }}>
            {lv.reason || <span className="att-muted">— none given —</span>}
          </dd>
          <dt>Applied on</dt>
          <dd>{lv.created_at ? fmtDate(lv.created_at) : "—"}</dd>
          {lv.status !== "Pending" && (
            <>
              <dt>{lv.status} by</dt>
              <dd>{lv.approver_name || "—"}</dd>
              <dt>{lv.status} on</dt>
              <dd>{lv.approved_at ? fmtDate(lv.approved_at) : "—"}</dd>
            </>
          )}
          {lv.approver_note && (<><dt>Note</dt>
            <dd style={{ whiteSpace: "normal" }}>{lv.approver_note}</dd></>)}
        </dl>

        <Note>{msg.err}</Note>

        {canCancel && !confirm && (
          <button className="att-btn line" onClick={() => setConfirm(true)}>
            Cancel this request
          </button>
        )}

        {canCancel && confirm && (
          <div className="att-note err">
            <span>This withdraws your request. The days go back to your balance.</span>
            <div className="att-flex" style={{ marginTop: 10 }}>
              <button className="att-btn grey sm" style={{ flex: 1 }}
                onClick={() => setConfirm(false)}>Keep it</button>
              <button className="att-btn sm" style={{ flex: 1, background: "#b42318" }}
                disabled={busy} onClick={cancel}>Yes, cancel</button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ================= kaun leave pe hai ================= */
function OnLeaveTab() {
  const [pickLeave, setPickLeave] = useState<any>(null);
  const [date, setDate] = useState(istToday());
  const [rows, setRows] = useState<any[]>([]);
  const [soon, setSoon] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setBusy(true);
      const [a, b] = await Promise.all([
        supabase.rpc("on_leave", { p_date: date }),
        supabase.rpc("upcoming_leaves", { p_days: 30 }),
      ]);
      setRows(a.data || []); setSoon(b.data || []); setBusy(false);
    })();
  }, [date]);

  const shown = rows.filter((r) => !q ||
    `${r.full_name} ${r.emp_code} ${r.team} ${r.leave_name}`
      .toLowerCase().includes(q.toLowerCase()));

  const groups: Record<string, any[]> = {};
  shown.forEach((r) => { (groups[r.team] = groups[r.team] || []).push(r); });
  const teams = Object.keys(groups).sort();

  const isToday = date === istToday();

  return (
    <>
      <div className="att-rephd">
        <div style={{ flex: 1, minWidth: 150 }}>
          <b style={{ fontSize: 16 }}>
            {shown.length} {shown.length === 1 ? "person" : "people"} on leave
          </b>
          <p className="att-muted">
            {new Date(date + "T00:00:00").toLocaleDateString("en-GB",
              { weekday: "long", day: "2-digit", month: "long" })}
            {isToday ? " · today" : ""}
          </p>
        </div>
        <div className="att-flex">
          {!isToday && (
            <button className="att-btn sm line" onClick={() => setDate(istToday())}>Today</button>
          )}
          <input type="date" value={date} className="att-repmonth"
            onChange={(e) => setDate(e.target.value)} />
          <button className="att-btn sm line" disabled={!shown.length}
            onClick={() => downloadCsv(shown.map((r) => ({
              Code: r.emp_code, Name: r.full_name, Department: r.team,
              Leave: r.leave_name,
              From: r.from_date, To: r.to_date,
              Time: r.from_time ? `${fmtHM(r.from_time)} – ${fmtHM(r.to_time)}` : "",
              Day: `${r.day_index} of ${r.total_days}`,
              Days: r.days, Reason: r.reason || "",
            })), `HJS_on_leave_${date}.csv`)}>CSV</button>
        </div>
      </div>

      {rows.length > 6 && (
        <input placeholder="Search name, department, leave type"
          value={q} onChange={(e) => setQ(e.target.value)} />
      )}

      {busy && <p className="att-muted">Loading…</p>}

      {!busy && !shown.length && (
        <div className="att-list">
          <p className="att-empty">
            {rows.length ? "No match found." : "Nobody is on leave this day."}
          </p>
        </div>
      )}

      {teams.map((tn) => (
        <div className="att-list" key={tn}>
          <div className="att-hd">
            <b>{tn}</b><span className="att-chip">{groups[tn].length}</span>
          </div>
          {groups[tn].map((r) => (
            <div className="att-row clk" key={r.employee_id} style={{ flexWrap: "wrap" }}
              onClick={() => setPickLeave({ ...r, id: r.leave_id, emp: r })}>
              <Avatar name={r.full_name} />
              <div className="grow" style={{ minWidth: 160 }}>
                <p>
                  <PName id={r.employee_id} code={r.emp_code}>
                    <b>{r.emp_code}</b> · {r.full_name}
                  </PName>
                </p>
                <p className="att-muted">{r.designation || "—"}</p>
                {r.reason && (
                  <p style={{ fontSize: 12.5, color: "#475467", whiteSpace: "normal" }}>
                    {r.reason}
                  </p>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="att-pill p-Leave">{r.leave_name}</span>
                <p className="att-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  {r.from_date === r.to_date
                    ? fmtDate(r.from_date)
                    : `${fmtDate(r.from_date)} – ${fmtDate(r.to_date)}`}
                </p>
                {r.from_time && (
                  <p className="att-muted" style={{ fontSize: 11.5 }}>
                    {fmtHM(r.from_time)} – {fmtHM(r.to_time)}
                  </p>
                )}
                {r.total_days > 1 && (
                  <p className="att-muted" style={{ fontSize: 11.5 }}>
                    day {r.day_index} of {r.total_days}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {pickLeave && (
        <LeaveSheet lv={pickLeave} who={null}
          onClose={() => setPickLeave(null)} />
      )}

      {isToday && soon.length > 0 && (
        <div className="att-list">
          <div className="att-hd">
            <b>Coming up</b><span className="att-muted">next 30 days</span>
          </div>
          {soon.map((r, i) => (
            <div className="att-row" key={i}>
              <Avatar name={r.full_name} />
              <div className="grow">
                <p><PName code={r.emp_code}><b>{r.full_name}</b></PName>
                  <span className="att-muted"> · {r.team}</span></p>
                <p className="att-muted">
                  {r.leave_name} · {r.from_date === r.to_date
                    ? fmtDate(r.from_date)
                    : `${fmtDate(r.from_date)} – ${fmtDate(r.to_date)}`} · {r.days}d
                </p>
              </div>
              <span className="att-muted" style={{ fontSize: 12.5 }}>
                {r.starts_in === 1 ? "tomorrow" : `in ${r.starts_in} days`}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ================= adhoore records ================= */
function NeedsSetupTab({ me }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [open, setOpen] = useState<any>(null);
  const canEdit = me?.role === "admin";

  const load = async () => {
    const { data } = await supabase.rpc("directory", {});
    const bad = (data || []).filter((r: any) =>
      String(r.emp_code).startsWith("REG-")
      || !r.team_id
      || !r.designation
      || (!r.reports_to && !r.co_manager_id && r.designation !== "Co-Founder")
      || !r.email);
    setRows(bad); setBusy(false);
  };
  useEffect(() => { load(); }, []);

  const gaps = (r: any) => {
    const g: string[] = [];
    if (String(r.emp_code).startsWith("REG-")) g.push("employee code");
    if (!r.team_id) g.push("department");
    if (!r.designation) g.push("designation");
    if (!r.reports_to && !r.co_manager_id && r.designation !== "Co-Founder")
      g.push("reporting manager");
    if (!r.email) g.push("email");
    return g;
  };

  if (busy) return <p className="att-muted">Loading…</p>;

  return (
    <>
      <p className="att-muted" style={{ whiteSpace: "normal" }}>
        These people are in the system but their record is missing something. Until it's
        filled in they sit outside the org chart, and without an email they can't sign in.
      </p>

      <div className="att-list">
        <div className="att-hd">
          <b>Half-filled records</b><span className="att-muted">{rows.length}</span>
        </div>
        {!rows.length && <p className="att-empty">Everyone's record is complete.</p>}
        {rows.map((r) => (
          <div className="att-row" key={r.id} style={{ flexWrap: "wrap" }}>
            <Avatar name={r.full_name} />
            <div className="grow" style={{ minWidth: 170 }}>
              <p><b>{r.full_name}</b> <span className="att-muted">{r.emp_code}</span></p>
              <p className="att-muted">
                {r.team !== "—" ? r.team : "no department"}
                {r.designation ? ` · ${r.designation}` : ""}
              </p>
              <p style={{ fontSize: 12, color: "#b54708", marginTop: 2 }}>
                Missing: {gaps(r).join(", ")}
              </p>
            </div>
            {canEdit && (
              <button className="att-btn sm" onClick={() => setOpen(r)}>Fix it</button>
            )}
          </div>
        ))}
      </div>

      {open && <PersonSheet p={open} canEdit={canEdit}
        onClose={() => setOpen(null)} onDeleted={load} />}
    </>
  );
}

function DaySheet({ d, me, onClose }: any) {
  const [sess, setSess] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    supabase.from("attendance_sessions").select("*")
      .eq("employee_id", me.id).eq("work_date", d.d).order("in_at")
      .then(({ data }) => { setSess(data || []); setBusy(false); });
  }, [d.d]);

  const pretty = new Date(d.d + "T00:00:00").toLocaleDateString("en-GB",
    { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  return (
    <Sheet title={pretty} onClose={onClose}>
      <div className="att-card att-stack">
        <div className="att-between">
          <span className={markClass(d.mark)} style={{ fontSize: 15, padding: "5px 14px" }}>
            {d.mark}
          </span>
          <b style={{ fontSize: 15 }}>{d.label}</b>
        </div>

        {d.log && (
          <dl className="att-dl">
            <dt>First check-in</dt>
            <dd>{fmtTime(d.log.punch_in_at)}</dd>
            <dt>Last check-out</dt>
            <dd>{d.log.punch_out_at ? fmtTime(d.log.punch_out_at)
              : <span className="att-muted">still checked in</span>}</dd>
            <dt>Hours worked</dt>
            <dd>{hhmm(d.log.worked_minutes)}</dd>
            <dt>Shift</dt>
            <dd>{fmtHM(me.shift_start)} – {fmtHM(me.shift_end)}</dd>
            {d.log.late_minutes ? (<><dt>Late by</dt><dd>{d.log.late_minutes} min</dd></>) : null}
          </dl>
        )}

        {d.lv && (
          <dl className="att-dl">
            <dt>Leave type</dt><dd>{d.lv.leave_type}</dd>
            <dt>From</dt><dd>{fmtDate(d.lv.from_date)}</dd>
            <dt>To</dt><dd>{fmtDate(d.lv.to_date)}</dd>
            {d.lv.from_time && (<><dt>Time</dt>
              <dd>{fmtHM(d.lv.from_time)} – {fmtHM(d.lv.to_time)}</dd></>)}
            <dt>Days</dt><dd>{d.lv.days}</dd>
            {d.lv.reason && (<><dt>Reason</dt><dd>{d.lv.reason}</dd></>)}
          </dl>
        )}

        {!d.log && !d.lv && (
          <p className="att-muted">
            {d.mark === "A" ? "No check-in recorded for this day."
              : d.mark === "W" ? "This is your weekly off."
              : d.mark === "F" ? "Company holiday." : "Nothing recorded."}
          </p>
        )}
      </div>

      {busy && <p className="att-muted">Loading sessions…</p>}

      {!busy && sess.length > 0 && (
        <div className="att-list" style={{ marginTop: 12 }}>
          <div className="att-hd">
            <b>Check-ins that day</b><span className="att-muted">{sess.length}</span>
          </div>
          {sess.map((x, i) => (
            <div className="att-row" key={x.id}>
              <span style={{ width: 22, fontWeight: 700, color: "#98a2b3" }}>{i + 1}</span>
              <div className="grow">
                <p>
                  {fmtTime(x.in_at)}
                  {x.out_at ? ` – ${fmtTime(x.out_at)}` : " – still in"}
                  {x.auto_closed && (
                    <span className="att-pill p-Late" style={{ marginLeft: 7 }}>auto closed</span>)}
                </p>
                <Pin lat={x.in_lat} lng={x.in_lng} dist={x.in_distance_m} ok={x.in_geo_ok} />
              </div>
              <b style={{ fontSize: 13 }}>{x.minutes ? hhmm(x.minutes) : "—"}</b>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* ================= apni report (sabke liye) ================= */
function MyReportTab({ me }: any) {
  const [month, setMonth] = useState(istToday().slice(0, 7));
  const [filter, setFilter] = useState("all");
  const [pick, setPick] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [hols, setHols] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    (async () => {
      setBusy(true);
      const from = `${month}-01`, to = lastDayOf(from);
      const [a, l, h] = await Promise.all([
        supabase.from("attendance_logs").select("*").eq("employee_id", me.id)
          .gte("work_date", from).lte("work_date", to).order("work_date"),
        supabase.from("leaves").select("*").eq("employee_id", me.id)
          .eq("status", "Approved").lte("from_date", to).gte("to_date", from),
        supabase.from("holidays").select("*").gte("hol_date", from).lte("hol_date", to),
      ]);
      setLogs(a.data || []); setLeaves(l.data || []); setHols(h.data || []);
      setBusy(false);
    })();
  }, [month, me.id]);

  const days = useMemo(() => {
    const from = `${month}-01`;
    const total = Number(lastDayOf(from).slice(-2));
    const out: any[] = [];
    for (let i = 0; i < total; i++) {
      const d = addDays(from, i);
      const log = logs.find((x: any) => x.work_date === d);
      const lv = leaves.find((x: any) => d >= x.from_date && d <= x.to_date);
      const hol = hols.find((x: any) => x.hol_date === d);
      const off = (me.week_off_days || []).includes(new Date(d + "T00:00:00").getDay());
      let mark = "", label = "";
      if (log) { mark = { Present: "P", Late: "L", "Half Day": "H" }[log.status as string] || "P";
                 label = log.status; }
      else if (lv) { mark = lv.leave_type; label = lv.leave_type; }
      else if (hol) { mark = "F"; label = hol.name; }
      else if (off) { mark = "W"; label = "Week off"; }
      else if (d > istToday()) { mark = ""; label = ""; }
      else { mark = "A"; label = "Absent"; }
      out.push({ d, mark, label, log, lv });
    }
    return out;
  }, [logs, leaves, hols, month, me]);

  const t = useMemo(() => {
    const c: any = { P: 0, L: 0, H: 0, A: 0, W: 0, F: 0, leave: 0, mins: 0 };
    days.forEach((x) => {
      if (["P", "L", "H", "A", "W", "F"].includes(x.mark)) c[x.mark]++;
      else if (x.mark) c.leave++;
      if (x.log) c.mins += x.log.worked_minutes || 0;
    });
    c.payable = c.P + c.L + c.H * 0.5 + c.leave;
    return c;
  }, [days]);

  const shownDays = days.filter((x) => {
    if (!x.mark) return false;
    if (filter === "worked") return ["P", "L", "H"].includes(x.mark);
    if (filter === "absent") return x.mark === "A";
    if (filter === "leave") return !["P", "L", "H", "A", "W", "F"].includes(x.mark);
    return true;
  });

  return (
    <div className="att-wrap att-stack">
      <div className="att-rephd">
        <div style={{ flex: 1, minWidth: 150 }}>
          <b style={{ fontSize: 16 }}>My attendance</b>
          <p className="att-muted">{me.emp_code} · {me.full_name}</p>
        </div>
        <div className="att-flex">
          <input type="month" value={month} max={istToday().slice(0, 7)}
            onChange={(e) => setMonth(e.target.value)} className="att-repmonth" />
          <button className="att-btn sm line" disabled={!days.length}
            onClick={() => downloadCsv(days.map((x) => ({
              Date: x.d, Mark: x.mark, Status: x.label,
              In: x.log ? fmtTime(x.log.punch_in_at) : "",
              Out: x.log?.punch_out_at ? fmtTime(x.log.punch_out_at) : "",
              Hours: x.log ? hhmm(x.log.worked_minutes) : "",
            })), `${me.emp_code}_${month}.csv`)}>CSV</button>
        </div>
      </div>

      <div className="att-stats">
        <button className="att-stat clk" onClick={() => setFilter("worked")}>
          <b style={{ color: "#16a34a" }}>{t.P}</b><span>Present</span></button>
        <button className="att-stat clk" onClick={() => setFilter("worked")}>
          <b style={{ color: "#d97706" }}>{t.L}</b><span>Late</span></button>
        <button className="att-stat clk" onClick={() => setFilter("worked")}>
          <b style={{ color: "#ea580c" }}>{t.H}</b><span>Half</span></button>
        <button className="att-stat clk" onClick={() => setFilter("absent")}>
          <b style={{ color: "#dc2626" }}>{t.A}</b><span>Absent</span></button>
        <button className="att-stat clk" onClick={() => setFilter("leave")}>
          <b style={{ color: "#2563eb" }}>{t.leave}</b><span>Leave</span></button>
        <button className="att-stat clk" onClick={() => setFilter("all")}>
          <b>{t.W}</b><span>Week off</span></button>
        <button className="att-stat clk" onClick={() => setFilter("all")}>
          <b>{t.F}</b><span>Holiday</span></button>
        <div className="att-stat"><b style={{ color: "#1849a9" }}>{t.payable}</b><span>Payable</span></div>
        <button className="att-stat clk" onClick={() => setFilter("worked")}>
          <b style={{ color: "#2563eb" }}>{hhmm(t.mins)}</b><span>Hours</span></button>
      </div>

      {busy && <p className="att-muted">Loading…</p>}

      {!busy && (
        <div className="att-list">
          <div className="att-hd">
            <b>Day by day</b>
            <span className="att-muted">
              {filter === "all" ? "every day" : filter} · tap a day for details
            </span>
          </div>

          <div className="att-seg" style={{ padding: "10px 14px 4px" }}>
            {[["all", "All"], ["worked", "Worked"], ["absent", "Absent"],
              ["leave", "Leave"]].map(([k, l]) => (
              <button key={k} className={filter === k ? "on" : ""}
                onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>

          {shownDays.map((x) => (
            <button className={`att-dayrow ${["W", "F"].includes(x.mark) ? "off" : ""}`}
              key={x.d} onClick={() => setPick(x)}>
              <span className="dt">
                <b>{x.d.slice(-2)}</b>
                <i>{new Date(x.d + "T00:00:00").toLocaleDateString("en-GB",
                  { weekday: "short" })}</i>
              </span>

              <span className={`${markClass(x.mark)} wide ${x.mark.length > 2 ? "long" : ""}`}>
                {x.mark}
              </span>

              <span className="mid">
                <b>{x.label}</b>
                <span>
                  {x.log
                    ? `${fmtTime(x.log.punch_in_at)}${x.log.punch_out_at
                        ? ` – ${fmtTime(x.log.punch_out_at)}` : " – still in"}`
                    : x.lv?.from_time
                      ? `${fmtHM(x.lv.from_time)} – ${fmtHM(x.lv.to_time)}`
                      : "\u00a0"}
                </span>
              </span>

              <span className={`hrs ${x.log?.worked_minutes ? "" : "none"}`}>
                {x.log?.worked_minutes ? hhmm(x.log.worked_minutes) : "—"}
              </span>
            </button>
          ))}

          {!shownDays.length && <p className="att-empty">Nothing here for this filter.</p>}
        </div>
      )}

      {pick && <DaySheet d={pick} me={me} onClose={() => setPick(null)} />}
    </div>
  );
}

/* ================= manager ka daily verification ================= */
function VerifyRow({ r, onSet, onClear, busy, date }: any) {
  const [menu, setMenu] = useState(false);
  const [edit, setEdit] = useState(false);
  const [up, setUp] = useState(false);

  // neeche jagah kam ho to menu upar khulega
  const openMenu = (setter: any, cur: boolean) => (e: any) => {
    const box = e.currentTarget.getBoundingClientRect();
    setUp(window.innerHeight - box.bottom < 230);
    setter(!cur);
  };
  const [confirm, setConfirm] = useState<null | "hold" | "cancel">(null);
  const [note, setNote] = useState("");

  const tone: any = {
    Approved: { bg: "#ecfdf3", fg: "#067647" },
    "On hold": { bg: "#fffaeb", fg: "#b54708" },
    Cancelled: { bg: "#fef3f2", fg: "#b42318" },
  };

  return (
    <>
      <div className={`att-vrow ${r.status === "Approved" ? "ok"
        : r.status === "On hold" ? "hold" : r.status === "Cancelled" ? "cut" : ""}`}>
        <div className="who">
        <Avatar name={r.full_name} />

        <div className="grow" style={{ minWidth: 0 }}>
          <p className="nm">
            <PName id={r.employee_id} code={r.emp_code}><b>{r.full_name}</b></PName>
            {r.still_in && (
              <span className="att-pill p-Present" style={{ marginLeft: 7 }}>in now</span>)}
            {r.geo_ok === false && (
              <span className="att-pill p-Absent" style={{ marginLeft: 7 }}>off-site</span>)}
          </p>
          <p className="att-muted">
            {r.designation || "—"}
            {r.day_status ? ` · ${r.day_status}` : ""}
          </p>
          {r.status && (
            <p className="att-muted" style={{ fontSize: 11.5, marginTop: 2 }}>
              {r.status} by {r.verified_by_name || "—"}
              {r.verified_at ? ` at ${fmtTime(r.verified_at)}` : ""}
              {r.note ? ` — ${r.note}` : ""}
            </p>
          )}
        </div>
        </div>

        <div className="when">
          <p className="att-vtime">
            {fmtTime(r.first_in)}{r.last_out ? ` – ${fmtTime(r.last_out)}` : ""}
          </p>
          {r.worked_minutes ? (
            <p className="att-muted" style={{ fontSize: 11.5 }}>{hhmm(r.worked_minutes)}</p>
          ) : null}
        </div>

        {r.status ? (
          <>
            <span className="att-vtag" style={{
              background: tone[r.status]?.bg, color: tone[r.status]?.fg }}>{r.status}</span>

            <div className="att-menu">
              <button className="att-pencil" onClick={openMenu(setEdit, edit)}
                aria-label="Change this">
                <Icon n="pencil" c="currentColor" s={14} />
              </button>
              {edit && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 20 }}
                    onClick={() => setEdit(false)} />
                  <div className={`att-pop ${up ? "up" : ""}`}>
                    <button onClick={() => { setEdit(false); onClear(r.employee_id); }}>
                      Change to not approved
                    </button>
                    {r.status !== "On hold" && (
                      <button onClick={() => { setEdit(false); setConfirm("hold"); }}>
                        Put on hold
                      </button>
                    )}
                    {r.status !== "Cancelled" && (
                      <>
                        <div className="sep" />
                        <button className="danger"
                          onClick={() => { setEdit(false); setConfirm("cancel"); }}>
                          Cancel this attendance
                        </button>
                      </>
                    )}
                    <div className="sep" />
                    <button onClick={() => setEdit(false)}>Cancel — leave it as is</button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <button className="att-btn sm green" disabled={busy}
              onClick={() => onSet(r.employee_id, "Approved")}>Approve</button>

            <div className="att-menu">
              <button className="att-dots" onClick={openMenu(setMenu, menu)}
                aria-label="More options">
                <Icon n="dots" c="currentColor" s={18} />
              </button>
              {menu && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 20 }}
                    onClick={() => setMenu(false)} />
                  <div className={`att-pop ${up ? "up" : ""}`}>
                    <button onClick={() => { setMenu(false); setConfirm("hold"); }}>
                      Put on hold
                    </button>
                    <div className="sep" />
                    <button className="danger"
                      onClick={() => { setMenu(false); setConfirm("cancel"); }}>
                      Cancel this attendance
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {confirm && (
        <Sheet title={confirm === "cancel" ? "Cancel attendance" : "Put on hold"}
          onClose={() => { setConfirm(null); setNote(""); }}>
          <div className="att-card att-stack">
            {confirm === "cancel" ? (
              <div className="att-note err">
                <span>
                  This marks <b>{r.full_name}</b> absent for {fmtDate(date)} even though
                  they checked in at {fmtTime(r.first_in)}. Their hours go to zero and it
                  shows up in payroll. Only do this if they didn't actually turn up.
                </span>
              </div>
            ) : (
              <p className="att-muted">
                On hold keeps the day as-is but flags it so you can come back to it.
              </p>
            )}
            <div>
              <label>Reason {confirm === "cancel" ? "(required)" : "(optional)"}</label>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                placeholder={confirm === "cancel"
                  ? "Why is this being cancelled?" : "Anything to note?"} />
            </div>
            <div className="att-flex">
              <button className="att-btn grey sm" style={{ flex: 1 }}
                onClick={() => { setConfirm(null); setNote(""); }}>Keep it</button>
              <button className="att-btn sm" style={{ flex: 1,
                  background: confirm === "cancel" ? "#b42318" : "#d97706" }}
                disabled={busy || (confirm === "cancel" && !note.trim())}
                onClick={() => {
                  onSet(r.employee_id, confirm === "cancel" ? "Cancelled" : "On hold", note);
                  setConfirm(null); setNote("");
                }}>
                {confirm === "cancel" ? "Yes, cancel it" : "Put on hold"}
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}

function VerifyPanel({ onCount }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [date, setDate] = useState(istToday());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"todo" | "all">("all");

  const load = async (d = date) => {
    const { data, error } = await supabase.rpc("verification_queue", { p_date: d });
    if (error) setErr(error.message);
    setRows(data || []);
    if (onCount) onCount((data || []).filter((r: any) => !r.status).length);
  };
  useEffect(() => { load(date); }, [date]);

  const setOne = async (emp: string, status: string, note?: string) => {
    setBusy(true); setErr("");
    const { error } = await supabase.rpc("set_verification", {
      p_emp: emp, p_status: status, p_date: date, p_note: note || null,
    });
    if (error) setErr(error.message);
    await load(); setBusy(false);
  };

  const clearOne = async (emp: string) => {
    setBusy(true); setErr("");
    const { error } = await supabase.rpc("clear_verification", { p_emp: emp, p_date: date });
    if (error) setErr(error.message);
    await load(); setBusy(false);
  };

  const approveMany = async (list: any[]) => {
    setBusy(true); setErr("");
    for (const r of list.filter((x) => !x.status)) {
      const { error } = await supabase.rpc("set_verification", {
        p_emp: r.employee_id, p_status: "Approved", p_date: date, p_note: null,
      });
      if (error) { setErr(error.message); break; }
    }
    await load(); setBusy(false);
  };

  const pending = rows.filter((r) => !r.status);
  const done = rows.length - pending.length;
  const pct = rows.length ? Math.round((done / rows.length) * 100) : 0;
  const shown = filter === "todo" ? pending : rows;

  const groups: Record<string, any[]> = {};
  shown.forEach((r) => { (groups[r.team || "—"] = groups[r.team || "—"] || []).push(r); });
  const teams = Object.keys(groups).sort();

  return (
    <div className="att-wrap att-stack">
      <div className="att-vhero">
        <div>
          <h2>Who turned up</h2>
          <p className="dt">
            {new Date(date + "T00:00:00").toLocaleDateString("en-GB",
              { weekday: "long", day: "2-digit", month: "long" })}
          </p>
        </div>

        <div className="att-vprog">
          <div className="att-between">
            <span className="att-muted">
              {rows.length === 0 ? "Nobody has checked in yet"
                : pending.length === 0 ? `All ${rows.length} checked`
                : `${done} of ${rows.length} checked`}
            </span>
            <b style={{ color: pct === 100 ? "#16a34a" : "#344054" }}>{pct}%</b>
          </div>
          <div className="att-vbar"><i style={{ width: `${pct}%` }} /></div>
        </div>

        <div className="att-flex">
          <input type="date" value={date} max={istToday()}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: "auto", minWidth: 168 }} />
          {pending.length > 0 && (
            <button className="att-btn green" disabled={busy}
              onClick={() => approveMany(rows)}>
              Approve all ({pending.length})
            </button>
          )}
        </div>
      </div>

      <Note>{err}</Note>

      {rows.length > 0 && (
        <div className="att-seg">
          <button className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>
            Everyone ({rows.length})
          </button>
          <button className={filter === "todo" ? "on" : ""} onClick={() => setFilter("todo")}>
            Still to check ({pending.length})
          </button>
        </div>
      )}

      {rows.length === 0 && (
        <div className="att-vwrap">
          <div className="att-vempty">
            <div className="big">🌤️</div>
            <p>No check-ins recorded for this day.</p>
          </div>
        </div>
      )}

      {rows.length > 0 && shown.length === 0 && (
        <div className="att-vwrap">
          <div className="att-vempty">
            <div className="big">✓</div>
            <p>Everyone's been checked. Nothing left for today.</p>
          </div>
        </div>
      )}

      {teams.map((tn) => {
        const g = groups[tn];
        const left = g.filter((x) => !x.status).length;
        return (
          <div className="att-vwrap" key={tn}>
            <div className="att-vteam">
              <b>{tn}</b>
              <span className="att-muted">
                {left ? `${left} to check` : "all checked"}
              </span>
              {left > 1 && (
                <button className="att-btn sm line" style={{ marginLeft: "auto" }}
                  disabled={busy} onClick={() => approveMany(g)}>
                  Approve these {left}
                </button>
              )}
            </div>
            {g.map((r) => (
              <VerifyRow key={r.employee_id} r={r} onSet={setOne} onClear={clearOne}
                busy={busy} date={date} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ================= person popup, poore app mein ================= */
const PersonCtx = React.createContext<any>(null);
const usePerson = () => React.useContext(PersonCtx);

// Kisi bhi naam ko clickable banata hai
function PName({ id, code, children, className = "" }: any) {
  const ctx = usePerson();
  if (!ctx || (!id && !code)) return <>{children}</>;
  return (
    <span className={`att-pname ${className}`}
      onClick={(e) => { e.stopPropagation(); ctx.open({ id, code }); }}>
      {children}
    </span>
  );
}

function PersonProvider({ me, children }: any) {
  const [dir, setDir] = useState<any[]>([]);
  const [pick, setPick] = useState<any>(null);
  const canEdit = me?.role === "admin";

  const load = async () => {
    const { data } = await supabase.rpc("directory", {});
    setDir(data || []);
    return data || [];
  };
  useEffect(() => { load(); }, []);

  const open = async ({ id, code }: any) => {
    const find = (list: any[]) =>
      list.find((r) => (id && r.id === id) || (code && r.emp_code === code));
    let row = find(dir);
    if (!row) row = find(await load());
    if (row) setPick(row);
  };

  return (
    <PersonCtx.Provider value={{ open }}>
      {children}
      {pick && (
        <PersonSheet p={pick} canEdit={canEdit}
          onClose={() => setPick(null)} onDeleted={load} />
      )}
    </PersonCtx.Provider>
  );
}

/* ================= account linking ================= */
function LinkAccount({ session, err: outerErr }: any) {
  const email = session?.user?.email || "";
  const [state, setState] = useState<"checking" | "notfound" | "stuck">("checking");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Sirf jodne ki koshish — kuch banata NAHI hai.
  // Ek hi baar chalta hai; jud gaya to poora page reload, taaki loop na bane.
  useEffect(() => {
    const key = `hjs_linked_${session?.user?.id}`;
    let done = false;

    // 8 second se zyada atka to aage badho
    const bail = setTimeout(() => {
      if (!done) { setErr("Couldn't reach the server. Check your connection."); setState("notfound"); }
    }, 8000);

    (async () => {
      const { data, error } = await supabase.rpc("link_self");
      done = true; clearTimeout(bail);

      if (error) {
        // link_self hai hi nahi (SQL nahi chali) -> saaf batao
        setErr(/function|schema cache/i.test(error.message)
          ? "The app isn't fully set up yet. Ask your admin to run the latest database update."
          : error.message);
        setState("notfound");
        return;
      }
      if (data === "linked") {
        if (sessionStorage.getItem(key)) { setState("stuck"); return; }
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return;
      }
      setState("notfound");
    })();

    return () => clearTimeout(bail);
  }, []);

  const request = async () => {
    if (!name.trim()) return setErr("Please enter your full name.");
    setBusy(true); setErr("");
    const { error } = await supabase.rpc("register_self", {
      p_full_name: name.trim(),
      p_phone: phone.trim() || null,
    });
    if (error) { setErr(error.message); setBusy(false); return; }
    setBusy(false);
    window.location.reload();
  };

  if (state === "checking") {
    return (
      <div className="att-center">
        <p className="att-muted">Checking your account…</p>
      </div>
    );
  }

  // Login juda hua hai par employee record padha nahi ja raha
  if (state === "stuck") {
    return (
      <div className="att-center">
        <div className="att-card" style={{ maxWidth: 430 }}>
          <h2 className="att-h1">Almost there</h2>
          <p className="att-muted" style={{ marginTop: 8, whiteSpace: "normal" }}>
            Your login ({email}) is linked, but we can't read your employee record.
            Ask your admin to check that your record is active.
          </p>
          {outerErr && <Note>{outerErr}</Note>}
          <button className="att-btn line" style={{ marginTop: 14, width: "100%" }}
            onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="att-center">
      <div className="att-card" style={{ maxWidth: 430 }}>
        <h2 className="att-h1">We don't have this email yet</h2>
        <p className="att-muted" style={{ marginTop: 8, whiteSpace: "normal" }}>
          You're signed in as <b>{email}</b>, but that address isn't on the employee
          list. If you have a different work email, sign out and try that one —
          you'll go straight in.
        </p>

        <div className="att-stack" style={{ marginTop: 16 }}>
          <div>
            <label>Your full name</label>
            <input value={name} autoFocus placeholder="Full name"
              onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label>Mobile <span className="att-muted">(optional)</span></label>
            <input value={phone} placeholder="98765 43210"
              onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Note>{err}</Note>
          <button className="att-btn" disabled={busy || !name.trim()} onClick={request}>
            {busy ? "Sending…" : "Ask an admin for access"}
          </button>
          <button className="att-btn line" onClick={() => supabase.auth.signOut()}>
            Sign out and try another email
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================= shell ========================= */
// Zoho jaisa 3-level nav:  rail (module) -> top bar (scope) -> sub-tabs (view)
type View = { k: string; label: string };
type Scope = { k: string; label: string; views: View[] };
type Module = { k: string; label: string; icon: string; scopes: Scope[]; approverOnly?: boolean };

const MODULES: Module[] = [
  {
    k: "home", label: "Home", icon: "home",
    scopes: [
      { k: "myspace", label: "My Space", views: [
        { k: "overview", label: "Overview" },
        { k: "calendar", label: "Calendar" },
      ]},
      { k: "team", label: "Team", views: [
        { k: "space", label: "Team Space" },
        { k: "dept", label: "Department" },
        { k: "peers", label: "Peers" },
      ]},
      { k: "org", label: "Organization", views: [
        { k: "list", label: "Employee List" },
        { k: "emptree", label: "Employee Tree" },
        { k: "depttree", label: "Department Tree" },
        { k: "deptdir", label: "Department Directory" },
        { k: "people", label: "Birthdays & New Hires" },
        { k: "notice", label: "Announcements" },
      ]},
    ],
  },
  {
    k: "att", label: "Attendance", icon: "clock",
    scopes: [
      { k: "mydata", label: "My Data", views: [
        { k: "summary", label: "Attendance Summary" },
        { k: "calendar", label: "Calendar" },
        { k: "regs", label: "Regularization" },
      ]},
      { k: "team", label: "Team", views: [
        { k: "today", label: "Today" },
        { k: "leave", label: "On Leave" },
        { k: "matrix", label: "Monthly Matrix" },
        { k: "dash", label: "Dashboard" },
      ]},
    ],
  },
  {
    k: "leave", label: "Leave Tracker", icon: "cal",
    scopes: [
      { k: "mydata", label: "My Data", views: [
        { k: "summary", label: "Leave Summary" },
        { k: "requests", label: "Leave Requests" },
      ]},
      { k: "team", label: "Team", views: [{ k: "leaves", label: "Team Leaves" }]},
      { k: "holidays", label: "Holidays", views: [{ k: "list", label: "Holiday List" }]},
    ],
  },
  {
    k: "approvals", label: "Approvals", icon: "check", approverOnly: true,
    scopes: [
      { k: "pending", label: "Pending", views: [{ k: "all", label: "Awaiting action" }]},
      { k: "history", label: "History", views: [{ k: "all", label: "All requests" }]},
      { k: "joiners", label: "New joiners", views: [{ k: "all", label: "Pending sign-ups" }]},
      { k: "setup", label: "Needs setup", views: [{ k: "all", label: "Half-filled records" }]},
    ],
  },
  {
    k: "reports", label: "Reports", icon: "users",
    scopes: [
      { k: "mine", label: "My Reports", views: [
        { k: "me", label: "My attendance" },
      ]},
      { k: "att", label: "Attendance", views: [
        { k: "muster", label: "Muster Roll" },
        { k: "payroll", label: "Payroll" },
      ]},
      { k: "people", label: "People", views: [{ k: "staff", label: "Staff" }]},
    ],
  },
  {
    k: "me", label: "Profile", icon: "user",
    scopes: [{ k: "me", label: "My Profile", views: [{ k: "profile", label: "Profile" }]}],
  },
];

export default function Attendance() {
  const [session, setSession] = useState<any>(undefined);
  const [me, setMe] = useState<any>(null);
  // Nav ab URL ke hash mein rehta hai: #home/myspace/verify
  // Isse refresh pe wahi tab khulta hai aur link share kiya ja sakta hai.
  // Nav URL ke hash mein bhi rehta hai aur browser ki memory mein bhi.
  // Iframe ke andar hash kabhi-kabhi udd jata hai (page ?attendance se
  // dobara load hota hai), isliye localStorage bhi rakha hai — refresh
  // pe wahi tab wapas khulta hai.
  const NAV_KEY = "hjs_nav";

  const readHash = () => {
    const h = (window.location.hash || "").replace(/^#/, "").split("/");
    if (h[0]) return { m: h[0], s: h[1] || "", v: h[2] || "" };
    try {
      const saved = (localStorage.getItem(NAV_KEY) || "").split("/");
      if (saved[0]) return { m: saved[0], s: saved[1] || "", v: saved[2] || "" };
    } catch {}
    return { m: "home", s: "", v: "" };
  };

  const [route, setRoute] = useState(readHash);
  const mod = route.m, scope = route.s, view = route.v;

  const remember = (m: string, s2: string, v: string) => {
    try { localStorage.setItem(NAV_KEY, `${m}/${s2}/${v}`); } catch {}
  };

  const goto = (m: string, s2: string, v: string) => {
    const h = `#${m}/${s2}/${v}`;
    if (window.location.hash !== h) window.location.hash = h;
    remember(m, s2, v);
    setRoute({ m, s: s2, v });
  };
  const setView = (v: string) => goto(mod, scope, v);

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const [pending, setPending] = useState(0);
  const [canVerify, setCanVerify] = useState(false);
  const [meErr, setMeErr] = useState("");
  const [toCheck, setToCheck] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setMe(null); return; }
    supabase.from("employees").select("*, branches(name), teams(name)")
      .eq("auth_user_id", session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("employee lookup failed:", error);
        setMe(data || null);
        setMeErr(error ? error.message : "");
      });
  }, [session]);

  useEffect(() => {
    if (!me) return;
    supabase.rpc("should_verify").then(async ({ data }) => {
      setCanVerify(!!data);
      if (data) {
        const q = await supabase.rpc("verification_queue", {});
        setToCheck((q.data || []).filter((r: any) => !r.status).length);
      }
    });
  }, [me]);

  useEffect(() => {
    if (!me || !["manager", "admin"].includes(me.role)) return;
    (async () => {
      const [l, r] = await Promise.all([
        supabase.from("leaves").select("id, employee_id").eq("status", "Pending"),
        supabase.from("regularizations").select("id, employee_id").eq("status", "Pending"),
      ]);
      const j = await supabase.rpc("pending_registrations");
      setPending([...(l.data || []), ...(r.data || [])]
        .filter((x: any) => me.role === "admin" || x.employee_id !== me.id).length
        + (j.data || []).length);
    })();
  }, [me, mod]);

  const shell = (children: any) => (
    <div className="hjsatt" lang="en-GB"><style>{CSS}</style>{children}</div>
  );

  if (session === undefined) return shell(<div className="att-center att-muted">Loading…</div>);
  if (!session) return shell(<Login />);
  if (!me) return shell(<LinkAccount session={session} err={meErr} />);

  if (me.approval_status === "Pending") return shell(
    <div className="att-center">
      <div className="att-card" style={{ maxWidth: 420, textAlign: "center" }}>
        <div className="att-flex" style={{ justifyContent: "center", marginBottom: 12 }}>
          <Avatar name={me.full_name} lg />
        </div>
        <h2 className="att-h1">Waiting for approval</h2>
        <p className="att-muted" style={{ marginTop: 8 }}>
          Your account ({me.email}) has been created. An admin needs to approve it
          before you can check in. You'll be able to sign in with the same code once
          they do.
        </p>
        <button className="att-btn grey sm" style={{ marginTop: 16, width: "100%" }}
          onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </div>
  );

  if (me.approval_status === "Rejected") return shell(
    <div className="att-center">
      <div className="att-card" style={{ maxWidth: 420, textAlign: "center" }}>
        <h2 className="att-h1">Account not approved</h2>
        <p className="att-muted" style={{ marginTop: 8 }}>
          Please speak to your admin or HR.
        </p>
        <button className="att-btn grey sm" style={{ marginTop: 16, width: "100%" }}
          onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </div>
  );

  const approver = ["manager", "admin"].includes(me.role);
  // Muster roll aur payroll sirf admin / co-founder ko.
  // Baaki sabko sirf "My Reports".
  const topAdmin = me.role === "admin" || me.designation === "Co-Founder";
  const mods = MODULES.filter((m) => !m.approverOnly || approver)
    .map((m) => m.k === "reports" && !topAdmin
      ? { ...m, scopes: m.scopes.filter((sc) => sc.k === "mine") }
      : m);
  const curMod = mods.find((m) => m.k === mod) || mods[0];
  const rawScope = curMod.scopes.find((sc) => sc.k === scope) || curMod.scopes[0];
  // "Daily check" tab sirf un logon ko jinke paas verify karne ko hai
  const curScope = (curMod.k === "home" && rawScope.k === "myspace" && canVerify)
    ? { ...rawScope, views: [...rawScope.views, { k: "verify", label: "Daily check" }] }
    : rawScope;
  const curView = curScope.views.find((v) => v.k === view) || curScope.views[0];

  const goMod = (k: string) => {
    const m = mods.find((x) => x.k === k)!;
    goto(k, m.scopes[0].k, m.scopes[0].views[0].k);
  };
  const goScope = (k: string) => {
    const sc = curMod.scopes.find((x) => x.k === k)!;
    goto(mod, k, sc.views[0].k);
  };

  const key = `${curMod.k}/${curScope.k}/${curView.k}`;

  // hash adhoora ya galat ho to chup-chaap sahi kar do.
  // Ye hook NAHI hai — early returns ke baad hook nahi laga sakte.
  if (typeof window !== "undefined") {
    if (window.location.hash !== `#${key}`) {
      window.history.replaceState(null, "", `#${key}`);
    }
    remember(curMod.k, curScope.k, curView.k);
  }

  const body = () => {
    switch (key) {
      // ---- Home ----
      case "home/myspace/overview": return <HomeScreen me={me} />;
      case "home/myspace/calendar": return <CalendarTab me={me} />;
      case "home/myspace/verify":   return <VerifyPanel onCount={setToCheck} />;
      case "home/team/space":       return <div className="att-wrap att-stack"><TodayTab /></div>;
      case "home/team/dept":        return <div className="att-wrap att-stack"><DeptTab /></div>;
      case "home/team/peers":       return <div className="att-wrap att-stack"><PeersTab /></div>;
      case "home/org/list":         return <div className="att-wrap att-stack"><DirectoryTab me={me} /></div>;
      case "home/org/emptree":      return <div className="att-wrap att-stack"><EmpTreeTab /></div>;
      case "home/org/depttree":     return <div className="att-wrap att-stack"><OrgTab /></div>;
      case "home/org/deptdir":      return <div className="att-wrap att-stack"><DeptTab /></div>;
      case "home/org/people":       return <div className="att-wrap att-stack"><PeopleTab /></div>;
      case "home/org/notice":       return <div className="att-wrap att-stack"><NoticeTab me={me} /></div>;
      // ---- Attendance ----
      case "att/mydata/summary":    return <AttSummary me={me} />;
      case "att/mydata/calendar":   return <CalendarTab me={me} />;
      case "att/mydata/regs":       return <div className="att-wrap att-stack"><MyRegsTab me={me} /></div>;
      case "att/team/today":        return <div className="att-wrap att-stack"><TodayTab /></div>;
      case "att/team/leave":        return <div className="att-wrap att-stack"><OnLeaveTab /></div>;
      case "att/team/matrix":       return <div className="att-wrap att-stack"><MatrixTab me={me} /></div>;
      case "att/team/dash":         return <div className="att-wrap att-stack"><DashTab /></div>;
      // ---- Leave ----
      case "leave/mydata/summary":  return <LeavesScreen me={me} tab="summary" />;
      case "leave/mydata/requests": return <LeavesScreen me={me} tab="requests" />;
      case "leave/team/leaves":     return <div className="att-wrap att-stack"><TeamLeavesTab me={me} /></div>;
      case "leave/holidays/list":   return <div className="att-wrap att-stack"><HolidaysTab me={me} /></div>;
      // ---- Approvals ----
      case "approvals/pending/all":  return <InboxScreen me={me} onCount={setPending} mode="pending" />;
      case "approvals/history/all":  return <InboxScreen me={me} onCount={setPending} mode="history" />;
      case "approvals/joiners/all":  return <div className="att-wrap att-stack"><JoinersTab /></div>;
      case "approvals/setup/all":    return <div className="att-wrap att-stack"><NeedsSetupTab me={me} /></div>;
      case "me/me/profile":          return <MeScreen me={me} />;
      // ---- Reports ----
      case "reports/mine/me":       return <MyReportTab me={me} />;
      case "reports/att/muster":    return <div className="att-wrap att-stack"><ReportsTab /></div>;
      case "reports/att/payroll":   return <div className="att-wrap att-stack"><PayrollTab /></div>;
      case "reports/people/staff":  return <div className="att-wrap att-stack"><StaffTab me={me} /></div>;
      default:                      return <HomeScreen me={me} />;
    }
  };

  return shell(
    <PersonProvider me={me}>
      <nav className="att-rail">
        <div className="att-raillogo">HJS</div>
        {mods.map((m) => (
          <button key={m.k} className={`att-railbtn ${mod === m.k ? "on" : ""}`}
            onClick={() => goMod(m.k)}>
            <div className="ic"><Icon n={m.icon} c={mod === m.k ? "#ffffff" : "#cbd7ea"} /></div>
            <span>{m.label}</span>
            {m.k === "approvals" && pending > 0 && <span className="cnt">{pending}</span>}
          </button>
        ))}
      </nav>

      <div className="att-body">
        <header className="att-topbar">
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{curMod.label}</b>
            <span className="sub" style={{ display: "block", cursor: "pointer" }}>
              <PName code={me.emp_code}>{me.emp_code} · {me.full_name}</PName>
            </span>
          </div>
          <button className="att-signout" onClick={() => {
            try { localStorage.removeItem(NAV_KEY); } catch {}
            supabase.auth.signOut();
          }}>Sign out</button>
        </header>

        <div className="att-scope">
          {curMod.scopes.map((sc) => (
            <button key={sc.k} className={`att-scopebtn ${scope === sc.k ? "on" : ""}`}
              onClick={() => goScope(sc.k)}>
              {sc.label}
              {curMod.k === "approvals" && pending > 0 && <span className="cnt">{pending}</span>}
            </button>
          ))}
        </div>

        <div className="att-mtabs">
          {mods.map((m) => (
            <button key={m.k} className={`att-tab ${mod === m.k ? "on" : ""}`}
              onClick={() => goMod(m.k)}>
              {m.label}
              {m.k === "approvals" && pending > 0 && <span className="cnt">{pending}</span>}
            </button>
          ))}
        </div>

        {curScope.views.length > 1 && (
          <div className="att-subbar">
            {curScope.views.map((v) => (
              <button key={v.k} className={`att-tab ${curView.k === v.k ? "on" : ""}`}
                onClick={() => setView(v.k)}>
                {v.label}
                {v.k === "verify" && toCheck > 0 && <span className="cnt">{toCheck}</span>}
              </button>
            ))}
          </div>
        )}

        <main className="att-main">{body()}</main>
      </div>
    </PersonProvider>
  );
}
