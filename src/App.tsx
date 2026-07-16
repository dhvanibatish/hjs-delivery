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
  Calendar as CalendarIcon,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════
   1) CONFIG  ── url + ANON PUBLIC key (SERVICE_ROLE nahi). Khaali = DEMO.
   ══════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  url: 'https://idcmfebqizovivuvsuns.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY21mZWJxaXpvdml2dXZzdW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NDgxODgsImV4cCI6MjA5OTMyNDE4OH0.miXziOcl5sEo8S6K1WsrHRhCbtEYRgnnUA4gAISUkmM',
  table: 'deliveries',
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
async function sbLogin(store, pw) {
  return sbRpc('staff_login', { p_store: store, p_password: pw });
}
// staff data — returns rows for the store (or all for ALL). Password checked in DB.
async function sbList(store, pw) {
  return sbRpc('staff_list', { p_store: store, p_password: pw });
}
// staff update — stage move/edit. Password + store-scope checked in DB.
async function sbUpdate(store, pw, invoiceId, patch) {
  return sbRpc('staff_update', {
    p_store: store,
    p_password: pw,
    p_invoice: invoiceId,
    p_patch: patch,
  });
}
// public customer tracking — link se invoice + customer ka registered phone
// NOTE: Supabase track_order RPC ab p_invoice + p_phone (poora number) le
async function sbTrack(invoice, phone) {
  return sbRpc('track_order', { p_invoice: invoice, p_phone: phone });
}
// sales team — sirf phone se us customer ki saari deliveries (latest→old).
// p_pin RPC mein verify hota hai — galat PIN pe RPC error deta hai.
async function sbTrackSearch(phone, pin) {
  return sbRpc('track_search', { p_phone: phone, p_pin: pin });
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
  MOH: 'Mohali',
  CHD: 'Chandigarh',
  GGN: 'Gurgaon',
  NCR: 'Delhi NCR',
  NOD: 'Noida',
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
  NOD: 'Dharmendra Singh - 9315573166',
  JAL: 'Bhupinder - 8558892244',
  MOH: 'Rajiv - 8146658040',
  JKP: 'Rajan - 8595353451',
};

/* Delivery persons store-wise. MOH shares CHD, NOD shares NCR. */
const DP = {
  CHD: [
    'Ghola Singh - 8360758647',
    'Surinder - 9115445618',
    'Sanjay - 6239650644',
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
    'MBC',
  ],
  JKP: [
    'Monu - 8766395642',
    'Nitish - 9911814167',
    'Rajankumar Jha - 8595353451',
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
  {
    id: 'new',
    label: 'New Delivery',
    short: 'New Job',
    status: 'New Delivery',
    color: T.slate,
    soft: T.slateSoft,
  },
  {
    id: 'talked',
    label: 'Talked to Customer',
    short: 'Contacted',
    status: 'Talked To Customer',
    color: T.blue,
    soft: T.blueSoft,
  },
  {
    id: 'scheduled',
    label: 'Delivery Scheduled',
    short: 'Scheduled',
    status: 'Delivery Scheduled',
    color: T.amber,
    soft: T.amberSoft,
  },
  {
    id: 'dispatched',
    label: 'Out for Delivery',
    short: 'Dispatched',
    status: 'Out For Delivery',
    color: T.violet,
    soft: T.violetSoft,
  },
  {
    id: 'delivered',
    label: 'Item Delivered',
    short: 'Delivered',
    status: 'Item Delivered',
    color: T.green,
    soft: T.mint,
  },
];
const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);
const stageToStatus = (id) =>
  (STAGES.find((s) => s.id === id) || {}).status || 'New Delivery';
function statusToStage(s) {
  const t = String(s || '').toLowerCase();
  if (t.includes('delet')) return 'deleted'; // "Deleted" — 'deliver' se alag
  if (t.includes('duplicate')) return 'duplicate';
  if (t.includes('renew')) return 'renewal';
  if (t.includes('cancel')) return 'cancelled';
  if (t.includes('new')) return 'new'; // "New Delivery" — 'deliver' se pehle check zaroori
  // NOTE: "Out For Delivery" mein bhi 'deliver' aata hai — isliye ye pehle
  if (t.includes('out for') || t.includes('dispatch')) return 'dispatched';
  if (t.includes('schedul')) return 'scheduled';
  if (t.includes('inspect')) return 'scheduled'; // inspection ab Scheduled ka part hai
  if (t.includes('deliver')) return 'delivered';
  if (t.includes('talk')) return 'talked';
  return 'new'; // naya / unknown record → New Delivery
}

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
  cancelled: 'Cancelled Invoice',
  duplicate: 'Duplicate Invoice',
  renewal: 'Renewal Invoice',
};
const isClosedStage = (s) =>
  s === 'cancelled' || s === 'duplicate' || s === 'renewal' || s === 'deleted';
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
  new: 'Delivery shuru karo',
  talked: 'Customer se baat karke Contacted bharo',
  scheduled: 'Delivery schedule karke details bharo',
  dispatched: 'Item nikal gaya — estimated time bharo',
  delivered: 'Item deliver karke amount bharo',
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

