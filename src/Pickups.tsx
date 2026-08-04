// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  Package,
  ClipboardCheck,
  Phone,
  Clock,
  MapPin,
  User,
  Search,
  Bell,
  LayoutDashboard,
  BarChart3,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  X,
  Check,
  IndianRupee,
  ShieldCheck,
  LogOut,
  Building2,
  Car,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Wind,
  BedDouble,
  Accessibility,
  Stethoscope,
  MessageSquareWarning,
  RefreshCw,
  CloudOff,
  Pencil,
  History,
  UserCog,
  Copy,
  Info,
  Trash2,
  Camera,
  Upload,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════
   1) CONFIG  ── url + ANON PUBLIC key (SERVICE_ROLE nahi). Khaali = DEMO.
   ══════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  url: 'https://idcmfebqizovivuvsuns.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY21mZWJxaXpvdml2dXZzdW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NDgxODgsImV4cCI6MjA5OTMyNDE4OH0.miXziOcl5sEo8S6K1WsrHRhCbtEYRgnnUA4gAISUkmM',
  table: 'pickups',
};
const CONFIGURED = !!(CONFIG.url && CONFIG.key);
const HDRS = () => ({
  apikey: CONFIG.key,
  Authorization: `Bearer ${CONFIG.key}`,
});

async function sbRpc(fn, body) {
  const res = await fetch(`${CONFIG.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { ...HDRS(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
// staff login — DB verifies password, returns [] if wrong
// Pickups ab delivery jaisa store-scoped hai — app_staff se verify hota hai.
async function sbLogin(store, pw) {
  return sbRpc('pickup_list_lite', { p_store: store, p_password: pw });
}
// staff data — returns rows for the store (or all for ALL). Password checked in DB.
async function sbList(store, pw) {
  // _lite = app_log ke bina (bada JSON). Timeline zarurat pe — dekho sbLogs().
  return sbRpc('pickup_list_lite', { p_store: store, p_password: pw });
}
// ── Sales pickup tracker (console ka CH tab) ────────────────────────
async function pkSalesMatrix(from, to, status) {
  return sbRpc('pickup_sales_matrix', {
    p_from: from,
    p_to: to,
    p_status: status || 'all',
  });
}
async function pkSalesList(sales, store, from, to, status) {
  return sbRpc('pickup_sales_list', {
    p_sales: sales || '',
    p_store: store || '',
    p_from: from,
    p_to: to,
    p_status: status || 'all',
  });
}
async function pkSalesSearch(qq) {
  return sbRpc('pickup_sales_search', { p_q: qq });
}
// usi invoice ki delivery (agar Supabase mein hai) — sales pickup detail pe
// upar collapsed line ke liye. Purane invoices ki delivery row hoti hi nahi,
// tab ye khaali aata hai aur kuch nahi dikhta.
async function pkDeliveryPeek(invoiceNumber) {
  return sbRpc('pickup_delivery_peek', { p_invoice: invoiceNumber });
}
// ek pickup ka timeline (app_log) — order kholne pe
async function pkSalesLog(invoiceNumber) {
  return sbRpc('pickup_sales_log', { p_invoice: invoiceNumber });
}
// sirf app_log — ek invoice ka (drawer) ya sabka (Activity log)
async function sbLogs(store, pw, invoice) {
  return sbRpc('pickup_logs', {
    p_store: store,
    p_password: pw,
    p_invoice: invoice || null,
  });
}
// staff update — stage move/edit. Password + store-scope checked in DB.
async function sbUpdate(store, pw, invoiceId, patch) {
  return sbRpc('pickup_update', {
    p_store: store,
    p_password: pw,
    p_invoice: invoiceId,
    p_patch: patch,
  });
}
// public customer tracking — link se invoice + customer ka registered phone
// NOTE: Supabase track_order RPC ab p_invoice + p_phone (poora number) le
async function sbTrack(invoice, phone) {
  return sbRpc('pickup_track', { p_invoice: invoice, p_phone: phone });
}
// sales team — sirf phone se us customer ki saari deliveries (latest→old).
// p_pin RPC mein verify hota hai — galat PIN pe RPC error deta hai.
// photo upload → Supabase Storage bucket 'pickup-photos'.
// naam: <invoiceNumber ke slashes ko - se>_<kind>_<timestamp>.jpg
// return: public URL (deliveries table mein save hota hai)
/* Phone ki photo 3-5 MB ki hoti hai — waise ki waise upload karne se storage
   aur egress dono udte hain. Upload se pehle canvas pe resize + JPEG compress
   kar dete hain (lambi side max 1600px). 3 MB → ~250 KB, dikhne mein farak
   nahi padta. Kuch galat ho jaye to original file hi chali jaati hai. */
async function shrinkImage(file, maxDim = 1600, quality = 0.7) {
  try {
    if (!file || !/^image\//.test(file.type || '')) return file;
    if (file.size < 300 * 1024) return file; // pehle se chhoti hai
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((res) =>
      canvas.toBlob(res, 'image/jpeg', quality),
    );
    if (!blob || blob.size >= file.size) return file; // faayda nahi to rehne do
    return blob;
  } catch (_) {
    return file;
  }
}
async function sbUploadPhoto(invoiceNumber, kind, file) {
  const safe = String(invoiceNumber || 'inv').replace(/[^a-zA-Z0-9]+/g, '-');
  const small = await shrinkImage(file);
  const shrunk = small !== file;
  const ext = shrunk
    ? 'jpg'
    : (file.name && file.name.split('.').pop()) || 'jpg';
  const path = `${safe}_${kind}_${Date.now()}.${ext}`.toLowerCase();
  const res = await fetch(
    `${CONFIG.url}/storage/v1/object/pickup-photos/${path}`,
    {
      method: 'POST',
      headers: {
        ...HDRS(),
        'Content-Type': shrunk ? 'image/jpeg' : file.type || 'image/jpeg',
        'x-upsert': 'true',
      },
      body: small,
    },
  );
  if (!res.ok) throw new Error(`upload ${res.status} ${await res.text()}`);
  return `${CONFIG.url}/storage/v1/object/public/pickup-photos/${path}`;
}

/* ══════════════════════════════════════════════════════════════════════ */
const T = {
  forest: '#14392B',
  forestSoft: '#1E5138',
  green: '#2E7D32',
  greenBright: '#3D9A42',
  mint: '#E7F0E8',
  beige: '#F5F1E8',
  cream: '#FBF9F4',
  card: '#FFFFFF',
  ink: '#1C2620',
  inkSoft: '#657069',
  line: '#E7E2D6',
  amber: '#C77D28',
  amberSoft: '#FBF0DE',
  blue: '#3E6B9E',
  blueSoft: '#E8EFF6',
  slate: '#64748B',
  slateSoft: '#EEF1F3',
  violet: '#6B5B9A',
  violetSoft: '#EEEAF7',
  red: '#B4472E',
  redSoft: '#F7E7E1',
};
const FONT = "'Plus Jakarta Sans','Inter',system-ui,-apple-system,sans-serif";

const BRANCH_NAMES = {
  MOH: 'Mohali Showroom',
  CHD: 'Head Office',
  GGN: 'Gurgaon',
  NCR: 'Delhi NCR',
  NOD: 'Noida Showroom',
  LDH: 'Ludhiana',
  JAL: 'Jalandhar',
  JPR: 'Jaipur',
  LKO: 'Lucknow',
  NWD: 'North West Delhi',
  JKP: 'Janakpuri',
};
const branchLabel = (code) => BRANCH_NAMES[code] || code;

/* Store managers (branch → name) */
const STORE_MANAGERS = {
  GGN: 'Hemant - 9773641804',
  CHD: 'Niranjan - 9811069030',
  NCR: 'Dharmendra Singh - 9315573166',
  LDH: 'Gursajan - 8360687306',
  JPR: 'Niraj Kumar - 8340710549',
  LKO: 'Mohd. Akhlaque - 7080809820',
  NWD: 'Nitin - 7007413101',
  NOD: 'Ravi Saini - 9759302924',
  JAL: 'Bhupinder - 8558892244',
  MOH: 'Sumita - 7814327703',
  JKP: 'Rajan - 8595353451',
};

/* Delivery persons store-wise. MOH shares CHD, NOD shares NCR. */
const DP = {
  CHD: [
    'Ghola Singh - 8360758647',
    'Sanjay - 6239650644',
    'Niranjan - 9811069030',
    'Vikas - 8433051048',
    'MBC',
  ],
  NCR: [
    'Shiva - 7303916944',
    'Sonu Sharma - 8447292843',
    'Gunjan Kumar - 7632972410',
    'Vikas Kumar Chauhan - 9650866938',
    'Dinesh - 9899755760',
    'Pradeep Kharwar - 9760629197',
    'Sikandar - 9821646171',
    'Gauri - 9871648466',
    'Arvind - 7210669844',
    'Abhishek - 9137544967',
    'MBC',
  ],
  GGN: [
    'Hemant - 9773641804',
    'Amit - 9934973249',
    'Arjun - 7042496461',
    'MBC',
  ],
  LDH: [
    'Gursajan - 8360687306',
    'Jagmeet - 8427278408',
    'Shubham Soni - 7681918859',
    'MBC',
  ],
  JAL: [
    'Bhupinder - 8558892244',
    'Karandeep - 9041285784',
    'Neeraj - 9056735883',
    'Jasmeet - 7696709951',
    'MBC',
  ],
  JPR: [
    'Mandeep - 9216854824',
    'Brijesh - 7742582403',
    'Niraj Kumar - 8340710549',
    'Shubham Sharma - 7891585998',
    'MBC',
  ],
  LKO: [
    'Aleem - 6306373637',
    'Sharique - 7525941591',
    'Junaid - 7905950247',
    'Mohd. Akhlaque - 7080809820',
    'MBC',
  ],
  NWD: [
    'Rahul Kumar - 8750245247',
    'Rahul - 9359521911',
    'Nitin Singh - 7007413101',
    'Karan Gupta - 7838465084',
    'Uday - 8595759588',
    'MBC',
  ],
  JKP: [
    'Monu - 8766395642',
    'Nitish - 9911814167',
    'Rajankumar Jha - 8595353451',
    'Anil - 8178680581',
    'MBC',
  ],
};
const DELIVERY_PERSONS = { ...DP, MOH: DP.CHD, NOD: DP.NCR };
const personsFor = (branch, current) => {
  const list = (DELIVERY_PERSONS[branch] || ['MBC']).slice();
  if (current && !list.includes(current)) list.unshift(current);
  return list;
};

const VEHICLES = ['Auto-Rikshaw', 'Bike', 'Champion', 'Porter', 'Other'];
const PAY_OPTIONS = [
  'Cash',
  'Cheque',
  'Nil',
  'QR',
  'Through Link',
  'Cash & Online (Both)',
];

/* ══════════════════════════════════════════════════════════════════════
   LOGIN  ── store dropdown se choose karo. Password store-wise 1001 se shuru
   hota hai aur aakhri store tak badhta hai. All stores (head) = 2222.
   ══════════════════════════════════════════════════════════════════════ */
const STORE_ORDER = [
  'MOH',
  'CHD',
  'GGN',
  'NCR',
  'NOD',
  'LDH',
  'JAL',
  'JPR',
  'LKO',
  'NWD',
  'JKP',
];
/* NOTE: passwords ab client mein NAHI hain — DB (app_staff) mein hain aur
   Supabase RPC verify karta hai. Ye sirf session object banata hai. */
function sessionFor(branch) {
  const isHead = branch === 'ALL';
  return {
    branch,
    authStore: branch,
    isHead,
    name: isHead ? 'All stores' : branchLabel(branch),
    storeName: isHead ? 'All stores' : branchLabel(branch),
  };
}

/* ── STAGES ────────────────────────────────────────────────────────────── */
const STAGES = [
  { id: 'new', label: 'New Pickup', short: 'New', status: 'New Pickup', color: T.slate, soft: T.slateSoft },
  { id: 'talked', label: 'Contacted', short: 'Contacted', status: 'Contacted', color: T.blue, soft: T.blueSoft },
  { id: 'scheduled', label: 'Pickup Scheduled', short: 'Scheduled', status: 'Pickup Scheduled', color: T.amber, soft: T.amberSoft },
  { id: 'dispatched', label: 'Out for Pickup', short: 'Out for Pickup', status: 'Out for Pickup', color: T.violet, soft: T.violetSoft },
  { id: 'delivered', label: 'Picked Up', short: 'Picked Up', status: 'Picked Up', color: T.green, soft: T.mint },
];
const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);

// peeche le jaate waqt: target stage ke AAGE wali stages ke saare fields null
const STAGE_COLS = {
  talked: { confirmed_date: null, confirmed_time: null, stage1_remarks: null },
  scheduled: { app_pickup_person: null, app_vehicle: null, stage2_remarks: null },
  dispatched: { app_eta: null, stage3_remarks: null },
  delivered: {
    item_inspected: false,
    pickup_image: null,
    actual_pickup_date: null,
    pickup_charges_collected: null,
    pickup_done: false,
    stage4_remarks: null,
  },
};
function clearAhead(toStage) {
  const t = stageIndex(toStage);
  let patch = {};
  STAGES.forEach((s, i) => {
    if (i > t && STAGE_COLS[s.id]) patch = { ...patch, ...STAGE_COLS[s.id] };
  });
  return patch;
}

/* ── Bhasha (EN / हिं) — sirf staff app ke stage naam + action buttons.
   Tracker hamesha English rehta hai. Choice localStorage mein yaad rehti hai. */
const HINDI = {
  new: { label: 'Nayi Pickup', short: 'Nayi' },
  talked: { label: 'Customer se baat hui', short: 'Baat hui' },
  scheduled: { label: 'Pickup schedule hui', short: 'Scheduled' },
  dispatched: { label: 'Pickup ke liye nikle', short: 'Nikle' },
  delivered: { label: 'Item utha liya', short: 'Utha liya' },
};
const HINDI_MOVE = {
  talked: 'Customer se baat karo',
  scheduled: 'Pickup schedule karo',
  dispatched: 'Pickup ke liye niklo',
  delivered: 'Item utha lo',
};
let HJS_LANG = 'en';
try {
  if (typeof localStorage !== 'undefined')
    HJS_LANG = localStorage.getItem('hjsLang') === 'hi' ? 'hi' : 'en';
} catch (_) {}
function setHjsLang(l) {
  HJS_LANG = l === 'hi' ? 'hi' : 'en';
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem('hjsLang', HJS_LANG);
  } catch (_) {}
}
// stage ka poora naam (Hindi on toggle; closed stages hamesha English)
function sLabel(id) {
  return HJS_LANG === 'hi' && HINDI[id] ? HINDI[id].label : stageMeta(id).label;
}
// stage ka chhota naam
function sShort(id) {
  return HJS_LANG === 'hi' && HINDI[id] ? HINDI[id].short : stageMeta(id).short;
}
// "Move to X" button text
function moveText(id) {
  if (HJS_LANG === 'hi' && HINDI_MOVE[id]) return HINDI_MOVE[id];
  const s = STAGES[stageIndex(id)];
  return `Move to ${s ? s.short : ''}`;
}
// timeline event ki line (Hindi on toggle)
function eventLine(ev) {
  if (HJS_LANG !== 'hi') return `${ev.action} ${ev.label}`;
  const label = HINDI[ev.stage] ? HINDI[ev.stage].label : ev.label;
  const verb =
    ev.action === 'Edited'
      ? 'edit kiya'
      : ev.action === 'Marked as'
        ? 'mark kiya'
        : 'pe pahuncha';
  return `${label} ${verb}`;
}
const stageToStatus = (id) =>
  (STAGES.find((s) => s.id === id) || {}).status || 'New Pickup';
function statusToStage(s) {
  const t = String(s || '').toLowerCase();
  if (t.includes('delet')) return 'deleted';
  if (t.includes('cancel')) return 'cancelled';
  // Rescheduled = abhi bhi pehli stage. NOTE: 'schedul' se PEHLE check zaroori,
  // warna "Rescheduled" galti se Pickup Scheduled ban jaata.
  if (t.includes('reschedul')) return 'new';
  if (t.includes('new')) return 'new';
  if (t.includes('schedul')) return 'scheduled';
  if (t.includes('out for')) return 'dispatched';
  if (t.includes('contact')) return 'talked';
  if (t.includes('picked')) return 'delivered';
  return 'new';
}

/* Sales pickup page delivery se copy hua hai jahan alag mapper tha —
   yahan statusToStage pehle se pickup statuses hi samajhta hai. */
const pickupStage = (st) => statusToStage(st);

/* ── CLOSED STATES ──────────────────────────────────────────────────────
   Cancelled / Duplicate / Renewal — teeno "closed" hain: active pipeline se
   hat jaati hain, apne color mein dikhti hain, aur drawer khol ke pata lag
   jaata hai. Status column mein hi likha jaata hai (koi naya column nahi). */
const CLOSED = {
  cancelled: {
    id: 'cancelled',
    label: 'Cancelled',
    short: 'Cancelled',
    color: T.red,
    soft: T.redSoft,
    title: 'This order has been cancelled',
    note: 'Zoho Books se cancel hua hai. Stages edit nahi ho sakti — bas record ke liye dikha rahe hain.',
    cust: 'This order has been cancelled. Please contact the store for any questions.',
  },
  duplicate: {
    id: 'duplicate',
    label: 'Duplicate Invoice',
    short: 'Duplicate',
    color: T.slate,
    soft: T.slateSoft,
    title: 'Marked as duplicate invoice',
    note: 'Store manager ne isse duplicate invoice mark kiya hai — active delivery list se hata diya gaya hai.',
    cust: 'This entry has been marked as a duplicate invoice. Please contact the store for any questions.',
  },
  renewal: {
    id: 'renewal',
    label: 'Renewal Invoice',
    short: 'Renewal',
    color: T.blue,
    soft: T.blueSoft,
    title: 'Marked as renewal invoice',
    note: 'Store manager ne isse renewal invoice mark kiya hai — active delivery list se hata diya gaya hai.',
    cust: 'This is a renewal invoice. Please contact the store for any questions.',
  },
  // deleted = soft delete. Row Supabase mein rehti hai (status="Deleted"),
  // par app ke saare views se hata di jaati hai (scoped filter mein).
  deleted: {
    id: 'deleted',
    label: 'Deleted',
    short: 'Deleted',
    color: T.slate,
    soft: T.slateSoft,
    title: 'This entry was deleted',
    note: 'Head ne isse delete kiya hai — Supabase mein record ke liye rakha gaya hai.',
    cust: 'This order is no longer active. Please contact the store for any questions.',
  },
};
const CLOSED_STATUS = {
  cancelled: 'Cancelled',
};
const isClosedStage = (s) => s === 'cancelled' || s === 'deleted';
/* Rescheduled — customer ne abhi date nahi di, baad mein baat hogi. Entry
   pehli stage mein hi pending rehti hai, bas tile pe alag dikhti hai. */
const RESCHED_STATUS = 'Rescheduled';
const isResched = (x) =>
  /reschedul/i.test(String((x && x.rawStatus) || ''));

/* ── Dashboard / Activity ke chhote helpers ──────────────────────────── */
const DASH_STORES = [
  'MOH','CHD','GGN','NCR','NOD','LDH','JAL','JPR','LKO','NWD','JKP',
];
function dayStr(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() {
  return dayStr(Date.now());
}
/* jis din ki pickup tay hui hai (confirmed_date) — future dated pakadne ko */
function plannedDate(x) {
  const r = (x && x._raw) || {};
  const v = r.confirmed_date || r.mentioned_pickup_date;
  return v && v !== 'null' ? String(v).slice(0, 10) : '';
}
/* stage id → meta (STAGES ya CLOSED dono cover). Card/list ke colors ke liye. */
function stageMeta(id) {
  const s = STAGES[stageIndex(id)];
  if (s) return s;
  if (CLOSED[id]) return CLOSED[id];
  return STAGES[0];
}
const stageColorOf = (id) => stageMeta(id).color;

/* Drawer mein agli stage ke liye simple prompt (next stage id → message) */
const STAGE_HINT = {
  new: 'Pickup shuru karo',
  talked: 'Customer se baat karke date tay karo',
  scheduled: 'Banda aur gaadi arrange karo',
  dispatched: 'Pickup ke liye nikle — ETA bharo',
  delivered: 'Item inspect karke utha lo',
};

function deriveBranch(r) {
  if (r.store_code && String(r.store_code).trim() && r.store_code !== 'null')
    return String(r.store_code).trim().toUpperCase();
  if (r.branch_code && String(r.branch_code).trim() && r.branch_code !== 'null')
    return String(r.branch_code).trim().toUpperCase();
  if (r.invoice_number)
    return String(r.invoice_number).split('/')[0].trim().toUpperCase();
  return '—';
}
function clean(v) {
  return v !== null && v !== undefined && v !== 'null' && v !== ''
    ? String(v)
        .replace(/\s*\n+\s*/g, ', ')
        .trim()
    : '';
}
function equipmentText(r) {
  let li = r.line_items;
  // Supabase se line_items kabhi-kabhi JSON string aati hai — usko parse karo.
  // NOTE: naye project mein line_items jsonb hai; track RPC ::text cast karti
  // hai to wo "Oxymed..." (quotes ke saath) aati hai. '"' waali ko bhi parse
  // karo taaki quotes hat jaayein.
  if (typeof li === 'string') {
    const t = li.trim();
    if (t.startsWith('[') || t.startsWith('{') || t.startsWith('"')) {
      try {
        li = JSON.parse(t);
      } catch (_) {}
    }
  }
  if (Array.isArray(li)) {
    const names = li
      .map((x) => {
        if (typeof x === 'string') return x;
        if (x && x.name) {
          const q = Number(x.quantity) || 0;
          return q > 1 ? `${x.name} × ${q}` : x.name;
        }
        return '';
      })
      .filter(Boolean);
    if (names.length) return names.join(', ');
  } else if (typeof li === 'string' && li.trim() && li !== 'null') {
    return li;
  }
  if (r.item_name && r.item_name !== 'null') {
    const t = String(r.item_name)
      .split('|')
      .map((s) => s.split(' x')[0].trim())
      .filter(Boolean)
      .join(', ');
    if (t) return t;
  }
  return 'Equipment';
}
/* line_items ko array of item-names mein todo (track page ki bullet list) */
function equipmentList(r) {
  let li = r.line_items;
  if (typeof li === 'string') {
    const t = li.trim();
    if (t.startsWith('[') || t.startsWith('{') || t.startsWith('"')) {
      try {
        li = JSON.parse(t);
      } catch (_) {}
    }
  }
  if (Array.isArray(li)) {
    const names = li
      .map((x) => {
        if (typeof x === 'string') return x;
        if (x && x.name) {
          const q = Number(x.quantity) || 0;
          return q > 1 ? `${x.name} × ${q}` : x.name;
        }
        return '';
      })
      .filter(Boolean);
    if (names.length) return names;
  }
  if (typeof li === 'string' && li.trim() && li !== 'null') {
    return li
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (r.item_name && r.item_name !== 'null') {
    const parts = String(r.item_name)
      .split('|')
      .map((s) => s.split(' x')[0].trim())
      .filter(Boolean);
    if (parts.length) return parts;
  }
  return ['Equipment'];
}
function equipIcon(text) {
  const t = String(text || '').toLowerCase();
  if (t.includes('oxygen') || t.includes('concentrat')) return Wind;
  if (t.includes('bed')) return BedDouble;
  if (t.includes('wheel')) return Accessibility;
  if (t.includes('cpap') || t.includes('bipap')) return Stethoscope;
  return Package;
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
const show = (v) =>
  v !== null && v !== undefined && v !== '' && v !== 'null' ? String(v) : '—';

/* customer-friendly date/time */
function niceDate(d) {
  if (!d || d === 'null') return null;
  const x = new Date(d);
  if (isNaN(x)) return String(d);
  return x.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
function niceTime(t) {
  if (!t || t === 'null') return null;
  const parts = String(t).split(':');
  if (parts.length < 2) return String(t);
  let hh = parseInt(parts[0], 10);
  if (isNaN(hh)) return String(t);
  const ap = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${hh}:${parts[1]} ${ap}`;
}

/* datetime (YYYY-MM-DD HH:MM ya ...THH:MM) → "17 Jul 2026, 3:30 PM" */
function niceDateTime(v) {
  if (!v || v === 'null') return null;
  const t = String(v).replace(' ', 'T');
  const d = niceDate(t.slice(0, 10));
  const tm = niceTime(t.slice(11, 16));
  if (!d && !tm) return String(v);
  return [d, tm].filter(Boolean).join(', ');
}
/* poori date + 12-ghante ka time — "23 Jul 2026, 5:43 PM" */
function fmtFullDateTime(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d)) return String(ts);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
/* datetime-local input ke liye value: YYYY-MM-DDTHH:MM */
function toLocalInput(v) {
  if (!v || v === 'null') return '';
  return String(v).replace(' ', 'T').slice(0, 16);
}

/* app-controlled timeline: each move/edit logs an event with the fields entered */
function stageFields(toStage, f) {
  const rmk = f.remarks ? { Remarks: f.remarks } : {};
  if (toStage === 'new') return {};
  if (toStage === 'talked')
    return {
      Date: f.date ? niceDate(f.date) || f.date : '—',
      Time: f.time ? niceTime(f.time) || f.time : '—',
      ...rmk,
    };
  if (toStage === 'scheduled')
    return { Person: f.person || '—', Transport: f.vehicle || '—', ...rmk };
  if (toStage === 'dispatched')
    return {
      'Estimated arrival': f.eta
        ? niceTime(String(f.eta).slice(11, 16)) || f.eta
        : '—',
      ...rmk,
    };
  if (toStage === 'delivered')
    return {
      Inspected: f.inspected ? 'Yes' : 'No',
      Date: f.pickDate ? niceDate(f.pickDate) || f.pickDate : '—',
      Charges: `₹${f.charges || 0}`,
      'Pending collected': `₹${f.pendingCollected || 0}`,
      Done: f.done ? 'Yes' : 'No',
      ...rmk,
    };
  return {};
}
/* ── Kaun kar raha hai ─────────────────────────────────────────────────
   Har app_log event ke saath login ka store + us store ka manager stamp
   hota hai, taaki Activity log mein "kisne kiya" dikh sake. Koi naya
   Supabase column nahi — ye app_log ke JSON ke andar hi baith jaata hai. */