/* app-controlled timeline: each move/edit logs an event with the fields entered */
function stageFields(toStage, f) {
  const rmk = f.remarks ? { Remarks: f.remarks } : {};
  if (toStage === 'new') return {};
  if (toStage === 'talked')
    return { Date: f.date || '—', Time: f.time || '—', ...rmk };
  if (toStage === 'scheduled')
    return {
      'Delivery person': f.person || '—',
      Vehicle: f.vehicle || '—',
      Inspected: f.inspected ? 'Yes' : 'No',
      ...rmk,
    };
  if (toStage === 'dispatched')
    return {
      'Estimated arrival': f.eta ? niceTime(f.eta) || f.eta : '—',
      ...rmk,
    };
  if (toStage === 'delivered')
    return {
      Delivered: f.delivered ? 'Yes' : 'No',
      Amount: `₹${f.amount || 0} · ${f.amountType || '—'}`,
      Security: `₹${f.security || 0} · ${f.securityType || '—'}`,
      ...rmk,
    };
  return {};
}
function makeEvent(toStage, fields, mode) {
  return {
    ts: new Date().toISOString(),
    stage: toStage,
    label: (STAGES[stageIndex(toStage)] || {}).label || toStage,
    action: mode === 'edit' ? 'Edited' : 'Moved to',
    fields: stageFields(toStage, fields || {}),
  };
}
/* closed (cancelled/duplicate/renewal) mark hone pe timeline event */
function makeClosedEvent(flag, remarks) {
  return {
    ts: new Date().toISOString(),
    stage: flag,
    label: (CLOSED[flag] || {}).label || flag,
    action: 'Marked as',
    fields: remarks ? { Remarks: remarks } : {},
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
function inView(x, viewMode) {
  const st = x.stage;
  // pending = abhi kaam baaki (new / talked / scheduled)
  const pending = st !== 'delivered' && !isClosedStage(st);
  if (viewMode === 'archived') {
    // Archived = ho-chuki entries: Delivered + Cancelled / Duplicate / Renewal
    return !pending;
  }
  // Today (kaam waala view):
  //   - saari pending (chahe purani ho)
  //   - jo aaj create hui
  //   - jo AAJ deliver hui (purani entry bhi) — kal se Today se hat jayegi,
  //     par Archived mein hamesha rahegi.
  return (
    pending ||
    isToday(createdTs(x)) ||
    (st === 'delivered' && isToday(deliveredTs(x)))
  );
}

/* stat categories jinpe collapsible entries khulti hain.
   NOTE: "Total Deliveries" ab yahan se hata diya — wo count Header ke
   "Today/Archived · Total deliveries · N" chip mein dikhta hai. Pending +
   Delivered + Cancelled se poori picture mil jaati hai.                 */
const CATS = [
  {
    id: 'pending',
    label: 'Pending',
    icon: Package,
    color: T.blue,
    soft: T.blueSoft,
    test: (x) => !isClosedStage(x.stage) && x.stage !== 'delivered',
  },
  {
    id: 'delivered',
    label: 'Delivered',
    icon: CheckCircle2,
    color: T.forestSoft,
    soft: T.mint,
    test: (x) => x.stage === 'delivered',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    icon: AlertTriangle,
    color: T.red,
    soft: T.redSoft,
    test: (x) => x.stage === 'cancelled',
  },
  {
    id: 'renewal',
    label: 'Renewal Invoices',
    icon: RefreshCw,
    color: T.blue,
    soft: T.blueSoft,
    test: (x) => x.stage === 'renewal',
  },
  {
    id: 'duplicate',
    label: 'Duplicate Invoices',
    icon: Copy,
    color: T.slate,
    soft: T.slateSoft,
    test: (x) => x.stage === 'duplicate',
  },
];

function rowToDelivery(r) {
  const branch = deriveBranch(r);
  return {
    invoice_id: r.invoice_id,
    id: r.invoice_number || r.invoice_id,
    branch,
    manager: STORE_MANAGERS[branch] || '—',
    customer: r.customer_name || '—',
    phone: clean(r.customer_phone) || '—',
    area: clean(r.city) || clean(r.billing_address) || '—',
    equipment: equipmentText(r),
    amount: Number(r.total_amount) || 0,
    expected: r.due_date && r.due_date !== 'null' ? r.due_date : '—',
    person: clean(r.app_delivery_person) || clean(r.delivery_person) || null,
    vehicle: clean(r.app_vehicle) || clean(r.assigned_vehicle) || null,
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

/* Embed mode: app apni asli content-height parent (Zoho) ko bhejta hai,
   taaki iframe utna hi bada ho — na cut, na neeche white gap. */
function usePostHeight() {
  useEffect(() => {
    if (!EMBEDDED) return;
    let last = 0;
    const post = () => {
      // #root ki asli rendered height — body.scrollHeight kabhi shrink nahi
      // hoti, isliye chhote content pe white space reh jaata tha.
      const root = document.getElementById('root');
      const h = root
        ? Math.ceil(root.getBoundingClientRect().height)
        : document.body
          ? document.body.scrollHeight
          : 0;
      if (!h || Math.abs(h - last) < 3) return;
      last = h;
      try {
        window.parent.postMessage({ hjsHeight: h }, '*');
      } catch (_) {}
    };
    post();
    let ro;
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      ro = new ResizeObserver(post);
      ro.observe(document.body);
    }
    window.addEventListener('resize', post);
    const iv = setInterval(post, 1200);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', post);
      clearInterval(iv);
    };
  }, []);
}

/* ════════════════════════════════════════════════════════════════ APP */
export default function App() {
  usePostHeight();
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
  if (inv) return <TrackPage invoice={inv} />; // customer — single order
  if (params.has('order') || params.has('my'))
    return <TrackPage invoice="" />; // customer — phone se latest order
  if (params.has('track') || params.has('sales') || isTrackPath)
    return <SalesTrackPage />; // sales — phone → list → timeline

  const [session, setSession] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [modal, setModal] = useState(null); // { invoiceId, toStage, mode }
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('today'); // today | archived
  const [layoutMode, setLayoutMode] = useState('board'); // board | categories
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

  const scoped = useMemo(() => {
    if (!session) return [];
    // Deleted (soft-deleted) entries app ke kisi bhi view mein nahi aati —
    // par Supabase mein status="Deleted" ke saath row bani rehti hai.
    const base = deliveries.filter((x) => x.stage !== 'deleted');
    if (session.branch === 'ALL') return base;
    return base.filter((x) => x.branch === session.branch);
  }, [deliveries, session]);

  // Board hamesha today/archived ke hisaab se — search se affect NAHI hota
  const viewItems = useMemo(
    () => scoped.filter((x) => inView(x, viewMode)),
    [scoped, viewMode],
  );

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

  const buildPatch = (toStage, f, mode) => {
    const patch = { updated_at: new Date().toISOString() };
    if (mode === 'move') patch.status = stageToStatus(toStage);
    if (toStage === 'talked') {
      patch.confirmed_date = f.date || null;
      patch.confirmed_time = f.time || null;
      patch.stage1_remarks = f.remarks || null;
    } else if (toStage === 'scheduled') {
      patch.app_delivery_person = f.person || null;
      patch.app_vehicle = f.vehicle || null;
      patch.item_inspected = !!f.inspected;
      patch.stage3_remarks = f.remarks || null;
    } else if (toStage === 'dispatched') {
      patch.app_eta = f.eta || null;
    } else if (toStage === 'delivered') {
      patch.item_delivered = !!f.delivered;
      patch.amount_collected = Number(f.amount) || 0;
      patch.amount_type = f.amountType || null;
      patch.security_collected = Number(f.security) || 0;
      patch.security_type = f.securityType || null;
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
      load();
    } catch (e) {
      ping('Save failed: ' + e.message);
    }
  };

  const commitModal = async (fields) => {
    const { invoiceId, toStage, mode } = modal;
    // Contact stage pe agar invoice flag (duplicate/renewal/cancelled) chuna →
    // date/time ki zarurat nahi, seedha closed mark karo.
    if (toStage === 'talked' && fields.invoiceFlag) {
      setModal(null);
      return closeEntry(invoiceId, fields.invoiceFlag, fields.remarks);
    }
    const patch = buildPatch(toStage, fields, mode);
    const cur = deliveries.find((x) => x.invoice_id === invoiceId);
    patch.app_log = [...existingLog(cur), makeEvent(toStage, fields, mode)];
    setModal(null);
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
      load();
    } catch (e) {
      ping('Save failed: ' + e.message);
    }
  };

  // direct backward move (no form)
  const setStage = async (invoiceId, toStage) => {
    const cur = deliveries.find((x) => x.invoice_id === invoiceId);
    const patch = {
      status: stageToStatus(toStage),
      updated_at: new Date().toISOString(),
      app_log: [...existingLog(cur), makeEvent(toStage, {}, 'move')],
    };
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
      load();
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
      load();
    } catch (e) {
      ping('Delete failed: ' + e.message);
    }
  };

  if (!session) return <Login onLogin={setSession} />;

  return (
    <div
      style={{
        fontFamily: FONT,
        background: T.beige,
        minHeight: '100vh',
        color: T.ink,
      }}
    >
      <StyleTag />
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar session={session} />
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
          />
          <main style={{ padding: '26px 30px 60px', flex: 1 }}>
            <Header
              session={session}
              live={CONFIGURED}
              count={viewItems.length}
              viewMode={viewMode}
              onViewMode={setViewMode}
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
            />
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
function EntriesView({ items, viewMode, layoutMode, loading, onOpen, onMove }) {
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
      />
    );
  }

  // Board layout → stage-wise kanban. Archived mein sirf Delivered list.
  return (
    <>
      <Stats items={items} viewMode={viewMode} onDrill={setDrill} />
      {viewMode === 'archived' ? (
        <ArchivedList items={items} onOpen={onOpen} onMove={onMove} />
      ) : isMobile ? (
        <MobileBoard
          items={items}
          loading={loading}
          onOpen={onOpen}
          onMove={onMove}
        />
      ) : (
        <Board
          items={items}
          loading={loading}
          onOpen={onOpen}
          onMove={onMove}
        />
      )}
      {viewMode !== 'archived' && <FooterTotal items={items} />}
    </>
  );
}