let ACTOR = { by: null, byName: null };
function setActor(session) {
  if (!session) {
    ACTOR = { by: null, byName: null };
    return;
  }
  const code = session.authStore || session.branch;
  ACTOR = {
    by: code,
    byName:
      code === 'ALL'
        ? 'Head office'
        : STORE_MANAGERS[code] || branchLabel(code),
  };
}
function actorStamp() {
  return { by: ACTOR.by || null, by_name: ACTOR.byName || null };
}
/* purani entries mein by/by_name nahi hoga — wahan honest "record nahi" */
function actorText(ev) {
  if (!ev) return 'Record nahi';
  const name = ev.by_name || ev.byName || '';
  const code = ev.by || '';
  if (!name && !code) return 'Record nahi (purana update)';
  if (code === 'ALL') return name || 'Head office';
  return name ? `${name} · ${branchLabel(code)}` : branchLabel(code);
}

function makeEvent(toStage, fields, mode) {
  return {
    ts: new Date().toISOString(),
    stage: toStage,
    label: (STAGES[stageIndex(toStage)] || {}).label || toStage,
    action: mode === 'edit' ? 'Edited' : 'Moved to',
    fields: stageFields(toStage, fields || {}),
    ...actorStamp(),
  };
}
function makeClosedEvent(flag, remarks) {
  return {
    ts: new Date().toISOString(),
    stage: flag,
    label: (CLOSED[flag] || {}).label || flag,
    action: 'Marked as',
    fields: remarks ? { Remarks: remarks } : {},
    ...actorStamp(),
  };
}
const existingLog = (d) =>
  d && d._raw && Array.isArray(d._raw.app_log) ? d._raw.app_log : [];

/* cancelled order: cancel hone se theek pehle jo aakhri (latest) stage set thi.
   NOTE: max NAHI lete — app_log mein aage-peeche move ho sakta hai, isliye
   sabse last event hi asli "current" stage hai jab cancel hua. */
function reachedIdxFromLog(log) {
  if (Array.isArray(log) && log.length) {
    for (let i = log.length - 1; i >= 0; i--) {
      const si = stageIndex(log[i] && log[i].stage);
      if (si >= 0) return si;
    }
  }
  return 0; // koi log nahi → New
}

/* ── Today vs Archived ─────────────────────────────────────────────────
   Today = sirf aaj create hui entries (kisi bhi stage). Archived = sab.   */
function isToday(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  if (isNaN(d)) return false;
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}
/* Supabase created time — row jab create hui. Agar tumhare table mein column
   ka naam alag ho (e.g. created_time), ye list usko bhi cover karti hai. */
function createdTs(x) {
  const r = (x && x._raw) || {};
  return (
    r.created_at ||
    r.created_time ||
    r.inserted_at ||
    r.synced_at ||
    x.synced_at ||
    r.updated_at ||
    null
  );
}
/* delivery kab hui — app_log ke aakhri 'delivered' event se. Fallback updated_at */
function deliveredTs(x) {
  const r = (x && x._raw) || {};
  const log = Array.isArray(r.app_log) ? r.app_log : [];
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i] && log[i].stage === 'delivered' && log[i].ts) return log[i].ts;
  }
  return r.updated_at || null;
}
function inView(x, viewMode, vFrom, vTo) {
  const st = x.stage;
  // pending = abhi kaam baaki
  const pending = st !== 'delivered' && !isClosedStage(st);
  if (viewMode === 'archived') {
    // Archived (all time) = ho-chuki entries: Delivered + Cancelled waghera
    return !pending;
  }
  if (viewMode === 'today') {
    // Today (kaam waala view):
    //   - saari pending (chahe purani ho)
    //   - jo aaj create hui
    //   - jo AAJ complete hui (purani entry bhi)
    return (
      pending ||
      isToday(createdTs(x)) ||
      (st === 'delivered' && isToday(deliveredTs(x)))
    );
  }
  // yesterday / month / custom — date range ke hisaab se: jo us duration mein
  // aayi ya us duration mein complete hui. Pending purani entries yahan nahi
  // aatin (wo Today mein dikhti hain).
  const [s, e] = viewBounds(viewMode, vFrom, vTo);
  const cd = dayStr(createdTs(x));
  const dd = st === 'delivered' ? dayStr(deliveredTs(x)) : '';
  return (cd && cd >= s && cd <= e) || (dd && dd >= s && dd <= e);
}
/* view dropdown ke liye [start, end] — dayStr/todayStr neeche define hain
   par hoisted functions hain, isliye yahan use kar sakte hain. */
/* dropdown ka chhota label — live chip mein dikhta hai */
function viewLabel(mode) {
  if (mode === 'archived') return 'Archived';
  if (mode === 'yesterday') return 'Yesterday';
  if (mode === 'month') return 'This month';
  if (mode === 'custom') return 'Custom';
  return 'Today';
}
function viewBounds(mode, vFrom, vTo) {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  if (mode === 'yesterday') {
    const y = new Date(t);
    y.setDate(y.getDate() - 1);
    return [dayStr(y), dayStr(y)];
  }
  if (mode === 'month') {
    const s = new Date(t.getFullYear(), t.getMonth(), 1);
    return [dayStr(s), dayStr(t)];
  }
  if (mode === 'custom') return [vFrom || dayStr(t), vTo || dayStr(t)];
  return [dayStr(t), dayStr(t)];
}

/* stat categories jinpe collapsible entries khulti hain.
   NOTE: "Total Pickups" ab yahan se hata diya — wo count Header ke
   "Today/Archived · Total deliveries · N" chip mein dikhta hai. Pending +
   Delivered + Cancelled se poori picture mil jaati hai.                 */
const CATS = [
  {
    id: 'pending',
    label: 'Pending',
    icon: Package,
    color: T.blue,
    soft: T.blueSoft,
    test: (x) =>
      !isClosedStage(x.stage) && x.stage !== 'delivered' && !isResched(x),
  },
  {
    id: 'delivered',
    label: 'Picked Up',
    icon: CheckCircle2,
    color: T.forestSoft,
    soft: T.mint,
    test: (x) => x.stage === 'delivered',
  },
  {
    id: 'resched',
    label: 'Rescheduled',
    icon: RotateCcw,
    color: T.amber,
    soft: T.amberSoft,
    test: (x) => isResched(x),
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    icon: AlertTriangle,
    color: T.red,
    soft: T.redSoft,
    test: (x) => x.stage === 'cancelled',
  },
];

function rowToDelivery(r) {
  const branch = deriveBranch(r);
  return {
    invoice_id: r.invoice_id,
    id: r.invoice_number || r.invoice_id,
    branch,
    manager: clean(r.store_manager) || STORE_MANAGERS[branch] || '—',
    customer: r.customer_name || '—',
    phone: clean(r.phone) || '—',
    area: clean(r.address) || '—',
    equipment: equipmentText(r),
    // Card / Drawer ka "Amount" = invoice ka total (Supabase se aata hai).
    // Pickup charges alag cheez hai — wo Picked Up stage pe khud bhare jaate
    // hain aur usi block mein dikhte hain. Khaali ho to blank, 0 nahi.
    amount:
      r.total_amount != null &&
      r.total_amount !== '' &&
      r.total_amount !== 'null'
        ? Number(r.total_amount)
        : null,
    // pending = invoice ka bacha hua balance (Books se aata hai). Card pe
    // yahi dikhta hai — wahi to uthana hai customer se.
    pending:
      r.pending_amount != null &&
      r.pending_amount !== '' &&
      r.pending_amount !== 'null'
        ? Number(r.pending_amount)
        : null,
    // Books se: security kis mode se li gayi thi (refund usi mode mein karna
    // hota hai) aur delivery pe amount kis mode se aaya tha. Sirf type.
    securityType: clean(r.security_type),
    securityAmount:
      r.security_amount != null &&
      r.security_amount !== '' &&
      r.security_amount !== 'null'
        ? Number(r.security_amount)
        : null,
    charges:
      r.pickup_charges_collected != null &&
      r.pickup_charges_collected !== '' &&
      r.pickup_charges_collected !== 'null'
        ? Number(r.pickup_charges_collected)
        : null,
    expected:
      r.confirmed_date && r.confirmed_date !== 'null'
        ? r.confirmed_date
        : r.mentioned_pickup_date && r.mentioned_pickup_date !== 'null'
          ? r.mentioned_pickup_date
          : '—',
    person: clean(r.app_pickup_person) || null,
    vehicle: clean(r.app_vehicle) || null,
    stage: statusToStage(r.status),
    rawStatus: r.status,
    synced_at: r.synced_at || r.updated_at,
    _raw: r,
  };
}

/* Demo data (jab key khaali ho) */
const DEMO = [
  demo(
    'MOH/25-26/041',
    'MOH',
    'Baldev Raj',
    '+9198150xxxxx',
    'Mohali',
    'Oxygen Concentrator',
    'Talked To Customer',
    3500,
    '2026-07-04',
  ),
  demo(
    'CHD/25-26/010',
    'CHD',
    'Anil Kapoor',
    '+9198140xxxxx',
    'Chandigarh',
    'CPAP',
    'Delivery Scheduled',
    4200,
    '2026-07-02',
  ),
  demo(
    'GGN/25-26/001',
    'GGN',
    'Ravi Menon',
    '+9198110xxxxx',
    'Gurgaon',
    'Hospital Bed',
    'Item Inspected',
    6000,
    '2026-07-05',
    'Hemant - 9773641804',
  ),
  demo(
    'NCR/25-26/007',
    'NCR',
    'Sunita Rao',
    '+9198220xxxxx',
    'Noida',
    'Wheelchair',
    'Item Delivered',
    1500,
    '2026-07-01',
    'Shiva - 7303916944',
  ),
];
function demo(inv, code, name, phone, city, equip, status, amt, due, person) {
  return rowToDelivery({
    invoice_id: inv,
    invoice_number: inv,
    store_code: code,
    customer_name: name,
    customer_phone: phone,
    city,
    line_items: equip,
    status,
    total_amount: amt,
    due_date: due,
    app_delivery_person: person || null,
    synced_at: new Date().toISOString(),
  });
}

/* mobile detection (behavior differs on phone vs laptop) */
function useIsMobile(bp = 760) {
  const q = `(max-width:${bp}px)`;
  const [m, setM] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(q).matches : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener
      ? mq.addEventListener('change', on)
      : mq.addListener(on);
    return () => {
      mq.removeEventListener
        ? mq.removeEventListener('change', on)
        : mq.removeListener(on);
    };
  }, [q]);
  return m;
}

/* iframe ke andar chal raha hai? (Zoho landing page embed) */
const EMBEDDED =
  typeof window !== 'undefined' && window.parent && window.parent !== window;

/* Embed mode: sirf ek class lagti hai (CSS ke liye). Height ab app khud
   nahi bhejta — iframe ko fixed 100vh di jaati hai aur app usko poora bharta
   hai, isliye na neeche white space aata hai na cut hota hai. */
function useEmbedFlag() {
  useEffect(() => {
    if (!EMBEDDED) return;
    document.documentElement.classList.add('hjs-embed');
  }, []);
}