/* stat card → kaunsi entries dikhani hain */
const STAT_CATS = {
  total: {
    label: 'Total Deliveries',
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
    label: 'Delivered',
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
function DrillView({ cat, items, viewMode, onBack, onOpen, onMove }) {
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* Archived board → Delivered / Cancelled dropdown se choose karo. Dot ka
   color bhi badalta hai (green = delivered, red = cancelled). */
function ArchivedList({ items, onOpen, onMove }) {
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
          label: 'Delivered',
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
          <option value="delivered">Delivered</option>
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
function CategoriesView({ items, loading, onOpen, onMove }) {
  const [open, setOpen] = useState('pending'); // default: Pending khula
  if (loading && items.length === 0)
    return <div className="loading">Deliveries load ho rahi hain…</div>;
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
function Login({ onLogin }) {
  const [branch, setBranch] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!branch) {
      setErr('Pehle store choose karo.');
      return;
    }
    if (!pw) {
      setErr('Password daalo.');
      return;
    }
    if (!CONFIGURED) {
      onLogin({ ...sessionFor(branch), pw });
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const rows = await sbLogin(branch, pw);
      if (!rows || rows.length === 0) {
        setErr('Galat password.');
        setBusy(false);
        return;
      }
      onLogin({ ...sessionFor(branch), pw });
    } catch (e) {
      setErr('Login error: ' + (e.message || 'unknown'));
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
            <div className="brand-badge">
              <Truck size={22} color="#fff" />
            </div>
            <div>
              <div
                style={{ fontWeight: 800, fontSize: 19, letterSpacing: -0.3 }}
              >
                Healthy Jeena Sikho
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.75 }}>
                Delivery Control
              </div>
            </div>
          </div>
          <h1 className="hero-h1">
            Har delivery,
            <br />
            ek hi jagah.
          </h1>
          <p className="hero-p">
            Zoho Books se aane wali har delivery — customer se baat se lekar
            item handover tak, store-wise, live from Supabase.
          </p>
          <div className="hero-chips">
            {['Oxygen', 'Hospital Bed', 'CPAP / BiPAP', 'Wheelchair'].map(
              (c) => (
                <span key={c} className="hero-chip">
                  {c}
                </span>
              ),
            )}
          </div>
          <div className="hero-flow">
            {STAGES.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flow-dot">
                  <span style={{ background: s.color }} className="flow-pip" />
                  {s.short}
                </div>
                {i < STAGES.length - 1 && (
                  <ChevronRight size={15} opacity={0.5} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <div className="login-form">
        <div className="glass-card">
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>
              Store login
            </div>
            <div style={{ fontSize: 13.5, color: T.inkSoft, marginTop: 4 }}>
              Apna store choose karke password daalo.
            </div>
          </div>
          <Field label="Store">
            <select
              className="inp"
              value={branch}
              onChange={(e) => {
                setBranch(e.target.value);
                setErr('');
              }}
            >
              <option value="">Select store…</option>
              <option value="ALL">All stores</option>
              {STORE_ORDER.map((c) => (
                <option key={c} value={c}>
                  {branchLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Password">
            <input
              className="inp"
              type="password"
              placeholder="••••"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setErr('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && go()}
            />
          </Field>
          {err && <div className="login-err">{err}</div>}
          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: 4 }}
            disabled={!branch || !pw || busy}
            onClick={go}
          >
            {busy ? (
              'Checking…'
            ) : (
              <>
                Sign in <ArrowRight size={17} />
              </>
            )}
          </button>
          <div
            style={{
              textAlign: 'center',
              fontSize: 11.5,
              color: T.inkSoft,
              marginTop: 12,
              lineHeight: 1.6,
            }}
          >
            {CONFIGURED
              ? 'Live · Supabase connected'
              : 'Demo mode · CONFIG.key khaali hai'}
            <br />
            Store password: <b>1001</b> se shuru &nbsp;·&nbsp; All stores:{' '}
            <b>2222</b>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════ SIDEBAR */
function Sidebar({ session }) {
  const nav = [
    { icon: LayoutDashboard, label: 'Deliveries', active: true },
    { icon: RotateCcw, label: 'Pickups', soon: true },
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
            HJS Delivery
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)' }}>
            Control Panel
          </div>
        </div>
      </div>
      <nav style={{ padding: '8px 12px', flex: 1 }}>
        {nav.map((n) => (
          <div
            key={n.label}
            className="nav-item"
            style={{
              background: n.active ? 'rgba(255,255,255,.12)' : 'transparent',
              color: n.active ? '#fff' : 'rgba(255,255,255,.62)',
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
  search,
  setSearch,
  results,
  onPick,
  onReload,
  loading,
  onLogout,
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
                      ₹{Number(x.amount).toLocaleString('en-IN')} · {x.equipment}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
      <div className="tb-actions">
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
        <div className="tb-user" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
  layoutMode,
  onLayoutMode,
  onSwitchStore,
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
          {session.branch === 'ALL'
            ? 'All stores'
            : branchLabel(session.branch)}{' '}
          deliveries
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
            <option value="archived">Archived</option>
          </select>
        </div>
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
              value={session.branch}
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
            ? `${viewMode === 'archived' ? 'Archived' : 'Today'} · Total Deliveries · ${count}`
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
          label: 'Delivered',
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
          label: 'Total Deliveries',
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
          label: 'Delivered',
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
function Board({ items, loading, onOpen, onMove }) {
  if (loading && items.length === 0)
    return (
      <div className="loading">Supabase se deliveries load ho rahi hain…</div>
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
                {stage.label}
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
                <div className="empty">Koi delivery nahi</div>
              )}
              {cards.map((x) => (
                <Card
                  key={x.invoice_id}
                  d={x}
                  stage={stage}
                  onOpen={() => onOpen(x)}
                  onMove={onMove}
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
function MobileBoard({ items, loading, onOpen, onMove }) {
  const [open, setOpen] = useState(null);
  if (loading && items.length === 0)
    return <div className="loading">Deliveries load ho rahi hain…</div>;
  return (
    <div className="m-board">
      {STAGES.map((stage) => {
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
                {stage.label}
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
                {cards.length === 0 ? (
                  <div className="empty">Koi delivery nahi</div>
                ) : (
                  cards.map((x) => (
                    <Card
                      key={x.invoice_id}
                      d={x}
                      stage={stage}
                      onOpen={() => onOpen(x)}
                      onMove={onMove}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}
      <div
        style={{
          fontSize: 11.5,
          color: T.inkSoft,
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        Kisi stage pe tap karke uske records dekho.
      </div>
    </div>
  );
}

function Card({ d, stage, onOpen, onMove }) {
  const Icon = equipIcon(d.equipment);
  const closed = isClosedStage(d.stage);
  const cancelled = d.stage === 'cancelled';
  const next = closed ? null : STAGES[stageIndex(d.stage) + 1];
  return (
    <div
      className={cancelled ? 'card is-cancelled' : 'card'}
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
      <div className="card-meta">
        <span style={{ color: T.green, fontWeight: 800 }}>
          <IndianRupee size={12} /> {d.amount.toLocaleString('en-IN')}
        </span>
        <span className="ellip" style={{ maxWidth: 130 }}>
          <MapPin size={12} /> {d.area}
        </span>
      </div>
      <div className="card-meta">
        <span>
          <Clock size={12} /> {d.expected}
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
        <button
          className="card-next"
          onClick={(e) => {
            e.stopPropagation();
            onMove(d, next.id);
          }}
        >
          Move to {next.short} <ArrowRight size={13} />
        </button>
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
      Total {board.length} deliveries &nbsp;•&nbsp; {per}
      {extra ? ` \u2022 ${extra}` : ''}
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
        ['Date', show(r.confirmed_date)],
        ['Time', show(r.confirmed_time)],
        ['Remarks', show(r.stage1_remarks)],
      ],
    },
    {
      id: 'scheduled',
      i: 2,
      rows: [
        ['Delivery person', d.person || '—'],
        ['Vehicle', d.vehicle || '—'],
        ['Inspected', r.item_inspected ? 'Yes' : 'No'],
        ['Remarks', show(r.stage3_remarks)],
      ],
    },
    {
      id: 'dispatched',
      i: 3,
      rows: [['Estimated arrival', niceTime(r.app_eta) || '—']],
    },
    {
      id: 'delivered',
      i: 4,
      rows: [
        ['Delivered', r.item_delivered ? 'Yes' : 'No'],
        [
          'Amount',
          r.amount_collected
            ? `₹${Number(r.amount_collected).toLocaleString('en-IN')} · ${show(r.amount_type)}`
            : '—',
        ],
        [
          'Security',
          r.security_collected
            ? `₹${Number(r.security_collected).toLocaleString('en-IN')} · ${show(r.security_type)}`
            : '—',
        ],
        ['Remarks', show(r.stage4_remarks)],
      ],
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
          {stage.label}
        </span>

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
                    {s.short}
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
                <Check size={14} /> Saari stages complete — delivery done
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
                    {s.short}
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
          <KV label="Amount" value={`₹${d.amount.toLocaleString('en-IN')}`} />
          <KV label="Due date" value={d.expected} />
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
                  {st.label}
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
function StageModal({ delivery, toStage, mode, onClose, onSave }) {
  const stage = STAGES[stageIndex(toStage)];
  const r = (delivery && delivery._raw) || {};
  const persons = personsFor(delivery.branch, delivery.person || '');
  const [f, setF] = useState({
    invoiceFlag: '',
    // Stage pe MOVE kar rahe ho → date/time/ETA hamesha khaali (purani value
    // dobara na chip jaye). EDIT kar rahe ho → jo bhara hai wahi dikhao.
    date:
      mode === 'edit' && r.confirmed_date && r.confirmed_date !== 'null'
        ? r.confirmed_date
        : '',
    time:
      mode === 'edit' && r.confirmed_time && r.confirmed_time !== 'null'
        ? String(r.confirmed_time).slice(0, 5)
        : '',
    remarks:
      (toStage === 'delivered'
        ? r.stage4_remarks
        : toStage === 'scheduled'
          ? r.stage3_remarks
          : r.stage1_remarks) || '',
    person: delivery.person || '',
    vehicle: delivery.vehicle || '',
    eta:
      mode === 'edit' && r.app_eta && r.app_eta !== 'null'
        ? String(r.app_eta).slice(0, 5)
        : '',
    inspected: !!r.item_inspected,
    delivered: !!r.item_delivered,
    amount:
      r.amount_collected != null && r.amount_collected !== 0
        ? r.amount_collected
        : delivery.amount,
    amountType:
      r.amount_type && r.amount_type !== 'null' ? r.amount_type : 'Cash',
    security:
      r.security_collected != null && r.security_collected !== 0
        ? r.security_collected
        : '',
    securityType:
      r.security_type && r.security_type !== 'null' ? r.security_type : 'Cash',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  // NOTE: showPicker() cross-origin iframe (Zoho embed) mein block hota hai —
  // isliye ab call nahi karte. Native date/time input ka apna picker chalega.
  const flagSel = toStage === 'talked' && !!f.invoiceFlag;
  const canSave =
    mode === 'edit'
      ? true
      : flagSel
        ? true
        : toStage === 'talked'
          ? !!(f.date && f.time) // baat hui → date+time zaroori
          : toStage === 'scheduled'
            ? !!(f.person && f.inspected)
            : toStage === 'dispatched'
              ? !!f.eta
              : toStage === 'delivered'
                ? f.delivered
                : true;

  return (
    <div className="overlay center" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span
              className="stage-badge"
              style={{
                background: flagSel ? CLOSED[f.invoiceFlag].soft : stage.soft,
                color: flagSel ? CLOSED[f.invoiceFlag].color : stage.color,
                marginBottom: 8,
              }}
            >
              <span
                className="col-pip"
                style={{
                  background: flagSel ? CLOSED[f.invoiceFlag].color : stage.color,
                }}
              />{' '}
              {flagSel
                ? CLOSED[f.invoiceFlag].label
                : mode === 'edit'
                  ? `Edit · ${stage.label}`
                  : stage.label}
            </span>
            <div className="ellip" style={{ fontSize: 12.5, color: T.inkSoft }}>
              {delivery.customer} · {delivery.id}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} color={T.ink} />
          </button>
        </div>
        <div className="modal-body">
          {toStage === 'talked' && (
            <>
              <Field label="Invoice status">
                <select
                  className="inp"
                  value={f.invoiceFlag}
                  onChange={(e) => set('invoiceFlag', e.target.value)}
                >
                  <option value="">Customer se baat hui</option>
                  <option value="renewal">Renewal invoice</option>
                  <option value="duplicate">Duplicate invoice</option>
                  <option value="cancelled">Cancelled invoice</option>
                </select>
              </Field>
              {flagSel ? (
                <div
                  className="flag-note"
                  style={{
                    background: CLOSED[f.invoiceFlag].soft,
                    color: CLOSED[f.invoiceFlag].color,
                  }}
                >
                  Ye entry <b>{CLOSED[f.invoiceFlag].label}</b> mark hokar active
                  list se hat jayegi — date/time bharne ki zarurat nahi. Neeche
                  save dabao.
                </div>
              ) : (
                <>
                  <Field label="Date *">
                    <DatePick
                      value={f.date}
                      onChange={(v) => set('date', v)}
                    />
                  </Field>
                  <Field label="Time *">
                    <TimePick
                      value={f.time}
                      onChange={(v) => set('time', v)}
                    />
                  </Field>
                  {!(f.date && f.time) && (
                    <div className="req-note">
                      Date aur Time dono bharna zaroori hai.
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {toStage === 'scheduled' && (
            <>
              <Field label="Delivery person">
                <select
                  className="inp"
                  value={f.person}
                  onChange={(e) => set('person', e.target.value)}
                >
                  <option value="">Select…</option>
                  {persons.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vehicle">
                <select
                  className="inp"
                  value={f.vehicle}
                  onChange={(e) => set('vehicle', e.target.value)}
                >
                  <option value="">Select…</option>
                  {VEHICLES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                  {f.vehicle && !VEHICLES.includes(f.vehicle) && (
                    <option value={f.vehicle}>{f.vehicle}</option>
                  )}
                </select>
              </Field>
              <Check1
                checked={f.inspected}
                onChange={() => set('inspected', !f.inspected)}
                label="Item inspected & ready"
              />
            </>
          )}

          {toStage === 'dispatched' && (
            <>
              <Field label="Estimated arrival time *">
                <TimePick value={f.eta} onChange={(v) => set('eta', v)} />
              </Field>
              {!f.eta && (
                <div className="req-note">
                  Customer ko yahi time message mein jaayega — bharna zaroori
                  hai.
                </div>
              )}
            </>
          )}

          {toStage === 'delivered' && (
            <>
              <Check1
                checked={f.delivered}
                onChange={() => set('delivered', !f.delivered)}
                label="Item delivered to customer"
              />
              <div className="two-col">
                <Field label="Amount collected">
                  <input
                    className="inp"
                    type="number"
                    value={f.amount}
                    onChange={(e) => set('amount', e.target.value)}
                  />
                </Field>
                <Field label="Amount type">
                  <select
                    className="inp"
                    value={f.amountType}
                    onChange={(e) => set('amountType', e.target.value)}
                  >
                    {PAY_OPTIONS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="two-col">
                <Field label="Security collected">
                  <input
                    className="inp"
                    type="number"
                    placeholder="0"
                    value={f.security}
                    onChange={(e) => set('security', e.target.value)}
                  />
                </Field>
                <Field label="Security type">
                  <select
                    className="inp"
                    value={f.securityType}
                    onChange={(e) => set('securityType', e.target.value)}
                  >
                    {PAY_OPTIONS.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          )}

          <Field label="Remarks">
            <textarea
              className="inp"
              rows={2}
              placeholder="Optional notes…"
              value={f.remarks}
              onChange={(e) => set('remarks', e.target.value)}
            />
          </Field>
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!canSave}
            onClick={() => onSave(f)}
          >
            <ShieldCheck size={16} />{' '}
            {flagSel
              ? `Mark as ${CLOSED[f.invoiceFlag].short}`
              : mode === 'edit'
                ? 'Update'
                : 'Save & update'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════ SMALL UI */
/* ── DATE PICKER — apna calendar (native input nahi, kyunki Zoho iframe
   mein native picker block ho jaata hai). Value format: YYYY-MM-DD ── */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad2 = (n) => String(n).padStart(2, '0');
const toISO = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

function DatePick({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const sel = value ? new Date(value + 'T00:00:00') : null;
  const today = new Date();
  const base = sel && !isNaN(sel) ? sel : today;
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  // panel khulte hi selected date ke month pe jao (warna purana view atka rehta)
  useEffect(() => {
    if (!open) return;
    const d = value ? new Date(value + 'T00:00:00') : new Date();
    if (!isNaN(d)) setView({ y: d.getFullYear(), m: d.getMonth() });
  }, [open]); // eslint-disable-line

  const first = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const shift = (n) => {
    let m = view.m + n;
    let y = view.y;
    if (m < 0) {
      m = 11;
      y--;
    }
    if (m > 11) {
      m = 0;
      y++;
    }
    setView({ y, m });
  };
  const isSel = (d) =>
    sel &&
    sel.getFullYear() === view.y &&
    sel.getMonth() === view.m &&
    sel.getDate() === d;
  const isNow = (d) =>
    today.getFullYear() === view.y &&
    today.getMonth() === view.m &&
    today.getDate() === d;

  return (
    <div>
      <button className="pick-btn" onClick={() => setOpen(!open)}>
        <CalendarIcon size={16} color={T.inkSoft} />
        <span style={{ flex: 1, textAlign: 'left' }}>
          {value ? niceDate(value) : 'Select date…'}
        </span>
        <ChevronRight
          size={16}
          color={T.inkSoft}
          style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform .15s',
          }}
        />
      </button>
      {open && (
        <div className="cal">
          {/* manual bharne ke liye — normal input bhi rakha hai */}
          <input
            className="inp manual-inp"
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="cal-head">
            <button className="cal-nav" onClick={() => shift(-1)}>
              <ArrowLeft size={15} />
            </button>
            <span style={{ fontWeight: 800, fontSize: 13.5 }}>
              {MONTHS[view.m]} {view.y}
            </span>
            <button className="cal-nav" onClick={() => shift(1)}>
              <ArrowRight size={15} />
            </button>
          </div>
          <div className="cal-grid">
            {WEEK.map((w, i) => (
              <div key={'w' + i} className="cal-w">
                {w}
              </div>
            ))}
            {cells.map((d, i) =>
              d === null ? (
                <div key={'e' + i} />
              ) : (
                <button
                  key={d}
                  className={
                    isSel(d) ? 'cal-day sel' : isNow(d) ? 'cal-day now' : 'cal-day'
                  }
                  onClick={() => onChange(toISO(view.y, view.m, d))}
                >
                  {d}
                </button>
              ),
            )}
          </div>
          <div className="cal-foot">
            <button className="cal-quick" onClick={() => onChange('')}>
              Clear
            </button>
            <button className="cal-quick save" onClick={() => setOpen(false)}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── TIME PICKER — phone-alarm jaisa: H / M / AM-PM vertical scroll columns.
   Value format: HH:MM (24h). Manual input bhi upar rakha hai. ── */
function TimePick({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const parts = String(value || '').split(':');
  const h24 = parseInt(parts[0], 10);
  const mm = parts.length > 1 ? parseInt(parts[1], 10) : NaN;
  const has = !isNaN(h24) && !isNaN(mm);
  const ap = has ? (h24 >= 12 ? 'PM' : 'AM') : null;
  const h12 = has ? h24 % 12 || 12 : null;

  const emit = (nh12, nmm, nap) => {
    let H = nh12 % 12;
    if (nap === 'PM') H += 12;
    onChange(`${pad2(H)}:${pad2(nmm)}`);
  };
  const setH = (n) => emit(n, isNaN(mm) ? 0 : mm, ap || 'AM');
  const setM = (n) => emit(h12 || 9, n, ap || 'AM');
  const setAP = (a) => emit(h12 || 9, isNaN(mm) ? 0 : mm, a);

  const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const MINS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div>
      <button className="pick-btn" onClick={() => setOpen(!open)}>
        <Clock size={16} color={T.inkSoft} />
        <span style={{ flex: 1, textAlign: 'left' }}>
          {has ? niceTime(value) : 'Select time…'}
        </span>
        <ChevronRight
          size={16}
          color={T.inkSoft}
          style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform .15s',
          }}
        />
      </button>
      {open && (
        <div className="cal">
          {/* manual bharne ke liye — normal input bhi rakha hai */}
          <input
            className="inp manual-inp"
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="tp-cols">
            <div className="tp-col">
              <div className="tp-label">H</div>
              <div className="tp-scroll">
                {HOURS.map((h) => (
                  <button
                    key={h}
                    className={h12 === h ? 'tp-item on' : 'tp-item'}
                    onClick={() => setH(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            <div className="tp-col">
              <div className="tp-label">M</div>
              <div className="tp-scroll">
                {MINS.map((m) => (
                  <button
                    key={m}
                    className={mm === m ? 'tp-item on' : 'tp-item'}
                    onClick={() => setM(m)}
                  >
                    {pad2(m)}
                  </button>
                ))}
              </div>
            </div>
            <div className="tp-col">
              <div className="tp-label">AM/PM</div>
              <div className="tp-scroll">
                {['AM', 'PM'].map((a) => (
                  <button
                    key={a}
                    className={ap === a ? 'tp-item on' : 'tp-item'}
                    onClick={() => setAP(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="cal-foot">
            <button className="cal-quick" onClick={() => onChange('')}>
              Clear
            </button>
            <button className="cal-quick save" onClick={() => setOpen(false)}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
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
    label: 'Order Registered',
    desc: 'Your order has been registered. Our team will call you shortly to confirm the delivery date and time.',
    icon: Package,
  },
  {
    id: 'talked',
    label: 'Confirmed With You',
    desc: 'Our team has contacted you and your delivery date and time has been confirmed.',
    icon: Phone,
  },
  {
    id: 'scheduled',
    label: 'Delivery Scheduled',
    desc: 'Your item has passed the quality check and the delivery has been scheduled.',
    icon: ClipboardCheck,
  },
  {
    id: 'dispatched',
    label: 'Out for Delivery',
    desc: 'Your order has been dispatched and is on its way to your location.',
    icon: Truck,
  },
  {
    id: 'delivered',
    label: 'Delivered',
    desc: 'Your order has been delivered successfully. Thank you for choosing Healthy Jeena Sikho.',
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
function SalesTrackPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [gateBusy, setGateBusy] = useState(false);
  const [gateErr, setGateErr] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('idle'); // idle|loading|done|notfound|error
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState('');

  // PIN verify: empty phone se call — sahi PIN pe [] aata hai, galat pe error
  const unlock = async () => {
    if (!pin) {
      setGateErr('Enter the sales PIN.');
      return;
    }
    setGateBusy(true);
    setGateErr('');
    try {
      await sbTrackSearch('', pin);
      setUnlocked(true);
    } catch (e) {
      const msg = String(e.message || '');
      // RPC sirf galat PIN pe hi 'pin' waala error deta hai. Baaki errors
      // (function missing / permission / naya project setup) alag dikhao.
      if (/pin|invalid|unauthor/i.test(msg)) {
        setGateErr('Wrong PIN. Try again.');
      } else {
        setGateErr('Access error: ' + msg);
      }
    }
    setGateBusy(false);
  };

  const search = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setErr('Please enter a full 10-digit mobile number.');
      return;
    }
    setErr('');
    setState('loading');
    setSelected(null);
    try {
      const res = await sbTrackSearch(`+91${digits}`, pin);
      if (!res || res.length === 0) {
        setRows([]);
        setState('notfound');
        return;
      }
      setRows(res);
      setState('done');
    } catch (e) {
      // PIN galat ho gaya (e.g. changed) → wapas gate pe
      if (String(e.message || '').toLowerCase().includes('pin')) {
        setUnlocked(false);
        setGateErr('Session expired — enter PIN again.');
        return;
      }
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
              Delivery tracker · Sales
            </div>
          </div>
        </div>
      </div>

      <div className="track-body">
        {!unlocked ? (
          <div className="track-card">
            <h1 className="track-h1">Sales access</h1>
            <p className="track-sub">
              Enter the sales PIN to look up customer deliveries.
            </p>
            <Field label="Sales PIN">
              <input
                className="inp"
                type="password"
                inputMode="numeric"
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setGateErr('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && unlock()}
              />
            </Field>
            {gateErr && <div className="login-err">{gateErr}</div>}
            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 4 }}
              disabled={!pin || gateBusy}
              onClick={unlock}
            >
              {gateBusy ? (
                'Checking…'
              ) : (
                <>
                  Unlock <ArrowRight size={17} />
                </>
              )}
            </button>
            <div className="track-foot" style={{ marginTop: 6 }}>
              Healthy Jeena Sikho · Internal use only
            </div>
          </div>
        ) : selected ? (
          <>
            <button className="track-back" onClick={() => setSelected(null)}>
              <ArrowLeft size={16} /> Back to list
            </button>
            <TrackResult row={selected} />
          </>
        ) : (
          <div className="track-card">
            <h1 className="track-h1">Track a customer's deliveries</h1>
            <p className="track-sub">
              Enter the customer's registered mobile number to see all their
              orders, latest first.
            </p>
            <Field label="Customer mobile number">
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
                  onKeyDown={(e) => e.key === 'Enter' && search()}
                />
              </div>
            </Field>
            {err && <div className="login-err">{err}</div>}
            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 4 }}
              disabled={state === 'loading'}
              onClick={search}
            >
              {state === 'loading' ? (
                'Searching…'
              ) : (
                <>
                  Search <ArrowRight size={17} />
                </>
              )}
            </button>
            {state === 'notfound' && (
              <div className="track-msg">
                No deliveries found for this number.
              </div>
            )}
            {state === 'error' && (
              <div className="track-msg">
                Unable to search right now. Please try again.
              </div>
            )}
          </div>
        )}

        {!selected && state === 'done' && rows.length > 0 && (
          <div className="sales-list">
            <div className="sales-list-head">
              {rows.length} {rows.length === 1 ? 'delivery' : 'deliveries'} ·
              latest first
            </div>
            {rows.map((r) => {
              const st = statusToStage(r.status);
              const cancelled = st === 'cancelled';
              const stg = stageMeta(st);
              const equip = equipmentText({
                line_items: r.line_items,
                item_name: r.item_name,
              });
              const Icon = equipIcon(equip);
              return (
                <button
                  key={r.invoice_number}
                  className={cancelled ? 'sales-row is-cancelled' : 'sales-row'}
                  onClick={() => setSelected(r)}
                >
                  <div className="eq-ico" style={{ background: stg.soft }}>
                    <Icon size={17} color={stg.color} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="sales-row-top">
                      <span
                        className="ellip"
                        style={{ fontWeight: 800, fontSize: 14.5 }}
                      >
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

        <div className="track-foot">
          Healthy Jeena Sikho · Internal delivery tracker
        </div>
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
      const res = await sbTrack(invoice || '', `+91${digits}`);
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
              Track your delivery
            </div>
          </div>
        </div>
      </div>

      <div className="track-body">
        <div className="track-card">
          <h1 className="track-h1">Track your delivery</h1>
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
      ? { text: 'Delivered successfully 🎉', bg: T.mint, fg: T.green }
      : stage === 'dispatched'
        ? {
            text: 'Your order is out for delivery',
            bg: T.violetSoft,
            fg: T.violet,
          }
        : stage === 'scheduled'
          ? { text: 'Your delivery is scheduled', bg: T.amberSoft, fg: T.amber }
          : stage === 'talked'
            ? { text: 'Your order is confirmed', bg: T.blueSoft, fg: T.blue }
            : {
                text: 'Your order has been received',
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
                        <b>Delivery slot:</b> {schedDate || ''}
                        {schedDate && schedTime ? ', ' : ''}
                        {schedTime || ''}
                      </div>
                    )}
                    {person && (
                      <div>
                        <b>Delivery partner:</b> {person}
                      </div>
                    )}
                  </div>
                )}

                {/* Stage 4 — out for delivery: estimated arrival */}
                {step.id === 'dispatched' && niceTime(row.app_eta) && (
                  <div className="ttl-extra">
                    <div>
                      <b>Estimated arrival:</b> {niceTime(row.app_eta)}
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
function StyleTag() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
      body { color: ${T.ink}; background: ${T.beige}; }
      #root { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; text-align: left !important; }

      /* ── EMBED MODE (Zoho iframe): app content-height le, taaki iframe auto-resize ho ── */
      .hjs-embed, .hjs-embed body { min-height: 0 !important; height: auto !important; }
      .hjs-embed .sidebar { height: auto !important; position: static !important; }
      .hjs-embed .login-wrap { min-height: 0 !important; }
      .hjs-embed .track-wrap { min-height: 0 !important; }
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

      .board { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 12px; align-items: start; }
      .column { background: #FBF9F4; border: 1px solid ${T.line}; border-radius: 14px; padding: 6px; overflow: hidden; }
      .column:nth-child(1) { border-top: 3px solid ${T.slate}; }
      .column:nth-child(2) { border-top: 3px solid ${T.blue}; }
      .column:nth-child(3) { border-top: 3px solid ${T.amber}; }
      .column:nth-child(4) { border-top: 3px solid ${T.violet}; }
      .column:nth-child(5) { border-top: 3px solid ${T.green}; }
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
      .card-next:hover { background: ${T.mint}; border-color: ${T.green}; }
      .card-done { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; font-size: 12.5px; font-weight: 700; color: ${T.green}; background: ${T.mint}; border-radius: 10px; padding: 8px; }
      .card.is-cancelled { background: #FCEFEA; border-color: #EAD0C6; }
      .card.is-cancelled:hover { border-color: #DFB9AC; }
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

      .flag-note { border-radius: 12px; padding: 11px 13px; font-size: 12.5px; font-weight: 600; line-height: 1.5; }
      .req-note { font-size: 11.5px; font-weight: 600; color: ${T.amber}; background: ${T.amberSoft}; border-radius: 9px; padding: 7px 11px; margin-top: -4px; }

      /* ── custom date/time pickers ── */
      .pick-btn { width: 100%; display: flex; align-items: center; gap: 9px; border: 1px solid ${T.line}; border-radius: 11px; padding: 11px 13px; font-size: 13.5px; font-weight: 600; font-family: inherit; background: #fff; color: ${T.ink}; cursor: pointer; }
      .pick-btn:hover { border-color: ${T.green}; }
      .cal { margin-top: 8px; border: 1px solid ${T.line}; border-radius: 13px; background: #fff; padding: 12px; box-shadow: 0 6px 18px rgba(20,57,43,.08); }
      .cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
      .cal-nav { width: 30px; height: 30px; border-radius: 9px; border: 1px solid ${T.line}; background: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; color: ${T.ink}; }
      .cal-nav:hover { background: ${T.beige}; }
      .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
      .cal-w { text-align: center; font-size: 10.5px; font-weight: 800; color: ${T.inkSoft}; padding: 4px 0; }
      .cal-day { height: 34px; border: none; background: transparent; border-radius: 9px; font-size: 13px; font-weight: 600; font-family: inherit; color: ${T.ink}; cursor: pointer; }
      .cal-day:hover { background: ${T.mint}; }
      .cal-day.now { border: 1.5px solid ${T.green}; color: ${T.green}; font-weight: 800; }
      .cal-day.sel { background: ${T.green}; color: #fff; font-weight: 800; }
      .cal-foot { display: flex; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid ${T.line}; }
      .cal-quick { flex: 1; border: 1px solid ${T.line}; background: ${T.cream}; border-radius: 9px; padding: 9px; font-size: 12.5px; font-weight: 700; font-family: inherit; color: ${T.inkSoft}; cursor: pointer; }
      .cal-quick:hover { background: ${T.beige}; }
      .cal-quick.save { background: ${T.green}; border-color: ${T.green}; color: #fff; }
      .cal-quick.save:hover { background: #276b2b; }
      .manual-inp { margin-bottom: 10px; }
      .tp-label { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; color: ${T.inkSoft}; text-align: center; margin-bottom: 6px; }
      .tp-cols { display: flex; gap: 8px; }
      .tp-col { flex: 1; min-width: 0; }
      .tp-scroll { max-height: 168px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding: 3px; background: ${T.cream}; border: 1px solid ${T.line}; border-radius: 10px; }
      .tp-item { border: none; background: transparent; border-radius: 8px; padding: 9px 4px; font-size: 13.5px; font-weight: 700; font-family: inherit; color: ${T.ink}; cursor: pointer; }
      .tp-item:hover { background: ${T.mint}; }
      .tp-item.on { background: ${T.green}; color: #fff; }
      .flag-note b { font-weight: 800; }
      .danger-zone { margin-top: 24px; padding-top: 16px; border-top: 1px dashed #e9cfc4; }
      .danger-confirm { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .btn-danger { background: #fff; color: ${T.red}; border: 1px solid #e9cfc4; border-radius: 11px; padding: 11px 16px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
      .btn-danger:hover { background: ${T.redSoft}; }

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
      .sales-row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: #fff; border: 1px solid ${T.line}; border-radius: 15px; padding: 13px 14px; cursor: pointer; font-family: inherit; color: ${T.ink}; transition: transform .12s, box-shadow .12s, border-color .12s; }
      .sales-row:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(20,57,43,.09); border-color: #d8d1c0; }
      .sales-row.is-cancelled { background: #FCEFEA; border-color: #EAD0C6; }
      .sales-row.is-cancelled:hover { border-color: #DFB9AC; }
      .sales-row-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .sales-chip { flex-shrink: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; padding: 3px 9px; border-radius: 8px; }
      .sales-sub { font-size: 12.5px; color: ${T.inkSoft}; margin-top: 3px; font-weight: 600; }
      .sales-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; }
      .sales-meta span { font-size: 11.5px; color: ${T.inkSoft}; max-width: 100%; }

      @media (max-width: 1400px) { .board { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; } }
      @media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .board { grid-template-columns: repeat(2,minmax(0,1fr)); } }
      @media (max-width: 860px) { .login-wrap { grid-template-columns: 1fr; } .login-hero { display: none; } .sidebar { display: none; } .board { grid-template-columns: 1fr; } }
      @media (max-width: 760px) {
        .topbar { height: auto; flex-wrap: wrap; padding: 8px 14px; gap: 8px 10px; }
        .tb-brand { display: flex; order: 0; flex: 1 1 auto; min-width: 0; }
        .tb-brand span { font-size: 14px; }
        .tb-actions { order: 1; flex: 0 0 auto; width: auto; justify-content: flex-end; gap: 8px; }
        .tb-user-text { display: none; }
        .tb-search { order: 2; flex: 1 1 100%; max-width: none; }
        .icon-btn { width: 34px; height: 34px; }
        main { padding: 16px 14px 60px !important; }
        .drawer { width: 100%; max-width: 100%; padding: 18px 16px; }
        .kv-grid { grid-template-columns: 1fr 1fr; }
        .modal { width: 100%; border-radius: 18px; }
        .glass-card { padding: 24px 20px; }
      }
      @media (max-width: 400px) { .stat-grid { grid-template-columns: 1fr 1fr; gap: 12px; } .stat-grid.three { grid-template-columns: 1fr 1fr; } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
    `}</style>
  );
}