/* ════════════════════════════════════════════════════════════════ APP */
export default function App({
  session: extSession = null,
  view = 'board',
  reloadKey = 0,
  openLogKey = 0,
  lang: extLang = null,
  search: extSearch = '',
  route = null,
  onResults = null,
  pickId = null,
  pickKey = 0,
}) {
  useEmbedFlag();
  // extSession aaye = delivery app ke andar embed ho raha hai. Tab na Login
  // screen, na apna Sidebar/Topbar — sirf board/dashboard render hota hai.
  const hosted = !!extSession;
  // console ka "Sales Pickup" tab — sirf matrix page, koi login nahi
  if (route === 'sales') return <PickupSalesPage />;
  // Tracking routes (Netlify SPA — query params + optional /track path):
  //   /track                → sales: number se saari deliveries + timeline
  //   /track?inv=CHD/...     → customer: single invoice (phone verify)
  //   ?inv=CHD/...           → customer (bina /track ke bhi chalega)
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isTrackPath = /\/track\/?$/.test(path);
  const inv = params.get('inv') || '';
  // ?order  → STATIC customer link (WhatsApp CTA button ke liye). Koi invoice
  // nahi chahiye — customer apna registered phone daale, uska latest order
  // ka timeline khul jaata hai. Isse har invoice ka alag link banane ki
  // zarurat khatam (Meta ke dynamic-URL suffix ka jhanjhat nahi).
  if (!hosted && inv) return <TrackPage invoice={inv} />;
  if (!hosted && (params.has('order') || params.has('my')))
    return <TrackPage invoice="" />;
  if (!hosted && (params.has('track') || params.has('sales') || isTrackPath))
    return <SalesTrackPage />;

  const [ownSession, setOwnSession] = useState(null);
  const session = hosted ? extSession : ownSession;
  const setSession = hosted ? () => {} : setOwnSession;
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [modal, setModal] = useState(null); // { invoiceId, toStage, mode }
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('today'); // today|yesterday|month|custom|archived
  const [vFrom, setVFrom] = useState(() => todayStr());
  const [vTo, setVTo] = useState(() => todayStr());
  const [layoutMode, setLayoutMode] = useState('board'); // board | categories
  const [lang, setLang] = useState(HJS_LANG); // en | hi (sirf re-render trigger)
  const [lastMove, setLastMove] = useState(null); // {stage, n} — mobile accordion jump
  const [ownPage, setOwnPage] = useState('pickups'); // pickups | dashboard
  // hosted mode mein page delivery app ka sidebar decide karta hai
  const page = hosted ? (view === 'dashboard' ? 'dashboard' : 'pickups') : ownPage;
  const setPage = hosted ? () => {} : setOwnPage;
  const [showLog, setShowLog] = useState(false); // activity log panel
  // hosted mode: head login store switch kar sake (session App ka hai,
  // isliye branch yahin local rakhte hain)
  const [viewBranch, setViewBranch] = useState(null);
  const jumpMobile = (toStage) => setLastMove({ stage: toStage, n: Date.now() });
  // kaun logged-in hai — har app_log event isi se stamp hota hai
  setActor(session);
  const switchLang = (l) => {
    setHjsLang(l);
    setLang(HJS_LANG);
  };
  // har store (aur head) → chosen layout. Default Stages (board), toggle se Categories.
  const effLayout = layoutMode;

  const ping = (m) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    if (!CONFIGURED) {
      setDeliveries(DEMO);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDeliveries(
        (await sbList(session.authStore, session.pw)).map(rowToDelivery),
      );
    } catch (e) {
      setError(e.message || 'Fetch failed');
    }
    setLoading(false);
  };
  useEffect(() => {
    if (session) load(); /* eslint-disable-next-line */
  }, [session]);
  // hosted mode: delivery app ka EN/Hing toggle yahan bhi lag jaaye
  useEffect(() => {
    if (!extLang) return;
    setHjsLang(extLang);
    setLang(HJS_LANG);
  }, [extLang]);
  // hosted mode: topbar ka Activity log button
  const firstLogKey = React.useRef(true);
  useEffect(() => {
    if (firstLogKey.current) {
      firstLogKey.current = false;
      return;
    }
    setShowLog(true);
  }, [openLogKey]);
  // hosted mode: delivery app ka refresh button dabane pe reloadKey badhta hai
  const firstReload = React.useRef(true);
  useEffect(() => {
    if (firstReload.current) {
      firstReload.current = false;
      return;
    }
    if (session) {
      setLogsLoaded(false);
      load();
    } /* eslint-disable-next-line */
  }, [reloadKey]);

  const scoped = useMemo(() => {
    if (!session) return [];
    // Deleted (soft-deleted) entries app ke kisi bhi view mein nahi aati —
    // par Supabase mein status="Deleted" ke saath row bani rehti hai.
    const base = deliveries.filter((x) => x.stage !== 'deleted');
    const br = viewBranch || session.branch;
    if (br === 'ALL') return base;
    return base.filter((x) => x.branch === br);
  }, [deliveries, session, viewBranch]);

  // Activity log ke liye alag scope — deleted entries bhi chahiye
  const scopedAll = useMemo(() => {
    if (!session) return [];
    if (session.branch === 'ALL') return deliveries;
    return deliveries.filter((x) => x.branch === session.branch);
  }, [deliveries, session]);

  // hosted mode mein topbar ka search seedha board ko filter karta hai
  // (dropdown delivery app ka hai, wo sirf deliveries dikhata hai)
  const hostSearch = hosted ? String(extSearch || '').trim().toLowerCase() : '';

  // Board hamesha today/archived ke hisaab se — search se affect NAHI hota
  const viewItems = useMemo(
    () => scoped.filter((x) => inView(x, viewMode, vFrom, vTo)),
    [scoped, viewMode, vFrom, vTo],
  );

  // hosted: topbar ke dropdown ke liye results upar bhejte hain (delivery
  // app jaisa hi — poori list mein match, top 8)
  useEffect(() => {
    if (!hosted || !onResults) return;
    if (!hostSearch) {
      onResults([]);
      return;
    }
    onResults(
      scoped
        .filter((x) =>
          `${x.customer} ${x.id} ${x.area} ${x.phone}`
            .toLowerCase()
            .includes(hostSearch),
        )
        .slice(0, 8)
        .map((x) => {
          const closed = isClosedStage(x.stage);
          const fresh = isToday(createdTs(x));
          return {
            key: x.invoice_id,
            id: x.invoice_id,
            name: x.customer,
            sub: `${x.id} · ${x.equipment}`,
            tag: closed ? stageMeta(x.stage).short : fresh ? 'Today' : 'Archived',
            tagKind: closed ? 'cancel' : fresh ? 'today' : 'arch',
            closed,
          };
        }),
    );
    // eslint-disable-next-line
  }, [hostSearch, scoped, hosted]);

  // topbar dropdown se koi result chuna gaya
  useEffect(() => {
    // pickKey har click pe badalta hai — wahi entry dobara chunne pe bhi khule
    if (pickId) setActiveId(pickId);
    // eslint-disable-next-line
  }, [pickKey]);

  // Search = alag dropdown (Bigin jaisa) — poori list mein match (today + archived), top 8
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return scoped
      .filter(
        (x) =>
          x.customer.toLowerCase().includes(q) ||
          String(x.id).toLowerCase().includes(q) ||
          x.area.toLowerCase().includes(q) ||
          String(x.phone).toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [scoped, search]);

  const active = deliveries.find((x) => x.invoice_id === activeId) || null;

  // ── Egress bachane ke liye ──────────────────────────────────────────
  // Pehle har save ke baad poori list dobara Supabase se aati thi. Ab sirf
  // usi row ko local state mein patch kar dete hain — result wahi dikhta hai,
  // par ek save = ek chhoti update call (poora table nahi).
  // ── Timeline (app_log) on-demand — list ab uske bina aati hai ──────
  const [logsLoaded, setLogsLoaded] = useState(false);
  const mergeLogs = (rows) => {
    const map = {};
    (rows || []).forEach((r) => {
      map[r.invoice_id] = r.app_log;
    });
    setDeliveries((prev) =>
      prev.map((x) =>
        map[x.invoice_id] !== undefined
          ? rowToDelivery({ ...x._raw, app_log: map[x.invoice_id] })
          : x,
      ),
    );
  };
  const loadLogs = async (invoice) => {
    if (!CONFIGURED || !session) return;
    try {
      mergeLogs(await sbLogs(session.authStore, session.pw, invoice || null));
      if (!invoice) setLogsLoaded(true);
    } catch (_) {}
  };
  useEffect(() => {
    if (!activeId) return;
    const row = deliveries.find((x) => x.invoice_id === activeId);
    if (row && row._raw && row._raw.app_log === undefined) loadLogs(activeId);
    // eslint-disable-next-line
  }, [activeId]);
  useEffect(() => {
    if (showLog && !logsLoaded) loadLogs(null);
    // eslint-disable-next-line
  }, [showLog]);

  const applyLocal = (id, patch) => {
    setDeliveries((prev) =>
      prev.map((x) =>
        x.invoice_id === id ? rowToDelivery({ ...x._raw, ...patch }) : x,
      ),
    );
  };

  const buildPatch = (toStage, f, mode) => {
    const patch = { updated_at: new Date().toISOString() };
    if (mode === 'move') patch.status = stageToStatus(toStage);
    if (toStage === 'talked') {
      patch.confirmed_date = f.date || null;
      patch.confirmed_time = f.time || null;
      patch.stage1_remarks = f.remarks || null;
    } else if (toStage === 'scheduled') {
      patch.app_pickup_person = f.person || null;
      patch.app_vehicle = f.vehicle || null;
      patch.stage2_remarks = f.remarks || null;
    } else if (toStage === 'dispatched') {
      patch.app_eta = f.eta || null;
      patch.stage3_remarks = f.remarks || null;
    } else if (toStage === 'delivered') {
      patch.item_inspected = !!f.inspected;
      patch.pickup_image = f.photoPicked || null;
      patch.actual_pickup_date = f.pickDate || null;
      patch.pickup_charges_collected =
        f.charges === '' || f.charges == null ? null : Number(f.charges);
      patch.pending_collected =
        f.pendingCollected === '' || f.pendingCollected == null
          ? null
          : Number(f.pendingCollected);
      patch.pickup_done = !!f.done;
      patch.stage4_remarks = f.remarks || null;
    }
    return patch;
  };

  // closed mark (cancelled/duplicate/renewal) — status column mein likha jaata hai
  const closeEntry = async (invoiceId, flag, remarks) => {
    const cur = deliveries.find((x) => x.invoice_id === invoiceId);
    const patch = {
      status: CLOSED_STATUS[flag],
      updated_at: new Date().toISOString(),
      app_log: [...existingLog(cur), makeClosedEvent(flag, remarks)],
    };
    if (!CONFIGURED) {
      setDeliveries((prev) =>
        prev.map((x) =>
          x.invoice_id === invoiceId
            ? { ...x, stage: flag, rawStatus: patch.status }
            : x,
        ),
      );
      ping(`Demo — ${CLOSED[flag].label}`);
      return;
    }
    try {
      await sbUpdate(session.authStore, session.pw, invoiceId, patch);
      ping(`Marked as ${CLOSED[flag].label}`);
      applyLocal(invoiceId, patch);
    } catch (e) {
      ping('Save failed: ' + e.message);
    }
  };

  // core move/edit apply — modal aur inline card dono use karte hain
  // Reschedule — entry pehli stage mein hi rehti hai, bas status "Rescheduled"
  // ho jaata hai aur pehle se bhari confirmed date/time hat jaati hai.
  const rescheduleEntry = async (invoiceId, remarks) => {
    const cur = deliveries.find((x) => x.invoice_id === invoiceId);
    const patch = {
      status: RESCHED_STATUS,
      confirmed_date: null,
      confirmed_time: null,
      stage1_remarks: remarks || null,
      updated_at: new Date().toISOString(),
      app_log: [
        ...existingLog(cur),
        {
          ts: new Date().toISOString(),
          stage: 'new',
          label: 'Rescheduled',
          action: 'Marked as',
          fields: remarks ? { Remarks: remarks } : {},
          ...actorStamp(),
        },
      ],
    };
    if (!CONFIGURED) {
      ping('Demo mode — save nahi hua');
      return;
    }
    try {
      await sbUpdate(session.authStore, session.pw, invoiceId, patch);
      ping('Rescheduled ✓ — entry pending mein hi hai');
      jumpMobile('new');
      applyLocal(invoiceId, patch);
    } catch (e) {
      ping('Save failed: ' + e.message);
    }
  };

  const applyMove = async (invoiceId, toStage, fields, mode) => {
    // pehli stage ka dropdown: reschedule / cancel alag raaste
    if (toStage === 'talked' && mode === 'move') {
      if (fields.flow === 'cancelled')
        return closeEntry(invoiceId, 'cancelled', fields.remarks);
      if (fields.flow === 'resched')
        return rescheduleEntry(invoiceId, fields.remarks);
    }
    const patch = buildPatch(toStage, fields, mode);
    const cur = deliveries.find((x) => x.invoice_id === invoiceId);
    patch.app_log = [...existingLog(cur), makeEvent(toStage, fields, mode)];
    if (!CONFIGURED) {
      ping('Demo mode — save nahi hua');
      return;
    }
    try {
      await sbUpdate(session.authStore, session.pw, invoiceId, patch);
      ping(
        mode === 'edit'
          ? 'Updated ✓'
          : `Saved ✓  ${STAGES[stageIndex(toStage)].label}`,
      );
      if (mode === 'move') jumpMobile(toStage);
      applyLocal(invoiceId, patch);
    } catch (e) {
      ping('Save failed: ' + e.message);
    }
  };

  const commitModal = async (fields) => {
    const { invoiceId, toStage, mode } = modal;
    setModal(null);
    await applyMove(invoiceId, toStage, fields, mode);
  };

  // direct backward move (no form)
  const setStage = async (invoiceId, toStage) => {
    const cur = deliveries.find((x) => x.invoice_id === invoiceId);
    const goingBack =
      cur && stageIndex(toStage) < stageIndex(cur.stage || 'new');
    if (goingBack) {
      const ok =
        typeof window === 'undefined'
          ? true
          : window.confirm(
              `Entry ko "${STAGES[stageIndex(toStage)].label}" pe wapas le jaayein?\n\nAage ki bhari hui details (person, photo, amount waghera) hat jaayengi — baad mein dobara bharni hongi.`,
            );
      if (!ok) return;
    }
    const patch = {
      status: stageToStatus(toStage),
      updated_at: new Date().toISOString(),
      app_log: [...existingLog(cur), makeEvent(toStage, {}, 'move')],
    };
    if (goingBack) Object.assign(patch, clearAhead(toStage));
    if (!CONFIGURED) {
      setDeliveries((prev) =>
        prev.map((x) =>
          x.invoice_id === invoiceId
            ? { ...x, stage: toStage, rawStatus: patch.status }
            : x,
        ),
      );
      ping('Demo mode — save nahi hua');
      return;
    }
    try {
      await sbUpdate(session.authStore, session.pw, invoiceId, patch);
      ping(`Moved to ${STAGES[stageIndex(toStage)].label}`);
      jumpMobile(toStage);
      applyLocal(invoiceId, patch);
    } catch (e) {
      ping('Save failed: ' + e.message);
    }
  };

  // delete — sirf head. HARD delete NAHI: row Supabase mein rehti hai,
  // bas status="Deleted" ho jaata hai aur app ke views se hat jaati hai.
  const removeEntry = async (invoiceId) => {
    const cur = deliveries.find((x) => x.invoice_id === invoiceId);
    const patch = {
      status: 'Deleted',
      updated_at: new Date().toISOString(),
      app_log: [
        ...existingLog(cur),
        {
          ts: new Date().toISOString(),
          stage: 'deleted',
          label: 'Deleted',
          action: 'Marked as',
          fields: {},
          ...actorStamp(),
        },
      ],
    };
    if (!CONFIGURED) {
      setDeliveries((prev) =>
        prev.map((x) =>
          x.invoice_id === invoiceId
            ? { ...x, stage: 'deleted', rawStatus: 'Deleted' }
            : x,
        ),
      );
      setActiveId(null);
      ping('Deleted (demo)');
      return;
    }
    try {
      await sbUpdate(session.authStore, session.pw, invoiceId, patch);
      setActiveId(null);
      ping('Deleted — Supabase mein "Deleted" mark ho gaya');
      applyLocal(invoiceId, patch);
    } catch (e) {
      ping('Delete failed: ' + e.message);
    }
  };

  if (!session) return <Login onLogin={setSession} />;

  // ── HOSTED: delivery app ke <main> ke andar — sirf content, koi chrome nahi
  if (hosted) {
    return (
      <div className="hjs-pickups">
        <StyleTag />
        {page === 'dashboard' ? (
          <Dashboard
            deliveries={scoped}
            onOpen={(x) => setActiveId(x.invoice_id)}
          />
        ) : (
          <>
            <Header
              session={session}
              live={CONFIGURED}
              count={viewItems.length}
              viewMode={viewMode}
              onViewMode={setViewMode}
            vFrom={vFrom}
            vTo={vTo}
            onVFrom={setVFrom}
            onVTo={setVTo}
              vFrom={vFrom}
              vTo={vTo}
              onVFrom={setVFrom}
              onVTo={setVTo}
              layoutMode={layoutMode}
              onLayoutMode={setLayoutMode}
              onSwitchStore={(b) => setViewBranch(b)}
              branchView={viewBranch || session.branch}
            />
            {error && (
              <div className="err">
                <CloudOff size={18} color={T.red} />
                <div>
                  <b>Supabase se connect nahi hua.</b> {error}
                </div>
              </div>
            )}
            <EntriesView
              items={viewItems}
              viewMode={viewMode}
              layoutMode={layoutMode}
              loading={loading}
              onOpen={(x) => setActiveId(x.invoice_id)}
              onMove={(x, toStage) =>
                setModal({ invoiceId: x.invoice_id, toStage, mode: 'move' })
              }
              onCommit={(dd, toStage, fields) =>
                applyMove(dd.invoice_id, toStage, fields, 'move')
              }
              focus={lastMove}
            />
          </>
        )}
        {active && (
          <Drawer
            d={active}
            canDelete={session.isHead}
            onDelete={() => removeEntry(active.invoice_id)}
            onClose={() => setActiveId(null)}
            onAdvance={(toStage) =>
              setModal({ invoiceId: active.invoice_id, toStage, mode: 'move' })
            }
            onSetStage={(toStage) => setStage(active.invoice_id, toStage)}
            onEditStage={(sid) =>
              setModal({
                invoiceId: active.invoice_id,
                toStage: sid,
                mode: 'edit',
              })
            }
          />
        )}
        {modal && (
          <StageModal
            delivery={deliveries.find((x) => x.invoice_id === modal.invoiceId)}
            toStage={modal.toStage}
            mode={modal.mode}
            onClose={() => setModal(null)}
            onSave={commitModal}
          />
        )}
        {showLog && (
          <ActivityLog
            deliveries={scopedAll}
            session={session}
            onClose={() => setShowLog(false)}
            onOpen={(x) => {
              setShowLog(false);
              setActiveId(x.invoice_id);
            }}
          />
        )}
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  return (
    <div
      className="hjs-pickups"
      style={{
        fontFamily: FONT,
        background: T.beige,
        minHeight: '100vh',
        color: T.ink,
      }}
    >
      <StyleTag />
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar
          session={session}
          page={session.branch === 'ALL' ? page : 'pickups'}
          onNav={setPage}
        />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Topbar
            session={session}
            page={session.branch === 'ALL' ? page : 'pickups'}
            onNav={setPage}
            search={search}
            setSearch={setSearch}
            results={searchResults}
            onPick={(x) => {
              setActiveId(x.invoice_id);
              setSearch('');
            }}
            onReload={load}
            loading={loading}
            onLogout={() => setSession(null)}
            onActivity={() => setShowLog(true)}
            lang={lang}
            onLang={switchLang}
          />
          <main style={{ padding: '26px 30px 60px', flex: 1 }}>
            {session.branch === 'ALL' && page === 'dashboard' ? (
              <Dashboard
                deliveries={scoped}
                onOpen={(x) => setActiveId(x.invoice_id)}
              />
            ) : (
              <>
            <Header
              session={session}
              live={CONFIGURED}
              count={viewItems.length}
              viewMode={viewMode}
              onViewMode={setViewMode}
            vFrom={vFrom}
            vTo={vTo}
            onVFrom={setVFrom}
            onVTo={setVTo}
              vFrom={vFrom}
              vTo={vTo}
              onVFrom={setVFrom}
              onVTo={setVTo}
              layoutMode={layoutMode}
              onLayoutMode={setLayoutMode}
              onSwitchStore={(b) =>
                setSession((s) => ({
                  ...s,
                  branch: b,
                  storeName: b === 'ALL' ? 'All stores' : branchLabel(b),
                }))
              }
            />
            {error && (
              <div className="err">
                <CloudOff size={18} color={T.red} />
                <div>
                  <b>Supabase se connect nahi hua.</b> {error}
                  <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>
                    anon key + RLS SELECT policy check karo.
                  </div>
                </div>
              </div>
            )}
            <EntriesView
              items={viewItems}
              viewMode={viewMode}
              layoutMode={effLayout}
              loading={loading}
              onOpen={(x) => setActiveId(x.invoice_id)}
              onMove={(x, toStage) =>
                setModal({ invoiceId: x.invoice_id, toStage, mode: 'move' })
              }
              onCommit={(dd, toStage, fields) =>
                applyMove(dd.invoice_id, toStage, fields, 'move')
              }
              focus={lastMove}
            />
              </>
            )}
          </main>
        </div>
      </div>

      {active && (
        <Drawer
          d={active}
          canDelete={session.isHead}
          onDelete={() => removeEntry(active.invoice_id)}
          onClose={() => setActiveId(null)}
          onAdvance={(toStage) =>
            setModal({ invoiceId: active.invoice_id, toStage, mode: 'move' })
          }
          onSetStage={(toStage) => setStage(active.invoice_id, toStage)}
          onEditStage={(sid) =>
            setModal({
              invoiceId: active.invoice_id,
              toStage: sid,
              mode: 'edit',
            })
          }
        />
      )}
      {showLog && (
        <ActivityLog
          deliveries={scopedAll}
          session={session}
          onClose={() => setShowLog(false)}
          onOpen={(x) => {
            setShowLog(false);
            setActiveId(x.invoice_id);
          }}
        />
      )}
      {modal && (
        <StageModal
          delivery={deliveries.find((x) => x.invoice_id === modal.invoiceId)}
          toStage={modal.toStage}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSave={commitModal}
        />
      )}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ ENTRIES VIEW
   FIX: ye component missing tha isliye login ke baad screen crash ho rahi
   thi ("EntriesView is not defined"). Ab ye Stats + Board/MobileBoard +
   FooterTotal ko viewMode aur screen-size ke hisaab se jodta hai.        */
function EntriesView({
  items,
  viewMode,
  layoutMode,
  loading,
  onOpen,
  onMove,
  onCommit,
  focus,
}) {
  const isMobile = useIsMobile();
  const [drill, setDrill] = useState(null); // null | total|pending|delivered|cancelled

  // layout ya view badalte hi drill reset
  useEffect(() => {
    setDrill(null);
  }, [layoutMode, viewMode]);

  // drill khulne pe ek history entry push karo — phone/browser ka back button
  // drill band karega (logout NAHI karega).
  useEffect(() => {
    if (!drill || typeof window === 'undefined') return;
    window.history.pushState({ hjsDrill: drill }, '');
    const onPop = () => setDrill(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [drill]);

  const back = () => {
    if (
      typeof window !== 'undefined' &&
      window.history.state &&
      window.history.state.hjsDrill
    ) {
      window.history.back(); // popstate → setDrill(null)
    } else {
      setDrill(null);
    }
  };

  // Categories layout → collapsible stat categories
  if (layoutMode === 'categories') {
    return (
      <CategoriesView
        items={items}
        loading={loading}
        onOpen={onOpen}
        onMove={onMove}
        onCommit={onCommit}
      />
    );
  }

  // Kisi stat card pe click → us category ki entries + Back button
  if (drill) {
    return (
      <DrillView
        cat={drill}
        items={items}
        viewMode={viewMode}
        onBack={back}
        onOpen={onOpen}
        onMove={onMove}
        onCommit={onCommit}
      />
    );
  }

  // Board layout → stage-wise kanban. Archived mein sirf Delivered list.
  return (
    <>
      {!isMobile && (
        <Stats items={items} viewMode={viewMode} onDrill={setDrill} />
      )}
      {viewMode === 'archived' ? (
        <ArchivedList
          items={items}
          onOpen={onOpen}
          onMove={onMove}
          onCommit={onCommit}
        />
      ) : isMobile ? (
        <MobileBoard
          items={items}
          loading={loading}
          onOpen={onOpen}
          onMove={onMove}
          onCommit={onCommit}
          focus={focus}
        />
      ) : (
        <Board
          items={items}
          loading={loading}
          onOpen={onOpen}
          onMove={onMove}
          onCommit={onCommit}
        />
      )}
      {viewMode !== 'archived' && <FooterTotal items={items} />}
    </>
  );
}

/* stat card → kaunsi entries dikhani hain */
const STAT_CATS = {
  total: {
    label: 'Total Pickups',
    color: T.green,
    soft: T.mint,
    test: (x) => !isClosedStage(x.stage),
  },
  pending: {
    label: 'Pending',
    color: T.blue,
    soft: T.blueSoft,
    test: (x) => !isClosedStage(x.stage) && x.stage !== 'delivered',
  },
  delivered: {
    label: 'Picked Up',
    color: T.forestSoft,
    soft: T.mint,
    test: (x) => x.stage === 'delivered',
  },
  cancelled: {
    label: 'Cancelled',
    color: T.amber,
    soft: T.amberSoft,
    test: (x) => x.stage === 'cancelled',
  },
};

/* Stat card click → us category ki entries grid + Back to stages */
function DrillView({ cat, items, viewMode, onBack, onOpen, onMove, onCommit }) {
  const meta = STAT_CATS[cat] || STAT_CATS.total;
  // Archived mein "Total" = saari archived entries (delivered + cancelled etc.)
  const allArchived = cat === 'total' && viewMode === 'archived';
  const rows = items.filter(allArchived ? () => true : meta.test);
  const label = allArchived ? 'All archived' : meta.label;
  return (
    <div>
      <button className="track-back" onClick={onBack}>
        <ArrowLeft size={16} /> Back to stages
      </button>
      <div className="drill-head">
        <span
          className="col-pip"
          style={{ background: meta.color, width: 10, height: 10 }}
        />
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{label}</h3>
        <span
          className="col-count"
          style={{ background: meta.soft, color: meta.color }}
        >
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="empty">Koi entry nahi</div>
      ) : (
        <div className="cat-grid">
          {rows.map((x) => (
            <Card
              key={x.invoice_id}
              d={x}
              stage={stageMeta(x.stage)}
              onOpen={() => onOpen(x)}
              onMove={onMove}
              onCommit={onCommit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* Archived board → Delivered / Cancelled dropdown se choose karo. Dot ka
   color bhi badalta hai (green = delivered, red = cancelled). */
function ArchivedList({ items, onOpen, onMove, onCommit }) {
  const [mode, setMode] = useState('delivered');
  const meta =
    mode === 'cancelled'
      ? {
          label: 'Cancelled',
          color: T.red,
          soft: T.redSoft,
          test: (x) => x.stage === 'cancelled',
        }
      : {
          label: 'Picked Up',
          color: T.green,
          soft: T.mint,
          test: (x) => x.stage === 'delivered',
        };
  const rows = items.filter(meta.test);
  return (
    <div>
      <div className="drill-head">
        <span
          className="col-pip"
          style={{ background: meta.color, width: 10, height: 10 }}
        />
        <select
          className="arch-select"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="delivered">Picked Up</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span
          className="col-count"
          style={{ background: meta.soft, color: meta.color }}
        >
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="empty">Koi {meta.label.toLowerCase()} entry nahi</div>
      ) : (
        <div className="cat-grid">
          {rows.map((x) => (
            <Card
              key={x.invoice_id}
              d={x}
              stage={stageMeta(x.stage)}
              onOpen={() => onOpen(x)}
              onMove={onMove}
              onCommit={onCommit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ CATEGORIES VIEW
   Stat categories (Pending / Delivered / Cancelled / Renewal / Duplicate) —
   har card clickable + collapsible. Click karo to us category ki entries
   khulti hain. Ismein koi stage-wise board NAHI hota.                    */
function CategoriesView({ items, loading, onOpen, onMove, onCommit }) {
  const [open, setOpen] = useState('pending'); // default: Pending khula
  if (loading && items.length === 0)
    return <div className="loading">Pickups load ho rahe hain…</div>;
  return (
    <div className="cat-list">
      {CATS.map((c) => {
        const rows = items.filter(c.test);
        const isOpen = open === c.id;
        return (
          <section
            key={c.id}
            className="cat-sec"
            style={{ borderTopColor: c.color }}
          >
            <button
              className="cat-head"
              onClick={() => setOpen(isOpen ? null : c.id)}
            >
              <div className="cat-ico" style={{ background: c.soft }}>
                <c.icon size={20} color={c.color} />
              </div>
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 1 }}>
                  {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                </div>
              </div>
              <span
                className="col-count"
                style={{ background: c.soft, color: c.color }}
              >
                {rows.length}
              </span>
              <ChevronRight
                size={18}
                color={T.inkSoft}
                style={{
                  transform: isOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform .15s',
                }}
              />
            </button>
            {isOpen && (
              <div className="cat-body">
                {rows.length === 0 ? (
                  <div className="empty">Koi entry nahi</div>
                ) : (
                  <div className="cat-grid">
                    {rows.map((x) => {
                      const stg = stageMeta(x.stage);
                      return (
                        <Card
                          key={x.invoice_id}
                          d={x}
                          stage={stg}
                          onOpen={() => onOpen(x)}
                          onMove={onMove}
                          onCommit={onCommit}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ LOGIN */
/* ═══════════════════════════════════════════ DASHBOARD (all stores · MIS)
   Store-wise daily picture. Cards + table sab clickable → entries neeche
   table mein khulti hain. Sirf head login mein dikhta hai.              */
function Dashboard({ deliveries, onOpen }) {
  const [range, setRange] = useState('today'); // today|yesterday|7d|month|all|custom
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [store, setStore] = useState('ALL');
  const [sel, setSel] = useState(null);

  const bounds = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const mk = (d) => dayStr(d);
    if (range === 'today') return [mk(t), mk(t)];
    if (range === 'yesterday') {
      const y = new Date(t);
      y.setDate(y.getDate() - 1);
      return [mk(y), mk(y)];
    }
    if (range === '7d') {
      const s = new Date(t);
      s.setDate(s.getDate() - 6);
      return [mk(s), mk(t)];
    }
    if (range === 'month') {
      const s = new Date(t.getFullYear(), t.getMonth(), 1);
      return [mk(s), mk(t)];
    }
    if (range === 'custom') return [from, to];
    return ['0000-01-01', '9999-12-31'];
  }, [range, from, to]);

  // base = date range + store filter (entry kab aayi, uspe)
  const base = useMemo(() => {
    const [s, e] = bounds;
    return deliveries.filter((x) => {
      const cd = dayStr(createdTs(x));
      if (cd < s || cd > e) return false;
      if (store !== 'ALL' && x.branch !== store) return false;
      return true;
    });
  }, [deliveries, bounds, store]);

  const today = todayStr();
  const metric = {
    all: () => true,
    picked: (x) => x.stage === 'delivered',
    pending: (x) => x.stage !== 'delivered' && !isClosedStage(x.stage),
    future: (x) =>
      x.stage !== 'delivered' &&
      !isClosedStage(x.stage) &&
      plannedDate(x) &&
      plannedDate(x) > today,
    resched: (x) => isResched(x),
    nophoto: (x) =>
      x.stage === 'delivered' &&
      !(x._raw && x._raw.pickup_image && x._raw.pickup_image !== 'null'),
  };
  const stageMetric = {
    new: (x) => x.stage === 'new',
    talked: (x) => x.stage === 'talked',
    scheduled: (x) => x.stage === 'scheduled',
    dispatched: (x) => x.stage === 'dispatched',
    delivered: (x) => x.stage === 'delivered',
  };

  const cards = [
    { kind: 'all', label: 'Total', color: T.slate, soft: T.slateSoft },
    { kind: 'picked', label: 'Picked up', color: T.green, soft: T.mint },
    { kind: 'pending', label: 'Pending', color: T.blue, soft: T.blueSoft },
    { kind: 'future', label: 'Future dated', color: T.amber, soft: T.amberSoft },
    { kind: 'resched', label: 'Rescheduled', color: T.amber, soft: T.amberSoft },
    { kind: 'nophoto', label: 'Picked up · photo missing', color: T.violet, soft: T.violetSoft },
  ];

  const rows = useMemo(() => {
    if (!sel) return [];
    let list = base;
    if (sel.store) list = list.filter((x) => x.branch === sel.store);
    const fn = metric[sel.kind] || stageMetric[sel.kind] || (() => true);
    return list
      .filter(fn)
      .sort((a, b) => String(createdTs(b) || '').localeCompare(String(createdTs(a) || '')));
    // eslint-disable-next-line
  }, [base, sel]);

  const cnt = (fn, list) => list.filter(fn).length;
  const rangeLabel =
    range === 'today' ? 'Aaj'
    : range === 'yesterday' ? 'Kal'
    : range === '7d' ? 'Pichhle 7 din'
    : range === 'month' ? 'Is mahine'
    : range === 'all' ? 'Sabhi'
    : `${from} → ${to}`;

  // ── Kisi number pe click → poora view badal jaata hai: sirf us subset ki
  // list, upar Back button. Dobara dashboard pe aane ke liye Back dabao.
  if (sel) {
    return (
      <div>
        <button className="track-back" onClick={() => setSel(null)}>
          <ArrowLeft size={16} /> Back to dashboard
        </button>
        <div className="dash-block">
          <div className="dash-block-h">
            {rows.length} entries
            {sel.store ? ` · ${branchLabel(sel.store)}` : ''} ·{' '}
            {cards.find((c) => c.kind === sel.kind)?.label || sShort(sel.kind) || 'All'}
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Store</th>
                  <th>Equipment</th>
                  <th>Stage</th>
                  <th>Amount</th>
                  <th>Aayi</th>
                  <th>Pickup date</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="dash-empty">Koi entry nahi</td>
                  </tr>
                ) : (
                  rows.map((x) => {
                    const st = stageMeta(x.stage);
                    return (
                      <tr key={x.invoice_id} className="dash-row" onClick={() => onOpen(x)}>
                        <td>{x.id}</td>
                        <td>{x.customer}</td>
                        <td>{branchLabel(x.branch)}</td>
                        <td className="ellip" style={{ maxWidth: 200 }}>{x.equipment}</td>
                        <td>
                          <span className="dash-chip" style={{ background: st.soft, color: st.color }}>
                            {st.short}
                          </span>
                        </td>
                        <td>{x.amount != null ? `₹${x.amount.toLocaleString('en-IN')}` : '—'}</td>
                        <td>{niceDate(createdTs(x)) || '—'}</td>
                        <td>{niceDate(plannedDate(x)) || '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="dash-head">
        <div>
          <div className="dash-sub">All stores · Pickups MIS</div>
          <h2 style={{ margin: '2px 0 0' }}>Dashboard</h2>
        </div>
        <div className="dash-filters">
          <select className="dash-inp" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Aaj</option>
            <option value="yesterday">Kal</option>
            <option value="7d">Pichhle 7 din</option>
            <option value="month">Is mahine</option>
            <option value="all">Sabhi</option>
            <option value="custom">Custom</option>
          </select>
          {range === 'custom' && (
            <>
              <input className="dash-inp" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              <input className="dash-inp" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </>
          )}
          <select
            className="dash-inp"
            value={store}
            onChange={(e) => {
              setStore(e.target.value);
              setSel({ kind: 'all', store: null });
            }}
          >
            <option value="ALL">All stores</option>
            {DASH_STORES.map((s) => (
              <option key={s} value={s}>{branchLabel(s)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="dash-cards">
        {cards.map((c) => {
          const n = cnt(metric[c.kind], base);
          const on = !!sel && sel.kind === c.kind && !sel.store;
          return (
            <button
              key={c.kind}
              className={on ? 'dash-card on' : 'dash-card'}
              style={on ? { borderColor: c.color } : {}}
              onClick={() => setSel({ kind: c.kind, store: null })}
            >
              <div className="dash-card-ico" style={{ background: c.soft, color: c.color }}>
                <BarChart3 size={16} />
              </div>
              <div className="dash-card-n" style={{ color: n ? c.color : T.ink }}>{n}</div>
              <div className="dash-card-l">{c.label}</div>
            </button>
          );
        })}
      </div>

      <div className="dash-block">
        <div className="dash-block-h">Store-wise · {rangeLabel}</div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Total</th>
                <th>New</th>
                <th>Contacted</th>
                <th>Scheduled</th>
                <th>Out for Pickup</th>
                <th>Picked Up</th>
                <th>Pending</th>
                <th>Future</th>
              </tr>
            </thead>
            <tbody>
              {base.length === 0 ? (
                <tr>
                  <td colSpan={9} className="dash-empty">Is duration mein koi entry nahi</td>
                </tr>
              ) : (
                DASH_STORES.filter((st) => store === 'ALL' || store === st).map((st) => {
                  const list = base.filter((x) => x.branch === st);
                  if (list.length === 0) return null;
                  const has = (kind) => cnt(metric[kind] || stageMetric[kind], list) > 0;
                  return (
                    <tr key={st}>
                      <td className="dash-store">{branchLabel(st)}</td>
                      <td className="dash-td-click" onClick={() => setSel({ kind: 'all', store: st })}>
                        {list.length}
                      </td>
                      {['new', 'talked', 'scheduled', 'dispatched', 'delivered'].map((k) => (
                        <td
                          key={k}
                          className={has(k) ? 'dash-td-click' : 'dash-td-zero'}
                          onClick={() => has(k) && setSel({ kind: k, store: st })}
                        >
                          {cnt(stageMetric[k], list)}
                        </td>
                      ))}
                      {['pending', 'future'].map((k) => (
                        <td
                          key={k}
                          className={has(k) ? 'dash-td-click' : 'dash-td-zero'}
                          onClick={() => has(k) && setSel({ kind: k, store: st })}
                        >
                          {cnt(metric[k], list)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!pw.trim()) { setErr('Dev password daalo.'); return; }
    setBusy(true); setErr('');
    try {
      await sbLogin('ALL', pw.trim());
      onLogin({ ...sessionFor('ALL'), pw: pw.trim() });
    } catch (e) {
      setErr(/unauthorized/i.test(e.message || '') ? 'Galat password.' : 'Login error: ' + (e.message || 'unknown'));
      setBusy(false);
    }
  };
  return (
    <div style={{ fontFamily: FONT }} className="login-wrap">
      <StyleTag />
      <div className="login-hero">
        <div className="hero-glow" />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="brand">
            <div className="brand-badge"><RotateCcw size={22} color="#fff" /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: -0.3 }}>Healthy Jeena Sikho</div>
              <div style={{ fontSize: 12.5, opacity: 0.75 }}>Pickup Control</div>
            </div>
          </div>
          <h1 className="hero-h1">Har pickup,<br />ek hi jagah.</h1>
          <p className="hero-p">Zoho Books se aane wali har return — customer se baat se lekar item collect hone tak, store-wise, live from Supabase.</p>
          <div className="hero-chips">
            {['Oxygen', 'Hospital Bed', 'CPAP / BiPAP', 'Wheelchair'].map((c) => <span key={c} className="hero-chip">{c}</span>)}
          </div>
          <div className="hero-flow">
            {STAGES.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flow-dot"><span style={{ background: s.color }} className="flow-pip" />{s.short}</div>
                {i < STAGES.length - 1 && <ChevronRight size={15} opacity={0.5} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <div className="login-form">
        <div className="glass-card">
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} color={T.green} /> Dev access
            </div>
            <div style={{ fontSize: 13.5, color: T.inkSoft, marginTop: 4 }}>Internal WIP — dev password daalo.</div>
          </div>
          <Field label="Password">
            <input className="inp" type="password" placeholder="••••••" value={pw} autoFocus
              onChange={(e) => { setPw(e.target.value); setErr(''); }}
              onKeyDown={(e) => e.key === 'Enter' && go()} />
          </Field>
          {err && <div className="login-err">{err}</div>}
          <button className="btn-primary" style={{ width: '100%', marginTop: 4 }} disabled={!pw.trim() || busy} onClick={go}>
            {busy ? 'Checking…' : <>Enter <ArrowRight size={17} /></>}
          </button>
          <div style={{ textAlign: 'center', fontSize: 11.5, color: T.inkSoft, marginTop: 12, lineHeight: 1.6 }}>
            Live · Supabase connected<br />Sirf internal team ke liye
          </div>
        </div>
      </div>
    </div>
  );
}

/* SIDEBAR */
function Sidebar({ session, page, onNav }) {
  const isAll = session.branch === 'ALL';
  const nav = [
    {
      icon: LayoutDashboard,
      label: 'Deliveries',
      onClick: () => {
        window.location.href = window.location.origin + window.location.pathname;
      },
    },
    { id: 'pickups', icon: RotateCcw, label: 'Pickups' },
    ...(isAll ? [{ id: 'dashboard', icon: BarChart3, label: 'Dashboard' }] : []),
    { icon: MessageSquareWarning, label: 'Complaints', soon: true },
    { icon: ClipboardCheck, label: 'Reports', soon: true },
  ];
  const mgr = session.branch === 'ALL' ? null : STORE_MANAGERS[session.branch];
  return (
    <aside className="sidebar">
      <div className="brand" style={{ padding: '22px 20px 18px' }}>
        <div className="brand-badge">
          <Truck size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15.5, color: '#fff' }}>
            HJS Pickups
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)' }}>
            Control Panel · DEV
          </div>
        </div>
      </div>
      <nav style={{ padding: '8px 12px', flex: 1 }}>
        {nav.map((n) => (
          <div
            key={n.label}
            className="nav-item"
            onClick={() => {
              if (n.soon) return;
              if (n.onClick) return n.onClick();
              if (n.id && onNav) onNav(n.id);
            }}
            style={{
              background: n.id && page === n.id ? 'rgba(255,255,255,.12)' : 'transparent',
              color: n.id && page === n.id ? '#fff' : 'rgba(255,255,255,.62)',
              cursor: n.soon ? 'default' : 'pointer',
            }}
          >
            <n.icon size={18} />
            <span style={{ flex: 1 }}>{n.label}</span>
            {n.soon && <span className="soon">soon</span>}
          </div>
        ))}
      </nav>
      <div className="store-tag">
        <Building2 size={15} color={T.greenBright} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>
            {session.branch === 'ALL'
              ? 'All stores'
              : branchLabel(session.branch)}
          </div>
          <div
            className="ellip"
            style={{ fontSize: 10.5, color: 'rgba(255,255,255,.6)' }}
          >
            {mgr ? `Mgr: ${mgr}` : 'All stores'}
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════════ TOPBAR */
function Topbar({
  session,
  page,
  onNav,
  search,
  setSearch,
  results,
  onPick,
  onReload,
  onActivity,
  loading,
  onLogout,
  lang,
  onLang,
}) {
  return (
    <header className="topbar">
      <div className="tb-brand">
        <div
          className="brand-badge"
          style={{ width: 32, height: 32, borderRadius: 10 }}
        >
          <Truck size={17} color="#fff" />
        </div>
        <span>Healthy Jeena Sikho</span>
      </div>
      <div className="tb-search">
        <Search
          size={16}
          color={T.inkSoft}
          style={{ position: 'absolute', left: 14, top: 12 }}
        />
        <input
          className="topbar-search"
          placeholder="Search by customer, invoice, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.trim() && (
          <div className="search-dd">
            {!results || results.length === 0 ? (
              <div className="search-empty">Koi match nahi mila</div>
            ) : (
              results.map((x) => {
                const closed = isClosedStage(x.stage);
                const today = isToday(createdTs(x));
                const tagClass = closed
                  ? 'search-tag cancel'
                  : today
                    ? 'search-tag today'
                    : 'search-tag arch';
                const tagText = closed
                  ? stageMeta(x.stage).short
                  : today
                    ? 'Today'
                    : 'Archived';
                return (
                  <button
                    key={x.invoice_id}
                    className={
                      closed ? 'search-row is-cancelled' : 'search-row'
                    }
                    onClick={() => onPick(x)}
                  >
                    <div className="search-row-main">
                      <span className="ellip search-name">{x.customer}</span>
                      <span className={tagClass}>{tagText}</span>
                    </div>
                    <div className="ellip search-sub">
                      {x.amount != null
                        ? `₹${x.amount.toLocaleString('en-IN')} · `
                        : ''}
                      {x.equipment}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      {session.isHead && (
        <select
          className="page-switch"
          value={page}
          onChange={(e) => onNav && onNav(e.target.value)}
        >
          <option value="pickups">Pickups</option>
          <option value="dashboard">Dashboard</option>
        </select>
      )}
      <div className="tb-actions">
        <div className="lang-toggle">
          <button
            className={lang === 'en' ? 'lang-btn active' : 'lang-btn'}
            onClick={() => onLang && onLang('en')}
          >
            EN
          </button>
          <button
            className={lang === 'hi' ? 'lang-btn active' : 'lang-btn'}
            onClick={() => onLang && onLang('hi')}
          >
            Hing
          </button>
        </div>
        <button
          className="icon-btn"
          onClick={onActivity}
          title="Activity log — kisne kya update kiya"
        >
          <History size={17} color={T.ink} />
        </button>
        <button className="icon-btn" onClick={onReload} title="Reload">
          <RefreshCw
            size={17}
            color={T.ink}
            className={loading ? 'spin' : ''}
          />
        </button>
        <button className="icon-btn">
          <Bell size={18} color={T.ink} />
          <span className="dot" />
        </button>
        <div className="tb-user">
          <div className="avatar">
            {(session.name || 'M').slice(0, 1).toUpperCase()}
          </div>
          <div className="tb-user-text" style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{session.name}</div>
            <div style={{ fontSize: 11, color: T.inkSoft }}>
              {session.storeName}
            </div>
          </div>
        </div>
        <button className="icon-btn" onClick={onLogout} title="Logout">
          <LogOut size={17} color={T.ink} />
        </button>
      </div>
    </header>
  );
}

function Header({
  session,
  live,
  count,
  viewMode,
  onViewMode,
  vFrom,
  vTo,
  onVFrom,
  onVTo,
  layoutMode,
  onLayoutMode,
  onSwitchStore,
  branchView,
}) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const mgr = session.branch === 'ALL' ? null : STORE_MANAGERS[session.branch];
  return (
    <div
      style={{
        marginBottom: 22,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: T.inkSoft, fontWeight: 600 }}>
          {today}
        </div>
        <h2
          style={{
            fontSize: 25,
            fontWeight: 800,
            letterSpacing: -0.5,
            margin: '3px 0 0',
            color: T.ink,
          }}
        >
          {(branchView || session.branch) === 'ALL'
            ? 'All stores'
            : branchLabel(branchView || session.branch)}{' '}
          pickups
        </h2>
        {mgr && (
          <div
            style={{
              fontSize: 12.5,
              color: T.inkSoft,
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <UserCog size={13} /> Store manager:{' '}
            <b style={{ color: T.ink, fontWeight: 700 }}>{mgr}</b>
          </div>
        )}
      </div>
      <div
        className="hdr-controls"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Clock
            size={15}
            color={T.inkSoft}
            style={{ position: 'absolute', left: 12, top: 11 }}
          />
          <select
            className="store-switch"
            value={viewMode}
            onChange={(e) => onViewMode(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="month">This month</option>
            <option value="custom">Custom range</option>
            <option value="archived">Archived (all time)</option>
          </select>
        </div>
        {viewMode === 'custom' && (
          <div className="view-range">
            <input
              className="dash-inp"
              type="date"
              value={vFrom}
              max={vTo}
              onChange={(e) => onVFrom && onVFrom(e.target.value)}
            />
            <span className="mx-arrow">–</span>
            <input
              className="dash-inp"
              type="date"
              value={vTo}
              min={vFrom}
              onChange={(e) => onVTo && onVTo(e.target.value)}
            />
          </div>
        )}
        <div className="layout-toggle">
          <button
            className={layoutMode === 'board' ? 'lt-btn active' : 'lt-btn'}
            onClick={() => onLayoutMode('board')}
          >
            <LayoutDashboard size={14} /> Stages
          </button>
          <button
            className={
              layoutMode === 'categories' ? 'lt-btn active' : 'lt-btn'
            }
            onClick={() => onLayoutMode('categories')}
          >
            <Package size={14} /> Categories
          </button>
        </div>
        {session.isHead && (
          <div style={{ position: 'relative' }}>
            <Building2
              size={15}
              color={T.inkSoft}
              style={{ position: 'absolute', left: 12, top: 11 }}
            />
            <select
              className="store-switch"
              value={branchView || session.branch}
              onChange={(e) => onSwitchStore(e.target.value)}
            >
              <option value="ALL">All stores</option>
              {Object.keys(BRANCH_NAMES).map((c) => (
                <option key={c} value={c}>
                  {branchLabel(c)} ({c})
                </option>
              ))}
            </select>
          </div>
        )}
        <span
          className="live-chip"
          style={{
            background: live ? T.mint : T.amberSoft,
            color: live ? T.green : T.amber,
          }}
        >
          <span
            className="col-pip"
            style={{ background: live ? T.greenBright : T.amber }}
          />
          {live
            ? `${viewLabel(viewMode)} · Total Pickups · ${count}`
            : 'Demo data'}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ STATS */
function Stats({ items, viewMode, onDrill }) {
  const board = items.filter((x) => !isClosedStage(x.stage));
  const pending = board.filter((x) => x.stage !== 'delivered').length;
  const done = board.filter((x) => x.stage === 'delivered').length;
  const cancelled = items.filter((x) => x.stage === 'cancelled').length;
  const archived = viewMode === 'archived';
  const cards = archived
    ? [
        {
          id: 'total',
          label: 'Total Archived',
          value: items.length,
          icon: Truck,
          color: T.green,
          soft: T.mint,
        },
        {
          id: 'delivered',
          label: 'Picked Up',
          value: done,
          icon: CheckCircle2,
          color: T.forestSoft,
          soft: T.mint,
        },
        {
          id: 'cancelled',
          label: 'Cancelled',
          value: cancelled,
          icon: AlertTriangle,
          color: T.amber,
          soft: T.amberSoft,
        },
      ]
    : [
        {
          id: 'total',
          label: 'Total Pickups',
          value: board.length,
          icon: Truck,
          color: T.green,
          soft: T.mint,
        },
        {
          id: 'pending',
          label: 'Pending',
          value: pending,
          icon: Package,
          color: T.blue,
          soft: T.blueSoft,
        },
        {
          id: 'delivered',
          label: 'Picked Up',
          value: done,
          icon: CheckCircle2,
          color: T.forestSoft,
          soft: T.mint,
        },
        {
          id: 'cancelled',
          label: 'Cancelled',
          value: cancelled,
          icon: AlertTriangle,
          color: T.amber,
          soft: T.amberSoft,
        },
      ];
  return (
    <div className={archived ? 'stat-grid three' : 'stat-grid'}>
      {cards.map((c) => (
        <button
          key={c.label}
          className="stat-card"
          onClick={() => onDrill && onDrill(c.id)}
        >
          <div className="stat-ico" style={{ background: c.soft }}>
            <c.icon size={20} color={c.color} />
          </div>
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: -0.6,
                lineHeight: 1,
              }}
            >
              {c.value}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: T.inkSoft,
                marginTop: 5,
                fontWeight: 600,
              }}
            >
              {c.label}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ BOARD */
function Board({ items, loading, onOpen, onMove, onCommit }) {
  if (loading && items.length === 0)
    return (
      <div className="loading">Supabase se pickups load ho rahe hain…</div>
    );
  return (
    <div className="board">
      {STAGES.map((stage) => {
        const cards = items.filter((x) => x.stage === stage.id);
        return (
          <section key={stage.id} className="column">
            <div className="col-head">
              <span className="col-pip" style={{ background: stage.color }} />
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>
                {sLabel(stage.id)}
              </span>
              <span
                className="col-count"
                style={{ background: stage.soft, color: stage.color }}
              >
                {cards.length}
              </span>
            </div>
            <div className="col-body">
              {cards.length === 0 && (
                <div className="empty">Koi pickup nahi</div>
              )}
              {cards.map((x) => (
                <Card
                  key={x.invoice_id}
                  d={x}
                  stage={stage}
                  onOpen={() => onOpen(x)}
                  onMove={onMove}
                  onCommit={onCommit}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* Mobile: 4 stage tabs (accordion). Records tap karne pe hi khulte hain. */
function MobileBoard({ items, loading, onOpen, onMove, onCommit, focus }) {
  // Phone: sirf entry-waale stages dikhao. Accordion single-open.
  const active = STAGES.filter((s) => items.some((x) => x.stage === s.id));
  const activeIds = active.map((s) => s.id);
  const sig = activeIds.join(',');
  const [open, setOpen] = useState(activeIds[0] || null);
  const consumed = React.useRef(0);
  useEffect(() => {
    setOpen((prev) => {
      // abhi-abhi move hua → us DESTINATION stage ko kholo (chahe purane stage
      // mein aur entries bachi ho). Har move ek hi baar consume hota hai.
      if (
        focus &&
        focus.n !== consumed.current &&
        activeIds.includes(focus.stage)
      ) {
        consumed.current = focus.n;
        return focus.stage;
      }
      // khula stage mein abhi bhi entry hai → wahi rehne do
      if (prev && activeIds.includes(prev)) return prev;
      // warna aage ka pehla active stage
      const prevIdx = prev ? stageIndex(prev) : -1;
      const forward = active.find((s) => stageIndex(s.id) > prevIdx);
      return forward ? forward.id : activeIds[0] || null;
    });
    // eslint-disable-next-line
  }, [sig, focus && focus.n]);

  if (loading && items.length === 0)
    return <div className="loading">Pickups load ho rahe hain…</div>;
  if (active.length === 0)
    return (
      <div className="empty" style={{ padding: '44px 0' }}>
        Koi pickup nahi
      </div>
    );

  return (
    <div className="m-board">
      {active.map((stage) => {
        const cards = items.filter((x) => x.stage === stage.id);
        const isOpen = open === stage.id;
        return (
          <section
            key={stage.id}
            className="m-sec"
            style={{ borderTopColor: stage.color }}
          >
            <button
              className="m-sec-head"
              onClick={() => setOpen(isOpen ? null : stage.id)}
            >
              <span className="col-pip" style={{ background: stage.color }} />
              <span style={{ fontWeight: 700, fontSize: 14.5 }}>
                {sLabel(stage.id)}
              </span>
              <span
                className="col-count"
                style={{
                  background: stage.soft,
                  color: stage.color,
                  marginLeft: 'auto',
                }}
              >
                {cards.length}
              </span>
              <ChevronRight
                size={17}
                color={T.inkSoft}
                style={{
                  transform: isOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform .15s',
                }}
              />
            </button>
            {isOpen && (
              <div className="m-sec-body">
                {cards.map((x) => (
                  <Card
                    key={x.invoice_id}
                    d={x}
                    stage={stage}
                    onOpen={() => onOpen(x)}
                    onMove={onMove}
                    onCommit={onCommit}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Card({ d, stage, onOpen, onMove, onCommit }) {
  const resched = isResched(d);
  const Icon = equipIcon(d.equipment);
  const closed = isClosedStage(d.stage);
  const cancelled = d.stage === 'cancelled';
  const next = closed ? null : STAGES[stageIndex(d.stage) + 1];
  const [expand, setExpand] = useState(false);
  const canInline = !!(next && onCommit); // inline move sirf jab commit handler ho
  return (
    <div
      className={
        cancelled ? 'card is-cancelled' : resched ? 'card is-resched' : 'card'
      }
      onClick={onOpen}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div className="eq-ico" style={{ background: stage.soft }}>
          <Icon size={17} color={stage.color} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="card-name">{d.customer}</div>
          <div className="ellip card-id">{d.id}</div>
        </div>
      </div>
      <div className="card-equip">{d.equipment}</div>
      {d.securityType && (
        <div className="card-meta">
          <span className="ellip" style={{ maxWidth: '100%' }}>
            <ShieldCheck size={12} /> Security:{' '}
            <b>
              {d.securityAmount != null
                ? `₹${d.securityAmount.toLocaleString('en-IN')} · `
                : ''}
              {d.securityType}
            </b>
          </span>
        </div>
      )}
      {resched && (
        <div className="resched-chip">
          <RotateCcw size={12} /> Rescheduled
          {d._raw && d._raw.stage1_remarks && d._raw.stage1_remarks !== 'null' ? (
            <span className="resched-note">· {d._raw.stage1_remarks}</span>
          ) : null}
        </div>
      )}
      <div className="card-meta">
        {d.pending != null && (
          <span
            style={{ color: d.pending > 0 ? T.red : T.green, fontWeight: 800 }}
            title="Pending amount"
          >
            <IndianRupee size={12} /> {d.pending.toLocaleString('en-IN')}
            {d.pending > 0 ? ' pending' : ' clear'}
          </span>
        )}
        <span className="ellip" style={{ maxWidth: 130 }}>
          <MapPin size={12} /> {d.area}
        </span>
      </div>
      <div className="card-meta">
        <span>
          <Clock size={12} /> {niceDate(d.expected) || d.expected}
        </span>
      </div>
      {(d.person || d.manager) && (
        <div className="card-meta">
          <span className="ellip" style={{ maxWidth: '100%' }}>
            <User size={12} /> {d.person || d.manager}
          </span>
        </div>
      )}
      {closed ? (
        <div
          className="card-done"
          style={{ color: stage.color, background: stage.soft }}
        >
          {cancelled ? <AlertTriangle size={13} /> : <Info size={13} />}{' '}
          {stage.short}
        </div>
      ) : next ? (
        <>
          <button
            className={expand ? 'card-next is-open' : 'card-next'}
            onClick={(e) => {
              e.stopPropagation();
              if (canInline) setExpand((v) => !v);
              else onMove(d, next.id);
            }}
          >
            {resched ? 'Edit · dobara bharo' : moveText(next.id)}{' '}
            {canInline ? (
              <ChevronRight
                size={14}
                style={{
                  transform: expand ? 'rotate(90deg)' : 'none',
                  transition: 'transform .15s',
                }}
              />
            ) : (
              <ArrowRight size={13} />
            )}
          </button>
          {canInline && expand && (
            <div onClick={(e) => e.stopPropagation()}>
              <StageModal
                delivery={d}
                toStage={next.id}
                mode="move"
                embedded
                onClose={() => setExpand(false)}
                onSave={(fields) => {
                  setExpand(false);
                  onCommit(d, next.id, fields);
                }}
              />
            </div>
          )}
        </>
      ) : (
        <div className="card-done">
          <Check size={13} /> Completed
        </div>
      )}
    </div>
  );
}

function FooterTotal({ items }) {
  const board = items.filter((x) => !isClosedStage(x.stage));
  const per = STAGES.map(
    (s) => `${s.short} ${items.filter((x) => x.stage === s.id).length}`,
  ).join(' · ');
  const can = items.filter((x) => x.stage === 'cancelled').length;
  const dup = items.filter((x) => x.stage === 'duplicate').length;
  const ren = items.filter((x) => x.stage === 'renewal').length;
  const extra = [
    can && `Cancelled ${can}`,
    ren && `Renewal ${ren}`,
    dup && `Duplicate ${dup}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="foot-total">
      Total {board.length} pickups &nbsp;•&nbsp; {per}
      {extra ? ` • ${extra}` : ''}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ DRAWER */
function Drawer({ d, onClose, onAdvance, onSetStage, onEditStage, canDelete, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const Icon = equipIcon(d.equipment);
  const closedMeta = CLOSED[d.stage] || null;
  const cancelled = !!closedMeta; // "closed" = cancelled / duplicate / renewal
  const idx = stageIndex(d.stage);
  const stage = cancelled
    ? { label: closedMeta.label, color: closedMeta.color, soft: closedMeta.soft }
    : STAGES[idx] || STAGES[0];
  const next = STAGES[idx + 1] || null; // agli actionable stage (nahi to null)
  // closed: yahan tak pahunchi thi (greyed dikhane ke liye)
  const reachedIdx = cancelled ? reachedIdxFromLog(d._raw && d._raw.app_log) : idx;
  const r = d._raw || {};
  // app_log is the timeline source now (table is locked; no direct fetch)
  const tl = [];

  // per-stage field blocks (previous + current editable, future locked)
  const blocks = [
    {
      id: 'talked',
      i: 1,
      rows: [
        ['Pickup date', niceDate(r.confirmed_date) || '—'],
        ['Time', niceTime(r.confirmed_time) || '—'],
        ['Remarks', show(r.stage1_remarks)],
      ],
    },
    {
      id: 'scheduled',
      i: 2,
      rows: [
        ['Pickup person', d.person || '—'],
        ['Transport', d.vehicle || '—'],
        ['Remarks', show(r.stage2_remarks)],
      ],
    },
    {
      id: 'dispatched',
      i: 3,
      rows: [
        ['Estimated arrival', niceTime(String(r.app_eta || '').slice(11, 16)) || '—'],
        ['Remarks', show(r.stage3_remarks)],
      ],
    },
    {
      id: 'delivered',
      i: 4,
      rows: [
        ['Inspected', r.item_inspected ? 'Yes' : 'No'],
        ['Picked up', r.pickup_done ? 'Yes' : 'No'],
        ['Actual date', niceDate(r.actual_pickup_date) || '—'],
        [
          'Charges',
          r.pickup_charges_collected != null && r.pickup_charges_collected !== ''
            ? `₹${Number(r.pickup_charges_collected).toLocaleString('en-IN')}`
            : '—',
        ],
        [
          'Pending collected',
          r.pending_collected != null &&
          r.pending_collected !== '' &&
          r.pending_collected !== 'null'
            ? `₹${Number(r.pending_collected).toLocaleString('en-IN')}`
            : '—',
        ],
        ['Remarks', show(r.stage4_remarks)],
      ],
      photo: r.pickup_image,
    },
  ];

  const appLog = Array.isArray(r.app_log) ? r.app_log : [];
  const hasClosedLog = appLog.some((e) => e && CLOSED[e.stage]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              minWidth: 0,
            }}
          >
            <div
              className="eq-ico"
              style={{ width: 42, height: 42, background: stage.soft }}
            >
              <Icon size={21} color={stage.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{d.customer}</div>
              <div
                className="ellip"
                style={{ fontSize: 12.5, color: T.inkSoft }}
              >
                {d.id}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} color={T.ink} />
          </button>
        </div>

        <span
          className="stage-badge"
          style={{ background: stage.soft, color: stage.color }}
        >
          <span className="col-pip" style={{ background: stage.color }} />{' '}
          {cancelled ? stage.label : sLabel(d.stage)}
        </span>

        {!cancelled && isResched(d) && (
          <div
            className="cancel-note"
            style={{ background: T.amberSoft, color: T.amber, borderColor: T.amberSoft }}
          >
            <RotateCcw size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 800 }}>Pickup reschedule hui hai</div>
              <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>
                Customer ne abhi date nahi di. Baat hone pe upar{' '}
                <b>Contacted</b> dabao aur dropdown se "Customer se baat hui"
                chun ke date bhar do.
              </div>
              {d._raw && d._raw.stage1_remarks && d._raw.stage1_remarks !== 'null' && (
                <div style={{ fontSize: 12.5, marginTop: 6, fontWeight: 700 }}>
                  “{d._raw.stage1_remarks}”
                </div>
              )}
            </div>
          </div>
        )}
        {cancelled ? (
          <>
            <div
              className="cancel-note"
              style={{
                background: closedMeta.soft,
                color: closedMeta.color,
                borderColor: closedMeta.soft,
              }}
            >
              {d.stage === 'cancelled' ? (
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              ) : (
                <Info size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              )}
              <div>
                <div style={{ fontWeight: 800 }}>{closedMeta.title}</div>
                <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>
                  {closedMeta.note}
                </div>
              </div>
            </div>
            <div className="sec-title" style={{ marginTop: 16 }}>
              Is se pehle ki stages
            </div>
            <div className="stage-picker">
              {STAGES.map((s, i) => {
                if (i > reachedIdx) return null; // jahan tak pahunchi thi
                return (
                  <button
                    key={s.id}
                    className="stage-pick-btn"
                    disabled
                    style={{
                      background: '#EDEBE4',
                      color: T.inkSoft,
                      borderColor: T.line,
                      cursor: 'default',
                    }}
                  >
                    <Check
                      size={12}
                      style={{ marginRight: 4, verticalAlign: -1 }}
                    />
                    {sShort(s.id)}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* ── Move to stage — progressive: bhari hui + sirf agli stage ── */}
            <div className="sec-title" style={{ marginTop: 16 }}>
              Move to stage
            </div>
            {next ? (
              <div className="next-hint">
                <span className="col-pip" style={{ background: next.color }} />
                <span>
                  Agla step: <b>{STAGE_HINT[next.id] || next.label}</b>
                </span>
              </div>
            ) : (
              <div className="next-hint done">
                <Check size={14} /> Saari stages complete — pickup done
              </div>
            )}
            <div className="stage-picker">
              {STAGES.map((s, i) => {
                if (i > idx + 1) return null; // aage wali stages abhi chhupi hain
                const filled = i <= idx; // bhar chuki → solid color
                const isNext = i === idx + 1; // agli actionable stage → soft tint
                return (
                  <button
                    key={s.id}
                    className={
                      isNext ? 'stage-pick-btn is-next' : 'stage-pick-btn'
                    }
                    style={{
                      background: filled ? s.color : isNext ? s.soft : '#fff',
                      color: filled ? '#fff' : s.color,
                      borderColor: s.color,
                    }}
                    onClick={() => {
                      if (i === idx) return;
                      i > idx ? onAdvance(s.id) : onSetStage(s.id);
                    }}
                  >
                    {filled && (
                      <Check
                        size={12}
                        style={{ marginRight: 4, verticalAlign: -1 }}
                      />
                    )}
                    {sShort(s.id)}
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 8 }}>
              Bhari hui stages colored hain · agli stage bharne pe wo colored
              hogi aur uske baad wali khulegi.
            </div>
          </>
        )}

        <div className="kv-grid" style={{ marginTop: 18 }}>
          <KV label="Phone" value={d.phone} />
          <KV label="Area" value={d.area} />
          <KV label="Equipment" value={d.equipment} full />
          <KV
            label="Pending amount"
            value={d.pending != null ? `₹${d.pending.toLocaleString('en-IN')}` : '—'}
          />
          <KV
            label="Invoice total"
            value={d.amount != null ? `₹${d.amount.toLocaleString('en-IN')}` : '—'}
          />
          <KV
            label="Security li thi"
            value={
              d.securityAmount != null || d.securityType
                ? `${d.securityAmount != null ? '₹' + d.securityAmount.toLocaleString('en-IN') : ''}${d.securityAmount != null && d.securityType ? ' · ' : ''}${d.securityType || ''}`
                : '—'
            }
          />
          <KV label="Pickup date" value={niceDate(d.expected) || d.expected} />
          <KV label="Store manager" value={d.manager} full />
        </div>

        {/* stage-wise fields — normal: progressive; cancelled: reached blocks read-only */}
        {blocks.map((b) => {
          const limit = cancelled ? reachedIdx : idx + 1;
          if (b.i > limit) return null;
          const st = STAGES[b.i];
          const filled = cancelled ? b.i <= reachedIdx : b.i <= idx;
          const editable = filled && !cancelled;
          return (
            <div key={b.id} style={cancelled ? { opacity: 0.75 } : null}>
              <div
                className="sec-title stage-block-title"
                style={{ justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span className="col-pip" style={{ background: st.color }} />{' '}
                  {sLabel(st.id)}
                </span>
                {editable ? (
                  <button
                    className="mini-edit"
                    onClick={() => onEditStage(b.id)}
                  >
                    <Pencil size={13} /> Edit
                  </button>
                ) : cancelled ? (
                  <span
                    className="next-badge"
                    style={{ color: T.inkSoft, background: T.slateSoft }}
                  >
                    locked
                  </span>
                ) : (
                  <span
                    className="next-badge"
                    style={{ color: st.color, background: st.soft }}
                  >
                    Agla step
                  </span>
                )}
              </div>
              {filled ? (
                <div className="kv-grid">
                  {b.rows.map(([k, v]) => (
                    <KV key={k} label={k} value={v} full={k === 'Remarks'} />
                  ))}
                  {b.photo && b.photo !== 'null' && (
                    <a
                      className="kv-photo"
                      href={b.photo}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img src={b.photo} alt="photo" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="block-next-note">
                  Ye stage bharne ke liye upar <b>{st.short}</b> button dabao.
                </div>
              )}
            </div>
          );
        })}

        <div className="sec-title" style={{ marginTop: 22 }}>
          <History size={14} /> Timeline / history
        </div>
        {cancelled && !hasClosedLog && (
          <div className="timeline">
            <div className="tl-row">
              <div className="tl-marker">
                <span
                  className="tl-dot"
                  style={{ background: closedMeta.color }}
                />
                {appLog.length > 0 && (
                  <span className="tl-line" style={{ background: T.line }} />
                )}
              </div>
              <div style={{ paddingBottom: 16 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: closedMeta.color,
                  }}
                >
                  {closedMeta.label}
                </div>
                <div className="tl-note">{closedMeta.title}</div>
              </div>
            </div>
          </div>
        )}
        {appLog.length > 0 ? (
          <div className="timeline">
            {appLog.map((ev, i) => {
              const c = stageColorOf(ev.stage);
              return (
                <div key={i} className="tl-row">
                  <div className="tl-marker">
                    <span className="tl-dot" style={{ background: c }} />
                    {i < appLog.length - 1 && (
                      <span
                        className="tl-line"
                        style={{ background: T.line }}
                      />
                    )}
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {eventLine(ev)}
                    </div>
                    <div className="tl-note">{fmtDateTime(ev.ts)}</div>
                    {ev.fields &&
                      Object.entries(ev.fields).map(([k, v]) => (
                        <div key={k} className="tl-field">
                          <b>{k}:</b> {String(v)}
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : tl && tl.length > 0 ? (
          <div className="timeline">
            {sortTimeline(tl).map((row, i, arr) => {
              const { ts, status, note } = tlParse(row);
              return (
                <div key={i} className="tl-row">
                  <div className="tl-marker">
                    <span
                      className="tl-dot"
                      style={{
                        background:
                          STAGES[stageIndex(statusToStage(status))]?.color ||
                          T.green,
                      }}
                    />
                    {i < arr.length - 1 && (
                      <span
                        className="tl-line"
                        style={{ background: T.line }}
                      />
                    )}
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {status || 'Updated'}
                    </div>
                    <div className="tl-note">{fmtDateTime(ts)}</div>
                    {note && <div className="tl-field">{note}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: T.inkSoft }}>
            Abhi koi history nahi. Jaise hi koi stage move/edit hoga, yahan
            continuous log banega.
          </div>
        )}

        {canDelete && (
          <div className="danger-zone">
            {confirmDel ? (
              <div className="danger-confirm">
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: T.red }}
                >
                  Pakka delete karna hai?
                </span>
                <button className="btn-danger" onClick={onDelete}>
                  <Trash2 size={15} /> Haan, delete
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setConfirmDel(false)}
                >
                  Rehne do
                </button>
              </div>
            ) : (
              <button
                className="btn-danger"
                onClick={() => setConfirmDel(true)}
              >
                <Trash2 size={15} /> Delete this entry
              </button>
            )}
            <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 8 }}>
              Sirf head delete kar sakta hai · view se hat jayega par Supabase
              mein <b>status = "Deleted"</b> ke saath record safe rahega.
            </div>
          </div>
        )}
        {/* sabse neeche — ye entry app mein kab aayi */}
        <div className="created-note">
          Entry app mein aayi: <b>{fmtFullDateTime(createdTs(d)) || '—'}</b>
        </div>

      </div>
    </div>
  );
}

function KV({ label, value, full }) {
  return (
    <div className="kv" style={full ? { gridColumn: '1 / -1' } : null}>
      <div className="kv-label">{label}</div>
      <div className="kv-val">{value}</div>
    </div>
  );
}

function sortTimeline(rows) {
  const ts = (r) => tlParse(r).ts || '';
  return [...rows].sort((a, b) => String(ts(b)).localeCompare(String(ts(a))));
}
function tlParse(r) {
  const tsKeys = [
    'created_at',
    'inserted_at',
    'logged_at',
    'changed_at',
    'timestamp',
    'updated_at',
    'time',
    'at',
  ];
  const stKeys = [
    'status',
    'new_status',
    'to_status',
    'stage',
    'new_stage',
    'event',
    'action',
    'label',
  ];
  const noteKeys = [
    'note',
    'notes',
    'remark',
    'remarks',
    'message',
    'description',
    'changed_fields',
    'field',
    'detail',
    'details',
  ];
  const pick = (keys) => {
    for (const k of keys)
      if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
    return '';
  };
  return {
    ts: pick(tsKeys),
    status: String(pick(stKeys) || ''),
    note: String(pick(noteKeys) || ''),
  };
}

/* ═══════════════════════════════════════════════════════════ STAGE MODAL */
function StageModal({ delivery, toStage, mode, onClose, onSave, embedded }) {
  const stage = STAGES[stageIndex(toStage)];
  const r = (delivery && delivery._raw) || {};
  const persons = personsFor(delivery.branch, delivery.person || '');
  const _now = new Date();
  const _pad = (n) => String(n).padStart(2, '0');
  const nowDate = `${_now.getFullYear()}-${_pad(_now.getMonth() + 1)}-${_pad(_now.getDate())}`;
  const nowTime = `${_pad(_now.getHours())}:${_pad(_now.getMinutes())}`;
  const nowDT = `${nowDate}T${nowTime}`;
  // ETA ki date ab poochhi nahi jaati — jo pickup date tay hui hai wahi le
  // lete hain (na ho to aaj). Staff sirf time bharta hai.
  const etaDay =
    (r.confirmed_date && r.confirmed_date !== 'null'
      ? String(r.confirmed_date).slice(0, 10)
      : '') || nowDate;
  const [f, setF] = useState({
    // pehli stage pe: talked | resched | cancelled
    flow: 'talked',
    date: mode === 'edit' && r.confirmed_date && r.confirmed_date !== 'null' ? r.confirmed_date : nowDate,
    time: mode === 'edit' && r.confirmed_time && r.confirmed_time !== 'null' ? String(r.confirmed_time).slice(0, 5) : nowTime,
    remarks:
      (toStage === 'delivered' ? r.stage4_remarks
        : toStage === 'dispatched' ? r.stage3_remarks
        : toStage === 'scheduled' ? r.stage2_remarks
        : r.stage1_remarks) || '',
    person: delivery.person || '',
    vehicle: delivery.vehicle || 'Bike',
    eta: mode === 'edit' && r.app_eta && r.app_eta !== 'null' ? toLocalInput(r.app_eta) : nowDT,
    inspected: !!r.item_inspected,
    photoPicked: r.pickup_image && r.pickup_image !== 'null' ? r.pickup_image : '',
    pickDate: mode === 'edit' && r.actual_pickup_date && r.actual_pickup_date !== 'null' ? r.actual_pickup_date : nowDate,
    charges: r.pickup_charges_collected != null && r.pickup_charges_collected !== '' ? r.pickup_charges_collected : '',
    pendingCollected:
      r.pending_collected != null && r.pending_collected !== '' && r.pending_collected !== 'null'
        ? r.pending_collected
        : '',
    done: !!r.pickup_done,
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const openPicker = (e) => { try { e.currentTarget.showPicker(); } catch (_) {} };
  const canSave =
    toStage === 'talked'
      ? f.flow === 'cancelled' || f.flow === 'resched'
        ? // reschedule / cancel — dono mein reason likhna zaroori hai
          !!String(f.remarks || '').trim()
        : !!(f.date && f.time)
    : toStage === 'scheduled' ? !!(f.person && f.vehicle)
    : toStage === 'dispatched' ? !!(f.eta && f.eta.slice(0, 10) && f.eta.slice(11, 16))
    : toStage === 'delivered' ? !!(f.inspected && f.done && f.photoPicked && f.pickDate && String(f.charges).trim() !== '')
    : true;

  const inner = (
    <>
      {!embedded && (
        <div className="modal-head">
          <div>
            <span className="stage-badge" style={{ background: stage.soft, color: stage.color, marginBottom: 8 }}>
              <span className="col-pip" style={{ background: stage.color }} />{' '}
              {mode === 'edit' ? `Edit · ${sLabel(toStage)}` : sLabel(toStage)}
            </span>
            <div className="ellip" style={{ fontSize: 12.5, color: T.inkSoft }}>
              {delivery.customer} · {delivery.id}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} color={T.ink} /></button>
        </div>
      )}
      <div className="modal-body">
        {toStage === 'talked' && (
          <>
            <Field label="Customer se kya baat hui?">
              <select
                className="inp"
                value={f.flow}
                onChange={(e) => set('flow', e.target.value)}
              >
                <option value="talked">Customer se baat hui</option>
                <option value="resched">Reschedule pickup</option>
                <option value="cancelled">Cancel pickup</option>
              </select>
            </Field>
            {f.flow === 'resched' && (
              <div className="flag-note" style={{ background: T.amberSoft, color: T.amber }}>
                <b>Reschedule</b> — entry pending mein hi rahegi, tile pe
                "Rescheduled" dikhega. Neeche remarks zaroori hai.
              </div>
            )}
            {f.flow === 'cancelled' && (
              <div className="flag-note" style={{ background: T.redSoft, color: T.red }}>
                Ye pickup <b>Cancelled</b> mark hokar active list se hat
                jayegi. Neeche wajah likhna zaroori hai.
              </div>
            )}
          </>
        )}
        {toStage === 'talked' && f.flow === 'talked' && (
          <>
            <Field label="Confirmed Pickup Date *">
              <input className="inp" type="date" value={f.date} min="2024-01-01" max="2099-12-31" onClick={openPicker}
                onChange={(e) => { const v = e.target.value; if (v && Number(v.slice(0, 4)) > 2099) return; set('date', v); }} />
            </Field>
            <Field label="Confirmed Time *">
              <TimePick12 value={f.time} onChange={(v) => set('time', v)} />
            </Field>
            {!(f.date && f.time) && <div className="req-note">Date aur Time dono bharo.</div>}
          </>
        )}
        {toStage === 'scheduled' && (
          <>
            <Field label="Pickup person *">
              <select className="inp" value={f.person} onChange={(e) => set('person', e.target.value)}>
                <option value="">Select…</option>
                {persons.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Transport / vehicle *">
              <select className="inp" value={f.vehicle} onChange={(e) => set('vehicle', e.target.value)}>
                <option value="">Select…</option>
                {VEHICLES.map((v) => <option key={v} value={v}>{v}</option>)}
                {f.vehicle && !VEHICLES.includes(f.vehicle) && <option value={f.vehicle}>{f.vehicle}</option>}
              </select>
            </Field>
          </>
        )}
        {toStage === 'dispatched' && (
          <>
            <Field label="Estimated arrival time *">
              <TimePick12
                value={(f.eta || '').slice(11, 16)}
                onChange={(t) => set('eta', `${etaDay}T${t}`)}
              />
              {(f.eta || '').slice(11, 16) && (
                <span className="tp-preview">🕐 {niceTime((f.eta || '').slice(11, 16))}</span>
              )}
            </Field>
            {!(f.eta && f.eta.slice(11, 16)) && (
              <div className="req-note">Estimated time bharna zaroori hai.</div>
            )}
          </>
        )}
        {toStage === 'delivered' && (
          <>
            <Check1 checked={f.inspected} onChange={() => set('inspected', !f.inspected)} label="Item inspected" />
            <Field label="Actual pickup date *">
              <input className="inp" type="date" value={f.pickDate} onClick={openPicker} onChange={(e) => set('pickDate', e.target.value)} />
            </Field>
            <Field label="Pickup charges collected (₹) *">
              <input className="inp" type="text" inputMode="numeric" placeholder="0" value={f.charges}
                onChange={(e) => set('charges', e.target.value.replace(/[^0-9]/g, ''))} />
            </Field>
            {String(f.charges).trim() === '' && (
              <div className="req-note">
                Pickup charges bharna zaroori hai — kuch nahi liya to 0 daal do.
              </div>
            )}
            {/* optional — bakaya amount agar wahin collect ho jaye to yahan */}
            <Field label="Pending amount collected (₹)">
              <input className="inp" type="text" inputMode="numeric" placeholder="0" value={f.pendingCollected}
                onChange={(e) => set('pendingCollected', e.target.value.replace(/[^0-9]/g, ''))} />
            </Field>
            <Check1 checked={f.done} onChange={() => set('done', !f.done)} label="Pickup done" />
            {/* photo tabhi maanga jaata hai jab "Pickup done" tick ho —
                delivery app jaisa hi flow */}
            {f.done && (
              <PhotoUpload label="Pickup photo *" invoiceNumber={delivery.id} kind="picked" value={f.photoPicked} onChange={(url) => set('photoPicked', url)} />
            )}
            {f.done && !f.photoPicked && (
              <div className="req-note">Pickup photo lagana zaroori hai.</div>
            )}
          </>
        )}
        {(() => {
          // pehli stage pe reschedule/cancel chuna to reason likhna zaroori
          const needRemarks =
            toStage === 'talked' &&
            (f.flow === 'resched' || f.flow === 'cancelled');
          const empty = !String(f.remarks || '').trim();
          return (
            <>
              <Field label={needRemarks ? 'Remarks *' : 'Remarks'}>
                <textarea
                  className="inp"
                  rows={needRemarks ? 3 : 2}
                  placeholder={
                    needRemarks
                      ? f.flow === 'resched'
                        ? 'Jaise: 1-2 din mein confirm karenge'
                        : 'Cancel karne ki wajah…'
                      : 'Optional notes…'
                  }
                  value={f.remarks}
                  onChange={(e) => set('remarks', e.target.value)}
                />
              </Field>
              {needRemarks && empty && (
                <div className="req-note">
                  Remarks bharna zaroori hai — kya baat hui, wo likh do.
                </div>
              )}
            </>
          );
        })()}
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!canSave} onClick={() => onSave(f)}>
          <ShieldCheck size={16} />{' '}
          {toStage === 'talked' && f.flow === 'resched'
            ? 'Save · Rescheduled'
            : toStage === 'talked' && f.flow === 'cancelled'
              ? 'Mark as Cancelled'
              : mode === 'edit'
                ? 'Update'
                : 'Save & update'}
        </button>
      </div>
    </>
  );
  if (embedded) return <div className="inline-move">{inner}</div>;
  return (
    <div className="overlay center" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>{inner}</div>
    </div>
  );
}

/* SMALL UI */
function Field({ label, children }) {
  // NOTE: <label> nahi — label ke andar button click dobara forward hota hai,
  // jisse picker khulke turant band ho jaata tha (laptop pe).
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}
/* 12-ghante ka time picker — hour (1-12) + minute + AM/PM.
   Native <input type="time"> device ke locale pe chalta hai (kahin 24-hr dikhta)
   aur Zoho iframe mein showPicker() block ho jaata hai, isliye apna control:
   value andar "HH:MM" (24h) hi rehti hai. */
function TimePick12({ value, onChange }) {
  const [hh, mm] = String(value || '')
    .split(':')
    .map((x) => parseInt(x, 10));
  const h24 = isNaN(hh) ? null : hh;
  const ap = h24 == null ? 'AM' : h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 == null ? '' : h24 % 12 || 12;
  const min = isNaN(mm) ? '' : String(mm).padStart(2, '0');

  const push = (nh12, nmin, nap) => {
    if (!nh12 || nmin === '' || !nap) return;
    let h = Number(nh12) % 12;
    if (nap === 'PM') h += 12;
    onChange(`${String(h).padStart(2, '0')}:${nmin}`);
  };

  return (
    <div className="tp12">
      <select
        className="inp"
        value={h12}
        onChange={(e) => push(e.target.value, min || '00', ap)}
      >
        <option value="">Hr</option>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="tp12-sep">:</span>
      <select
        className="inp"
        value={min}
        onChange={(e) => push(h12 || 12, e.target.value, ap)}
      >
        <option value="">Min</option>
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(
          (m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ),
        )}
      </select>
      <select
        className="inp"
        value={ap}
        onChange={(e) => push(h12 || 12, min || '00', e.target.value)}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

function Check1({ checked, onChange, label }) {
  return (
    <button
      className="check1"
      onClick={onChange}
      style={{ borderColor: checked ? T.green : T.line }}
    >
      <span
        className="check-box"
        style={{
          background: checked ? T.green : '#fff',
          borderColor: checked ? T.green : T.line,
        }}
      >
        {checked && <Check size={13} color="#fff" />}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>
        {label}
      </span>
    </button>
  );
}

/* Photo upload — camera se click ya device se choose. Supabase Storage pe
   upload hoke URL onChange se milta hai. */
function PhotoUpload({ label, invoiceNumber, kind, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const camRef = React.useRef(null);
  const fileRef = React.useRef(null);

  const handle = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // same file dobara chun sakein
    if (!file) return;
    setErr('');
    setBusy(true);
    try {
      const url = await sbUploadPhoto(invoiceNumber, kind, file);
      onChange(url);
    } catch (er) {
      setErr('Upload fail hua, dobara try karo');
    }
    setBusy(false);
  };

  return (
    <div className="photo-up">
      <div className="photo-up-label">{label}</div>
      {value ? (
        <div className="photo-preview">
          <img src={value} alt={label} />
          <button
            className="photo-remove"
            onClick={() => onChange('')}
            type="button"
          >
            <X size={13} /> Hatao
          </button>
        </div>
      ) : (
        <div className="photo-btns">
          <button
            type="button"
            className="photo-btn"
            onClick={() => camRef.current && camRef.current.click()}
            disabled={busy}
          >
            <Camera size={15} /> {busy ? 'Upload ho raha…' : 'Camera'}
          </button>
          <button
            type="button"
            className="photo-btn alt"
            onClick={() => fileRef.current && fileRef.current.click()}
            disabled={busy}
          >
            <Upload size={15} /> Device se
          </button>
        </div>
      )}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handle}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handle}
      />
      {err && <div className="req-note">{err}</div>}
    </div>
  );
}
function Toast({ msg }) {
  return (
    <div className="toast">
      <CheckCircle2 size={17} color={T.greenBright} /> {msg}
    </div>
  );
}

/* ══════════════════════════════════════════════ CUSTOMER TRACK PAGE */
const TRACK_STEPS = [
  {
    id: 'new',
    label: 'Pickup Registered',
    desc: 'Your pickup request has been registered. Our team will call you shortly to confirm the pickup date and time.',
    icon: Package,
  },
  {
    id: 'talked',
    label: 'Confirmed With You',
    desc: 'Our team has contacted you and your pickup date and time has been confirmed.',
    icon: Phone,
  },
  {
    id: 'scheduled',
    label: 'Pickup Scheduled',
    desc: 'Your pickup has been scheduled. Our team will arrive to collect your item.',
    icon: ClipboardCheck,
  },
  {
    id: 'dispatched',
    label: 'Out for Pickup',
    desc: 'Our team is on the way to your location to collect your item.',
    icon: Truck,
  },
  {
    id: 'delivered',
    label: 'Picked Up',
    desc: 'Your item has been picked up successfully. Thank you for choosing Healthy Jeena Sikho.',
    icon: CheckCircle2,
  },
];
/* customer country-code dropdown — default +91 */
const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+977', '+880', '+61'];
function stepTime(log, stageId) {
  if (!Array.isArray(log)) return null;
  const evs = log.filter((e) => e && e.stage === stageId);
  return evs.length ? evs[evs.length - 1].ts : null;
}

/* ── SALES TRACK PAGE ──────────────────────────────────────────────────
   /track → sales team ek customer ka number daale, us number ki saari
   deliveries (latest → old) dekhe, kisi pe click kare to wahi tracking
   timeline khul jaaye (customer wala TrackResult reuse hota hai).        */
function PickupSalesPage() {
  // Matrix flow: salesperson (rows) × store (cols) counts → cell click → list → detail.
  const [range, setRange] = useState('today');
  const [from, setFrom] = useState(dayStr(Date.now()));
  const [to, setTo] = useState(dayStr(Date.now()));
  const [storeFilter, setStoreFilter] = useState(''); // '' = all stores
  const [statusFilter, setStatusFilter] = useState('all'); // all|pending|delivered
  const [matrix, setMatrix] = useState([]); // [{salesperson, store, cnt}]
  const [mState, setMState] = useState('loading'); // loading|done|error
  const [mErr, setMErr] = useState('');
  const [cell, setCell] = useState(null); // {sales, store}
  const [rows, setRows] = useState([]);
  const [cState, setCState] = useState('idle');
  const [q, setQ] = useState(''); // global search (customer/invoice/salesperson)
  const [sRows, setSRows] = useState([]);
  const [sState, setSState] = useState('idle'); // idle|loading|done
  const [lq, setLq] = useState(''); // list search (cell view)
  const [selected, setSelected] = useState(null);
  // order chunte hi uska timeline (app_log) le aao — customer link jaisa
  // "Updated: ..." har stage pe dikhe
  const pickOrder = async (r) => {
    setSelected(r);
    if (!r || !r.invoice_number || r.app_log) return;
    try {
      const det = (await pkSalesLog(r.invoice_number)) || {};
      setSelected((cur) =>
        cur && cur.invoice_number === r.invoice_number
          ? {
              ...cur,
              app_log: det.app_log,
              photo_delivered: det.photo_delivered,
              customer_phone: det.customer_phone || cur.customer_phone,
            }
          : cur,
      );
    } catch (_) {
      /* log na aaye to baaki detail phir bhi dikhti rahe */
    }
  };

  // global search — 2+ akshar pe deliveries dhoondo (matrix ki jagah list)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setSState('idle');
      setSRows([]);
      return;
    }
    let alive = true;
    setSState('loading');
    const t = setTimeout(async () => {
      try {
        const res = await pkSalesSearch(term);
        if (alive) {
          setSRows(res || []);
          setSState('done');
        }
      } catch (_) {
        if (alive) setSState('done');
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const bounds = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const mk = (d) => dayStr(d);
    if (range === 'today') return [mk(t), mk(t)];
    if (range === 'yesterday') {
      const y = new Date(t);
      y.setDate(y.getDate() - 1);
      return [mk(y), mk(y)];
    }
    if (range === '7d') {
      const s = new Date(t);
      s.setDate(s.getDate() - 6);
      return [mk(s), mk(t)];
    }
    if (range === 'month') {
      const s = new Date(t.getFullYear(), t.getMonth(), 1);
      return [mk(s), mk(t)];
    }
    if (range === 'custom') return [from, to];
    return ['2000-01-01', '2999-12-31'];
  };

  const loadMatrix = async () => {
    setMState('loading');
    setCell(null);
    setSelected(null);
    const [f, t] = bounds();
    try {
      const res = await pkSalesMatrix(f, t, statusFilter);
      setMatrix(res || []);
      setMState('done');
    } catch (e) {
      setMErr(e.message || 'error');
      setMState('error');
    }
  };

  useEffect(() => {
    loadMatrix();
    // eslint-disable-next-line
  }, [range, from, to, statusFilter]);

  const openCell = async (sales, store) => {
    setCell({
      sales,
      store,
      title:
        sales && store
          ? `${sales} · ${branchLabel(store)}`
          : sales
            ? sales
            : store
              ? branchLabel(store)
              : 'All',
    });
    setSelected(null);
    setLq('');
    setCState('loading');
    const [f, t] = bounds();
    try {
      const res = await pkSalesList(sales, store, f, t, statusFilter);
      setRows(res || []);
      setCState('done');
    } catch (e) {
      setCState('error');
    }
  };

  // matrix ko pivot karo: salespeople (rows) × stores (cols jinme data hai)
  const stores = [];
  const people = [];
  const map = {}; // sales|store -> cnt
  const rowTotal = {};
  const colTotal = {};
  matrix.forEach((m) => {
    if (!stores.includes(m.store)) stores.push(m.store);
    if (!people.includes(m.salesperson)) people.push(m.salesperson);
    map[`${m.salesperson}|${m.store}`] = Number(m.cnt);
    rowTotal[m.salesperson] = (rowTotal[m.salesperson] || 0) + Number(m.cnt);
    colTotal[m.store] = (colTotal[m.store] || 0) + Number(m.cnt);
  });
  // store order fixed rakho jaha possible
  const STORE_ORDER = [
    'NOD', 'JKP', 'NWD', 'GGN', 'JPR', 'LKO', 'MOH', 'JAL', 'LDH', 'CHD', 'NCR',
  ];
  stores.sort((a, b) => STORE_ORDER.indexOf(a) - STORE_ORDER.indexOf(b));
  const shownStores = stores;
  // number waale (asli salespeople) upar, bina-number waale neeche; phir total se
  const hasNum = (p) => /\d{6,}/.test(String(p || ''));
  people.sort((a, b) => {
    const na = hasNum(a) ? 1 : 0;
    const nb = hasNum(b) ? 1 : 0;
    if (na !== nb) return nb - na; // number waale pehle
    return (rowTotal[b] || 0) - (rowTotal[a] || 0);
  });
  const shownPeople = people.filter(
    (p) => !q.trim() || p.toLowerCase().includes(q.trim().toLowerCase()),
  );

  const shownRows = rows.filter((r) => {
    if (!lq.trim()) return true;
    const hay = `${r.customer_name || ''} ${r.invoice_number || ''} ${equipmentText(
      { line_items: r.line_items, item_name: r.item_name },
    )}`.toLowerCase();
    return hay.includes(lq.trim().toLowerCase());
  });

  const rangeLabel =
    range === 'today' ? 'Aaj'
    : range === 'yesterday' ? 'Kal'
    : range === '7d' ? 'Pichhle 7 din'
    : range === 'month' ? 'Is mahine'
    : range === 'all' ? 'Sabhi'
    : `${from} → ${to}`;

  return (
    <div className="track-wrap" style={{ fontFamily: FONT }}>
      <StyleTag />
      <div className="track-topbar">
        <div className="brand">
          <div className="brand-badge">
            <Truck size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: T.ink }}>
              Healthy Jeena Sikho
            </div>
            <div style={{ fontSize: 11.5, color: T.inkSoft }}>
              Pickup tracker · Sales
            </div>
          </div>
        </div>
      </div>

      <div className={cell || selected ? 'track-body' : 'track-body track-wide'}>
        {/* DETAIL VIEW */}
        {selected ? (
          <>
            <button className="track-back" onClick={() => setSelected(null)}>
              <ArrowLeft size={16} /> Back to list
            </button>
            <PkOrderCard row={selected} />
            <DeliveryPhase invoice={selected.invoice_number} />
            <TrackResult row={selected} />
          </>
        ) : cell ? (
          /* CELL LIST VIEW */
          <>
            <button
              className="track-back"
              onClick={() => {
                setCell(null);
                setStoreFilter('');
              }}
            >
              <ArrowLeft size={16} /> Back to overview
            </button>
            <div className="sales-listbar">
              <div className="sales-list-head">
                {cell.title} · {shownRows.length}
              </div>
              <div className="sales-search">
                <Search size={15} color={T.inkSoft} />
                <input
                  placeholder="Search name, invoice, product…"
                  value={lq}
                  onChange={(e) => setLq(e.target.value)}
                />
              </div>
            </div>
            {cState === 'loading' ? (
              <div className="track-msg">Loading…</div>
            ) : shownRows.length === 0 ? (
              <div className="track-msg">Koi pickup nahi mili.</div>
            ) : (
              <PkGroupedList rows={shownRows} onPick={pickOrder} />
            )}
          </>
        ) : (
          /* MATRIX OVERVIEW */
          <>
            <div className="mx-toolbar">
              <div className="mx-search">
                <Search size={16} color={T.inkSoft} />
                <input
                  placeholder="Search customer, invoice, salesperson…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="mx-daterow">
                <select
                  className="mx-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="picked">Picked up</option>
                </select>
                <select
                  className="mx-select"
                  value={storeFilter}
                  onChange={(e) => {
                    const s = e.target.value;
                    setStoreFilter(s);
                    if (s) openCell('', s);
                    else setCell(null);
                  }}
                >
                  <option value="">All stores</option>
                  {[
                    'NOD', 'JKP', 'NWD', 'GGN', 'JPR', 'LKO', 'MOH', 'JAL',
                    'LDH', 'CHD', 'NCR',
                  ].map((s) => (
                    <option key={s} value={s}>
                      {branchLabel(s)}
                    </option>
                  ))}
                </select>
                <select
                  className="mx-select"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="7d">Last 7 days</option>
                  <option value="month">This month</option>
                  <option value="all">All time</option>
                  <option value="custom">Custom range</option>
                </select>
                {range === 'custom' && (
                  <div className="mx-range">
                    <input
                      className="mx-date"
                      type="date"
                      value={from}
                      max={to}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                    <span className="mx-arrow">–</span>
                    <input
                      className="mx-date"
                      type="date"
                      value={to}
                      min={from}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mx-caption">
              {sState === 'idle' &&
                `Pickups by salesperson & store · ${rangeLabel}${statusFilter !== 'all' ? ' · ' + statusFilter[0].toUpperCase() + statusFilter.slice(1) : ''}`}
            </div>

            {sState !== 'idle' ? (
              /* GLOBAL SEARCH RESULTS — matrix ki jagah */
              <>
                <div className="mx-caption">
                  {sState === 'loading'
                    ? 'Searching…'
                    : `${sRows.length} result${sRows.length === 1 ? '' : 's'} for "${q.trim()}"`}
                </div>
                {sState === 'done' && sRows.length === 0 ? (
                  <div className="track-msg">Kuch nahi mila.</div>
                ) : (
                  <PkGroupedList rows={sRows} onPick={pickOrder} />
                )}
              </>
            ) : mState === 'loading' ? (
              <div className="track-msg">Loading…</div>
            ) : mState === 'error' ? (
              <div className="track-msg">Unable to load. {mErr}</div>
            ) : shownPeople.length === 0 ? (
              <div className="track-msg">Is duration mein koi pickup nahi.</div>
            ) : (
              <div className="matrix-wrap">
                <table className="matrix">
                  <thead>
                    <tr>
                      <th className="mx-sticky">Salesperson</th>
                      {shownStores.map((s) => (
                        <th
                          key={s}
                          className="mx-store mx-hclick"
                          title={`${branchLabel(s)} — click for all`}
                          onClick={() => colTotal[s] && openCell('', s)}
                        >
                          {s}
                        </th>
                      ))}
                      <th className="mx-total">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shownPeople.map((person) => {
                      const rt = rowTotal[person] || 0;
                      return (
                        <tr key={person}>
                          <td
                            className="mx-sticky mx-name mx-nclick"
                            onClick={() => openCell(person, '')}
                            title="Click for all deliveries"
                          >
                            {person}
                          </td>
                          {shownStores.map((s) => {
                            const n = map[`${person}|${s}`] || 0;
                            return (
                              <td
                                key={s}
                                className={
                                  n ? 'mx-cell mx-click' : 'mx-cell mx-zero'
                                }
                                onClick={() => n && openCell(person, s)}
                              >
                                {n || '·'}
                              </td>
                            );
                          })}
                          <td
                            className={rt ? 'mx-total mx-tclick' : 'mx-total'}
                            onClick={() => rt && openCell(person, '')}
                          >
                            {rt}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="mx-footer">
                      <td className="mx-sticky">Total</td>
                      {shownStores.map((s) => (
                        <td
                          key={s}
                          className={
                            colTotal[s] ? 'mx-total mx-tclick' : 'mx-total'
                          }
                          onClick={() => colTotal[s] && openCell('', s)}
                        >
                          {colTotal[s] || 0}
                        </td>
                      ))}
                      <td className="mx-total">
                        {matrix.reduce((a, m) => a + Number(m.cnt), 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="track-foot">
          Healthy Jeena Sikho · Internal pickup tracker
        </div>
      </div>
    </div>
  );
}


/* Sales pickup detail pe upar — usi invoice ki delivery ka collapsed hissa.
   Delivery record na mile to kuch render nahi hota. */
function DeliveryPhase({ invoice }) {
  const [row, setRow] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let alive = true;
    setRow(null);
    setOpen(false);
    if (!invoice) return;
    (async () => {
      try {
        const res = await pkDeliveryPeek(invoice);
        const d = (res || [])[0] || null;
        if (alive && d) setRow(d);
      } catch (_) {}
    })();
    return () => {
      alive = false;
    };
  }, [invoice]);

  if (!row) return null;
  const log = Array.isArray(row.app_log) ? row.app_log : [];
  const done = /deliver/i.test(String(row.status || '')) &&
    !/out for/i.test(String(row.status || ''));
  const when = niceDate(row.confirmed_date);

  return (
    <div className="dphase">
      <button className="phase-collapse" onClick={() => setOpen((v) => !v)}>
        <span className="phase-tick">
          {done ? <Check size={13} /> : <Truck size={13} />}
        </span>
        <span style={{ flex: 1, textAlign: 'left' }}>
          {done ? 'Delivered' : `Delivery · ${row.status || '—'}`}
          {when ? ` · ${when}` : ''}
        </span>
        <span className="phase-link">{open ? 'Hide' : 'View delivery'}</span>
        <ChevronRight
          size={16}
          style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform .15s',
          }}
        />
      </button>
      {open && (
        <div className="dphase-body">
          {log.length === 0 ? (
            <div className="empty">Delivery ka koi timeline nahi mila</div>
          ) : (
            <div className="timeline">
              {log.map((ev, i) => (
                <div key={i} className="tl-row">
                  <div className="tl-marker">
                    <span className="tl-dot" style={{ background: T.green }} />
                    {i < log.length - 1 && (
                      <span className="tl-line" style={{ background: T.line }} />
                    )}
                  </div>
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {ev.action} {ev.label}
                    </div>
                    <div className="tl-note">{fmtDateTime(ev.ts)}</div>
                    {ev.fields &&
                      Object.entries(ev.fields).map(([k, v]) => (
                        <div key={k} className="tl-field">
                          <b>{k}:</b> {String(v)}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PkGroupedList({ rows, onPick }) {
  const order = ['new', 'talked', 'scheduled', 'dispatched']; // pending stages
  const rank = (r) => {
    const st = pickupStage(r.status);
    const i = order.indexOf(st);
    return i === -1 ? 99 : i;
  };
  const pending = rows
    .filter((r) => order.includes(pickupStage(r.status)))
    .sort((a, b) => rank(a) - rank(b));
  const delivered = rows.filter((r) => pickupStage(r.status) === 'delivered');
  const cancelled = rows.filter((r) => pickupStage(r.status) === 'cancelled');

  const Row = (r) => {
    const st = pickupStage(r.status);
    const cancel = st === 'cancelled';
    const stg = stageMeta(st);
    const equip = equipmentText({
      line_items: r.line_items,
      item_name: r.item_name,
    });
    const Icon = equipIcon(equip);
    return (
      <button
        key={r.invoice_number}
        className={cancel ? 'sales-row is-cancelled' : 'sales-row'}
        onClick={() => onPick(r)}
      >
        <div className="eq-ico" style={{ background: stg.soft }}>
          <Icon size={17} color={stg.color} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="sales-row-top">
            <span className="ellip" style={{ fontWeight: 800, fontSize: 14.5 }}>
              {r.customer_name || 'Customer'}
            </span>
            <span
              className="sales-chip"
              style={{ background: stg.soft, color: stg.color }}
            >
              {stg.short}
            </span>
          </div>
          <div className="ellip sales-sub">{equip}</div>
          <div className="sales-meta">
            <span className="ellip">#{r.invoice_number}</span>
            <span>
              ₹{Number(r.total_amount || 0).toLocaleString('en-IN')}
            </span>
            {niceDate(r.created_at) && <span>{niceDate(r.created_at)}</span>}
          </div>
        </div>
        <ChevronRight size={18} color={T.inkSoft} />
      </button>
    );
  };

  const Group = (title, list, color) =>
    list.length === 0 ? null : (
      <div className="sgroup">
        <div className="sgroup-head">
          <span className="sgroup-dot" style={{ background: color }} />
          {title}
          <span className="sgroup-count">{list.length}</span>
        </div>
        <div className="sales-list">{list.map(Row)}</div>
      </div>
    );

  return (
    <>
      {Group('Pending', pending, T.blue)}
      {Group('Delivered', delivered, T.green)}
      {Group('Cancelled', cancelled, T.red)}
    </>
  );
}

/* Sales-only detail card — sab zaroori info ek jagah, systematically */
function PkOrderCard({ row }) {
  const store = deriveBranch(row);
  const manager = STORE_MANAGERS[store] || '—';
  const stage = pickupStage(row.status);
  const stg = stageMeta(stage);
  const val = (x) => (x && x !== 'null' ? x : null);
  const money = (n) =>
    n != null && n !== '' ? `₹${Number(n).toLocaleString('en-IN')}` : null;

  const rows = [
    ['Order stage', <span key="s" className="sales-chip" style={{ background: stg.soft, color: stg.color }}>{stg.short}</span>],
    ['Salesperson', val(row.sale_person) || '—'],
    ['Customer phone', val(row.phone) || '—'],
    ['Store', branchLabel(store)],
    ['Store manager', manager],
    ['Pickup slot given',
      val(row.confirmed_date)
        ? `${niceDate(row.confirmed_date)}${val(row.confirmed_time) ? ', ' + niceTime(row.confirmed_time) : ''}`
        : '—'],
    ['Pickup person', val(row.app_pickup_person) || '—'],
    ['Transport', val(row.app_vehicle) || '—'],
    ['Estimated arrival', niceTime(String(row.app_eta || '').slice(11, 16)) || '—'],
    ['Security li thi',
      row.security_amount != null || val(row.security_type)
        ? `${row.security_amount != null ? money(row.security_amount) : ''}${row.security_amount != null && val(row.security_type) ? ' · ' : ''}${val(row.security_type) || ''}`
        : '—'],
    ['Pickup charges', money(row.pickup_charges_collected) || '—'],
    ['Pending collected', money(row.pending_collected) || '—'],
    ['Pending amount', money(row.pending_amount) || '—'],
    ['Invoice total', money(row.total_amount) || '—'],
  ];


  return (
    <div className="soc">
      <div className="soc-head">
        <div>
          <div className="soc-cust">{row.customer_name || 'Customer'}</div>
          <div className="soc-inv">#{row.invoice_number}</div>
        </div>
      </div>
      <div className="soc-grid">
        {rows.map(([k, v]) => (
          <div className="soc-item" key={k}>
            <div className="soc-k">{k}</div>
            <div className="soc-v">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


function TrackPage({ invoice }) {
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('idle'); // idle | loading | done | notfound | error
  const [rows, setRows] = useState([]);
  const [row, setRow] = useState(null);
  const [err, setErr] = useState('');

  const track = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setErr('Please enter your full registered mobile number.');
      return;
    }
    setErr('');
    setState('loading');
    setRow(null);
    try {
      const all = await sbTrack(invoice || '', `+91${digits}`);
      // Renewal / Duplicate / Deleted = internal cheezein — customer ko na dikhe.
      // Cancelled dikhta hai (customer ko pata hona chahiye).
      const res = (all || []).filter((r) => {
        const st = statusToStage(r.status);
        return st !== 'renewal' && st !== 'duplicate' && st !== 'deleted';
      });
      if (!res || res.length === 0) {
        setState('notfound');
        setRows([]);
        return;
      }
      setRows(res);
      // Ek hi order → seedha timeline. Ek se zyada (jaise oxygen + cannula
      // alag invoices) → list dikhao, customer apna order chun le.
      if (res.length === 1) setRow(res[0]);
      setState('done');
    } catch (e) {
      setErr(e.message || 'Something went wrong');
      setState('error');
    }
  };

  return (
    <div className="track-wrap" style={{ fontFamily: FONT }}>
      <StyleTag />
      <div className="track-topbar">
        <div className="brand">
          <div className="brand-badge">
            <Truck size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: T.ink }}>
              Healthy Jeena Sikho
            </div>
            <div style={{ fontSize: 11.5, color: T.inkSoft }}>
              Track your pickup
            </div>
          </div>
        </div>
      </div>

      <div className="track-body">
        <div className="track-card">
          <h1 className="track-h1">Track your pickup</h1>
          <p className="track-sub">
            Welcome! Please enter your registered mobile number to see your
            order status.
          </p>
          {invoice && (
            <div className="track-inv">
              Order&nbsp;<b>{invoice}</b>
            </div>
          )}
          <Field label="Registered mobile number">
            <div className="phone-row">
              <span className="code-fixed">+91</span>
              <input
                className="inp phone-input"
                inputMode="numeric"
                placeholder="Enter mobile number"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, ''));
                  setErr('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && track()}
              />
            </div>
          </Field>
          {err && <div className="login-err">{err}</div>}
          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: 4 }}
            disabled={state === 'loading'}
            onClick={track}
          >
            {state === 'loading' ? (
              'Searching…'
            ) : (
              <>
                Track order <ArrowRight size={17} />
              </>
            )}
          </button>

          {state === 'notfound' && (
            <div className="track-msg">
              No order found for this number. Please check and try again.
            </div>
          )}
          {state === 'error' && (
            <div className="track-msg">
              Unable to track right now. Please try again in a bit.
            </div>
          )}
        </div>

        {/* 1 se zyada order → customer apna order chune */}
        {state === 'done' && !row && rows.length > 1 && (
          <div className="sales-list">
            <div className="sales-list-head">
              {rows.length} orders found · choose one
            </div>
            {rows.map((r) => {
              const st = statusToStage(r.status);
              const stg = stageMeta(st);
              const equip = equipmentText({
                line_items: r.line_items,
                item_name: r.item_name,
              });
              const Icon = equipIcon(equip);
              return (
                <button
                  key={r.invoice_number}
                  className="sales-row"
                  onClick={() => setRow(r)}
                >
                  <div className="eq-ico" style={{ background: stg.soft }}>
                    <Icon size={17} color={stg.color} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="sales-row-top">
                      <span
                        className="ellip"
                        style={{ fontWeight: 800, fontSize: 14 }}
                      >
                        {equip}
                      </span>
                      <span
                        className="sales-chip"
                        style={{ background: stg.soft, color: stg.color }}
                      >
                        {stg.short}
                      </span>
                    </div>
                    <div className="sales-meta">
                      <span className="ellip">#{r.invoice_number}</span>
                      {niceDate(r.created_at) && (
                        <span>{niceDate(r.created_at)}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={18} color={T.inkSoft} />
                </button>
              );
            })}
          </div>
        )}

        {state === 'done' && row && (
          <>
            {rows.length > 1 && (
              <button
                className="track-back"
                style={{ marginTop: 16 }}
                onClick={() => setRow(null)}
              >
                <ArrowLeft size={16} /> Back to my orders
              </button>
            )}
            <TrackResult row={row} />
          </>
        )}

        <div className="track-foot">
          Healthy Jeena Sikho · Medical equipment rentals
        </div>
      </div>
    </div>
  );
}

function TrackResult({ row }) {
  // row = safe fields from track_order RPC (poora delivery row NAHI)
  const equipment = equipmentText({
    line_items: row.line_items,
    item_name: row.item_name,
  });
  const items = equipmentList({
    line_items: row.line_items,
    item_name: row.item_name,
  });
  const stage = statusToStage(row.status);
  const closedMeta = CLOSED[stage] || null;
  const cancelled = !!closedMeta;
  const idx = stageIndex(stage);
  const log = Array.isArray(row.app_log) ? row.app_log : [];
  // closed: cancel/mark se pehle jahan tak pahunchi thi (app_log se)
  const reachedIdx = cancelled ? reachedIdxFromLog(log) : idx;
  const flowIdx = cancelled ? reachedIdx : idx; // kitni stages timeline mein dikhein
  const Icon = equipIcon(equipment);
  const person = row.delivery_partner || null;
  const orderId = row.invoice_number;

  const banner = cancelled
    ? { text: closedMeta.label, bg: closedMeta.soft, fg: closedMeta.color }
    : stage === 'delivered'
      ? { text: 'Picked up successfully 🎉', bg: T.mint, fg: T.green }
      : stage === 'dispatched'
        ? {
            text: 'Our team is on the way to pick up your item',
            bg: T.violetSoft,
            fg: T.violet,
          }
        : stage === 'scheduled'
          ? { text: 'Your pickup is scheduled', bg: T.amberSoft, fg: T.amber }
          : stage === 'talked'
            ? { text: 'Your pickup is confirmed', bg: T.blueSoft, fg: T.blue }
            : {
                text: 'Your pickup request has been received',
                bg: T.slateSoft,
                fg: T.slate,
              };

  const schedDate = niceDate(row.confirmed_date);
  const schedTime = niceTime(row.confirmed_time);

  return (
    <div className="track-result">
      {/* order summary */}
      <div className="track-order">
        <div className="eq-ico" style={{ width: 44, height: 44, background: T.mint }}>
          <Icon size={22} color={T.green} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: T.ink }}>
            {items.length > 1 ? `${items.length} items` : 'Order details'}
          </div>
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 2 }}>
            Order #{orderId}
          </div>
        </div>
      </div>
      <ul className="eq-list">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>

      <div className="track-banner" style={{ background: banner.bg, color: banner.fg }}>
        {banner.text}
      </div>

      {/* the timeline */}
      <div className="track-tl">
        {TRACK_STEPS.map((step, i) => {
          if (i > flowIdx) return null; // sirf reached stages dikhao
          const current = !cancelled && i === idx;
          // "reached this stage" time — har stage pe green chhota timestamp
          const reachedTs =
            stepTime(log, step.id) ||
            (step.id === 'new'
              ? row.created_at ||
                row.created_time ||
                row.inserted_at ||
                row.synced_at ||
                null
              : null);
          const StepIcon = step.icon;
          // closed hua to aakhri reached stage bhi neeche closed-entry se jude
          const showLine = i < flowIdx || cancelled;
          return (
            <div className="ttl-row" key={step.id}>
              <div className="ttl-left">
                <div
                  className="ttl-dot"
                  style={{
                    background: T.green,
                    borderColor: T.green,
                    color: '#fff',
                  }}
                >
                  <StepIcon size={16} />
                </div>
                {showLine && (
                  <span className="ttl-line" style={{ background: T.green }} />
                )}
              </div>
              <div className="ttl-content">
                <div
                  className="ttl-title"
                  style={{ color: T.ink, fontWeight: current ? 800 : 700 }}
                >
                  {step.label}
                  {current && <ArrowLeft className="ttl-now-arrow" size={18} />}
                </div>
                <div className="ttl-desc">{step.desc}</div>

                {/* Stage 2 — confirmed delivery slot */}
                {step.id === 'talked' && (schedDate || schedTime) && (
                  <div className="ttl-extra">
                    <div>
                      <b>Confirmed slot:</b> {schedDate || ''}
                      {schedDate && schedTime ? ', ' : ''}
                      {schedTime || ''}
                    </div>
                  </div>
                )}

                {/* Stage 3 — delivery slot + partner */}
                {step.id === 'scheduled' && (
                  <div className="ttl-extra">
                    {(schedDate || schedTime) && (
                      <div>
                        <b>Pickup slot:</b> {schedDate || ''}
                        {schedDate && schedTime ? ', ' : ''}
                        {schedTime || ''}
                      </div>
                    )}
                    {person && (
                      <div>
                        <b>Pickup person:</b> {person}
                      </div>
                    )}
                  </div>
                )}

                {/* Stage 4 — out for delivery: estimated arrival */}
                {step.id === 'dispatched' && row.app_eta && (
                  <div className="ttl-extra">
                    <div>
                      <b>Estimated arrival:</b>{' '}
                      {niceTime(String(row.app_eta || '').slice(11, 16))}
                    </div>
                  </div>
                )}

                {/* har stage pe — kab update hua (green chhota) */}
                {reachedTs && (
                  <div className="ttl-time">
                    Updated: {fmtDateTime(reachedTs)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* closed → reached stages ke baad colored closed entry */}
        {cancelled && (
          <div className="ttl-row">
            <div className="ttl-left">
              <div
                className="ttl-dot"
                style={{
                  background: closedMeta.color,
                  borderColor: closedMeta.color,
                  color: '#fff',
                }}
              >
                {stage === 'cancelled' ? (
                  <AlertTriangle size={16} />
                ) : (
                  <Info size={16} />
                )}
              </div>
            </div>
            <div className="ttl-content">
              <div
                className="ttl-title"
                style={{ color: closedMeta.color, fontWeight: 800 }}
              >
                {closedMeta.label}
              </div>
              <div className="ttl-desc">{closedMeta.cust}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ STYLES */
/* ═════════════════════════════════════════════════ ACTIVITY LOG (overall)
   Saari entries ke app_log events ek jagah, latest pehle — Books / Bigin ke
   audit trail jaisa. Data wahi hai jo har entry ke andar timeline mein
   dikhta hai; yahan sab merge karke "kisne kya kab kiya" ek screen pe.
   Delete hui entries bhi yahan aati hain (view se hatti hain, log se nahi). */
const ACT_KINDS = [
  { id: 'all', label: 'Sab updates' },
  { id: 'move', label: 'Stage move' },
  { id: 'edit', label: 'Edit' },
  { id: 'closed', label: 'Cancelled' },
  { id: 'delete', label: 'Delete' },
];
function actKind(ev) {
  if (!ev) return 'move';
  if (ev.stage === 'deleted') return 'delete';
  if (CLOSED[ev.stage]) return 'closed';
  if (ev.action === 'Edited') return 'edit';
  return 'move';
}
function actIconOf(k) {
  return k === 'delete'
    ? Trash2
    : k === 'edit'
      ? Pencil
      : k === 'closed'
        ? AlertTriangle
        : ArrowRight;
}
function actTitle(ev) {
  const k = actKind(ev);
  const lbl =
    (CLOSED[ev.stage] || STAGES[stageIndex(ev.stage)] || {}).label ||
    ev.label ||
    ev.stage;
  if (ev.label === 'Rescheduled') return 'Reschedule kiya';
  if (k === 'delete') return 'Entry delete ki';
  if (k === 'closed') return `${lbl} mark kiya`;
  if (k === 'edit') return `${lbl} edit kiya`;
  return `${lbl} pe move kiya`;
}
function actDayLabel(ds) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (ds === todayStr()) return 'Aaj';
  if (ds === dayStr(y)) return 'Kal';
  const d = new Date(ds + 'T00:00');
  return isNaN(d)
    ? ds
    : d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
}
function actTime(ts) {
  const d = new Date(ts);
  if (isNaN(d)) return '—';
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function ActivityLog({ deliveries, session, onOpen, onClose }) {
  const [q, setQ] = useState('');
  const [range, setRange] = useState('7d'); // today|yesterday|7d|month|all
  const [store, setStore] = useState('ALL');
  const [kind, setKind] = useState('all');

  const bounds = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    if (range === 'today') return [dayStr(t), dayStr(t)];
    if (range === 'yesterday') {
      const y = new Date(t);
      y.setDate(y.getDate() - 1);
      return [dayStr(y), dayStr(y)];
    }
    if (range === '7d') {
      const s = new Date(t);
      s.setDate(s.getDate() - 6);
      return [dayStr(s), dayStr(t)];
    }
    if (range === 'month') {
      const s = new Date(t.getFullYear(), t.getMonth(), 1);
      return [dayStr(s), dayStr(t)];
    }
    return ['0000-01-01', '9999-12-31'];
  }, [range]);

  // saari entries ke app_log ko ek flat list mein merge karo (latest pehle)
  const all = useMemo(() => {
    const out = [];
    deliveries.forEach((d) => {
      const log = d._raw && Array.isArray(d._raw.app_log) ? d._raw.app_log : [];
      log.forEach((ev, i) => {
        if (ev && ev.ts) out.push({ ev, d, key: `${d.invoice_id}#${i}` });
      });
    });
    out.sort((a, b) => String(b.ev.ts).localeCompare(String(a.ev.ts)));
    return out;
  }, [deliveries]);

  const rows = useMemo(() => {
    const [s, e] = bounds;
    const term = q.trim().toLowerCase();
    return all.filter(({ ev, d }) => {
      const ds = dayStr(ev.ts);
      if (ds < s || ds > e) return false;
      if (store !== 'ALL' && d.branch !== store) return false;
      if (kind !== 'all' && actKind(ev) !== kind) return false;
      if (!term) return true;
      const hay =
        `${d.customer} ${d.id} ${branchLabel(d.branch)} ${actorText(ev)} ${actTitle(ev)}`.toLowerCase();
      return hay.includes(term);
    });
  }, [all, bounds, store, kind, q]);

  // din ke hisaab se group — heading ke neeche us din ke updates
  const days = [];
  const byDay = {};
  rows.forEach((r) => {
    const ds = dayStr(r.ev.ts);
    if (!byDay[ds]) {
      byDay[ds] = [];
      days.push(ds);
    }
    byDay[ds].push(r);
  });

  return (
    <div className="overlay" onClick={onClose}>
      <div className="act-panel" onClick={(e) => e.stopPropagation()}>
        <div className="act-head">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Activity log</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft }}>
              Kisne kya update kiya · {rows.length}{' '}
              {rows.length === 1 ? 'update' : 'updates'}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} color={T.ink} />
          </button>
        </div>

        <div className="act-filters">
          <div className="act-search">
            <Search size={15} color={T.inkSoft} />
            <input
              placeholder="Customer, invoice, store, naam…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="act-selects">
            <select
              className="dash-inp"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="today">Aaj</option>
              <option value="yesterday">Kal</option>
              <option value="7d">Pichhle 7 din</option>
              <option value="month">Is mahine</option>
              <option value="all">Sabhi</option>
            </select>
            <select
              className="dash-inp"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {ACT_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            {session && session.isHead && (
              <select
                className="dash-inp"
                value={store}
                onChange={(e) => setStore(e.target.value)}
              >
                <option value="ALL">All stores</option>
                {STORE_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {branchLabel(s)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="act-body">
          {rows.length === 0 ? (
            <div className="empty" style={{ padding: '44px 0' }}>
              Is filter mein koi update nahi
            </div>
          ) : (
            days.map((ds) => (
              <div key={ds}>
                <div className="act-day">{actDayLabel(ds)}</div>
                {byDay[ds].map(({ ev, d, key }) => {
                  const k = actKind(ev);
                  const Ico = actIconOf(k);
                  const c = k === 'delete' ? T.red : stageColorOf(ev.stage);
                  const soft =
                    k === 'delete' ? T.redSoft : stageMeta(ev.stage).soft;
                  const fields =
                    ev.fields && typeof ev.fields === 'object'
                      ? Object.entries(ev.fields).filter(
                          ([, v]) => v !== '' && v !== null && v !== undefined,
                        )
                      : [];
                  return (
                    <button
                      key={key}
                      className="act-row"
                      onClick={() => onOpen(d)}
                    >
                      <div
                        className="act-ico"
                        style={{ background: soft, color: c }}
                      >
                        <Ico size={15} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="act-line">
                          <span className="act-what" style={{ color: c }}>
                            {actTitle(ev)}
                          </span>
                          <span className="act-time">{actTime(ev.ts)}</span>
                        </div>
                        <div className="act-who">
                          <UserCog size={12} />{' '}
                          <span className="ellip">{actorText(ev)}</span>
                        </div>
                        <div className="act-sub">
                          <span className="act-cust">{d.customer}</span>
                          <span className="act-dot">·</span>
                          <span className="ellip">{d.id}</span>
                          {session && session.isHead && (
                            <>
                              <span className="act-dot">·</span>
                              <span>{branchLabel(d.branch)}</span>
                            </>
                          )}
                        </div>
                        {fields.length > 0 && (
                          <div className="act-fields">
                            {fields.map(([fk, fv]) => (
                              <span key={fk} className="act-chip">
                                <b>{fk}:</b> {String(fv)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        size={16}
                        color={T.inkSoft}
                        style={{ flexShrink: 0, alignSelf: 'center' }}
                      />
                    </button>
                  );
                })}
              </div>
            ))
          )}
          <div className="act-foot">
            Purane updates mein naam nahi dikhega — "kisne kiya" ab se save
            hona shuru hua hai.
          </div>
        </div>
      </div>
    </div>
  );
}

function StyleTag() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
      body { color: ${T.ink}; background: ${T.beige}; }
      #root { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; text-align: left !important; }

      /* ── EMBED MODE (Zoho iframe): app poora frame bhare (100vh = iframe height) ── */
      .hjs-embed .track-wrap, .hjs-embed .login-wrap { min-height: 100vh; }
      button { color: inherit; font-family: inherit; }
      h1, h2, h3 { color: ${T.ink}; }
      .ellip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .spin { animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      ::-webkit-scrollbar { width: 9px; height: 9px; }
      ::-webkit-scrollbar-thumb { background: #cfc8b8; border-radius: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }

      .sidebar { width: 240px; flex-shrink: 0; background: linear-gradient(180deg,${T.forest},${T.forestSoft}); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; }
      .brand { display: flex; align-items: center; gap: 11px; }
      .brand-badge { width: 40px; height: 40px; border-radius: 12px; background: ${T.green}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(46,125,50,.35); }
      .nav-item { display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 11px; font-size: 13.5px; font-weight: 600; margin-bottom: 3px; transition: background .15s; }
      .nav-item:hover { background: rgba(255,255,255,.07); }
      .soon { font-size: 9.5px; text-transform: uppercase; letter-spacing: .5px; background: rgba(255,255,255,.12); padding: 2px 6px; border-radius: 6px; color: rgba(255,255,255,.7); }
      .store-tag { margin: 12px; padding: 12px 14px; border-radius: 13px; background: rgba(255,255,255,.08); display: flex; align-items: center; gap: 10px; }

      .topbar { height: 64px; background: rgba(251,249,244,.85); backdrop-filter: blur(10px); border-bottom: 1px solid ${T.line}; display: flex; align-items: center; justify-content: space-between; padding: 0 30px; position: sticky; top: 0; z-index: 20; gap: 20px; }
      .topbar-search { width: 100%; height: 40px; border: 1px solid ${T.line}; border-radius: 11px; padding: 0 14px 0 40px; font-size: 13.5px; font-family: inherit; background: #fff; outline: none; color: ${T.ink}; }
      .topbar-search:focus { border-color: ${T.green}; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }
      .icon-btn { position: relative; width: 38px; height: 38px; border-radius: 10px; border: 1px solid ${T.line}; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .icon-btn:hover { background: ${T.beige}; }
      .icon-btn .dot { position: absolute; top: 9px; right: 10px; width: 7px; height: 7px; border-radius: 50%; background: ${T.amber}; border: 2px solid #fff; }
      .avatar { width: 36px; height: 36px; border-radius: 50%; background: ${T.green}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
      .live-chip { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; padding: 7px 13px; border-radius: 20px; }
      .store-switch { border: 1px solid ${T.line}; background: #fff; border-radius: 10px; padding: 8px 12px 8px 34px; font-size: 13px; font-weight: 700; font-family: inherit; color: ${T.ink}; cursor: pointer; outline: none; appearance: none; }
      .store-switch:focus { border-color: ${T.green}; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }
      .login-err { background: ${T.redSoft}; border: 1px solid #e9cfc4; color: ${T.red}; padding: 10px 13px; border-radius: 11px; font-size: 12.5px; font-weight: 600; text-align: center; }

      .err { display: flex; gap: 12px; background: ${T.redSoft}; border: 1px solid #e9cfc4; color: ${T.red}; padding: 14px 16px; border-radius: 14px; margin-bottom: 20px; font-size: 13.5px; }
      .loading { text-align: center; color: ${T.inkSoft}; padding: 50px; font-size: 14px; }

      .stat-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; margin-bottom: 26px; }
      .stat-grid.three { grid-template-columns: repeat(3,minmax(0,1fr)); }
      .stat-card { background: #fff; border: 1px solid ${T.line}; border-radius: 18px; padding: 18px 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 1px 2px rgba(20,57,43,.04); cursor: pointer; text-align: left; font-family: inherit; color: ${T.ink}; width: 100%; transition: transform .12s, box-shadow .12s, border-color .12s; }
      .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(20,57,43,.09); border-color: #d8d1c0; }
      .stat-ico { width: 46px; height: 46px; border-radius: 13px; display: flex; align-items: center; justify-content: center; }
      .drill-head { display: flex; align-items: center; gap: 10px; margin: 4px 0 16px; }
      .arch-select { font-size: 17px; font-weight: 800; font-family: inherit; color: ${T.ink}; border: 1px solid ${T.line}; background: #fff; border-radius: 10px; padding: 7px 12px; cursor: pointer; outline: none; }
      .arch-select:focus { border-color: ${T.green}; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }

      /* ── layout toggle (Stages / Categories) ── */
      .view-range { display: inline-flex; align-items: center; gap: 6px; }
      .mx-arrow { color: ${T.inkSoft}; font-weight: 700; }
      .layout-toggle { display: inline-flex; background: #fff; border: 1px solid ${T.line}; border-radius: 11px; padding: 3px; gap: 3px; }
      .lt-btn { display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent; padding: 8px 13px; border-radius: 9px; font-size: 12.5px; font-weight: 700; font-family: inherit; color: ${T.inkSoft}; cursor: pointer; }
      .lt-btn.active { background: ${T.forest}; color: #fff; }

      /* ── categories (collapsible stat categories) ── */
      .cat-list { display: flex; flex-direction: column; gap: 14px; }
      .cat-sec { background: #fff; border: 1px solid ${T.line}; border-top: 3px solid ${T.line}; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 2px rgba(20,57,43,.04); }
      .cat-head { width: 100%; display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: #fff; border: none; cursor: pointer; font-family: inherit; color: ${T.ink}; }
      .cat-head:hover { background: ${T.cream}; }
      .cat-ico { width: 44px; height: 44px; border-radius: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .cat-body { padding: 14px 16px 18px; border-top: 1px solid ${T.line}; background: ${T.cream}; }
      .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }

      .hjs-pickups .board { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 12px; align-items: start; }
      .column { background: #FBF9F4; border: 1px solid ${T.line}; border-radius: 14px; padding: 6px; overflow: hidden; }
      .hjs-pickups .column:nth-child(1) { border-top: 3px solid ${T.slate}; }
      .hjs-pickups .column:nth-child(2) { border-top: 3px solid ${T.blue}; }
      .hjs-pickups .column:nth-child(3) { border-top: 3px solid ${T.amber}; }
      .hjs-pickups .column:nth-child(4) { border-top: 3px solid ${T.violet}; }
      .hjs-pickups .column:nth-child(5) { border-top: 3px solid ${T.green}; }
      .col-head { display: flex; align-items: center; gap: 8px; padding: 12px 12px 10px; }
      .col-pip { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .col-count { margin-left: auto; font-size: 11.5px; font-weight: 800; min-width: 22px; height: 22px; border-radius: 7px; display: flex; align-items: center; justify-content: center; padding: 0 6px; }
      .col-body { display: flex; flex-direction: column; gap: 10px; padding: 4px; min-height: 40px; }
      .empty { text-align: center; font-size: 12px; color: ${T.inkSoft}; padding: 18px 0; }

      .card { background: #fff; border: 1px solid ${T.line}; border-radius: 15px; padding: 14px; cursor: pointer; transition: transform .12s, box-shadow .12s, border-color .12s; }
      .card:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(20,57,43,.09); border-color: #d8d1c0; }
      .eq-ico { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .card-name { font-weight: 800; font-size: 15px; letter-spacing: -0.3px; line-height: 1.25; color: ${T.ink}; overflow-wrap: anywhere; }
      .card-id { font-size: 11px; color: ${T.inkSoft}; margin-top: 2px; }
      .card-equip { font-size: 12px; color: ${T.inkSoft}; margin-top: 10px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .card-meta { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 9px; }
      .card-meta span { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: ${T.inkSoft}; }
      .card-next { width: 100%; margin-top: 12px; border: 1px dashed ${T.line}; background: ${T.cream}; border-radius: 10px; padding: 8px; font-size: 12.5px; font-weight: 700; color: ${T.green}; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; font-family: inherit; }
      .card-next.is-open { background: ${T.mint}; border-style: solid; border-color: ${T.green}; }
      .inline-move { margin-top: 10px; border-top: 1px solid ${T.line}; padding-top: 12px; }
      .inline-move .modal-body { display: flex; flex-direction: column; gap: 13px; max-height: none; overflow: visible; padding: 0; }
      .inline-move .modal-foot { padding: 12px 0 2px; border-top: none; margin-top: 2px; }
      /* card ke andar wala inline form — lamba button hone pe footer bahar
         nikal jaata tha (justify-end + no wrap). Ab wrap hoke andar rehta hai. */
      .inline-move .modal-foot { flex-wrap: wrap; gap: 8px; }
      .inline-move .modal-foot .btn-ghost,
      .inline-move .modal-foot .btn-primary { flex: 1 1 auto; min-width: 0; padding: 12px 14px; text-align: center; }
      .card-next:hover { background: ${T.mint}; border-color: ${T.green}; }
      .card-done { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; font-size: 12.5px; font-weight: 700; color: ${T.green}; background: ${T.mint}; border-radius: 10px; padding: 8px; }
      .card.is-cancelled { background: #FCEFEA; border-color: #EAD0C6; }
      .card.is-cancelled:hover { border-color: #DFB9AC; }
      /* Rescheduled — pending hi hai, bas alag rang aur badge */
      .card.is-resched { background: #FDF6EA; border-color: #EEDFC2; }
      .card.is-resched:hover { border-color: #E2CB9F; }
      .resched-chip { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 10px; background: ${T.amberSoft}; color: ${T.amber}; border-radius: 9px; padding: 6px 10px; font-size: 11.5px; font-weight: 800; }
      .resched-note { font-weight: 600; opacity: .85; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
      .cancel-note { display: flex; align-items: flex-start; gap: 10px; background: ${T.redSoft}; border: 1px solid #e9cfc4; color: ${T.red}; border-radius: 12px; padding: 12px 14px; margin-top: 14px; font-size: 13.5px; }

      .foot-total { margin-top: 28px; padding-top: 16px; border-top: 1px solid ${T.line}; text-align: center; font-size: 13px; color: ${T.inkSoft}; font-weight: 700; }

      .overlay { position: fixed; inset: 0; background: rgba(20,40,32,.42); backdrop-filter: blur(3px); z-index: 50; display: flex; animation: fade .18s ease; }
      .overlay.center { align-items: center; justify-content: center; padding: 20px; }
      @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
      .drawer { margin-left: auto; width: 470px; max-width: 94vw; height: 100%; background: ${T.cream}; overflow-y: auto; padding: 22px; animation: slidein .24s cubic-bezier(.2,.8,.2,1); text-align: left; }
      @keyframes slidein { from { transform: translateX(30px); opacity: .6 } to { transform: none; opacity: 1 } }
      .drawer-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; gap: 10px; }
      .stage-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 6px 11px; border-radius: 20px; }

      .kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; background: #fff; border: 1px solid ${T.line}; border-radius: 14px; padding: 14px; }
      .kv { min-width: 0; }
      .kv-label { font-size: 10px; color: ${T.inkSoft}; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
      .kv-val { font-size: 13px; font-weight: 600; margin-top: 2px; color: ${T.ink}; word-break: break-word; }
      .sec-title { font-size: 12.5px; font-weight: 800; margin: 18px 0 8px; color: ${T.ink}; display: flex; align-items: center; gap: 6px; }
      .mini-edit { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: ${T.green}; background: ${T.mint}; border: 1px solid ${T.mint}; border-radius: 8px; padding: 4px 9px; cursor: pointer; font-family: inherit; }
      .mini-edit:hover { background: #dcebdd; }
      .edit-btn { width: 100%; margin-top: 14px; border: 1px solid ${T.green}; background: ${T.mint}; color: ${T.green}; border-radius: 11px; padding: 11px; font-weight: 700; font-size: 13px; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
      .edit-btn:hover { background: #dcebdd; }

      .flag-note { border-radius: 12px; padding: 11px 13px; font-size: 12.5px; font-weight: 600; line-height: 1.45; }
      .flag-note b { font-weight: 800; }
      .danger-zone { margin-top: 24px; padding-top: 16px; border-top: 1px dashed #e9cfc4; }
      .danger-confirm { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .btn-danger { background: ${T.redSoft}; color: ${T.red}; border: 1px solid #e9cfc4; border-radius: 11px; padding: 11px 16px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 7px; transition: background .12s, border-color .12s; }
      .btn-danger:hover { background: #F2D9D0; border-color: #DFB9AC; }
      .req-note { font-size: 11.5px; font-weight: 600; color: ${T.amber}; background: ${T.amberSoft}; border-radius: 9px; padding: 8px 11px; margin-top: -6px; line-height: 1.45; }
      .tp-preview { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 800; color: ${T.green}; margin-top: 6px; }
      .tp12 { display: flex; align-items: center; gap: 7px; }
      .tp12 .inp { flex: 1; min-width: 0; padding: 11px 8px; text-align: center; cursor: pointer; }
      .tp12 .inp:last-child { flex: 0 0 84px; }
      .tp12-sep { font-weight: 800; color: ${T.inkSoft}; }
      .photo-up { border: 1px dashed ${T.line}; border-radius: 12px; padding: 12px; background: ${T.cream}; }
      .photo-up-label { font-size: 12px; font-weight: 700; color: ${T.ink}; margin-bottom: 9px; }
      .photo-btns { display: flex; gap: 9px; }
      .photo-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid ${T.green}; background: ${T.green}; color: #fff; border-radius: 10px; padding: 11px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; }
      .photo-btn.alt { background: #fff; color: ${T.green}; }
      .photo-btn:disabled { opacity: .6; cursor: default; }
      .photo-preview { position: relative; }
      .photo-preview img { width: 100%; max-height: 240px; object-fit: cover; border-radius: 10px; display: block; border: 1px solid ${T.line}; }
      .photo-remove { position: absolute; top: 8px; right: 8px; display: inline-flex; align-items: center; gap: 5px; background: rgba(20,32,26,.82); color: #fff; border: none; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; }
      .kv-photo { grid-column: 1 / -1; display: block; border-radius: 10px; overflow: hidden; border: 1px solid ${T.line}; }
      .kv-photo img { width: 100%; max-height: 220px; object-fit: cover; display: block; }

      .created-note { margin-top: 22px; padding-top: 14px; border-top: 1px solid ${T.line}; font-size: 11.5px; color: ${T.inkSoft}; text-align: center; }
      .created-note b { color: ${T.ink}; font-weight: 700; }
      .timeline { margin-bottom: 8px; }
      .tl-row { display: flex; gap: 12px; }
      .tl-marker { display: flex; flex-direction: column; align-items: center; }
      .tl-dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 3px; box-shadow: 0 0 0 3px ${T.cream}; z-index: 1; }
      .tl-line { flex: 1; width: 2px; margin: 2px 0; min-height: 14px; }
      .tl-note { font-size: 11.5px; color: ${T.inkSoft}; margin-top: 2px; }
      .tl-field { font-size: 12px; color: ${T.inkSoft}; margin-top: 2px; font-weight: 500; line-height: 1.4; }
      .tl-field b { font-weight: 700; color: ${T.ink}; }

      .stage-picker { display: flex; flex-wrap: wrap; gap: 10px; }
      .stage-pick-btn { flex: 1 1 110px; min-width: 104px; border: 1.5px solid; border-radius: 12px; padding: 14px 10px; font-size: 15px; font-weight: 800; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: transform .1s, box-shadow .12s; }
      .stage-pick-btn:hover { transform: translateY(-1px); }
      .stage-pick-btn.is-next { border-width: 2.5px; box-shadow: 0 3px 12px rgba(20,57,43,.12); }

      .next-hint { display: flex; align-items: center; gap: 9px; background: ${T.cream}; border: 1px solid ${T.line}; border-radius: 12px; padding: 12px 14px; font-size: 14px; color: ${T.ink}; margin-bottom: 12px; line-height: 1.4; }
      .next-hint b { font-weight: 800; }
      .next-hint .col-pip { width: 10px; height: 10px; }
      .next-hint.done { background: ${T.mint}; border-color: #cfe3d0; color: ${T.green}; font-weight: 800; }
      .next-badge { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; padding: 4px 10px; border-radius: 8px; }
      .sec-title.stage-block-title { font-size: 15px; }
      .block-next-note { font-size: 12.5px; color: ${T.inkSoft}; margin-top: 8px; background: ${T.cream}; border: 1px dashed ${T.line}; border-radius: 10px; padding: 8px 11px; }
      .block-next-note b { color: ${T.ink}; font-weight: 800; }

      .tb-search { position: relative; flex: 1; max-width: 420px; }
      .tb-brand { display: none; align-items: center; gap: 9px; }
      .tb-brand span { font-weight: 800; font-size: 15px; letter-spacing: -0.3px; color: ${T.forest}; }
      .tb-actions { display: flex; align-items: center; gap: 12px; }
      .tb-user { display: flex; align-items: center; gap: 10px; }
      .lang-toggle { display: inline-flex; background: #fff; border: 1px solid ${T.line}; border-radius: 10px; padding: 2px; gap: 2px; }
      .lang-btn { border: none; background: transparent; padding: 6px 10px; border-radius: 8px; font-size: 12.5px; font-weight: 800; font-family: inherit; color: ${T.inkSoft}; cursor: pointer; }
      .lang-btn.active { background: ${T.forest}; color: #fff; }
      /* phone pe sidebar chhup jaata hai — head login ke liye page switcher
         yahan topbar mein aa jaata hai (laptop pe sidebar hi kaafi hai) */
      .page-switch { display: none; border: 1px solid ${T.line}; background: #fff; border-radius: 10px; padding: 7px 10px; font-size: 12.5px; font-weight: 700; font-family: inherit; color: ${T.ink}; cursor: pointer; outline: none; max-width: 150px; }
      .page-switch:focus { border-color: ${T.green}; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }
      @media (max-width: 860px) { .page-switch { display: block; } }
      .search-dd { position: absolute; top: 48px; left: 0; right: 0; background: #fff; border: 1px solid ${T.line}; border-radius: 13px; box-shadow: 0 14px 34px rgba(20,57,43,.16); z-index: 60; max-height: 380px; overflow-y: auto; padding: 6px; }
      .search-row { display: flex; flex-direction: column; gap: 3px; width: 100%; text-align: left; background: transparent; border: none; padding: 10px 11px; border-radius: 10px; cursor: pointer; font-family: inherit; }
      .search-row:hover { background: ${T.cream}; }
      .search-row-main { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .search-name { font-size: 13.5px; font-weight: 700; color: ${T.ink}; min-width: 0; }
      .search-tag { flex-shrink: 0; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; padding: 2px 7px; border-radius: 6px; }
      .search-tag.today { background: ${T.mint}; color: ${T.green}; }
      .search-tag.arch { background: ${T.slateSoft}; color: ${T.slate}; }
      .search-tag.cancel { background: ${T.redSoft}; color: ${T.red}; }
      .search-row.is-cancelled { background: #FCF2EF; }
      .search-row.is-cancelled:hover { background: #F8E6E0; }
      .search-sub { font-size: 11.5px; color: ${T.inkSoft}; }
      .search-empty { padding: 14px; text-align: center; font-size: 12.5px; color: ${T.inkSoft}; }
      .m-board { display: flex; flex-direction: column; gap: 12px; }
      .m-sec { background: #fff; border: 1px solid ${T.line}; border-top: 3px solid ${T.line}; border-radius: 14px; overflow: hidden; }
      .m-sec-head { width: 100%; display: flex; align-items: center; gap: 10px; padding: 15px 14px; background: #fff; border: none; cursor: pointer; font-family: inherit; text-align: left; color: ${T.ink}; }
      .m-sec-body { padding: 8px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid ${T.line}; background: ${T.cream}; }

      .modal { width: 470px; max-width: 100%; max-height: 90vh; overflow-y: auto; background: ${T.cream}; border-radius: 20px; animation: pop .2s cubic-bezier(.2,.8,.2,1); text-align: left; }
      @keyframes pop { from { transform: scale(.96); opacity: 0 } to { transform: none; opacity: 1 } }
      .modal-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 20px 14px; border-bottom: 1px solid ${T.line}; gap: 10px; }
      .modal-body { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
      .modal-foot { padding: 14px 20px; border-top: 1px solid ${T.line}; display: flex; gap: 10px; justify-content: flex-end; }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

      .field { display: flex; flex-direction: column; gap: 6px; }
      .field-label { font-size: 12px; font-weight: 700; color: ${T.ink}; }
      .inp { width: 100%; border: 1px solid ${T.line}; border-radius: 11px; padding: 11px 13px; font-size: 13.5px; font-family: inherit; background: #fff; outline: none; color: ${T.ink}; }
      .inp:focus { border-color: ${T.green}; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }
      /* native date/time picker icon — proper calendar / clock (green).
         Manual typing bhi chalti hai; icon sirf picker kholne ke liye hai. */
      .inp[type="date"], .inp[type="time"], .inp[type="datetime-local"] { cursor: pointer; }
      .inp[type="date"]::-webkit-calendar-picker-indicator,
      .inp[type="time"]::-webkit-calendar-picker-indicator,
      .inp[type="datetime-local"]::-webkit-calendar-picker-indicator { opacity: 1; cursor: pointer; width: 19px; height: 19px; padding: 0; margin-left: 6px; background-repeat: no-repeat; background-position: center; background-size: 19px 19px; }
      .inp[type="date"]::-webkit-calendar-picker-indicator,
      .inp[type="datetime-local"]::-webkit-calendar-picker-indicator { background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%232E7D32'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Crect%20width='18'%20height='18'%20x='3'%20y='4'%20rx='2'/%3E%3Cline%20x1='16'%20x2='16'%20y1='2'%20y2='6'/%3E%3Cline%20x1='8'%20x2='8'%20y1='2'%20y2='6'/%3E%3Cline%20x1='3'%20x2='21'%20y1='10'%20y2='10'/%3E%3C/svg%3E"); }
      .inp[type="time"]::-webkit-calendar-picker-indicator { background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%232E7D32'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Ccircle%20cx='12'%20cy='12'%20r='10'/%3E%3Cpolyline%20points='12%206%2012%2012%2016%2014'/%3E%3C/svg%3E"); }
      textarea.inp { resize: vertical; }

      .check1 { display: flex; align-items: center; gap: 10px; border: 1px solid ${T.line}; background: #fff; border-radius: 11px; padding: 12px 13px; cursor: pointer; font-family: inherit; text-align: left; }
      .check-box { width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

      .btn-primary { background: ${T.green}; color: #fff; border: none; border-radius: 11px; padding: 12px 18px; font-size: 13.5px; font-weight: 700; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(46,125,50,.28); }
      .btn-primary:hover { background: #276b2b; }
      .btn-primary:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
      .btn-ghost { background: #fff; color: ${T.ink}; border: 1px solid ${T.line}; border-radius: 11px; padding: 12px 18px; font-size: 13.5px; font-weight: 700; font-family: inherit; cursor: pointer; }
      .btn-ghost:hover { background: ${T.beige}; }

      .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: ${T.forest}; color: #fff; padding: 13px 20px; border-radius: 13px; font-size: 13.5px; font-weight: 600; z-index: 80; display: flex; align-items: center; gap: 9px; box-shadow: 0 10px 30px rgba(20,57,43,.35); animation: up .25s ease; max-width: 90vw; }
      @keyframes up { from { transform: translate(-50%,14px); opacity: 0 } to { transform: translate(-50%,0); opacity: 1 } }

      .login-wrap { display: grid; grid-template-columns: 1.05fr .95fr; min-height: 100vh; }
      .login-hero { background: linear-gradient(150deg,${T.forest} 0%,${T.forestSoft} 55%,#256b45 100%); color: #fff; padding: 54px 56px; position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; }
      .hero-glow { position: absolute; width: 460px; height: 460px; border-radius: 50%; background: radial-gradient(circle, rgba(61,154,66,.5), transparent 65%); top: -120px; right: -120px; }
      .hero-h1 { font-size: 44px; line-height: 1.06; font-weight: 800; letter-spacing: -1.2px; margin: 30px 0 16px; color: #fff; }
      .hero-p { font-size: 15px; line-height: 1.6; opacity: .82; max-width: 400px; margin: 0; }
      .hero-chips { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 26px; }
      .hero-chip { font-size: 12.5px; font-weight: 600; padding: 7px 13px; border-radius: 20px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18); }
      .hero-flow { display: flex; align-items: center; gap: 10px; margin-top: 40px; flex-wrap: wrap; padding-top: 26px; border-top: 1px solid rgba(255,255,255,.14); }
      .flow-dot { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; opacity: .92; }
      .flow-pip { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
      .login-form { background: ${T.beige}; display: flex; align-items: center; justify-content: center; padding: 40px; }
      .glass-card { width: 100%; max-width: 380px; background: rgba(255,255,255,.75); backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,.9); border-radius: 22px; padding: 30px; box-shadow: 0 20px 50px rgba(20,57,43,.14); display: flex; flex-direction: column; gap: 15px; }

      /* ── customer track page ── */
      .track-wrap { min-height: 100vh; background: ${T.beige}; }
      .track-topbar { background: #fff; border-bottom: 1px solid ${T.line}; padding: 14px 20px; position: sticky; top: 0; z-index: 10; }
      .track-body { max-width: 560px; margin: 0 auto; padding: 24px 16px 60px; }
      .track-card { background: rgba(255,255,255,.9); border: 1px solid ${T.line}; border-radius: 20px; padding: 24px; box-shadow: 0 10px 30px rgba(20,57,43,.06); display: flex; flex-direction: column; gap: 14px; }
      .track-h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.4px; margin: 0; color: ${T.ink}; }
      .track-sub { font-size: 13.5px; color: ${T.inkSoft}; margin: -6px 0 4px; line-height: 1.5; }
      .phone-row { display: flex; gap: 10px; }
      .track-inv { display: inline-flex; align-items: center; align-self: flex-start; background: ${T.mint}; color: ${T.green}; border: 1px solid #cfe3d0; border-radius: 10px; padding: 7px 12px; font-size: 12.5px; font-weight: 700; margin: -2px 0 2px; }
      .phone-row .code-fixed { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 0 14px; border: 1px solid ${T.line}; border-radius: 11px; background: ${T.beige}; font-size: 14px; font-weight: 800; color: ${T.ink}; }
      .phone-row .phone-input { flex: 1 1 auto; min-width: 0; }
      .track-msg { background: ${T.cream}; border: 1px solid ${T.line}; border-radius: 12px; padding: 12px 14px; font-size: 13px; color: ${T.ink}; margin-top: 6px; }
      .track-result { margin-top: 18px; background: #fff; border: 1px solid ${T.line}; border-radius: 20px; padding: 22px; box-shadow: 0 10px 30px rgba(20,57,43,.06); }
      .track-order { display: flex; align-items: center; gap: 12px; }
      .eq-list { margin: 12px 0 0; padding: 12px 14px; list-style: none; display: flex; flex-direction: column; gap: 7px; background: ${T.mint}; border: 1px solid #cfe3d0; border-radius: 13px; }
      .eq-list li { position: relative; padding-left: 17px; font-size: 12.5px; font-weight: 700; color: ${T.forestSoft}; line-height: 1.4; }
      .eq-list li::before { content: ''; position: absolute; left: 2px; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: ${T.greenBright}; }
      .track-banner { text-align: center; font-weight: 800; font-size: 14px; padding: 12px; border-radius: 13px; margin: 16px 0 4px; }
      .track-tl { margin-top: 14px; }
      .ttl-row { display: flex; gap: 14px; }
      .ttl-left { display: flex; flex-direction: column; align-items: center; }
      .ttl-dot { width: 38px; height: 38px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 0 4px #fff; z-index: 1; }
      .ttl-line { flex: 1; width: 3px; margin: 3px 0; min-height: 26px; border-radius: 3px; }
      .ttl-content { padding-bottom: 22px; padding-top: 4px; }
      .ttl-title { font-size: 15px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ttl-now { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; background: ${T.mint}; color: ${T.green}; padding: 3px 8px; border-radius: 20px; }
      .ttl-now-arrow { color: ${T.green}; flex-shrink: 0; }
      .ttl-desc { font-size: 12.5px; color: ${T.inkSoft}; margin-top: 2px; }
      .ttl-time { font-size: 12px; color: ${T.green}; font-weight: 700; margin-top: 4px; }
      .ttl-extra { margin-top: 8px; background: ${T.cream}; border: 1px solid ${T.line}; border-radius: 11px; padding: 10px 12px; font-size: 12.5px; color: ${T.ink}; line-height: 1.6; }
      .ttl-extra b { font-weight: 700; }
      .track-foot { text-align: center; font-size: 11.5px; color: ${T.inkSoft}; margin-top: 22px; }
      .track-back { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid ${T.line}; border-radius: 10px; padding: 9px 14px; font-size: 13px; font-weight: 700; font-family: inherit; color: ${T.ink}; cursor: pointer; margin-bottom: 14px; }
      .track-back:hover { background: ${T.beige}; }
      .sales-list { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
      .sales-list-head { font-size: 12px; font-weight: 700; color: ${T.inkSoft}; text-transform: uppercase; letter-spacing: .4px; padding: 0 2px; }
      .sgroup { margin-top: 18px; }
      .sgroup:first-child { margin-top: 8px; }
      .sgroup-head { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: ${T.ink}; text-transform: uppercase; letter-spacing: .4px; padding: 0 2px; }
      .sgroup-dot { width: 9px; height: 9px; border-radius: 50%; }
      .sgroup-count { margin-left: 4px; font-size: 12px; font-weight: 800; color: ${T.inkSoft}; background: ${T.cream}; border: 1px solid ${T.line}; border-radius: 999px; padding: 1px 9px; }
      /* sales pickup detail — upar delivery ka collapsed hissa */
      .dphase { margin-bottom: 16px; }
      .dphase-body { background: #fff; border: 1px solid ${T.line}; border-radius: 14px; padding: 16px 16px 4px; margin-top: 8px; }
      .phase-collapse { width: 100%; display: flex; align-items: center; gap: 10px; background: ${T.mint}; border: 1px solid #cfe3d0; border-radius: 13px; padding: 12px 14px; font-size: 13.5px; font-weight: 800; color: ${T.green}; font-family: inherit; cursor: pointer; }
      .phase-tick { width: 22px; height: 22px; border-radius: 50%; background: ${T.green}; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .phase-link { font-size: 12px; font-weight: 700; opacity: .85; }
      .sales-listbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; }
      .sales-search { display: flex; align-items: center; gap: 7px; background: #fff; border: 1px solid ${T.line}; border-radius: 11px; padding: 8px 12px; min-width: 220px; flex: 1; max-width: 340px; }
      .sales-search input { border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: ${T.ink}; width: 100%; }
      .sales-row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: #fff; border: 1px solid ${T.line}; border-radius: 15px; padding: 13px 14px; cursor: pointer; font-family: inherit; color: ${T.ink}; transition: transform .12s, box-shadow .12s, border-color .12s; }
      /* Sales matrix — toolbar + polished light table */
      .mx-toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
      .mx-search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid ${T.line}; border-radius: 12px; padding: 10px 14px; flex: 1; min-width: 220px; }
      .mx-search input { border: none; outline: none; background: transparent; font-family: inherit; font-size: 14px; color: ${T.ink}; width: 100%; }
      .mx-daterow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .mx-select { border: 1px solid ${T.line}; background: #fff; border-radius: 12px; padding: 10px 14px; font-size: 13.5px; font-weight: 600; font-family: inherit; color: ${T.ink}; cursor: pointer; }
      .mx-range { display: inline-flex; align-items: center; gap: 6px; }
      .mx-date { border: 1px solid ${T.line}; background: #fff; border-radius: 12px; padding: 9px 12px; font-size: 13px; font-family: inherit; color: ${T.ink}; cursor: pointer; }
      .mx-arrow { color: ${T.inkSoft}; font-weight: 700; }
      .mx-caption { font-size: 12.5px; font-weight: 600; color: ${T.inkSoft}; margin-bottom: 12px; }
      .matrix-wrap { overflow-x: auto; border: 1px solid ${T.line}; border-radius: 16px; background: #fff; box-shadow: 0 1px 3px rgba(20,57,43,.04); }
      .matrix { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 14.5px; }
      .matrix th, .matrix td { padding: 15px 16px; text-align: center; white-space: nowrap; }
      .matrix thead th { font-size: 12.5px; font-weight: 800; color: ${T.green}; text-transform: uppercase; letter-spacing: .5px; background: ${T.mint}; border-bottom: 1px solid ${T.line}; }
      .mx-hclick { cursor: pointer; }
      .mx-hclick:hover { background: ${T.green}; color: #fff; }
      .matrix tbody td { border-bottom: 1px solid #F1EFE8; }
      .matrix tbody tr:last-child td { border-bottom: none; }
      .matrix tbody tr:nth-child(even) td { background: #FBFAF6; }
      .matrix tbody tr:hover td { background: ${T.mint}; }
      .mx-sticky { position: sticky; left: 0; z-index: 2; text-align: left !important; background: #fff; box-shadow: 1px 0 0 ${T.line}; }
      .matrix thead .mx-sticky { background: ${T.mint}; }
      .matrix tbody tr:nth-child(even) .mx-sticky { background: #FBFAF6; }
      .matrix tbody tr:nth-child(odd) .mx-sticky { background: #fff; }
      .matrix tbody tr:hover .mx-sticky { background: ${T.mint}; }
      .mx-store { min-width: 64px; }
      .mx-name { font-weight: 700; color: ${T.ink}; min-width: 210px; font-size: 14px; }
      .mx-nclick { cursor: pointer; }
      .mx-nclick:hover { color: ${T.green}; text-decoration: underline; }
      .mx-cell { font-weight: 800; font-size: 15.5px; }
      .mx-click { color: ${T.green}; cursor: pointer; }
      .mx-click:hover { text-decoration: underline; }
      .mx-zero { color: #D0CEC4; font-weight: 500; }
      .mx-total { font-weight: 800; color: ${T.ink}; background: #F4F2EB !important; font-size: 15px; }
      .mx-tclick { cursor: pointer; }
      .mx-tclick:hover { color: ${T.green}; text-decoration: underline; }
      .matrix thead .mx-total { color: ${T.green}; background: ${T.mint} !important; }
      .mx-footer td { border-top: 2px solid ${T.line}; font-weight: 800; background: #F4F2EB !important; }
      .mx-footer .mx-sticky { background: #F4F2EB !important; }
      /* Sales-only order details card */
      .soc { background: #fff; border: 1px solid ${T.line}; border-radius: 16px; padding: 18px 18px 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(20,57,43,.04); }
      .soc-head { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 1px solid #F1EFE8; margin-bottom: 4px; }
      .soc-cust { font-size: 17px; font-weight: 800; color: ${T.ink}; }
      .soc-inv { font-size: 12.5px; color: ${T.inkSoft}; font-weight: 600; margin-top: 2px; }
      .soc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
      .soc-item { padding: 11px 4px; border-bottom: 1px solid #F5F3EC; }
      .soc-item:nth-child(odd) { padding-right: 16px; }
      .soc-k { font-size: 11px; font-weight: 700; color: ${T.inkSoft}; text-transform: uppercase; letter-spacing: .3px; margin-bottom: 3px; }
      .soc-v { font-size: 14px; font-weight: 600; color: ${T.ink}; }
      @media (max-width: 560px) { .soc-grid { grid-template-columns: 1fr; } }
      .sales-row:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(20,57,43,.09); border-color: #d8d1c0; }
      .sales-row.is-cancelled { background: #FCEFEA; border-color: #EAD0C6; }
      .sales-row.is-cancelled:hover { border-color: #DFB9AC; }
      .sales-row-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .sales-chip { flex-shrink: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; padding: 3px 9px; border-radius: 8px; }
      .sales-sub { font-size: 12.5px; color: ${T.inkSoft}; margin-top: 3px; font-weight: 600; }
      .sales-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
      .sales-meta span { font-size: 11.5px; color: ${T.inkSoft}; max-width: 100%; }

      /* ── DASHBOARD ── */
      .dash-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
      .dash-sub { font-size: 12.5px; color: ${T.inkSoft}; font-weight: 600; }
      .dash-filters { display: flex; gap: 8px; flex-wrap: wrap; }
      .dash-inp { border: 1px solid ${T.line}; border-radius: 10px; padding: 9px 12px; font-size: 13px; font-weight: 600; font-family: inherit; background: #fff; color: ${T.ink}; cursor: pointer; }
      /* dashboard ke date inputs pe bhi wahi green calendar icon (warna
         icon default light-grey hota hai aur beige background mein chhup jaata) */
      .dash-inp[type="date"] { cursor: pointer; }
      .dash-inp[type="date"]::-webkit-calendar-picker-indicator { opacity: 1; cursor: pointer; width: 18px; height: 18px; margin-left: 6px; background-repeat: no-repeat; background-position: center; background-size: 18px 18px; background-image: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%232E7D32'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Crect%20width='18'%20height='18'%20x='3'%20y='4'%20rx='2'/%3E%3Cline%20x1='16'%20x2='16'%20y1='2'%20y2='6'/%3E%3Cline%20x1='8'%20x2='8'%20y1='2'%20y2='6'/%3E%3Cline%20x1='3'%20x2='21'%20y1='10'%20y2='10'/%3E%3C/svg%3E"); }
      .dash-cards { display: grid; grid-template-columns: repeat(6,minmax(0,1fr)); gap: 12px; margin-bottom: 20px; }
      .dash-card { text-align: left; border: 1.5px solid ${T.line}; background: #fff; border-radius: 14px; padding: 14px; cursor: pointer; font-family: inherit; transition: transform .1s, box-shadow .12s; }
      .dash-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(20,57,43,.08); }
      .dash-card.on { box-shadow: 0 4px 16px rgba(20,57,43,.12); }
      .dash-card-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
      .dash-card-n { font-size: 26px; font-weight: 800; color: ${T.ink}; line-height: 1; }
      .dash-card-l { font-size: 11.5px; font-weight: 600; color: ${T.inkSoft}; margin-top: 5px; }
      .dash-block { background: #fff; border: 1px solid ${T.line}; border-radius: 16px; padding: 6px; margin-bottom: 20px; overflow: hidden; }
      .dash-block-h { font-size: 13px; font-weight: 800; color: ${T.ink}; padding: 12px 12px 10px; }
      .dash-table-wrap { overflow-x: auto; }
      .dash-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .dash-table th { text-align: left; font-size: 11px; font-weight: 700; color: ${T.inkSoft}; text-transform: uppercase; letter-spacing: .3px; padding: 9px 12px; border-bottom: 1px solid ${T.line}; white-space: nowrap; }
      .dash-table td { padding: 11px 12px; border-bottom: 1px solid ${T.cream}; white-space: nowrap; }
      /* table scroll karte waqt pehla column (Store / Invoice) jama rehta hai */
      .dash-table th:first-child, .dash-table td:first-child { position: sticky; left: 0; z-index: 2; background: #fff; box-shadow: 1px 0 0 ${T.line}; }
      .dash-table thead th:first-child { z-index: 3; }
      .dash-row:hover td:first-child { background: ${T.cream}; }
      .dash-store { font-weight: 700; color: ${T.ink}; }
      .dash-td-click { font-weight: 700; color: ${T.green}; cursor: pointer; }
      .dash-td-click:hover { background: ${T.mint}; }
      .dash-td-zero { color: ${T.line2 || '#C9C7BE'}; }
      .dash-row { cursor: pointer; }
      .dash-row:hover { background: ${T.cream}; }
      .dash-chip { padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
      .dash-empty { text-align: center; color: ${T.inkSoft}; padding: 26px !important; }
      @media (max-width: 1100px) { .dash-cards { grid-template-columns: repeat(3,minmax(0,1fr)); } }
      @media (max-width: 760px) { .dash-cards { grid-template-columns: repeat(2,minmax(0,1fr)); } }

      /* ── activity log (overall history panel) ── */
      .act-panel { margin-left: auto; width: 560px; max-width: 96vw; height: 100%; background: ${T.cream}; display: flex; flex-direction: column; animation: slidein .24s cubic-bezier(.2,.8,.2,1); text-align: left; }
      .act-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 20px 20px 14px; border-bottom: 1px solid ${T.line}; background: #fff; }
      .act-filters { padding: 12px 20px; border-bottom: 1px solid ${T.line}; background: #fff; display: flex; flex-direction: column; gap: 9px; }
      .act-search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid ${T.line}; border-radius: 11px; padding: 9px 13px; }
      .act-search input { border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: ${T.ink}; width: 100%; }
      .act-selects { display: flex; gap: 8px; flex-wrap: wrap; }
      .act-selects .dash-inp { flex: 1 1 auto; min-width: 120px; }
      .act-body { flex: 1; overflow-y: auto; padding: 8px 16px 30px; }
      .act-day { font-size: 11px; font-weight: 800; color: ${T.inkSoft}; text-transform: uppercase; letter-spacing: .5px; padding: 16px 4px 8px; position: sticky; top: 0; background: ${T.cream}; z-index: 1; }
      .act-row { display: flex; gap: 12px; width: 100%; text-align: left; background: #fff; border: 1px solid ${T.line}; border-radius: 14px; padding: 13px 14px; margin-bottom: 9px; cursor: pointer; font-family: inherit; color: ${T.ink}; transition: transform .12s, box-shadow .12s, border-color .12s; }
      .act-row:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(20,57,43,.08); border-color: #d8d1c0; }
      .act-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
      .act-line { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
      .act-what { font-size: 13.5px; font-weight: 800; letter-spacing: -0.2px; }
      .act-time { flex-shrink: 0; font-size: 11.5px; font-weight: 700; color: ${T.inkSoft}; }
      .act-who { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: ${T.forestSoft}; margin-top: 3px; min-width: 0; }
      .act-sub { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11.5px; color: ${T.inkSoft}; margin-top: 3px; }
      .act-cust { font-weight: 700; color: ${T.ink}; }
      .act-dot { color: #C9C7BE; }
      .act-fields { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      .act-chip { font-size: 11px; color: ${T.inkSoft}; background: ${T.cream}; border: 1px solid ${T.line}; border-radius: 8px; padding: 3px 8px; line-height: 1.4; }
      .act-chip b { font-weight: 700; color: ${T.ink}; }
      .act-foot { text-align: center; font-size: 11px; color: ${T.inkSoft}; padding: 20px 10px 4px; line-height: 1.5; }
      @media (max-width: 760px) { .act-panel { width: 100%; max-width: 100%; } .act-body { padding: 6px 12px 26px; } }

      @media (max-width: 1400px) { .hjs-pickups .board { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; } }
      @media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .hjs-pickups .board { grid-template-columns: repeat(2,minmax(0,1fr)); } }
      @media (max-width: 860px) { .login-wrap { grid-template-columns: 1fr; } .login-hero { display: none; } .sidebar { display: none; } .hjs-pickups .board { grid-template-columns: 1fr; } }
      @media (max-width: 760px) {
        .topbar { height: auto; flex-wrap: wrap; padding: 8px 14px; gap: 8px 10px; }
        .tb-brand { display: flex; order: 0; flex: 1 1 auto; min-width: 0; }
        .tb-brand span { font-size: 14px; }
        /* icons apni poori line lete hain aur barabar faila jaate hain —
           warna right mein khaali jagah bach jaati thi */
        .tb-actions { order: 1; flex: 1 1 100%; width: 100%; justify-content: space-between; align-items: center; gap: 6px; }
        .tb-user-text { display: none; }
        /* phone pe avatar ki jagah nahi — naam waise bhi chhupa hua hai */
        .tb-user { display: none; }
        .page-switch { order: 2; flex: 1 1 100%; max-width: none; }
        .tb-search { order: 3; flex: 1 1 100%; max-width: none; }
        .icon-btn { width: 34px; height: 34px; flex-shrink: 0; }
        .lang-btn { padding: 6px 8px; }
        main { padding: 10px 14px 60px !important; }
        main > div:first-child { margin-bottom: 14px !important; }
        h2 { font-size: 22px !important; }
        .drawer { width: 100%; max-width: 100%; padding: 18px 16px; }
        .kv-grid { grid-template-columns: 1fr 1fr; }
        .modal { width: 100%; border-radius: 18px; }
        .glass-card { padding: 24px 20px; }
        /* time input pe AM/PM hamesha dikhe — width thodi zyada rakho */
        .inp[type="time"], .inp[type="datetime-local"] { min-height: 44px; }
      }
      /* phone pe header ke controls (Today / Stages / All stores / chip) ek
         doosre ke saath fit ho jaayein — pehle har ek apni line le leta tha */
      @media (max-width: 760px) {
        .hdr-controls { gap: 8px !important; width: 100%; }
        .hdr-controls > * { flex: 0 1 auto; }
        .store-switch { padding: 8px 10px 8px 30px; font-size: 12.5px; }
        .lt-btn { padding: 8px 11px; font-size: 12px; }
        .live-chip { font-size: 11.5px; padding: 7px 11px; }
        .view-range .dash-inp { padding: 8px 10px; font-size: 12.5px; }
      }
      @media (max-width: 400px) { .stat-grid { grid-template-columns: 1fr 1fr; gap: 12px; } .stat-grid.three { grid-template-columns: 1fr 1fr; } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
    `}</style>
  );
}
