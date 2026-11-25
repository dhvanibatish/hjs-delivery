import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquareWarning,
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
  ShieldCheck,
  LogOut,
  Building2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Wind,
  BedDouble,
  Accessibility,
  Stethoscope,
  Wrench,
  RefreshCw,
  CloudOff,
  Pencil,
  History,
  UserCog,
  Copy,
  Info,
  Trash2,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════
   1) CONFIG  ── url + ANON PUBLIC key (SERVICE_ROLE nahi). Khaali = DEMO.
   ══════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  url: 'https://idcmfebqizovivuvsuns.supabase.co',
  key: 'sb_publishable_T6E3AVHgJE7KKmMV3Ko7tQ_qXvap_V_',
  table: 'tickets',
};
const CONFIGURED = !!(CONFIG.url && CONFIG.key);
const HDRS = () => ({
  apikey: CONFIG.key,
  Authorization: `Bearer ${CONFIG.key}`,
});

async function sbSelect() {
  const res = await fetch(
    `${CONFIG.url}/rest/v1/${CONFIG.table}?select=*&order=created_at.desc`,
    { headers: HDRS() },
  );
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
async function sbPatch(ticketId, patch) {
  const res = await fetch(
    `${CONFIG.url}/rest/v1/${CONFIG.table}?ticket_id=eq.${encodeURIComponent(ticketId)}`,
    {
      method: 'PATCH',
      headers: {
        ...HDRS(),
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
/* Technician login — PIN client mein nahi, Supabase RPC verify karta hai
   (complaint_tech_login · SQL file: complaints_priority_technician.sql) */
async function sbTechLogin(name, pin) {
  const res = await fetch(`${CONFIG.url}/rest/v1/rpc/complaint_tech_login`, {
    method: 'POST',
    headers: { ...HDRS(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_name: name, p_pin: pin }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
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
const FONT =
  "'Onest','Hanken Grotesk','Plus Jakarta Sans',system-ui,-apple-system,sans-serif";

const BRANCH_NAMES = {
  Mohali: 'Mohali',
  Ludhiana: 'Ludhiana',
  Jalandhar: 'Jalandhar',
  Jaipur: 'Jaipur',
  Lucknow: 'Lucknow',
  Janakpuri: 'Janakpuri',
  'Shastri Nagar': 'Shastri Nagar',
  Gurugram: 'Gurugram',
  Noida: 'Noida',
};
const branchLabel = (code) =>
  (REGIONS[code] && REGIONS[code].label) || BRANCH_NAMES[code] || code;

/* Store managers (branch → name) */
const STORE_MANAGERS = {
  Mohali: 'Niranjan Das',
  Ludhiana: 'Gursajan',
  Jalandhar: 'Bhupinder',
  Jaipur: 'Niraj',
  Lucknow: 'Akhlaque',
  Janakpuri: 'Rajan',
  'Shastri Nagar': 'Nitin',
  Gurugram: 'Hemant',
  Noida: 'Dharmendra',
};

/* Technician / handler store-wise — ab form me use nahi hota */

/* Technician list — store-wise nahi, sabhi stores ke liye common */
const TECHNICIANS = [
  { name: 'Sonu', phone: '+91 84472 92843' },
  { name: 'Arvind', phone: '+91 72106 69844' },
  { name: 'Hemant', phone: '+91 97736 41804' },
  { name: 'Nitin', phone: '+91 70074 13101' },
  { name: 'Rajan', phone: '+91 85953 53451' },
  { name: 'Nitish', phone: '+91 99118 14167' },
  { name: 'Pradeep', phone: '+91 97606 29197' },
  { name: 'Uday', phone: '+91 85957 59588' },
];
/* ── PRIORITY ── sirf "All stores" (head) login set kar sakta hai.
   Baaki sab (store manager, technician) sirf color dekhte hain. */
const PRIORITIES = {
  High: { id: 'High', label: 'High', hi: 'High', color: '#C62828', soft: '#FDE7E7', rank: 0 },
  Medium: { id: 'Medium', label: 'Medium', hi: 'Medium', color: '#C77D28', soft: '#FBF0DE', rank: 1 },
  Low: { id: 'Low', label: 'Low', hi: 'Low', color: '#2E7D32', soft: '#E7F0E8', rank: 2 },
};
const PRIO_NONE = { id: '', label: 'Not set', color: '#64748B', soft: '#EEF1F3', rank: 3 };
const prioMeta = (p) => PRIORITIES[p] || PRIO_NONE;
const byPriority = (a, b) => prioMeta(a.priority).rank - prioMeta(b.priority).rank;
const canSetPriority = (session) => !!(session && session.isHead);

function PriorityBadge({ p, small }) {
  const m = prioMeta(p);
  return (
    <span
      className="prio-badge"
      style={{
        background: m.soft,
        color: m.color,
        fontSize: small ? 10.5 : 11.5,
        padding: small ? '2px 7px' : '4px 10px',
      }}
    >
      <span className="col-pip" style={{ background: m.color }} />
      {p ? m.label : L('prioNotSet')}
    </span>
  );
}

const techPhoneOf = (name) =>
  (TECHNICIANS.find((t) => t.name === name) || {}).phone || '';
/* form ke fields se asli naam/phone — 'Other' hone par manual wale */
const techNameOf = (f) =>
  f.tech === 'Other' ? String(f.techOther || '').trim() : f.tech || '';
const techPhoneVal = (f) =>
  f.tech === 'Other'
    ? String(f.techPhoneOther || '').trim()
    : techPhoneOf(f.tech);

/* ══════════════════════════════════════════════════════════════════════
   PRODUCT CATALOG — Stage 1 ("Details") mein product ka type aur problem
   yahin se aata hai. Form ab sirf naam/phone/product/problem bhejta hai.
   Naya product / problem jodna ho to bas yahan ek line jodo.
   ══════════════════════════════════════════════════════════════════════ */
const CATALOG = [
  {
    key: 'bed',
    label: 'Bed',
    match: /bed/i,
    types: {
      'Electric Bed': [
        'Not turning on',
        'Physical damage',
        'Remote not working',
        'Wheel lock problem',
        'Motor not working',
        'Plug out / Power plug disconnected',
        'Wire loose',
        'Mattress issue',
        'Welding issue',
        'Side railing issue',
      ],
      'Manual Bed': [
        'Loose parts / Nut bolt loose',
        'Wheel lock problem',
        'Wheel damaged',
        'Crank handle not working',
        'Physical damage',
        'Mattress issue',
        'Head side not lifting / Leg side not lifting',
        'Side railing issue',
      ],
    },
  },
  {
    key: 'wheelchair',
    label: 'Wheelchair',
    match: /wheel\s*chair/i,
    types: {
      'Manual Wheelchair': [
        'Seat damaged',
        'Brake issue',
        'Physical damage',
        'Nut bolt issue',
      ],
      'Motorized Wheelchair': [
        'Physical damage',
        'Seat damaged',
        'Joystick not working',
        'Battery drain issue',
        'Not getting charged',
        'Motor not working',
        'Power issue',
      ],
      'Stair-Climbing': [
        'Battery issue',
        'Crawler belt',
        'Slipping on stairs',
        'Nut bolt loose',
        'Brake issue',
        'Seat belt',
        'Physical damage',
      ],
    },
  },
  {
    key: 'oc',
    label: 'Oxygen Concentrator',
    match: /concentrat|\boc\b|oc-/i,
    types: {
      'OC 5L': null,
      'OC 10L': null,
    },
    problems: [
      'Physical damage',
      'Power issue',
      'Low pressure issue',
      'Filter issue',
      'Low oxygen purity issue',
      'Display issue',
      'Humidifier bottle issue',
    ],
  },
  {
    key: 'pap',
    label: 'BiPAP / CPAP',
    match: /bipap|cpap/i,
    types: { BiPAP: null, CPAP: null },
    problems: [
      'Mask not fitting properly',
      'Humidifier issue',
      'Pressure setting issue',
      'Filter issue',
      'Power issue',
      'Tube damaged / loose',
    ],
  },
  {
    key: 'dvt',
    label: 'DVT Pump',
    match: /dvt/i,
    problems: ['Power issue', 'Cuff leakage issue', 'Cuff damaged', 'Not turning on'],
  },
  {
    key: 'monitor',
    label: 'Monitor',
    match: /monitor/i,
    problems: [
      'BP cuff leakage issue',
      'Battery backup issue',
      'NIBP fluctuation issue',
      'Display issue',
      'Power issue',
    ],
  },
  {
    key: 'cylinder',
    label: 'Oxygen Cylinder',
    match: /cylinder/i,
    problems: ['Flow meter leaking', 'Refill required', 'Pressure issue', 'Knob damaged'],
  },
  {
    key: 'suction',
    label: 'Suction Machine',
    match: /suction/i,
    problems: ['Jar damaged', 'Pressure not holding', 'Power issue'],
  },
];
const catalogOf = (product) =>
  CATALOG.find((c) => c.match.test(String(product || ''))) || null;
const typeNamesOf = (cat) => (cat && cat.types ? Object.keys(cat.types) : []);
/* type chuna ho to us type ki list, warna product ki common list */
function problemsFor(cat, type) {
  if (!cat) return [];
  if (cat.types && type && Array.isArray(cat.types[type])) return cat.types[type];
  return cat.problems || [];
}
const realVal = (v) => (v && v !== 'null' ? String(v) : '');
/* Form ke dropdown mein jo type / problem chuni gayi — Stage 1 mein pehle
   se bhar dete hain. "Electric-Bed" = "Electric Bed", aakhri "." ignore. */
const norm = (v) =>
  String(v || '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/[.\s]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
function guessFromForm(raw, cat) {
  const out = { ptype: '', problem: '' };
  if (!cat || !raw) return out;
  const vals = Object.keys(raw)
    .filter(
      (k) =>
        k !== 'product' &&
        !/remarks|app_log|status|name|mobile|email|city/i.test(k),
    )
    .map((k) => realVal(raw[k]))
    .filter(Boolean);
  const types = typeNamesOf(cat);
  for (const v of vals) {
    const t = types.find((x) => norm(x) === norm(v) || norm(v).includes(norm(x)));
    if (t) {
      out.ptype = t;
      break;
    }
  }
  const list = problemsFor(cat, out.ptype);
  for (const v of vals) {
    const pr = list.find((x) => norm(x) === norm(v));
    if (pr) {
      out.problem = pr;
      break;
    }
  }
  return out;
}
/* Stage 1 mein bhari problem — "Other" ho to likhi hui */
const pickedProblem = (r) =>
  realVal(r.problem_type) === 'Other'
    ? realVal(r.problem_other)
    : realVal(r.problem_type);

/* Resolution — kya karke problem theek hui */
const ACTIONS = [
  'Ghar pe repair kiya (technician)',
  'Part / spare badla',
  'Naya saman diya (replace)',
  'Store pe repair kiya',
  'Company / warehouse se theek karwaya',
  'Customer ko samjhaya — machine theek thi',
  'Other',
];

/* ══════════════════════════════════════════════════════════════════════
   LOGIN  ── store dropdown se choose karke store-wise PIN daalo.
   Head login se saare stores dikhte hain.
   ══════════════════════════════════════════════════════════════════════ */
/* ── Region grouping — Punjab / Delhi NCR ek saath dekhne ke liye ──── */
const REGIONS = {
  PUNJAB: {
    label: 'Punjab (all stores)',
    stores: ['Mohali', 'Ludhiana', 'Jalandhar'],
  },
  NCR: {
    label: 'Delhi side (all stores)',
    // Jaipur aur Lucknow bhi Delhi side ke under aate hain
    stores: [
      'Janakpuri',
      'Shastri Nagar',
      'Gurugram',
      'Noida',
      'Jaipur',
      'Lucknow',
    ],
  },
};
const isRegionCode = (b) => !!REGIONS[b];
/* ek branch code ke andar kaunse stores aate hain */
function storesOf(branch) {
  if (branch === 'ALL') return null; // null = sab
  if (REGIONS[branch]) return REGIONS[branch].stores;
  return [branch];
}

const STORE_ORDER = [
  'Mohali',
  'Ludhiana',
  'Jalandhar',
  'Jaipur',
  'Lucknow',
  'Janakpuri',
  'Shastri Nagar',
  'Gurugram',
  'Noida',
];
/* All stores = 2222 · Punjab = 3001 · Delhi NCR = 3002 · store 1001 se shuru */
const LOCAL_PW = (() => {
  const m = { ALL: '2222', PUNJAB: '3001', NCR: '3002' };
  STORE_ORDER.forEach((c, i) => {
    m[c] = String(1001 + i);
  });
  return m;
})();
function sessionFor(branch) {
  const isHead = branch === 'ALL';
  const isRegion = isRegionCode(branch);
  return {
    branch,
    authStore: branch,
    isHead,
    isRegion,
    // Punjab / Delhi wale logins ke paas bhi head jaise poore rights —
    // band ticket edit kar sakte hain aur entry delete kar sakte hain.
    isPower: isHead || isRegion,
    // region login apne stores ke beech switch kar sake
    canSwitch: isHead || isRegion,
    switchList: isHead ? STORE_ORDER : isRegion ? REGIONS[branch].stores : [],
    name: isHead ? 'All stores' : branchLabel(branch),
    storeName: isHead ? 'All stores' : branchLabel(branch),
  };
}
/* Technician session — sirf "Meri Tickets" view, koi aur page nahi */
/* Tech Admin = saare technicians ki tickets ek jagah.
   viaHead = head (All stores) ne app ke andar se switch kiya hai */
const TECH_ADMIN = 'Tech Admin';
function techSession(name, phone, isTechAdmin = false, viaHead = false) {
  return {
    branch: 'ALL',
    authStore: 'TECH',
    isTech: true,
    isTechAdmin: !!isTechAdmin,
    viaHead: !!viaHead,
    techName: name,
    techPhone: phone || '',
    isHead: false,
    isRegion: false,
    isPower: false,
    canSwitch: false,
    switchList: [],
    name,
    storeName: 'Technician',
  };
}
const sameName = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/* ── STAGES ────────────────────────────────────────────────────────────── */
const STAGES = [
  {
    id: 'received',
    label: 'Ticket Received',
    short: 'Received',
    status: 'Open',
    color: T.slate,
    soft: T.slateSoft,
  },
  {
    id: 'talk',
    label: 'Details & Problem',
    short: 'Details',
    status: 'Talked To Customer',
    color: T.blue,
    soft: T.blueSoft,
  },
  {
    id: 'tech',
    label: 'Technician Assigned',
    short: 'Technician',
    status: 'Technician Assigned',
    color: T.violet,
    soft: T.violetSoft,
  },
  {
    id: 'resolution',
    label: 'Resolved',
    short: 'Resolved',
    status: 'Resolved',
    color: T.green,
    soft: T.mint,
  },
];
const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);

// peeche le jaate waqt: target stage ke AAGE wali stages ke saare fields null
const STAGE_COLS = {
  talk: {
    talk_date: null,
    talk_time: null,
    stage1_remarks: null,
    product_type: null,
    problem_type: null,
    problem_other: null,
  },
  tech: {
    technician: null,
    technician_phone: null,
    tech_remarks: null,
    expected_date: null,
    tech_done_at: null,
    tech_done_by: null,
    tech_done_remarks: null,
  },
  status: {
    action_taken: null,
    action_other: null,
    stage2_remarks: null,
  },
  resolution: {
    is_resolved: false,
    stage3_remarks: null,
    action_taken: null,
    action_other: null,
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

/* ── Language (EN / Hinglish) — dono clean & professional ── */
const HINDI = {
  received: { label: 'Ticket Mila', short: 'Naya' },
  talk: { label: 'Details & Problem', short: 'Details' },
  tech: { label: 'Technician Bheja', short: 'Technician' },
  status: { label: 'Kaam Jaari Hai', short: 'Jaari' },
  resolution: { label: 'Samasya Hal Hui', short: 'Hal Hui' },
};
const HINDI_MOVE = {
  talk: 'Details bharein',
  tech: 'Technician assign karein',
  status: 'Kaam shuru karein',
  resolution: 'Hal hua mark karein',
};
const ENG_MOVE = {
  talk: 'Fill details',
  tech: 'Assign a technician',
  status: 'Start the work',
  resolution: 'Mark as resolved',
};
let HJS_LANG = 'en';
try {
  if (typeof localStorage !== 'undefined')
    HJS_LANG = localStorage.getItem('cmpLang') === 'hi' ? 'hi' : 'en';
} catch (_) {}
function setHjsLang(l) {
  HJS_LANG = l === 'hi' ? 'hi' : 'en';
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem('cmpLang', HJS_LANG);
  } catch (_) {}
}
function sLabel(id) {
  return HJS_LANG === 'hi' && HINDI[id] ? HINDI[id].label : stageMeta(id).label;
}
function sShort(id) {
  return HJS_LANG === 'hi' && HINDI[id] ? HINDI[id].short : stageMeta(id).short;
}
function moveText(id) {
  if (HJS_LANG === 'hi' && HINDI_MOVE[id]) return HINDI_MOVE[id];
  return ENG_MOVE[id] || `Move to ${stageMeta(id).short}`;
}

/* ── UI text — har string dono language me. L('key') se aata hai. ──── */
const TXT = {
  // priority
  priority: { en: 'Priority', hi: 'Priority' },
  prioNotSet: { en: 'Not set', hi: 'Set nahi' },
  prioClear: { en: 'Clear', hi: 'Hatao' },
  prioOnlyHead: {
    en: 'Only the All stores login can set priority.',
    hi: 'Priority sirf All stores login set kar sakta hai.',
  },
  prioSetBy: { en: 'Set by', hi: 'Kisne set ki' },
  tPrioSaved: { en: 'Priority updated', hi: 'Priority update hui' },
  // technician
  techDoneBadge: { en: 'Technician: work done', hi: 'Technician: kaam ho gaya' },
  techDoneTitle: { en: 'Technician marked work done', hi: 'Technician ne kaam poora kiya' },
  techDoneAt: { en: 'Done at', hi: 'Kab' },
  techDoneRemark: { en: 'Technician remark', hi: 'Technician remark' },
  myTickets: { en: 'My tickets', hi: 'Meri tickets' },
  allTechTickets: { en: 'All technician tickets', hi: 'Saare technicians ki tickets' },
  allTechs: { en: 'All technicians', hi: 'Saare technicians' },
  techAdminView: { en: 'Technician view', hi: 'Technician view' },
  boardView: { en: 'Complaints board', hi: 'Complaints board' },
  techBoardSub: {
    en: 'Tickets assigned to technicians — tap any card for full details',
    hi: 'Technicians ko assign hui tickets — details ke liye card pe tap karein',
  },
  overdue: { en: 'Overdue', hi: 'Late' },
  filterOn: { en: 'Showing', hi: 'Dikha rahe' },
  techNoMatch: { en: 'No tickets for this filter.', hi: 'Is filter mein koi ticket nahi.' },
  techDoneQ: { en: 'Work finished on this ticket?', hi: 'Is ticket ka kaam ho gaya?' },
  doneToday: { en: 'Done today', hi: 'Aaj done' },
  techOpen: { en: 'Open', hi: 'Open' },
  techDoneTab: { en: 'Done (7 days)', hi: 'Ho gaya (7 din)' },
  techNoOpen: {
    en: 'No open tickets right now.',
    hi: 'Abhi koi open ticket nahi hai.',
  },
  techNoDone: {
    en: 'Nothing marked done in the last 7 days.',
    hi: 'Pichhle 7 din mein koi kaam done mark nahi hua.',
  },
  techMarkDone: { en: 'Work done', hi: 'Kaam ho gaya' },
  techConfirm: { en: 'Confirm — work done', hi: 'Confirm — kaam ho gaya' },
  techRemarkPh: {
    en: 'Remark (optional) — what was done',
    hi: 'Remark (optional) — kya kaam kiya',
  },
  techCall: { en: 'Call', hi: 'Call karo' },
  tTechDone: { en: 'Marked as done', hi: 'Done mark ho gaya' },
  // header / chips
  complaints: { en: 'complaints', hi: 'ki shikayatein' },
  storeManager: { en: 'Store manager', hi: 'Store manager' },
  today: { en: 'Today', hi: 'Aaj' },
  archived: { en: 'Archived', hi: 'Purani' },
  vYesterday: { en: 'Yesterday', hi: 'Kal' },
  vMonth: { en: 'This month', hi: 'Is mahine' },
  vCustom: { en: 'Custom range', hi: 'Custom' },
  vAllTime: { en: 'all time', hi: 'sab' },
  stages: { en: 'Stages', hi: 'Stages' },
  categories: { en: 'Categories', hi: 'Category' },
  allStores: { en: 'All stores', hi: 'Sabhi stores' },
  totalTickets: { en: 'Total Tickets', hi: 'Kul Tickets' },
  totalArchived: { en: 'Total Archived', hi: 'Kul Purani' },
  pending: { en: 'Pending', hi: 'Baaki' },
  resolved: { en: 'Resolved', hi: 'Hal Hui' },
  cancelled: { en: 'Cancelled', hi: 'Cancel' },
  demoData: { en: 'Demo data', hi: 'Demo data' },
  // board / cards
  noTicket: { en: 'No tickets', hi: 'Koi ticket nahi' },
  completed: { en: 'Completed', hi: 'Poora hua' },
  backToStages: { en: 'Back to stages', hi: 'Stages par wapas' },
  noEntry: { en: 'No entries', hi: 'Koi entry nahi' },
  // search
  searchPh: {
    en: 'Search by customer, ticket, phone…',
    hi: 'Customer, ticket ya phone se dhundein…',
  },
  noMatch: { en: 'No match found', hi: 'Kuch nahi mila' },
  // drawer
  moveToStage: { en: 'Move to stage', hi: 'Stage badlein' },
  nextStep: { en: 'Next step', hi: 'Agla step' },
  allDone: {
    en: 'All stages complete — issue resolved',
    hi: 'Saari stages poori — samasya hal ho gayi',
  },
  filledColored: {
    en: 'Completed stages are coloured. Fill the next stage to unlock the one after it.',
    hi: 'Poori hui stages coloured hain. Agli stage bharne par uske baad wali khulegi.',
  },
  prevStages: { en: 'Earlier stages', hi: 'Pichhli stages' },
  fillNote: { en: 'To fill this stage, tap', hi: 'Ye stage bharne ke liye dabayein' },
  aboveBtn: { en: 'above.', hi: 'upar wala button.' },
  timeline: { en: 'Timeline / history', hi: 'Timeline / history' },
  noHistory: {
    en: 'No history yet. Every stage change will appear here as a continuous log.',
    hi: 'Abhi koi history nahi. Har stage change yahan log hoga.',
  },
  dangerDelete: { en: 'Delete this entry', hi: 'Is entry ko delete karein' },
  confirmDelete: { en: 'Are you sure?', hi: 'Pakka delete karein?' },
  yesDelete: { en: 'Yes, delete', hi: 'Haan, delete' },
  keepIt: { en: 'Keep it', hi: 'Rehne dein' },
  deleteNote: {
    en: 'Only head office and region logins can delete. It disappears from view but stays in the database as "Deleted".',
    hi: 'Sirf head office aur region logins delete kar sakte hain. View se hat jayega par database mein "Deleted" ke saath safe rahega.',
  },
  locked: { en: 'locked', hi: 'locked' },
  lockedTitle: {
    en: 'This ticket is closed',
    hi: 'Ye ticket band ho chuka hai',
  },
  lockedNote: {
    en: 'The issue was resolved, so the stages can no longer be edited. If a change is needed, ask head office or your region login.',
    hi: 'Samasya hal ho chuki hai, isliye stages ab edit nahi ho sakti. Kuch badalna ho to head office ya apne region login se kehna.',
  },
  headCanEdit: {
    en: 'You have full rights — this closed ticket can still be edited.',
    hi: 'Aapke paas poore rights hain — ye band ticket bhi edit ho sakta hai.',
  },
  nextStepBadge: { en: 'Next step', hi: 'Agla step' },
  // KV labels
  kvPhone: { en: 'Phone', hi: 'Phone' },
  kvEmail: { en: 'Email', hi: 'Email' },
  kvItem: { en: 'Product', hi: 'Product' },
  kvIssue: { en: 'Complaint', hi: 'Shikayat' },
  kvStore: { en: 'Store', hi: 'Store' },
  kvOpened: { en: 'Ticket opened', hi: 'Ticket khula' },
  kvManager: { en: 'Store manager', hi: 'Store manager' },
  // modal fields
  whatCustomerSaid: {
    en: 'What did the customer say? *',
    hi: 'Customer ne kya kaha? *',
  },
  whatCustomerSaidPh: {
    en: 'Note the problem, condition, and any advice given…',
    hi: 'Dikkat, haalat aur di gayi salah — sab likhein…',
  },
  autoTime: {
    en: 'The current time will be saved automatically:',
    hi: 'Abhi ka time apne aap save hoga:',
  },
  saidRequired: {
    en: 'Please note what the customer said.',
    hi: 'Customer ne kya kaha — likhna zaroori hai.',
  },
  // technician stage
  chooseTech: { en: 'Technician person *', hi: 'Technician person *' },
  techName: { en: "Technician's name *", hi: 'Technician ka naam *' },
  techNamePh: { en: 'Full name…', hi: 'Poora naam…' },
  techPhone: { en: 'Phone number *', hi: 'Phone number *' },
  techPhonePh: { en: '+91 …', hi: '+91 …' },
  techOtherOpt: { en: 'Other (not in the list)', hi: 'Other (list me nahi hai)' },
  techAutoPhone: {
    en: 'The number will be saved automatically:',
    hi: 'Number apne aap save hoga:',
  },
  techOtherRequired: {
    en: 'You selected "Other" — both name and number are required.',
    hi: 'Aapne "Other" chuna — naam aur number dono bharna zaroori hai.',
  },
  techRemarksPh: {
    en: 'When will they visit, what to carry…',
    hi: 'Kab jayega, kya le kar jayega…',
  },
  techShort: { en: 'Technician', hi: 'Technician' },
  productType: { en: 'Product type *', hi: 'Product type *' },
  exactProblem: { en: 'Exact problem *', hi: 'Sahi problem *' },
  problemOtherLbl: { en: 'Describe the problem *', hi: 'Problem likhein *' },
  problemOtherPh: { en: 'What exactly is wrong…', hi: 'Kya kharab hai…' },
  problemFree: { en: 'Problem *', hi: 'Problem *' },
  problemRequired: {
    en: 'Choose the product type and problem to continue.',
    hi: 'Aage badhne ke liye product type aur problem chunein.',
  },
  formSaid: { en: 'Form mein likha', hi: 'Form mein likha' },
  kvType: { en: 'Type', hi: 'Type' },
  kvProblemShort: { en: 'Problem', hi: 'Problem' },
  customerSaidOpt: {
    en: 'What did the customer say? (optional)',
    hi: 'Customer ne kya kaha? (optional)',
  },
  expectedRequired: {
    en: 'Choose the expected resolution date.',
    hi: 'Kab tak theek hoga — date chunein.',
  },
  techPhoneShort: { en: 'Phone', hi: 'Phone' },
  techAssigned: { en: 'Technician', hi: 'Technician' },
  workDone: {
    en: 'What resolution was done? *',
    hi: 'Kya resolution kiya? *',
  },
  workDoneOther: {
    en: 'Describe the work done *',
    hi: 'Jo kaam kiya wo likhein *',
  },
  workDoneOtherPh: { en: 'Describe the work…', hi: 'Kaam ke baare mein likhein…' },
  otherRequired: {
    en: 'You selected "Other" — please describe it.',
    hi: 'Aapne "Other" chuna — likhna zaroori hai.',
  },
  expectedBy: { en: 'Expected resolution date *', hi: 'Kab tak theek hoga? *' },
  markResolvedChk: { en: 'Issue has been resolved', hi: 'Samasya theek ho gayi' },
  resolvedRequired: {
    en: 'Tick the box to close the ticket.',
    hi: 'Tick karein — tabhi ticket band hoga.',
  },
  workWasDone: { en: 'Work done', hi: 'Kya kaam kiya tha' },
  // short KV row labels (drawer blocks)
  kvDate: { en: 'Date', hi: 'Date' },
  kvTime: { en: 'Time', hi: 'Time' },
  whatSaidShort: { en: 'Customer said', hi: 'Customer ne kya kaha' },
  workDoneShort: { en: 'Resolution', hi: 'Resolution' },
  expectedShort: { en: 'Expected by', hi: 'Kab tak theek hoga' },
  remarksShort: { en: 'Remarks', hi: 'Remarks' },
  resolvedShort: { en: 'Resolved', hi: 'Hal hua' },
  yes: { en: 'Yes', hi: 'Haan' },
  no: { en: 'No', hi: 'Nahi' },
  remarks: { en: 'Remarks (optional)', hi: 'Remarks (optional)' },
  remarksResolve: { en: 'How it was fixed (optional)', hi: 'Kaise theek hua (optional)' },
  remarksPh: { en: 'Optional notes…', hi: 'Optional notes…' },
  remarksResolvePh: {
    en: 'What fixed the issue…',
    hi: 'Kya karne se theek hua…',
  },
  finalResolution: { en: 'Final · resolution', hi: 'Final · resolution' },
  ticketStatus: { en: 'Ticket status', hi: 'Ticket status' },
  talkedNormal: { en: 'Talked to customer', hi: 'Customer se baat hui' },
  invalidOpt: { en: 'Invalid ticket', hi: 'Invalid ticket' },
  duplicateOpt: { en: 'Duplicate ticket', hi: 'Duplicate ticket' },
  cancelledOpt: { en: 'Cancelled ticket', hi: 'Cancelled ticket' },
  select: { en: 'Select…', hi: 'Chunein…' },
  cancel: { en: 'Cancel', hi: 'Cancel' },
  update: { en: 'Update', hi: 'Update' },
  save: { en: 'Save & update', hi: 'Save karein' },
  saveCompleted: { en: 'Save · Completed', hi: 'Save · Poora' },
  edit: { en: 'Edit', hi: 'Edit' },
  // toasts
  tSaved: { en: 'Saved', hi: 'Save ho gaya' },
  tUpdated: { en: 'Updated', hi: 'Update ho gaya' },
  tDeleted: {
    en: 'Deleted — marked "Deleted" in the database',
    hi: 'Delete ho gaya — database mein "Deleted" mark hua',
  },
  tSaveFail: { en: 'Save failed', hi: 'Save nahi hua' },
  tTransferred: { en: 'Transferred to', hi: 'Transfer hua' },
  transferTitle: { en: 'Transfer to another store', hi: 'Dusre store ko bhejein' },
  transferPh: { en: 'Choose store…', hi: 'Store chunein…' },
  transferBtn: { en: 'Transfer', hi: 'Transfer' },
  transferNote: {
    en: 'Ticket moves to that store with all its stages. This store will no longer see it.',
    hi: 'Ticket apni saari stages ke saath us store mein chala jayega. Is store mein nahi dikhega.',
  },
  kvProblem: { en: 'Customer problem', hi: 'Customer ki problem' },
  tDeleteFail: { en: 'Delete failed', hi: 'Delete nahi hua' },
  tMarked: { en: 'Marked as', hi: 'Mark hua' },
  tMoved: { en: 'Moved to', hi: 'Move hua' },
  // dashboard
  dashSub: { en: 'All stores · MIS', hi: 'Sabhi stores · MIS' },
  dashTitle: { en: 'Dashboard', hi: 'Dashboard' },
  rToday: { en: 'Today', hi: 'Aaj' },
  rYesterday: { en: 'Yesterday', hi: 'Kal' },
  r7d: { en: 'Last 7 days', hi: 'Pichhle 7 din' },
  rMonth: { en: 'This month', hi: 'Is mahine' },
  rAll: { en: 'All time', hi: 'Sabhi' },
  rCustom: { en: 'Custom', hi: 'Custom' },
  storeWise: { en: 'Store-wise', hi: 'Store-wise' },
  entriesWord: { en: 'entries', hi: 'entries' },
  entryWord: { en: 'entry', hi: 'entry' },
  colStore: { en: 'Store', hi: 'Store' },
  colTotal: { en: 'Total', hi: 'Kul' },
  colPending: { en: 'Pending', hi: 'Baaki' },
  colOverdue: { en: 'Overdue', hi: 'Late' },
  colIssues: { en: 'Issues', hi: 'Issues' },
  colCustomer: { en: 'Customer', hi: 'Customer' },
  colItem: { en: 'Product', hi: 'Product' },
  colComplaint: { en: 'Complaint', hi: 'Shikayat' },
  colStage: { en: 'Stage', hi: 'Stage' },
  colOpened: { en: 'Opened', hi: 'Khula' },
  colDue: { en: 'Due', hi: 'Kab tak' },
  colTicket: { en: 'Ticket', hi: 'Ticket' },
  cTotal: { en: 'Total', hi: 'Kul' },
  cResolved: { en: 'Resolved', hi: 'Hal Hui' },
  cOverdue: { en: 'Overdue', hi: 'Late' },
  cIssues: { en: 'Cancelled/Dup/Invalid', hi: 'Cancel/Dup/Invalid' },
  // misc
  loadingTickets: { en: 'Loading tickets…', hi: 'Tickets load ho rahe hain…' },
  connectFail: {
    en: 'Could not connect to Supabase.',
    hi: 'Supabase se connect nahi hua.',
  },
  connectHint: {
    en: 'Check the anon key and the RLS SELECT policy.',
    hi: 'anon key aur RLS SELECT policy check karein.',
  },
  noneOf: { en: 'No', hi: 'Koi' },
  entriesLower: { en: 'entries', hi: 'entries' },
};
function L(key) {
  const t = TXT[key];
  if (!t) return key;
  return HJS_LANG === 'hi' ? t.hi : t.en;
}
function eventLine(ev) {
  if (ev && ev.stage === 'priority') {
    const f = ev.fields || {};
    return `Priority — ${f.From || 'Not set'} → ${f.To || 'Not set'}`;
  }
  if (ev && ev.stage === 'techdone')
    return HJS_LANG === 'hi'
      ? 'Technician ne kaam ho gaya mark kiya'
      : 'Technician marked work done';
  if (ev && ev.stage === 'transfer') {
    const f = ev.fields || {};
    return HJS_LANG === 'hi'
      ? `Store transfer — ${f.From || ''} se ${f.To || ''}`
      : `Transferred ${f.From || ''} → ${f.To || ''}`;
  }
  const label =
    HJS_LANG === 'hi' && HINDI[ev.stage] ? HINDI[ev.stage].label : ev.label;
  if (HJS_LANG !== 'hi') return `${ev.action} ${label}`;
  const verb =
    ev.action === 'Edited'
      ? '— edit hua'
      : ev.action === 'Marked as'
        ? 'mark hua'
        : 'par pahuncha';
  return `${label} ${verb}`;
}
const stageToStatus = (id) =>
  (STAGES.find((s) => s.id === id) || {}).status || 'Open';
function statusToStage(s) {
  const t = String(s || '').toLowerCase();
  if (t.includes('delet')) return 'deleted';
  if (t.includes('duplicate')) return 'duplicate';
  if (t.includes('invalid') || t.includes('reject')) return 'invalid';
  if (t.includes('cancel')) return 'cancelled';
  if (t.includes('resolv') || t.includes('closed') || t.includes('suljh'))
    return 'resolution';
  // "Work in Progress" stage hata di — purane In Progress tickets
  // Technician stage pe dikhenge, agla step seedha Resolution.
  if (t.includes('progress') || t.includes('chalu')) return 'tech';
  if (t.includes('technician') || t.includes('assign')) return 'tech';
  if (t.includes('talk') || t.includes('baat')) return 'talk';
  return 'received';
}

/* ── CLOSED STATES ────────────────────────────────────────────────────── */
const CLOSED = {
  cancelled: {
    id: 'cancelled',
    label: 'Cancelled',
    short: 'Cancelled',
    color: T.red,
    soft: T.redSoft,
    title: { en: 'This ticket was cancelled', hi: 'Ye ticket cancel ho gaya' },
    note: {
      en: 'The customer withdrew the complaint. Stages can no longer be edited — kept for the record.',
      hi: 'Customer ne shikayat wapas le li. Stages ab edit nahi ho sakti — record ke liye rakhi gayi hai.',
    },
  },
  duplicate: {
    id: 'duplicate',
    label: 'Duplicate Ticket',
    short: 'Duplicate',
    color: T.slate,
    soft: T.slateSoft,
    title: { en: 'Marked as duplicate', hi: 'Duplicate mark hua' },
    note: {
      en: 'The store manager marked this as a duplicate — removed from the active list.',
      hi: 'Store manager ne isse duplicate mark kiya — active list se hata diya gaya.',
    },
  },
  invalid: {
    id: 'invalid',
    label: 'Invalid Ticket',
    short: 'Invalid',
    color: T.blue,
    soft: T.blueSoft,
    title: { en: 'Marked as invalid', hi: 'Invalid mark hua' },
    note: {
      en: 'Not a valid complaint (out of warranty / wrong entry) — removed from the active list.',
      hi: 'Ye valid shikayat nahi thi (warranty ke bahar / galat entry) — active list se hata di gayi.',
    },
  },
  deleted: {
    id: 'deleted',
    label: 'Deleted',
    short: 'Deleted',
    color: T.slate,
    soft: T.slateSoft,
    title: { en: 'This entry was deleted', hi: 'Ye entry delete hui' },
    note: {
      en: 'The head deleted this — kept in the database for the record.',
      hi: 'Head ne isse delete kiya — database mein record ke liye rakha gaya.',
    },
  },
};
// closed meta ka title/note current language me
const cTitle = (m) => (typeof m.title === 'string' ? m.title : m.title[HJS_LANG === 'hi' ? 'hi' : 'en']);
const cNote = (m) => (typeof m.note === 'string' ? m.note : m.note[HJS_LANG === 'hi' ? 'hi' : 'en']);
const isClosedStage = (s) =>
  s === 'cancelled' || s === 'duplicate' || s === 'invalid' || s === 'deleted';
function stageMeta(id) {
  const s = STAGES[stageIndex(id)];
  if (s) return s;
  if (CLOSED[id]) return CLOSED[id];
  return STAGES[0];
}
const stageColorOf = (id) => stageMeta(id).color;

const STAGE_HINT = {
  received: {
    en: 'Ticket has been registered',
    hi: 'Ticket register ho gaya',
  },
  talk: {
    en: 'Call the customer — pick the product type and exact problem',
    hi: 'Customer ko call karein — product type aur sahi problem chunein',
  },
  tech: {
    en: 'Assign a technician and the expected resolution date',
    hi: 'Technician aur kab tak theek hoga — dono bharein',
  },

  resolution: {
    en: 'Enter the resolution done and tick resolved — the ticket will close',
    hi: 'Kya resolution kiya bharein aur tick karein — ticket band ho jayega',
  },
};
const stageHint = (id) => {
  const h = STAGE_HINT[id];
  if (!h) return '';
  return typeof h === 'string' ? h : h[HJS_LANG === 'hi' ? 'hi' : 'en'];
};

function clean(v) {
  return v !== null && v !== undefined && v !== 'null' && v !== ''
    ? String(v)
        .replace(/\s*\n+\s*/g, ', ')
        .trim()
    : '';
}
function equipIcon(text) {
  const t = String(text || '').toLowerCase();
  if (t.includes('oxygen') || t.includes('concentrat') || /\boc\b/.test(t))
    return Wind;
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
function niceDateTime(v) {
  if (!v || v === 'null') return null;
  const t = String(v).replace(' ', 'T');
  const d = niceDate(t.slice(0, 10));
  const tm = niceTime(t.slice(11, 16));
  if (!d && !tm) return String(v);
  return [d, tm].filter(Boolean).join(', ');
}
function toLocalInput(v) {
  if (!v || v === 'null') return '';
  return String(v).replace(' ', 'T').slice(0, 16);
}

/* app-controlled timeline */
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

function stageFields(toStage, f) {
  const rmk = f.remarks ? { Remarks: f.remarks } : {};
  if (toStage === 'received') return {};
  if (toStage === 'talk')
    return {
      Date: f.date || '—',
      Time: f.time || '—',
      ...(f.ptype ? { Type: f.ptype } : {}),
      Problem: (f.problem === 'Other' ? f.problemOther : f.problem) || '—',
      ...rmk,
    };
  if (toStage === 'tech')
    return {
      Technician: techNameOf(f) || '—',
      Phone: techPhoneVal(f) || '—',
      'Kab tak': f.expected ? niceDate(f.expected) || f.expected : '—',
      ...rmk,
    };
  if (toStage === 'resolution')
    return {
      Resolution: (f.action === 'Other' ? f.actionOther : f.action) || '—',
      Resolved: f.resolved ? 'Yes' : 'No',
      ...rmk,
    };
  return {};
}
/* ── Kaun kar raha hai ─────────────────────────────────────────────────
   Har app_log event ke saath login ka store + manager stamp hota hai, taaki
   Activity log mein "kisne kiya" dikh sake. Koi naya column nahi. */
let ACTOR = { by: null, byName: null };
function setActor(session) {
  if (!session) {
    ACTOR = { by: null, byName: null };
    return;
  }
  if (session.isTech) {
    ACTOR = {
      by: 'TECH',
      byName: session.viaHead
        ? 'Head office (Tech Admin)'
        : session.isTechAdmin
          ? 'Tech Admin'
          : `${session.techName} (Technician)`,
    };
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
function actorText(ev) {
  if (!ev) return 'Record nahi';
  const name = ev.by_name || ev.byName || '';
  const code = ev.by || '';
  if (!name && !code) return 'Record nahi (purana update)';
  if (code === 'ALL') return name || 'Head office';
  if (code === 'TECH') return name || 'Technician';
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
const existingLog = (d) =>
  d && d._raw && Array.isArray(d._raw.app_log) ? d._raw.app_log : [];

function reachedIdxFromLog(log) {
  if (Array.isArray(log) && log.length) {
    for (let i = log.length - 1; i >= 0; i--) {
      const si = stageIndex(log[i] && log[i].stage);
      if (si >= 0) return si;
    }
  }
  return 0;
}

/* ── Today vs Archived ────────────────────────────────────────────────── */
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
function createdTs(x) {
  const r = (x && x._raw) || {};
  return r.created_at || r.opening_time || r.updated_at || null;
}
// ticket kab "band" hua — resolved ya closed (cancelled/duplicate/invalid).
// app_log ke aakhri closing-event ka time; warna updated_at.
function closedTs(x) {
  const r = (x && x._raw) || {};
  const log = Array.isArray(r.app_log) ? r.app_log : [];
  for (let i = log.length - 1; i >= 0; i--) {
    const ev = log[i];
    if (ev && (ev.stage === 'resolution' || CLOSED[ev.stage]) && ev.ts)
      return ev.ts;
  }
  return r.updated_at || r.created_at || null;
}
const HOUR = 3600000;
function hoursSince(ts) {
  if (!ts) return 0;
  const d = new Date(ts);
  if (isNaN(d)) return 0;
  return (Date.now() - d.getTime()) / HOUR;
}
/*
  Ek ticket kaha dikhe:
  - PENDING (received/talk/status)  → hamesha "Today" me.
  - BAND (resolved/cancelled/dup/invalid):
      0–24 ghante   → "Today" me (abhi-abhi band hui).
      24–48 ghante  → "Archived" me.
      48+ ghante    → kahin nahi (view se gayab; Supabase me safe rehti hai).
*/
/*
  Ek ticket kaha dikhe:
  - Today     → saari pending (chahe purani ho) + jo aaj aayi + jo aaj band hui
  - Archived  → saari ho-chuki entries (all time)
  - Yesterday / This month / Custom → us duration mein aayi ya band hui
*/
function inView(x, viewMode, vFrom, vTo) {
  const st = x.stage;
  const pending = st !== 'resolution' && !isClosedStage(st);
  if (viewMode === 'archived') return !pending;
  if (viewMode === 'today') {
    return pending || isToday(createdTs(x)) || isToday(closedTs(x));
  }
  const [s, e] = viewBounds(viewMode, vFrom, vTo);
  const cd = dayStr(createdTs(x));
  const dd = pending ? '' : dayStr(closedTs(x));
  return (cd && cd >= s && cd <= e) || (dd && dd >= s && dd <= e);
}
/* view dropdown ke liye [start, end] — dayStr/todayStr hoisted hain */
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

const CATS = [
  {
    id: 'pending',
    label: 'Pending',
    icon: Wrench,
    color: T.blue,
    soft: T.blueSoft,
    test: (x) => !isClosedStage(x.stage) && x.stage !== 'resolution',
  },
  {
    id: 'resolved',
    label: 'Resolved',
    icon: CheckCircle2,
    color: T.forestSoft,
    soft: T.mint,
    test: (x) => x.stage === 'resolution',
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
    id: 'invalid',
    label: 'Invalid Tickets',
    icon: RefreshCw,
    color: T.blue,
    soft: T.blueSoft,
    test: (x) => x.stage === 'invalid',
  },
  {
    id: 'duplicate',
    label: 'Duplicate Tickets',
    icon: Copy,
    color: T.slate,
    soft: T.slateSoft,
    test: (x) => x.stage === 'duplicate',
  },
];

/* ── Form ki city → app ka store ──────────────────────────────────────
   Zoho form ki city list aur app ke STORE_ORDER ke naam alag the
   (Gurgaon vs Gurugram, NCR, Chandigarh). Bina is map ke wo tickets kisi
   store login mein nahi dikhte the — sirf "All stores" mein.
   Naya form label aaye to yahan ek line jod do. */
const CITY_ALIAS = {
  gurgaon: 'Gurugram',
  gurugram: 'Gurugram',
  ncr: 'Noida', // ⚠ confirm: form ka "NCR" = Noida store?
  noida: 'Noida',
  chandigarh: 'Mohali', // ⚠ confirm: Chandigarh tickets Mohali store handle karta hai?
  mohali: 'Mohali',
  'mohali / chandigarh': 'Mohali',
  'shastri nagar': 'Shastri Nagar',
  'delhi - shastri nagar': 'Shastri Nagar',
  janakpuri: 'Janakpuri',
  'delhi - janakpuri': 'Janakpuri',
  jaipur: 'Jaipur',
  ludhiana: 'Ludhiana',
  jalandhar: 'Jalandhar',
  lucknow: 'Lucknow',
};
function normalizeCity(v) {
  const c = clean(v);
  if (!c) return '';
  return CITY_ALIAS[c.toLowerCase()] || c;
}

/* ── Customer ki problem ──────────────────────────────────────────────
   Zoho form mein problem har product ke alag dropdown + "Problem
   Description" mein aati hai. Jo bhi column bhara ho (subject, ya naam mein
   problem / issue / description) — sab jod ke ek line bana dete hain. */
const PROBLEM_KEY = /problem|issue|description|complaint|subject/i;
const PROBLEM_SKIP = /remarks|stage|action|app_log|resolved/i;
function problemOf(r) {
  const seen = new Set();
  const out = [];
  const add = (v) => {
    const c = clean(v);
    if (!c || c === '-Select-' || c === '—') return;
    const k = c.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(c);
  };
  add(pickedProblem(r));
  // form se subject = product placeholder ("BED") — wo problem nahi hai
  const subj = clean(r.subject);
  const prod = clean(r.product);
  const subjIsProduct = !!subj && !!prod && subj.toLowerCase() === prod.toLowerCase();
  const typeTxt = realVal(r.product_type);
  if (!subjIsProduct) {
    // Stage 1 ke baad subject "Type · Problem" hota hai — type dobara na dikhe
    add(typeTxt && subj.startsWith(typeTxt + ' · ') ? subj.slice(typeTxt.length + 3) : subj);
  }
  Object.keys(r || {}).forEach((key) => {
    if (key === 'subject' || key === 'problem_type' || key === 'problem_other')
      return;
    if (PROBLEM_KEY.test(key) && !PROBLEM_SKIP.test(key)) add(r[key]);
  });
  return out.join(' · ');
}

function rowToTicket(r) {
  const branch = normalizeCity(r.city) || '—';
  return {
    ticket_id: r.ticket_id,
    id: r.ticket_number || r.ticket_id,
    branch,
    manager: STORE_MANAGERS[branch] || '—',
    customer: r.full_name || '—',
    phone: clean(r.mobile) || '—',
    email: clean(r.email_id) || '—',
    area: branch !== '—' ? branchLabel(branch) : '—',
    equipment:
      [clean(r.product), realVal(r.product_type)].filter(Boolean).join(' · ') ||
      'Equipment',
    subject: problemOf(r) || '—',
    technician: clean(r.technician) || '',
    technicianPhone: clean(r.technician_phone) || '',
    opened: r.opening_time || r.created_at || null,
    expected: clean(r.expected_date) || '—',
    stage: statusToStage(r.status),
    rawStatus: r.status,
    priority: PRIORITIES[clean(r.priority)] ? clean(r.priority) : '',
    techDoneAt: r.tech_done_at || null,
    techDone: !!r.tech_done_at,
    _raw: r,
  };
}


/* mobile detection */
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
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => {
      mq.removeEventListener
        ? mq.removeEventListener('change', on)
        : mq.removeListener(on);
    };
  }, [q]);
  return m;
}

/* ════════════════════════════════════════════════════════════════ APP */
export default function App({
  session: extSession = null,
  view = 'board',
  reloadKey = 0,
  openLogKey = 0,
  lang: extLang = null,
  search: extSearch = '',
  onResults = null,
  pickId = null,
  pickKey = 0,
  onLogout: extLogout = null,
  onNav: extNav = null, // hosted: delivery app ka page badlo (complaints ⇄ techadmin)
}) {
  // extSession aaye = delivery app ke andar embed ho raha hai. Tab na Login
  // screen, na apna Sidebar/Topbar — sirf board/dashboard render hota hai.
  const hosted = !!extSession;
  const [ownSession, setOwnSession] = useState(null);
  const session = hosted ? extSession : ownSession;
  const setSession = hosted ? () => {} : setOwnSession;
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [modal, setModal] = useState(null); // { ticketId, toStage, mode }
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState('today'); // today|yesterday|month|custom|archived
  const [vFrom, setVFrom] = useState(() => todayStr());
  const [vTo, setVTo] = useState(() => todayStr());
  const [layoutMode, setLayoutMode] = useState('board'); // board | categories
  const [lang, setLang] = useState(HJS_LANG);
  const [lastMove, setLastMove] = useState(null);
  const jumpMobile = (toStage) => setLastMove({ stage: toStage, n: Date.now() });
  const [showLog, setShowLog] = useState(false); // activity log panel
  // hosted mode: head login store switch kar sake
  const [viewBranch, setViewBranch] = useState(null);
  // kaun logged-in hai — har app_log event isi se stamp hota hai
  setActor(session);
  const [ownPage, setOwnPage] = useState('tickets'); // tickets | dashboard
  const page = hosted
    ? view === 'dashboard'
      ? 'dashboard'
      : view === 'techadmin'
        ? 'techadmin'
        : 'tickets'
    : ownPage;
  const setPage = hosted ? () => {} : setOwnPage;
  const switchLang = (l) => {
    setHjsLang(l);
    setLang(HJS_LANG);
  };
  const effLayout = layoutMode;

  const ping = (m) => {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setTickets((await sbSelect()).map(rowToTicket));
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
  // hosted mode: delivery app ka refresh button
  const firstReload = React.useRef(true);
  useEffect(() => {
    if (firstReload.current) {
      firstReload.current = false;
      return;
    }
    if (session) load(); /* eslint-disable-next-line */
  }, [reloadKey]);

  const scoped = useMemo(() => {
    if (!session) return [];
    const base = tickets.filter((x) => x.stage !== 'deleted');
    const br = viewBranch || session.branch;
    const list = storesOf(br);
    if (!list) return base; // ALL
    return base.filter((x) => list.includes(x.branch));
  }, [tickets, session, viewBranch]);

  // Activity log ke liye alag scope — deleted entries bhi chahiye
  const scopedAll = useMemo(() => {
    if (!session) return [];
    const list = storesOf(session.branch);
    if (!list) return tickets; // ALL
    return tickets.filter((x) => list.includes(x.branch));
  }, [tickets, session]);

  const hostSearch = hosted ? String(extSearch || '').trim().toLowerCase() : '';

  // High priority wale har column/list mein sabse upar (stable sort —
  // same priority ke andar purana order, yaani naya pehle, wahi rehta hai)
  const viewItems = useMemo(
    () =>
      scoped
        .filter((x) => inView(x, viewMode, vFrom, vTo))
        .map((x, i) => [x, i])
        .sort((a, b) => byPriority(a[0], b[0]) || a[1] - b[1])
        .map((p) => p[0]),
    [scoped, viewMode, vFrom, vTo],
  );

  // hosted: topbar ke dropdown ke liye results upar bhejte hain
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
            key: x.ticket_id,
            id: x.ticket_id,
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
    if (pickId) setActiveId(pickId);
    // eslint-disable-next-line
  }, [pickKey]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return scoped
      .filter(
        (x) =>
          x.customer.toLowerCase().includes(q) ||
          String(x.id).toLowerCase().includes(q) ||
          x.area.toLowerCase().includes(q) ||
          x.equipment.toLowerCase().includes(q) ||
          String(x.phone).toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [scoped, search]);

  const active = tickets.find((x) => x.ticket_id === activeId) || null;

  // ── Egress bachane ke liye ──────────────────────────────────────────
  // Pehle har save ke baad poori list dobara Supabase se aati thi. Ab sirf
  // usi row ko local state mein patch kar dete hain — ek save = ek chhoti
  // update call (poora table nahi).
  const applyLocal = (id, patch) => {
    setTickets((prev) =>
      prev.map((x) =>
        x.ticket_id === id ? rowToTicket({ ...x._raw, ...patch }) : x,
      ),
    );
  };

  const buildPatch = (toStage, f, mode) => {
    const patch = { updated_at: new Date().toISOString() };
    if (mode === 'move') patch.status = stageToStatus(toStage);
    if (toStage === 'talk') {
      patch.talk_date = f.date || null;
      patch.talk_time = f.time || null;
      patch.stage1_remarks = f.remarks || null;
      patch.product_type = f.ptype || null;
      patch.problem_type = f.problem || null;
      patch.problem_other =
        f.problem === 'Other' ? f.problemOther || null : null;
      // Form se subject = product (jaise "BED") aata hai. Stage 1 bharte hi
      // subject ko asli problem bana dete hain — "Electric Bed · Remote not working"
      const picked = f.problem === 'Other' ? f.problemOther : f.problem;
      if (picked) patch.subject = [f.ptype, picked].filter(Boolean).join(' · ');
    } else if (toStage === 'tech') {
      patch.technician = techNameOf(f) || null;
      patch.technician_phone = techPhoneVal(f) || null;
      patch.expected_date = f.expected || null;
      patch.tech_remarks = f.remarks || null;
    } else if (toStage === 'resolution') {
      patch.action_taken = f.action || null;
      patch.action_other = f.action === 'Other' ? f.actionOther || null : null;
      patch.is_resolved = !!f.resolved;
      patch.stage3_remarks = f.remarks || null;
    }
    return patch;
  };

  const applyMove = async (ticketId, toStage, fields, mode) => {
    const patch = buildPatch(toStage, fields, mode);
    const cur = tickets.find((x) => x.ticket_id === ticketId);
    // technician badla to purana "kaam ho gaya" reset — naya banda fir se karega
    if (
      toStage === 'tech' &&
      cur &&
      cur.techDone &&
      !sameName(patch.technician, cur.technician)
    ) {
      Object.assign(patch, {
        tech_done_at: null,
        tech_done_by: null,
        tech_done_remarks: null,
      });
    }
    patch.app_log = [...existingLog(cur), makeEvent(toStage, fields, mode)];
    const landed = toStage;
    try {
      await sbPatch(ticketId, patch);
      ping(
        mode === 'edit'
          ? `${L('tUpdated')} ✓`
          : `${L('tSaved')} ✓ · ${sLabel(landed)}`,
      );
      if (mode === 'move') jumpMobile(landed);
      applyLocal(ticketId, patch);
    } catch (e) {
      ping(`${L('tSaveFail')}: ` + e.message);
    }
  };

  const commitModal = async (fields) => {
    const { ticketId, toStage, mode } = modal;
    setModal(null);
    await applyMove(ticketId, toStage, fields, mode);
  };

  const setStage = async (ticketId, toStage) => {
    const cur = tickets.find((x) => x.ticket_id === ticketId);
    const goingBack =
      cur && stageIndex(toStage) < stageIndex(cur.stage || 'received');
    if (goingBack) {
      const ok =
        typeof window === 'undefined'
          ? true
          : window.confirm(
              `Ticket ko "${STAGES[stageIndex(toStage)].label}" pe wapas le jaayein?\n\nAage ki bhari hui details (kaam, date, resolution waghera) hat jaayengi — baad mein dobara bharni hongi.`,
            );
      if (!ok) return;
    }
    const patch = {
      status: stageToStatus(toStage),
      updated_at: new Date().toISOString(),
      app_log: [...existingLog(cur), makeEvent(toStage, {}, 'move')],
    };
    if (goingBack) Object.assign(patch, clearAhead(toStage));
    try {
      await sbPatch(ticketId, patch);
      ping(`${L('tMoved')} · ${sLabel(toStage)}`);
      jumpMobile(toStage);
      applyLocal(ticketId, patch);
    } catch (e) {
      ping(`${L('tSaveFail')}: ` + e.message);
    }
  };

  // ── Store transfer — ticket galat store pe aa gaya to dusre store bhejo.
  // Sirf `city` column badalta hai; app_log mein From → To likha jaata hai.
  const transferTicket = async (ticketId, toStore) => {
    const cur = tickets.find((x) => x.ticket_id === ticketId);
    if (!cur || !toStore || toStore === cur.branch) return;
    const patch = {
      city: toStore,
      updated_at: new Date().toISOString(),
      app_log: [
        ...existingLog(cur),
        {
          ts: new Date().toISOString(),
          stage: 'transfer',
          label: 'Store transfer',
          action: 'Transferred',
          fields: { From: branchLabel(cur.branch), To: branchLabel(toStore) },
          ...actorStamp(),
        },
      ],
    };
    try {
      await sbPatch(ticketId, patch);
      setActiveId(null);
      ping(`${L('tTransferred')} · ${branchLabel(toStore)}`);
      applyLocal(ticketId, patch);
    } catch (e) {
      ping(`${L('tSaveFail')}: ` + e.message);
    }
  };

  // ── Priority — sirf head (All stores). UI ke saath yahan bhi check.
  const setPriority = async (ticketId, p) => {
    if (!canSetPriority(session)) {
      ping(L('prioOnlyHead'));
      return;
    }
    const cur = tickets.find((x) => x.ticket_id === ticketId);
    if (!cur || (cur.priority || '') === (p || '')) return;
    const now = new Date().toISOString();
    const patch = {
      priority: p || null,
      priority_set_by: p ? ACTOR.byName || 'Head office' : null,
      priority_set_at: p ? now : null,
      updated_at: now,
      app_log: [
        ...existingLog(cur),
        {
          ts: now,
          stage: 'priority',
          label: 'Priority',
          action: 'Priority',
          fields: { From: cur.priority || 'Not set', To: p || 'Not set' },
          ...actorStamp(),
        },
      ],
    };
    try {
      await sbPatch(ticketId, patch);
      ping(`${L('tPrioSaved')} · ${p || L('prioNotSet')}`);
      applyLocal(ticketId, patch);
    } catch (e) {
      ping(`${L('tSaveFail')}: ` + e.message);
    }
  };

  // ── Technician ne kaam poora kiya. Stage "Technician Assigned" hi
  // rehti hai (status nahi badalta) — bas tech_done_* bhar jaate hain,
  // taaki aage ka flow (Resolved) store/head pehle jaisa kar sake.
  const markTechDone = async (ticketId, remarks, sess = session) => {
    const session = sess; // head ke Tech Admin switch mein alag session aata hai
    const cur = tickets.find((x) => x.ticket_id === ticketId);
    if (!cur || !session || !session.isTech) return;
    if (cur.stage !== 'tech') return;
    // technician sirf apni ticket; Tech Admin kisi ki bhi done kar sakta hai
    if (!session.isTechAdmin && !sameName(cur.technician, session.techName))
      return;
    const now = new Date().toISOString();
    const patch = {
      tech_done_at: now,
      tech_done_by: cur.technician || session.techName,
      tech_done_remarks: remarks || null,
      updated_at: now,
      app_log: [
        ...existingLog(cur),
        {
          ts: now,
          stage: 'techdone',
          label: 'Technician — work done',
          action: 'Marked as',
          fields: {
            ...(session.isTechAdmin ? { Technician: cur.technician || '—' } : {}),
            ...(remarks ? { Remark: remarks } : {}),
          },
          ...actorStamp(),
        },
      ],
    };
    try {
      await sbPatch(ticketId, patch);
      ping(`${L('tTechDone')} ✓`);
      applyLocal(ticketId, patch);
    } catch (e) {
      ping(`${L('tSaveFail')}: ` + e.message);
    }
  };

  const removeEntry = async (ticketId) => {
    const cur = tickets.find((x) => x.ticket_id === ticketId);
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
    try {
      await sbPatch(ticketId, patch);
      setActiveId(null);
      ping(L('tDeleted'));
      applyLocal(ticketId, patch);
    } catch (e) {
      ping(`${L('tDeleteFail')}: ` + e.message);
    }
  };

  if (!session) return <Login onLogin={setSession} />;

  // ── Technician view: app ke andar ek page (sidebar/topbar wahi).
  // Head = saare stores; region / store login = sirf apne store(s) ki
  // technician tickets (scoped pehle se store-wise filter hota hai).
  // Board ⇄ Technician view ka toggle dono pages pe upar rehta hai.
  const headTech = !session.isTech ? techSession(TECH_ADMIN, '', true, true) : null;
  const goView = (v) => {
    setActiveId(null);
    if (hosted) extNav && extNav(v === 'techadmin' ? 'techadmin' : 'complaints');
    else setOwnPage(v === 'techadmin' ? 'techadmin' : 'tickets');
  };
  const techBoardEl = headTech ? (
    <>
      <ViewSwitch value="techadmin" onChange={goView} />
      <TechBoard
        session={headTech}
        tickets={scoped}
        loading={loading}
        onOpen={(x) => setActiveId(x.ticket_id)}
        onDone={(id, rm) => markTechDone(id, rm, headTech)}
        embedded
        onlyAssigned={!session.isHead}
      />
    </>
  ) : null;

  // ── TECHNICIAN: sirf uska apna view — koi sidebar / dashboard / board nahi
  if (session.isTech) {
    return (
      <TechView
        session={session}
        tickets={tickets}
        loading={loading}
        error={error}
        onReload={load}
        onLogout={hosted ? extLogout || (() => {}) : () => setSession(null)}
        onDone={markTechDone}
        toast={toast}
        lang={lang}
        onLang={switchLang}
      />
    );
  }

  // ── HOSTED: delivery app ke <main> ke andar — sirf content, koi chrome nahi
  if (hosted) {
    return (
      <div className="hjs-complaints">
        <StyleTag />
        {page === 'techadmin' && headTech ? (
          techBoardEl
        ) : page === 'dashboard' ? (
          <Dashboard tickets={scoped} onOpen={(x) => setActiveId(x.ticket_id)} />
        ) : (
          <>
            {headTech && extNav && <ViewSwitch value="board" onChange={goView} />}
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
              layoutMode={layoutMode}
              onLayoutMode={setLayoutMode}
              onSwitchStore={(b) => setViewBranch(b)}
              branchView={viewBranch || session.branch}
            />
            {error && (
              <div className="err">
                <CloudOff size={18} color={T.red} />
                <div>
                  <b>{L('connectFail')}</b> {error}
                </div>
              </div>
            )}
            <EntriesView
              items={viewItems}
              viewMode={viewMode}
              layoutMode={effLayout}
              loading={loading}
              onOpen={(x) => setActiveId(x.ticket_id)}
              onMove={(x, toStage) =>
                setModal({ ticketId: x.ticket_id, toStage, mode: 'move' })
              }
              onCommit={(dd, toStage, fields) =>
                applyMove(dd.ticket_id, toStage, fields, 'move')
              }
              focus={lastMove}
            />
          </>
        )}
        {active && (
          <Drawer
            d={active}
            isHead={session.isPower}
            canPriority={canSetPriority(session)}
            onPriority={(p) => setPriority(active.ticket_id, p)}
            canDelete={session.isPower}
            onDelete={() => removeEntry(active.ticket_id)}
            onTransfer={(st) => transferTicket(active.ticket_id, st)}
            onClose={() => setActiveId(null)}
            onAdvance={(toStage) =>
              setModal({ ticketId: active.ticket_id, toStage, mode: 'move' })
            }
            onSetStage={(toStage) => setStage(active.ticket_id, toStage)}
            onEditStage={(sid) =>
              setModal({ ticketId: active.ticket_id, toStage: sid, mode: 'edit' })
            }
          />
        )}
        {modal && (
          <StageModal
            ticket={tickets.find((x) => x.ticket_id === modal.ticketId)}
            toStage={modal.toStage}
            mode={modal.mode}
            onClose={() => setModal(null)}
            onSave={commitModal}
          />
        )}
        {showLog && (
          <ActivityLog
            tickets={scopedAll}
            session={session}
            onClose={() => setShowLog(false)}
            onOpen={(x) => {
              setShowLog(false);
              setActiveId(x.ticket_id);
            }}
          />
        )}
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  return (
    <div
      className="hjs-complaints"
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
          page={
            session.isHead || session.isRegion
              ? page === 'techadmin'
                ? 'tickets'
                : page
              : 'tickets'
          }
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
            search={search}
            setSearch={setSearch}
            results={searchResults}
            onPick={(x) => {
              setActiveId(x.ticket_id);
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
            {page === 'techadmin' && headTech ? (
              techBoardEl
            ) : (session.isHead || session.isRegion) && page === 'dashboard' ? (
              <Dashboard
                tickets={scoped}
                onOpen={(x) => setActiveId(x.ticket_id)}
              />
            ) : (
              <>
                {headTech && <ViewSwitch value="board" onChange={goView} />}
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
                      <b>{L('connectFail')}</b> {error}
                      <div
                        style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}
                      >
                        {L('connectHint')}
                      </div>
                    </div>
                  </div>
                )}
                <EntriesView
                  items={viewItems}
                  viewMode={viewMode}
                  layoutMode={effLayout}
                  loading={loading}
                  onOpen={(x) => setActiveId(x.ticket_id)}
                  onMove={(x, toStage) =>
                    setModal({ ticketId: x.ticket_id, toStage, mode: 'move' })
                  }
                  onCommit={(dd, toStage, fields) =>
                    applyMove(dd.ticket_id, toStage, fields, 'move')
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
          isHead={session.isPower}
          canPriority={canSetPriority(session)}
          onPriority={(p) => setPriority(active.ticket_id, p)}
          canDelete={session.isPower}
          onDelete={() => removeEntry(active.ticket_id)}
          onTransfer={(st) => transferTicket(active.ticket_id, st)}
          onClose={() => setActiveId(null)}
          onAdvance={(toStage) =>
            setModal({ ticketId: active.ticket_id, toStage, mode: 'move' })
          }
          onSetStage={(toStage) => setStage(active.ticket_id, toStage)}
          onEditStage={(sid) =>
            setModal({ ticketId: active.ticket_id, toStage: sid, mode: 'edit' })
          }
        />
      )}
      {modal && (
        <StageModal
          ticket={tickets.find((x) => x.ticket_id === modal.ticketId)}
          toStage={modal.toStage}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSave={commitModal}
        />
      )}
      {showLog && (
        <ActivityLog
          tickets={scopedAll}
          session={session}
          onClose={() => setShowLog(false)}
          onOpen={(x) => {
            setShowLog(false);
            setActiveId(x.ticket_id);
          }}
        />
      )}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ DASHBOARD */
const DASH_STORES = STORE_ORDER;

function dayStr(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() {
  return dayStr(Date.now());
}
function plannedDate(x) {
  const r = (x && x._raw) || {};
  const v = r.expected_date;
  return v && v !== 'null' ? String(v).slice(0, 10) : '';
}

function Dashboard({ tickets, onOpen }) {
  const [range, setRange] = useState('today');
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

  const base = useMemo(() => {
    const [s, e] = bounds;
    return tickets.filter((x) => {
      const cd = dayStr(createdTs(x));
      if (cd < s || cd > e) return false;
      if (store !== 'ALL' && x.branch !== store) return false;
      return true;
    });
  }, [tickets, bounds, store]);

  const today = todayStr();
  const isClosed = (x) => isClosedStage(x.stage);
  const metric = {
    all: () => true,
    resolved: (x) => x.stage === 'resolution',
    pending: (x) => x.stage !== 'resolution' && !isClosed(x),
    overdue: (x) =>
      x.stage !== 'resolution' &&
      !isClosed(x) &&
      plannedDate(x) &&
      plannedDate(x) < today,
    issues: (x) => isClosed(x),
  };
  const stageMetric = {
    received: (x) => x.stage === 'received',
    talk: (x) => x.stage === 'talk',
    tech: (x) => x.stage === 'tech',
    resolution: (x) => x.stage === 'resolution',
  };

  const cards = [
    { kind: 'all', label: L('cTotal'), color: T.slate, soft: T.slateSoft },
    { kind: 'resolved', label: L('cResolved'), color: T.green, soft: T.mint },
    { kind: 'pending', label: L('pending'), color: T.blue, soft: T.blueSoft },
    { kind: 'overdue', label: L('cOverdue'), color: T.amber, soft: T.amberSoft },
    { kind: 'issues', label: L('cIssues'), color: T.red, soft: T.redSoft },
  ];

  const rows = useMemo(() => {
    if (!sel) return [];
    let list = base;
    if (sel.store) list = list.filter((x) => x.branch === sel.store);
    const fn = metric[sel.kind] || stageMetric[sel.kind] || (() => true);
    return list
      .filter(fn)
      .sort((a, b) => new Date(createdTs(b) || 0) - new Date(createdTs(a) || 0));
    // eslint-disable-next-line
  }, [base, sel]);

  const cnt = (fn, list) => list.filter(fn).length;
  const rangeLabel =
    range === 'today'
      ? L('rToday')
      : range === 'yesterday'
        ? L('rYesterday')
        : range === '7d'
          ? L('r7d')
          : range === 'month'
            ? L('rMonth')
            : range === 'all'
              ? L('rAll')
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
            {rows.length} {L('entriesWord')}
            {sel.store ? ` · ${branchLabel(sel.store)}` : ''} ·{' '}
            {cards.find((c) => c.kind === sel.kind)?.label ||
              sShort(sel.kind) ||
              'All'}
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>{L('colTicket')}</th>
                  <th>{L('colCustomer')}</th>
                  <th>{L('colStore')}</th>
                  <th>{L('colItem')}</th>
                  <th>{L('colComplaint')}</th>
                  <th>{L('colStage')}</th>
                  <th>{L('colOpened')}</th>
                  <th>{L('colDue')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="dash-empty">
                      {L('noEntry')}
                    </td>
                  </tr>
                ) : (
                  rows.map((x) => {
                    const st = stageMeta(x.stage);
                    return (
                      <tr
                        key={x.ticket_id}
                        className="dash-row"
                        onClick={() => onOpen(x)}
                      >
                        <td>#{x.id}</td>
                        <td>{x.customer}</td>
                        <td>{branchLabel(x.branch)}</td>
                        <td className="ellip" style={{ maxWidth: 160 }}>
                          {x.equipment}
                        </td>
                        <td className="ellip" style={{ maxWidth: 200 }}>
                          {x.subject}
                        </td>
                        <td>
                          <span
                            className="dash-chip"
                            style={{ background: st.soft, color: st.color }}
                          >
                            {st.short}
                          </span>
                        </td>
                        <td>{dayStr(createdTs(x)) || '—'}</td>
                        <td>{plannedDate(x) || '—'}</td>
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
          <div className="dash-sub">{L('dashSub')}</div>
          <h2 style={{ margin: '2px 0 0' }}>Dashboard</h2>
        </div>
        <div className="dash-filters">
          <select
            className="dash-inp"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="today">{L('rToday')}</option>
            <option value="yesterday">{L('rYesterday')}</option>
            <option value="7d">{L('r7d')}</option>
            <option value="month">{L('rMonth')}</option>
            <option value="all">{L('rAll')}</option>
            <option value="custom">{L('rCustom')}</option>
          </select>
          {range === 'custom' && (
            <>
              <input
                className="dash-inp"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <input
                className="dash-inp"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
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
            {DASH_STORES.map((c) => (
              <option key={c} value={c}>
                {branchLabel(c)}
              </option>
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
              <div
                className="dash-card-ico"
                style={{ background: c.soft, color: c.color }}
              >
                <BarChart3 size={16} />
              </div>
              <div className="dash-card-n">{n}</div>
              <div className="dash-card-l">{c.label}</div>
            </button>
          );
        })}
      </div>

      <div className="dash-block">
        <div className="dash-block-h">{L('storeWise')} · {rangeLabel}</div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>{L('colStore')}</th>
                <th>{L('colTotal')}</th>
                <th>{sShort('received')}</th>
                <th>{sShort('talk')}</th>
                <th>{sShort('tech')}</th>
                <th>{sShort('resolution')}</th>
                <th>{L('colPending')}</th>
                <th>{L('colOverdue')}</th>
                <th>{L('colIssues')}</th>
              </tr>
            </thead>
            <tbody>
              {DASH_STORES.filter((st) => store === 'ALL' || store === st).map(
                (st) => {
                  const list = base.filter((x) => x.branch === st);
                  if (list.length === 0) return null;
                  const has = (kind) =>
                    cnt(metric[kind] || stageMetric[kind], list) > 0;
                  return (
                    <tr key={st}>
                      <td className="dash-store">{branchLabel(st)}</td>
                      <td
                        className="dash-td-click"
                        onClick={() => setSel({ kind: 'all', store: st })}
                      >
                        {list.length}
                      </td>
                      {['received', 'talk', 'tech', 'resolution'].map((k) => (
                        <td
                          key={k}
                          className={has(k) ? 'dash-td-click' : 'dash-td-zero'}
                          onClick={() => has(k) && setSel({ kind: k, store: st })}
                        >
                          {cnt(stageMetric[k], list)}
                        </td>
                      ))}
                      {['pending', 'overdue', 'issues'].map((k) => (
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
                },
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════ ENTRIES VIEW */
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
  const [drill, setDrill] = useState(null);

  useEffect(() => {
    setDrill(null);
  }, [layoutMode, viewMode]);

  useEffect(() => {
    if (!drill || typeof window === 'undefined') return;
    window.history.pushState({ cmpDrill: drill }, '');
    const onPop = () => setDrill(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [drill]);

  const back = () => {
    if (
      typeof window !== 'undefined' &&
      window.history.state &&
      window.history.state.cmpDrill
    ) {
      window.history.back();
    } else {
      setDrill(null);
    }
  };

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

const STAT_CATS = {
  total: {
    label: 'Total Tickets',
    color: T.green,
    soft: T.mint,
    test: (x) => !isClosedStage(x.stage),
  },
  pending: {
    label: 'Pending',
    color: T.blue,
    soft: T.blueSoft,
    test: (x) => !isClosedStage(x.stage) && x.stage !== 'resolution',
  },
  resolved: {
    label: 'Resolved',
    color: T.forestSoft,
    soft: T.mint,
    test: (x) => x.stage === 'resolution',
  },
  cancelled: {
    label: 'Cancelled',
    color: T.amber,
    soft: T.amberSoft,
    test: (x) => x.stage === 'cancelled',
  },
};

function DrillView({ cat, items, viewMode, onBack, onOpen, onMove, onCommit }) {
  const meta = STAT_CATS[cat] || STAT_CATS.total;
  const allArchived = cat === 'total' && viewMode === 'archived';
  const rows = items.filter(allArchived ? () => true : meta.test);
  const label = allArchived ? 'All archived' : meta.label;
  return (
    <div>
      <button className="track-back" onClick={onBack}>
        <ArrowLeft size={16} /> {L('backToStages')}
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
        <div className="empty">{L('noEntry')}</div>
      ) : (
        <div className="cat-grid">
          {rows.map((x) => (
            <Card
              key={x.ticket_id}
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

function ArchivedList({ items, onOpen, onMove, onCommit }) {
  const [mode, setMode] = useState('resolved');
  const meta =
    mode === 'cancelled'
      ? {
          label: 'Cancelled',
          color: T.red,
          soft: T.redSoft,
          test: (x) => x.stage === 'cancelled',
        }
      : {
          label: 'Resolved',
          color: T.green,
          soft: T.mint,
          test: (x) => x.stage === 'resolution',
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
          <option value="resolved">Resolved</option>
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
        <div className="empty">{L('noneOf')} {meta.label.toLowerCase()} {L('entriesLower')}</div>
      ) : (
        <div className="cat-grid">
          {rows.map((x) => (
            <Card
              key={x.ticket_id}
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

function CategoriesView({ items, loading, onOpen, onMove, onCommit }) {
  const [open, setOpen] = useState('pending');
  if (loading && items.length === 0)
    return <div className="loading">{L('loadingTickets')}</div>;
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
                  {rows.length} {rows.length === 1 ? L('entryWord') : L('entriesWord')}
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
                  <div className="empty">{L('noEntry')}</div>
                ) : (
                  <div className="cat-grid">
                    {rows.map((x) => (
                      <Card
                        key={x.ticket_id}
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
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ LOGIN */
function Login({ onLogin }) {
  const [mode, setMode] = useState('store'); // store | tech
  const [branch, setBranch] = useState('');
  const [tech, setTech] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const goTech = async () => {
    if (!tech) {
      setErr('Please choose your name first.');
      return;
    }
    if (!pw) {
      setErr('Enter your PIN.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const rows = await sbTechLogin(tech, pw);
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row || !row.name) {
        setErr('Incorrect PIN.');
        setBusy(false);
        return;
      }
      onLogin(
        techSession(
          row.name,
          row.phone || techPhoneOf(row.name),
          !!row.is_admin || sameName(row.name, TECH_ADMIN),
        ),
      );
    } catch (e) {
      setErr('Login error: ' + (e.message || 'unknown'));
      setBusy(false);
    }
  };
  const go = async () => {
    if (mode === 'tech') return goTech();
    if (!branch) {
      setErr('Please choose a store first.');
      return;
    }
    if (!pw) {
      setErr('Enter your PIN.');
      return;
    }
    setBusy(true);
    setErr('');
    if (LOCAL_PW[branch] !== pw) {
      setErr('Incorrect PIN.');
      setBusy(false);
      return;
    }
    onLogin({ ...sessionFor(branch), pw });
  };
  return (
    <div style={{ fontFamily: FONT }} className="login-wrap">
      <StyleTag />
      <div className="login-hero">
        <div className="hero-glow" />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="brand">
            <div className="brand-badge">
              <MessageSquareWarning size={22} color="#fff" />
            </div>
            <div>
              <div
                style={{ fontWeight: 800, fontSize: 19, letterSpacing: -0.3 }}
              >
                Healthy Jeena Sikho
              </div>
              <div style={{ fontSize: 12.5, opacity: 0.75 }}>
                Complaint Desk
              </div>
            </div>
          </div>
          <h1 className="hero-h1">
            Every complaint,
            <br />
            in one place.
          </h1>
          <p className="hero-p">
            Every complaint from your sheet — from the first customer call to
            final resolution, store by store, live from Supabase.
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
            <div className="login-tabs">
              {[
                ['store', 'Store'],
                ['tech', 'Technician'],
              ].map(([k, lbl]) => (
                <button
                  key={k}
                  className={mode === k ? 'login-tab on' : 'login-tab'}
                  onClick={() => {
                    setMode(k);
                    setPw('');
                    setErr('');
                  }}
                >
                  {k === 'tech' ? <Wrench size={14} /> : <Building2 size={14} />}{' '}
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>
              {mode === 'tech' ? 'Technician login' : 'Store login'}
            </div>
            <div style={{ fontSize: 13.5, color: T.inkSoft, marginTop: 4 }}>
              {mode === 'tech'
                ? 'Choose your name and enter your PIN.'
                : 'Choose your store and enter the PIN.'}
            </div>
          </div>
          {mode === 'tech' ? (
            <Field label="Technician">
              <select
                className="inp"
                value={tech}
                onChange={(e) => {
                  setTech(e.target.value);
                  setErr('');
                }}
              >
                <option value="">Select your name…</option>
                <option value={TECH_ADMIN}>Tech Admin (all technicians)</option>
                {TECHNICIANS.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
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
              {Object.keys(REGIONS).map((rk) => (
                <option key={rk} value={rk}>
                  {REGIONS[rk].label}
                </option>
              ))}
              {STORE_ORDER.map((c) => (
                <option key={c} value={c}>
                  {branchLabel(c)}
                </option>
              ))}
            </select>
          </Field>
          )}
          <Field label="PIN">
            <input
              className="inp"
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value.replace(/\D/g, '').slice(0, 4));
                setErr('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && go()}
            />
          </Field>
          {err && <div className="login-err">{err}</div>}
          <button
            className="btn-primary"
            style={{ width: '100%', marginTop: 4 }}
            disabled={(mode === 'tech' ? !tech : !branch) || !pw || busy}
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
              ? 'Live · Connected to Supabase'
              : 'Not connected · check Supabase key'}
            {mode !== 'tech' && (
              <>
                <br />
                Store PIN: <b>1001</b> se · Punjab: <b>3001</b> · Delhi NCR:{' '}
                <b>3002</b> · All stores: <b>2222</b>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════ TECHNICIAN VIEW
   TechBoard = andar ka content (stats + technician chips + tabs + cards).
   Do jagah use hota hai:
   1) TechView  — technician / Tech Admin login ka apna mobile shell
   2) Head ke liye app ke andar ek page (sidebar/topbar wahi rehte hain)
   Har card click → details drawer. "Kaam ho gaya" card pe bhi, drawer mein bhi. */
function addressOf(r) {
  const k = Object.keys(r || {}).find((x) => /address/i.test(x) && clean(r[x]));
  return k ? clean(r[k]) : '';
}
const isOverdue = (x) => {
  const e = clean(x && x._raw && x._raw.expected_date);
  return !!e && !x.techDone && e.slice(0, 10) < todayStr();
};

/* Head ke liye: Complaints board ⇄ Technician view (dono taraf ek click) */
function ViewSwitch({ value, onChange }) {
  return (
    <div className="dash-switch" style={{ marginBottom: 16 }}>
      <div className="layout-toggle">
        <button
          className={value === 'board' ? 'lt-btn active' : 'lt-btn'}
          onClick={() => onChange('board')}
        >
          <LayoutDashboard size={14} /> {L('boardView')}
        </button>
        <button
          className={value === 'techadmin' ? 'lt-btn active' : 'lt-btn'}
          onClick={() => onChange('techadmin')}
        >
          <Wrench size={14} /> {L('techAdminView')}
        </button>
      </div>
    </div>
  );
}

function TechBoard({
  session,
  tickets,
  loading,
  onOpen,
  onDone,
  embedded,
  onlyAssigned = false, // store login: sirf wahi technicians jo is store ki tickets pe lage
}) {
  const admin = !!session.isTechAdmin;
  const [tab, setTab] = useState('open');
  const [statF, setStatF] = useState(''); // '' | high | late | today — box click filter
  const [techFilter, setTechFilter] = useState(''); // admin: '' = sab
  const [openId, setOpenId] = useState(null); // jis card pe confirm khula hai
  const [remark, setRemark] = useState('');
  const [busyId, setBusyId] = useState(null);

  const live = useMemo(
    () => tickets.filter((x) => x.stage !== 'deleted'),
    [tickets],
  );
  // admin: kisi bhi technician ki ticket; technician: sirf apni
  const forMe = (name) =>
    admin
      ? !techFilter || sameName(name, techFilter)
      : sameName(name, session.techName);

  const openList = useMemo(
    () =>
      live
        .filter((x) => x.stage === 'tech' && !x.techDone && forMe(x.technician))
        .sort(
          (a, b) =>
            byPriority(a, b) ||
            String(a._raw.expected_date || '9999').localeCompare(
              String(b._raw.expected_date || '9999'),
            ),
        ),
    // eslint-disable-next-line
    [live, session.techName, admin, techFilter],
  );
  const doneList = useMemo(
    () =>
      live
        .filter(
          (x) =>
            x.techDone &&
            forMe(x._raw.tech_done_by || x.technician) &&
            hoursSince(x.techDoneAt) <= 24 * 7,
        )
        .sort((a, b) => String(b.techDoneAt).localeCompare(String(a.techDoneAt))),
    // eslint-disable-next-line
    [live, session.techName, admin, techFilter],
  );
  // admin chips: har technician ki open tickets
  const techCounts = useMemo(() => {
    const m = {};
    live.forEach((x) => {
      if (x.stage === 'tech' && !x.techDone && x.technician)
        m[x.technician] = (m[x.technician] || 0) + 1;
    });
    return m;
  }, [live]);
  // store: sirf is store ki tickets (open ya done) pe assign hue technicians;
  // head: poori technician list
  const assignedNames = Array.from(
    new Set(
      live
        .filter((x) => x.technician && (x.stage === 'tech' || x.techDone))
        .map((x) => x.technician),
    ),
  );
  const techNames = Array.from(
    new Set(
      onlyAssigned
        ? assignedNames
        : [...Object.keys(techCounts), ...TECHNICIANS.map((t) => t.name)],
    ),
  ).sort((a, b) => (techCounts[b] || 0) - (techCounts[a] || 0));
  const totalOpen = Object.values(techCounts).reduce((a, b) => a + b, 0);

  const stats = [
    { k: 'open', label: L('techOpen'), n: openList.length, c: T.violet, s: T.violetSoft },
    {
      k: 'high',
      label: 'High',
      n: openList.filter((x) => x.priority === 'High').length,
      c: PRIORITIES.High.color,
      s: PRIORITIES.High.soft,
    },
    { k: 'late', label: L('overdue'), n: openList.filter(isOverdue).length, c: T.amber, s: T.amberSoft },
    {
      k: 'today',
      label: L('doneToday'),
      n: doneList.filter((x) => isToday(x.techDoneAt)).length,
      c: T.green,
      s: T.mint,
    },
  ];
  const baseList = tab === 'open' ? openList : doneList;
  const list =
    statF === 'high'
      ? baseList.filter((x) => x.priority === 'High')
      : statF === 'late'
        ? baseList.filter(isOverdue)
        : statF === 'today'
          ? baseList.filter((x) => isToday(x.techDoneAt))
          : baseList;
  // box click: us hisaab se tab + filter; same box dobara = filter hatao
  const pickStat = (k) => {
    if (k === 'open') {
      setTab('open');
      setStatF('');
      return;
    }
    if (statF === k) {
      setStatF('');
      return;
    }
    setTab(k === 'today' ? 'done' : 'open');
    setStatF(k);
  };
  const statActive = (k) =>
    k === 'open' ? tab === 'open' && !statF : statF === k;

  const confirm = async (x) => {
    setBusyId(x.ticket_id);
    await onDone(x.ticket_id, remark.trim());
    setBusyId(null);
    setOpenId(null);
    setRemark('');
  };

  return (
    <div className={embedded ? 'tb tb-embedded' : 'tb'}>
      {embedded && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: T.inkSoft, fontWeight: 600 }}>
            {L('techBoardSub')}
          </div>
        </div>
      )}
      {!embedded && (
        <div className="tech-h">{admin ? L('allTechTickets') : L('myTickets')}</div>
      )}

      <div className="tb-stats">
        {stats.map((st) => {
          const on = statActive(st.k);
          return (
            <button
              key={st.k}
              className={on ? 'tb-stat on' : 'tb-stat'}
              style={on ? { borderColor: st.c, background: st.s } : null}
              onClick={() => pickStat(st.k)}
            >
              <span className="tb-stat-n" style={{ color: st.c }}>{st.n}</span>
              <span className="tb-stat-l">
                <span className="col-pip" style={{ background: st.c }} /> {st.label}
                {on && st.k !== 'open' && <X size={12} style={{ marginLeft: 'auto' }} />}
              </span>
            </button>
          );
        })}
      </div>

      {admin && (
        <div className="tb-chips">
          <button
            className={!techFilter ? 'tb-chip on' : 'tb-chip'}
            onClick={() => setTechFilter('')}
          >
            {L('allTechs')} <span className="tb-chip-n">{totalOpen}</span>
          </button>
          {techNames.map((n) => (
            <button
              key={n}
              className={sameName(techFilter, n) ? 'tb-chip on' : 'tb-chip'}
              onClick={() => setTechFilter(sameName(techFilter, n) ? '' : n)}
            >
              {n} <span className="tb-chip-n">{techCounts[n] || 0}</span>
            </button>
          ))}
        </div>
      )}

      <div className="layout-toggle" style={{ marginBottom: 14 }}>
        <button
          className={tab === 'open' ? 'lt-btn active' : 'lt-btn'}
          onClick={() => {
            setTab('open');
            if (statF === 'today') setStatF('');
          }}
        >
          {L('techOpen')} · {openList.length}
        </button>
        <button
          className={tab === 'done' ? 'lt-btn active' : 'lt-btn'}
          onClick={() => {
            setTab('done');
            if (statF === 'high' || statF === 'late') setStatF('');
          }}
        >
          {L('techDoneTab')} · {doneList.length}
        </button>
      </div>

      {loading && tickets.length === 0 && (
        <div className="loading">{L('loadingTickets')}</div>
      )}
      {statF && (
        <div className="tb-filter-note">
          {L('filterOn')}:{' '}
          <b>{(stats.find((x) => x.k === statF) || {}).label}</b> · {list.length}
          <button className="tb-clear" onClick={() => setStatF('')}>
            <X size={12} /> {L('prioClear')}
          </button>
        </div>
      )}
      {!loading && list.length === 0 && (
        <div className="tech-empty">
          {statF ? L('techNoMatch') : tab === 'open' ? L('techNoOpen') : L('techNoDone')}
        </div>
      )}

      <div className="tb-grid">
        {list.map((x) => {
          const r = x._raw || {};
          const pm = prioMeta(x.priority);
          const Icon = equipIcon(x.equipment);
          const tel = String(x.phone || '').replace(/[^\d+]/g, '');
          const isOpen = openId === x.ticket_id;
          const late = isOverdue(x);
          return (
            <div
              key={x.ticket_id}
              className="card tb-card"
              onClick={() => onOpen && onOpen(x)}
              style={{ borderLeft: `4px solid ${pm.color}` }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div className="eq-ico" style={{ background: pm.soft }}>
                  <Icon size={17} color={pm.color} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="card-name">{x.customer}</div>
                  <div className="ellip card-id">#{x.id}</div>
                </div>
                <PriorityBadge p={x.priority} small />
              </div>
              <div className="card-equip">{x.subject}</div>
              <div className="card-meta">
                <span className="ellip" style={{ maxWidth: '100%' }}>
                  <Package size={12} /> {x.equipment}
                </span>
              </div>
              <div className="card-meta">
                <span>
                  <MapPin size={12} /> {x.area}
                </span>
                {x.manager && x.manager !== '—' && (
                  <span className="ellip" style={{ maxWidth: 150 }}>
                    <User size={12} /> {x.manager}
                  </span>
                )}
              </div>
              <div className="card-meta">
                <span style={late ? { color: T.red, fontWeight: 700 } : null}>
                  <Clock size={12} /> {L('expectedShort')}:{' '}
                  <b>{niceDate(r.expected_date) || '—'}</b>
                  {late ? ` · ${L('overdue')}` : ''}
                </span>
              </div>
              {admin && (
                <div className="card-tech">
                  <Wrench size={12} />
                  <span className="ellip">
                    <b>{x.technician || '—'}</b>
                    {x.technicianPhone ? ` · ${x.technicianPhone}` : ''}
                  </span>
                </div>
              )}

              {tab === 'open' ? (
                <div onClick={(e) => e.stopPropagation()}>
                  {!isOpen ? (
                    <div className="tech-actions">
                      {tel && (
                        <a className="tech-call" href={`tel:${tel}`}>
                          <Phone size={14} /> {L('techCall')}
                        </a>
                      )}
                      <button
                        className="tech-done-btn"
                        onClick={() => {
                          setOpenId(x.ticket_id);
                          setRemark('');
                        }}
                      >
                        <CheckCircle2 size={15} /> {L('techMarkDone')}
                      </button>
                    </div>
                  ) : (
                    <div className="tech-confirm">
                      <textarea
                        className="inp"
                        rows={2}
                        placeholder={L('techRemarkPh')}
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          className="btn-ghost"
                          style={{ flex: 1 }}
                          onClick={() => setOpenId(null)}
                          disabled={busyId === x.ticket_id}
                        >
                          {L('cancel')}
                        </button>
                        <button
                          className="btn-primary"
                          style={{ flex: 2 }}
                          onClick={() => confirm(x)}
                          disabled={busyId === x.ticket_id}
                        >
                          <Check size={15} /> {L('techConfirm')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card-techdone">
                  <CheckCircle2 size={12} /> {fmtFullDateTime(x.techDoneAt)}
                  {r.tech_done_remarks ? ` · ${r.tech_done_remarks}` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Technician / Tech Admin login ka apna shell (mobile-first). Card click →
   read-only details drawer — stage, transfer, delete jaise koi control nahi. */
function TechView({
  session,
  tickets,
  loading,
  error,
  onReload,
  onLogout,
  onDone,
  toast,
  lang,
  onLang,
}) {
  const [activeId, setActiveId] = useState(null);
  const active = tickets.find((x) => x.ticket_id === activeId) || null;
  const canDoneActive =
    active &&
    active.stage === 'tech' &&
    !active.techDone &&
    (session.isTechAdmin || sameName(active.technician, session.techName));
  return (
    <div className="hjs-complaints tech-wrap" style={{ fontFamily: FONT }}>
      <StyleTag />
      <div className="tech-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div className="brand-badge" style={{ width: 36, height: 36 }}>
            <Wrench size={17} color="#fff" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, opacity: 0.7 }}>
              HJS Complaints · {session.isTechAdmin ? 'All technicians' : 'Technician'}
            </div>
            <div className="ellip" style={{ fontWeight: 800, fontSize: 16.5 }}>
              {session.isTechAdmin ? 'Tech Admin' : session.techName}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="tech-icon"
            onClick={() => onLang(lang === 'hi' ? 'en' : 'hi')}
            title="Language"
          >
            {lang === 'hi' ? 'EN' : 'Hi'}
          </button>
          <button className="tech-icon" onClick={onReload} title="Refresh">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button className="tech-icon" onClick={onLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="tech-body">
        {error && (
          <div className="err">
            <CloudOff size={18} color={T.red} />
            <div>
              <b>{L('connectFail')}</b> {error}
            </div>
          </div>
        )}
        <TechBoard
          session={session}
          tickets={tickets}
          loading={loading}
          onOpen={(x) => setActiveId(x.ticket_id)}
          onDone={onDone}
        />
      </div>

      {active && (
        <Drawer
          d={active}
          readOnly
          onClose={() => setActiveId(null)}
          extra={
            canDoneActive ? (
              <TechDoneBox
                onDone={async (rm) => {
                  await onDone(active.ticket_id, rm);
                }}
              />
            ) : null
          }
        />
      )}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

/* Drawer ke andar "Kaam ho gaya" — technician details dekh ke wahin se done kare */
function TechDoneBox({ onDone }) {
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="techdone-box">
      <div style={{ fontWeight: 800, fontSize: 13.5, color: T.green, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CheckCircle2 size={15} /> {L('techDoneQ')}
      </div>
      <textarea
        className="inp"
        rows={2}
        placeholder={L('techRemarkPh')}
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
      />
      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: 8 }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onDone(remark.trim());
          setBusy(false);
        }}
      >
        <CheckCircle2 size={16} /> {L('techConfirm')}
      </button>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════ SIDEBAR */
function Sidebar({ session, page, onNav }) {
  const isAll = session.isHead || session.isRegion;
  const nav = [
    { id: 'tickets', icon: LayoutDashboard, label: 'Complaints' },
    ...(isAll ? [{ id: 'dashboard', icon: BarChart3, label: 'Dashboard' }] : []),
    { id: 'pickups', icon: RotateCcw, label: 'Pickups', soon: true },
    { id: 'reports', icon: ClipboardCheck, label: 'Reports', soon: true },
  ];
  const mgr = STORE_MANAGERS[session.branch] || null;
  return (
    <aside className="sidebar">
      <div className="brand" style={{ padding: '22px 20px 18px' }}>
        <div className="brand-badge">
          <MessageSquareWarning size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15.5, color: '#fff' }}>
            HJS Complaints
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
            onClick={() => !n.soon && onNav && onNav(n.id)}
            style={{
              background:
                page === n.id ? 'rgba(255,255,255,.12)' : 'transparent',
              color: page === n.id ? '#fff' : 'rgba(255,255,255,.62)',
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
            {branchLabel(session.branch)}
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
  onActivity,
  search,
  setSearch,
  results,
  onPick,
  onReload,
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
          <MessageSquareWarning size={17} color="#fff" />
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
          placeholder={L('searchPh')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.trim() && (
          <div className="search-dd">
            {!results || results.length === 0 ? (
              <div className="search-empty">{L('noMatch')}</div>
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
                    key={x.ticket_id}
                    className={closed ? 'search-row is-cancelled' : 'search-row'}
                    onClick={() => onPick(x)}
                  >
                    <div className="search-row-main">
                      <span className="ellip search-name">{x.customer}</span>
                      <span className={tagClass}>{tagText}</span>
                    </div>
                    <div className="ellip search-sub">
                      #{x.id} · {x.equipment}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
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
        <button className="icon-btn" onClick={onActivity} title="Activity log">
          <History size={17} color={T.ink} />
        </button>
        <button className="icon-btn" onClick={onReload} title="Reload">
          <RefreshCw size={17} color={T.ink} className={loading ? 'spin' : ''} />
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
  const mgr = STORE_MANAGERS[session.branch] || null;
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
            <UserCog size={13} /> {L('storeManager')}:{' '}
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
            <option value="today">{L('today')}</option>
            <option value="yesterday">{L('vYesterday')}</option>
            <option value="month">{L('vMonth')}</option>
            <option value="custom">{L('vCustom')}</option>
            <option value="archived">{L('archived')} ({L('vAllTime')})</option>
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
            <LayoutDashboard size={14} /> {L('stages')}
          </button>
          <button
            className={layoutMode === 'categories' ? 'lt-btn active' : 'lt-btn'}
            onClick={() => onLayoutMode('categories')}
          >
            <Package size={14} /> {L('categories')}
          </button>
        </div>
        {(session.canSwitch || session.isHead) && (
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
              {session.isHead ? (
                <>
                  <option value="ALL">All stores</option>
                  {Object.keys(REGIONS).map((rk) => (
                    <option key={rk} value={rk}>
                      {REGIONS[rk].label}
                    </option>
                  ))}
                  {STORE_ORDER.map((c) => (
                    <option key={c} value={c}>
                      {branchLabel(c)}
                    </option>
                  ))}
                </>
              ) : (
                <>
                  <option value={session.branch}>
                    {branchLabel(session.branch)}
                  </option>
                  {(session.switchList || []).map((c) => (
                    <option key={c} value={c}>
                      {branchLabel(c)}
                    </option>
                  ))}
                </>
              )}
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
            ? `${viewMode === 'archived' ? L('archived') : viewMode === 'yesterday' ? L('vYesterday') : viewMode === 'month' ? L('vMonth') : viewMode === 'custom' ? L('vCustom') : L('today')} · ${L('totalTickets')} · ${count}`
            : L('demoData')}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ STATS */
function Stats({ items, viewMode, onDrill }) {
  const board = items.filter((x) => !isClosedStage(x.stage));
  const pending = board.filter((x) => x.stage !== 'resolution').length;
  const done = board.filter((x) => x.stage === 'resolution').length;
  const cancelled = items.filter((x) => x.stage === 'cancelled').length;
  const archived = viewMode === 'archived';
  const cards = archived
    ? [
        {
          id: 'total',
          label: 'Total Archived',
          value: items.length,
          icon: MessageSquareWarning,
          color: T.green,
          soft: T.mint,
        },
        {
          id: 'resolved',
          label: 'Resolved',
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
          label: 'Total Tickets',
          value: board.length,
          icon: MessageSquareWarning,
          color: T.green,
          soft: T.mint,
        },
        {
          id: 'pending',
          label: 'Pending',
          value: pending,
          icon: Wrench,
          color: T.blue,
          soft: T.blueSoft,
        },
        {
          id: 'resolved',
          label: 'Resolved',
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
    return <div className="loading">{L('loadingTickets')}</div>;
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
              {cards.length === 0 && <div className="empty">{L('noTicket')}</div>}
              {cards.map((x) => (
                <Card
                  key={x.ticket_id}
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

/* Mobile: stage tabs (accordion). */
function MobileBoard({ items, loading, onOpen, onMove, onCommit, focus }) {
  const active = STAGES.filter((s) => items.some((x) => x.stage === s.id));
  const activeIds = active.map((s) => s.id);
  const sig = activeIds.join(',');
  const [open, setOpen] = useState(activeIds[0] || null);
  const consumed = React.useRef(0);
  useEffect(() => {
    setOpen((prev) => {
      if (
        focus &&
        focus.n !== consumed.current &&
        activeIds.includes(focus.stage)
      ) {
        consumed.current = focus.n;
        return focus.stage;
      }
      if (prev && activeIds.includes(prev)) return prev;
      const prevIdx = prev ? stageIndex(prev) : -1;
      const forward = active.find((s) => stageIndex(s.id) > prevIdx);
      return forward ? forward.id : activeIds[0] || null;
    });
    // eslint-disable-next-line
  }, [sig, focus && focus.n]);

  if (loading && items.length === 0)
    return <div className="loading">{L('loadingTickets')}</div>;
  if (active.length === 0)
    return (
      <div className="empty" style={{ padding: '44px 0' }}>
        {L('noTicket')}
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
                    key={x.ticket_id}
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
  const Icon = equipIcon(d.equipment);
  const closed = isClosedStage(d.stage);
  const cancelled = d.stage === 'cancelled';
  const next = closed ? null : STAGES[stageIndex(d.stage) + 1];
  const [expand, setExpand] = useState(false);
  const canInline = !!(next && onCommit);
  const pm = prioMeta(d.priority);
  return (
    <div
      className={cancelled ? 'card is-cancelled' : 'card'}
      onClick={onOpen}
      style={
        d.priority && !closed
          ? { borderLeft: `4px solid ${pm.color}`, background: d.priority === 'High' ? '#FFF8F7' : undefined }
          : undefined
      }
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div className="eq-ico" style={{ background: stage.soft }}>
          <Icon size={17} color={stage.color} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="card-name">{d.customer}</div>
          <div className="ellip card-id">#{d.id}</div>
        </div>
        {d.priority && <PriorityBadge p={d.priority} small />}
      </div>
      <div className="card-equip">{d.subject}</div>
      <div className="card-meta">
        <span className="ellip" style={{ maxWidth: '100%' }}>
          <Package size={12} /> {d.equipment}
        </span>
      </div>
      <div className="card-meta">
        <span>
          <Phone size={12} /> {d.phone}
        </span>
        <span className="ellip" style={{ maxWidth: 120 }}>
          <MapPin size={12} /> {d.area}
        </span>
      </div>
      <div className="card-meta">
        <span>
          <Clock size={12} /> {niceDate(d.opened) || '—'}
        </span>
      </div>
      {d.manager && d.manager !== '—' && (
        <div className="card-meta">
          <span className="ellip" style={{ maxWidth: '100%' }}>
            <User size={12} /> {d.manager}
          </span>
        </div>
      )}
      {d.technician && (
        <div className="card-tech">
          <Wrench size={12} />
          <span className="ellip">
            <b>{d.technician}</b>
            {d.technicianPhone ? ` · ${d.technicianPhone}` : ''}
          </span>
        </div>
      )}
      {d.techDone && d.stage === 'tech' && (
        <div className="card-techdone">
          <CheckCircle2 size={12} /> {L('techDoneBadge')}
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
            {moveText(next.id)}{' '}
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
                ticket={d}
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
          <Check size={13} /> {L('completed')}
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
  const inv = items.filter((x) => x.stage === 'invalid').length;
  const extra = [
    can && `Cancelled ${can}`,
    inv && `Invalid ${inv}`,
    dup && `Duplicate ${dup}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="foot-total">
      Total {board.length} tickets &nbsp;•&nbsp; {per}
      {extra ? ` \u2022 ${extra}` : ''}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ DRAWER */
function Drawer({
  d,
  onClose,
  onAdvance,
  onSetStage,
  onEditStage,
  canDelete,
  onDelete,
  onTransfer,
  isHead,
  canPriority = false,
  onPriority = null,
  readOnly = false, // technician: sirf dekhe, koi stage/transfer/delete nahi
  extra = null, // drawer ke upar extra action (jaise "Kaam ho gaya")
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [moveTo, setMoveTo] = useState('');
  const Icon = equipIcon(d.equipment);
  const closedMeta = CLOSED[d.stage] || null;
  const cancelled = !!closedMeta;
  const idx = stageIndex(d.stage);
  const stage = cancelled
    ? { label: closedMeta.label, color: closedMeta.color, soft: closedMeta.soft }
    : STAGES[idx] || STAGES[0];
  const next = STAGES[idx + 1] || null;
  const reachedIdx = cancelled
    ? reachedIdxFromLog(d._raw && d._raw.app_log)
    : idx;
  // Resolved ticket band ho jaata hai — sirf head office (All stores) edit
  // kar sakta hai. Baaki logins ke liye stages aur Edit buttons locked.
  const resolvedLock = d.stage === 'resolution' && !isHead;
  const r = d._raw || {};

  const blocks = [
    {
      id: 'talk',
      i: 1,
      rows: [
        [L('kvDate'), show(niceDate(r.talk_date))],
        [L('kvTime'), show(niceTime(r.talk_time))],
        [L('kvType'), show(realVal(r.product_type))],
        [L('kvProblemShort'), show(pickedProblem(r))],
        [L('whatSaidShort'), show(r.stage1_remarks)],
      ],
    },
    {
      id: 'tech',
      i: 2,
      rows: [
        [L('techShort'), show(r.technician)],
        [L('techPhoneShort'), show(r.technician_phone)],
        [L('expectedShort'), show(niceDate(r.expected_date))],
        [L('remarksShort'), show(r.tech_remarks)],
      ],
    },
    {
      id: 'resolution',
      i: 3,
      rows: [
        [
          L('workDoneShort'),
          show(r.action_taken === 'Other' ? r.action_other : r.action_taken),
        ],
        [L('resolvedShort'), r.is_resolved ? L('yes') : L('no')],
        [L('remarksShort'), show(r.stage3_remarks || r.stage2_remarks)],
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
            style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}
          >
            <div
              className="eq-ico"
              style={{ width: 42, height: 42, background: stage.soft }}
            >
              <Icon size={21} color={stage.color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{d.customer}</div>
              <div className="ellip" style={{ fontSize: 12.5, color: T.inkSoft }}>
                #{d.id}
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

        {/* ── Priority ── head set kare, baaki sirf dekhein */}
        <div className="prio-box">
          <div className="prio-head">
            <span className="sec-title" style={{ margin: 0 }}>
              {L('priority')}
            </span>
            <PriorityBadge p={d.priority} />
          </div>
          {canPriority && onPriority && !cancelled && d.stage !== 'resolution' ? (
            <div className="prio-pick">
              {Object.values(PRIORITIES).map((m) => {
                const on = d.priority === m.id;
                return (
                  <button
                    key={m.id}
                    className="prio-btn"
                    style={{
                      background: on ? m.color : m.soft,
                      color: on ? '#fff' : m.color,
                      borderColor: m.color,
                    }}
                    onClick={() => onPriority(m.id)}
                  >
                    {on && <Check size={12} style={{ marginRight: 3, verticalAlign: -1 }} />}
                    {m.label}
                  </button>
                );
              })}
              {d.priority && (
                <button className="prio-btn prio-clear" onClick={() => onPriority('')}>
                  {L('prioClear')}
                </button>
              )}
            </div>
          ) : null}
          {d.priority && r.priority_set_by && (
            <div className="prio-meta">
              {L('prioSetBy')}: <b>{r.priority_set_by}</b>
              {r.priority_set_at ? ` · ${fmtFullDateTime(r.priority_set_at)}` : ''}
            </div>
          )}
        </div>

        {d.techDone && (
          <div className="techdone-note">
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 800 }}>{L('techDoneTitle')}</div>
              <div style={{ fontSize: 12, marginTop: 2, opacity: 0.9 }}>
                {r.tech_done_by || d.technician} · {L('techDoneAt')}:{' '}
                {fmtFullDateTime(r.tech_done_at)}
              </div>
              {r.tech_done_remarks && (
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {L('techDoneRemark')}: {r.tech_done_remarks}
                </div>
              )}
            </div>
          </div>
        )}

        {extra}

        {readOnly ? null : cancelled ? (
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
                <div style={{ fontWeight: 800 }}>{cTitle(closedMeta)}</div>
                <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>
                  {cNote(closedMeta)}
                </div>
              </div>
            </div>
            <div className="sec-title" style={{ marginTop: 16 }}>
              {L('prevStages')}
            </div>
            <div className="stage-picker">
              {STAGES.map((s, i) => {
                if (i > reachedIdx) return null;
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
        ) : resolvedLock ? (
          <>
            <div
              className="cancel-note"
              style={{
                background: T.mint,
                color: T.green,
                borderColor: '#cfe3d0',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 800 }}>{L('lockedTitle')}</div>
                <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>
                  {L('lockedNote')}
                </div>
              </div>
            </div>
            <div className="sec-title" style={{ marginTop: 16 }}>
              {L('prevStages')}
            </div>
            <div className="stage-picker">
              {STAGES.map((st2) => (
                <button
                  key={st2.id}
                  className="stage-pick-btn"
                  disabled
                  style={{
                    background: '#EDEBE4',
                    color: T.inkSoft,
                    borderColor: T.line,
                    cursor: 'default',
                  }}
                >
                  <Check size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                  {sShort(st2.id)}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="sec-title" style={{ marginTop: 16 }}>
              {L('moveToStage')}
            </div>
            {d.stage === 'resolution' && isHead && (/* isHead = poore rights */
              <div className="head-edit-note">
                <ShieldCheck size={14} /> {L('headCanEdit')}
              </div>
            )}
            {next ? (
              <div className="next-hint">
                <span className="col-pip" style={{ background: next.color }} />
                <span>
                  {L('nextStep')}: <b>{stageHint(next.id) || next.label}</b>
                </span>
              </div>
            ) : (
              <div className="next-hint done">
                <Check size={14} /> {L('allDone')}
              </div>
            )}
            <div className="stage-picker">
              {STAGES.map((s, i) => {
                if (i > idx + 1) return null;
                const filled = i <= idx;
                const isNext = i === idx + 1;
                return (
                  <button
                    key={s.id}
                    className={isNext ? 'stage-pick-btn is-next' : 'stage-pick-btn'}
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
              {L('filledColored')}
            </div>
          </>
        )}

        <div className="kv-grid" style={{ marginTop: 18 }}>
          <KV label={L('kvPhone')} value={d.phone} />
          <KV label={L('kvEmail')} value={d.email} />
          <KV label={L('kvItem')} value={d.equipment} full />
          <KV label={L('kvProblem')} value={d.subject} full />
          <KV label={L('kvStore')} value={branchLabel(d.branch)} />
          <KV label={L('kvOpened')} value={niceDateTime(d.opened) || '—'} />
          <KV label={L('kvManager')} value={d.manager} full />
        </div>

        {onTransfer && !cancelled && d.stage !== 'resolution' && (
          <div className="transfer-box">
            <div className="sec-title" style={{ margin: '0 0 8px' }}>
              <Building2 size={14} /> {L('transferTitle')}
            </div>
            <div className="transfer-row">
              <select
                className="inp"
                value={moveTo}
                onChange={(e) => setMoveTo(e.target.value)}
              >
                <option value="">{L('transferPh')}</option>
                {STORE_ORDER.filter((c) => c !== d.branch).map((c) => (
                  <option key={c} value={c}>
                    {branchLabel(c)}
                  </option>
                ))}
              </select>
              <button
                className="btn-primary"
                disabled={!moveTo}
                onClick={() => {
                  onTransfer(moveTo);
                  setMoveTo('');
                }}
              >
                <ArrowRight size={15} /> {L('transferBtn')}
              </button>
            </div>
            <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 6 }}>
              {L('transferNote')}
            </div>
          </div>
        )}

        {blocks.map((b) => {
          const limit = cancelled || resolvedLock ? reachedIdx : idx + 1;
          if (b.i > limit) return null;
          const st = STAGES[b.i];
          const filled = cancelled ? b.i <= reachedIdx : b.i <= idx;
          if (readOnly && !filled) return null;
          const editable = filled && !cancelled && !resolvedLock && !readOnly;
          return (
            <div
              key={b.id}
              style={cancelled || resolvedLock ? { opacity: 0.75 } : null}
            >
              <div
                className="sec-title stage-block-title"
                style={{ justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span className="col-pip" style={{ background: st.color }} />{' '}
                  {sLabel(st.id)}
                </span>
                {readOnly ? null : editable ? (
                  <button className="mini-edit" onClick={() => onEditStage(b.id)}>
                    <Pencil size={13} /> {L('edit')}
                  </button>
                ) : cancelled || resolvedLock ? (
                  <span
                    className="next-badge"
                    style={{ color: T.inkSoft, background: T.slateSoft }}
                  >
                    {L('locked')}
                  </span>
                ) : (
                  <span
                    className="next-badge"
                    style={{ color: st.color, background: st.soft }}
                  >
                    {L('nextStepBadge')}
                  </span>
                )}
              </div>
              {filled ? (
                <div className="kv-grid">
                  {b.rows.map(([k, v]) => (
                    <KV
                      key={k}
                      label={k}
                      value={v}
                      full={
                        k === L('remarksShort') ||
                        k === L('whatSaidShort') ||
                        k === L('kvProblemShort')
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="block-next-note">
                  {L('fillNote')} <b>{sShort(st.id)}</b> {L('aboveBtn')}
                </div>
              )}
            </div>
          );
        })}

        <div className="sec-title" style={{ marginTop: 22 }}>
          <History size={14} /> {L('timeline')}
        </div>
        {cancelled && !hasClosedLog && (
          <div className="timeline">
            <div className="tl-row">
              <div className="tl-marker">
                <span className="tl-dot" style={{ background: closedMeta.color }} />
                {appLog.length > 0 && (
                  <span className="tl-line" style={{ background: T.line }} />
                )}
              </div>
              <div style={{ paddingBottom: 16 }}>
                <div
                  style={{ fontSize: 13, fontWeight: 800, color: closedMeta.color }}
                >
                  {closedMeta.label}
                </div>
                <div className="tl-note">{cTitle(closedMeta)}</div>
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
                      <span className="tl-line" style={{ background: T.line }} />
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
        ) : (
          <div style={{ fontSize: 12, color: T.inkSoft }}>
            {L('noHistory')}
          </div>
        )}

        {canDelete && (
          <div className="danger-zone">
            {confirmDel ? (
              <div className="danger-confirm">
                <span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>
                  {L('confirmDelete')}
                </span>
                <button className="btn-danger" onClick={onDelete}>
                  <Trash2 size={15} /> {L('yesDelete')}
                </button>
                <button className="btn-ghost" onClick={() => setConfirmDel(false)}>
                  {L('keepIt')}
                </button>
              </div>
            ) : (
              <button className="btn-danger" onClick={() => setConfirmDel(true)}>
                <Trash2 size={15} /> {L('dangerDelete')}
              </button>
            )}
            <div style={{ fontSize: 11, color: T.inkSoft, marginTop: 8 }}>
              {L('deleteNote')}
            </div>
          </div>
        )}
        {/* sabse neeche — ye entry app mein kab aayi */}
        <div className="created-note">
          Ticket app mein aaya: <b>{fmtFullDateTime(createdTs(d)) || '—'}</b>
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

/* ═══════════════════════════════════════════════════════════ STAGE MODAL */
function StageModal({ ticket, toStage, mode, onClose, onSave, embedded }) {
  const stage = STAGES[stageIndex(toStage)];
  const r = (ticket && ticket._raw) || {};
  // Live ghadi — talk stage me "abhi ka time" har second update hota rahe,
  // taaki save karte waqt bilkul current time save ho.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (toStage !== 'talk') return;
    const id = setInterval(() => setNowTick(Date.now()), 20000);
    return () => clearInterval(id);
  }, [toStage]);
  const _now = new Date(nowTick);
  const _pad = (n) => String(n).padStart(2, '0');
  const nowDate = `${_now.getFullYear()}-${_pad(_now.getMonth() + 1)}-${_pad(_now.getDate())}`;
  const nowTime = `${_pad(_now.getHours())}:${_pad(_now.getMinutes())}`;
  const in3 = new Date(Date.now() + 3 * 86400000);
  const soonDate = `${in3.getFullYear()}-${_pad(in3.getMonth() + 1)}-${_pad(in3.getDate())}`;
  const formGuess = guessFromForm(
    r,
    catalogOf(ticket && ticket._raw ? ticket._raw.product : ''),
  );
  const [f, setF] = useState({
    // talk ki date/time ab MANUAL nahi — save karte waqt abhi ka time
    // apne aap bhar jayega (niche onSave me). Edit me purana rahega.
    date:
      mode === 'edit' && r.talk_date && r.talk_date !== 'null'
        ? r.talk_date
        : nowDate,
    time:
      mode === 'edit' && r.talk_time && r.talk_time !== 'null'
        ? String(r.talk_time).slice(0, 5)
        : nowTime,
    remarks:
      (toStage === 'resolution'
        ? r.stage3_remarks
        : toStage === 'tech'
            ? r.tech_remarks
            : r.stage1_remarks) || '',
    // technician — saved naam list me hai to dropdown, warna 'Other' + manual
    tech:
      r.technician && r.technician !== 'null'
        ? TECHNICIANS.some((t) => t.name === r.technician)
          ? r.technician
          : 'Other'
        : '',
    techOther:
      r.technician &&
      r.technician !== 'null' &&
      !TECHNICIANS.some((t) => t.name === r.technician)
        ? r.technician
        : '',
    techPhoneOther:
      r.technician &&
      r.technician !== 'null' &&
      !TECHNICIANS.some((t) => t.name === r.technician)
        ? (r.technician_phone && r.technician_phone !== 'null'
            ? r.technician_phone
            : '')
        : '',
    action: (r.action_taken && r.action_taken !== 'null' && r.action_taken) || '',
    actionOther:
      (r.action_other && r.action_other !== 'null' && r.action_other) || '',
    expected:
      mode === 'edit' && r.expected_date && r.expected_date !== 'null'
        ? String(r.expected_date).slice(0, 10)
        : soonDate,
    resolved: !!r.is_resolved,
    // Stage 1 — product type + sahi problem
    ptype: realVal(r.product_type) || formGuess.ptype,
    problem: realVal(r.problem_type) || formGuess.problem,
    problemOther: realVal(r.problem_other),
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const openPicker = (e) => {
    try {
      e.currentTarget.showPicker();
    } catch (_) {}
  };
  const otherAction = f.action === 'Other';
  const otherTech = f.tech === 'Other';
  // Stage 1 — product ke hisaab se type aur problem ki list
  const cat = catalogOf(ticket && ticket._raw ? ticket._raw.product : '');
  const typeList = typeNamesOf(cat);
  const needType = typeList.length > 0;
  const probList = problemsFor(cat, f.ptype);
  const otherProblem = !cat || f.problem === 'Other';
  const talkOk = cat
    ? (!needType || !!f.ptype) &&
      !!f.problem &&
      (f.problem !== 'Other' || !!f.problemOther.trim())
    : !!f.problemOther.trim();
  const canSave =
    toStage === 'talk'
      ? talkOk
      : toStage === 'tech'
        ? !!f.expected &&
          (otherTech
            ? !!(f.techOther.trim() && f.techPhoneOther.trim())
            : !!f.tech)
      : toStage === 'resolution'
        ? !!(f.action && (!otherAction || f.actionOther.trim()) && f.resolved)
        : true;

  // neeche wala textarea — stage ke hisaab se label
  const remarkLabel =
    toStage === 'talk'
      ? L('customerSaidOpt')
      : toStage === 'resolution'
        ? L('remarksResolve')
        : L('remarks');
  const remarkPh =
    toStage === 'talk'
      ? L('whatCustomerSaidPh')
      : toStage === 'resolution'
        ? L('remarksResolvePh')
        : toStage === 'tech'
          ? L('techRemarksPh')
          : L('remarksPh');

  const inner = (
    <>
      {!embedded && (
        <div className="modal-head">
          <div>
            <span
              className="stage-badge"
              style={{
                background: stage.soft,
                color: stage.color,
                marginBottom: 8,
              }}
            >
              <span className="col-pip" style={{ background: stage.color }} />{' '}
              {mode === 'edit' ? `Edit · ${sLabel(toStage)}` : sLabel(toStage)}
            </span>
            <div className="ellip" style={{ fontSize: 12.5, color: T.inkSoft }}>
              {ticket.customer} · #{ticket.id}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} color={T.ink} />
          </button>
        </div>
      )}
      <div className="modal-body">
        {ticket && ticket.subject && ticket.subject !== '—' && (
          <div className="problem-line">
            <AlertTriangle size={15} />
            <span>
              {L('kvProblem')}: <b>{ticket.subject}</b>
              {ticket.equipment ? ` · ${ticket.equipment}` : ''}
            </span>
          </div>
        )}
        {toStage === 'talk' && (
          <div className="auto-time">
            <Clock size={15} />
            <span>
              {L('autoTime')}{' '}
              <b>
                {_now.toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </b>
            </span>
          </div>
        )}

        {toStage === 'talk' && (
          <>
            {cat && needType && (
              <Field label={L('productType')}>
                <div className="chip-row">
                  {typeList.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={f.ptype === t ? 'chip on' : 'chip'}
                      onClick={() =>
                        setF((p) => ({
                          ...p,
                          ptype: t,
                          // type badla to purani problem hatao
                          problem: problemsFor(cat, t).includes(p.problem)
                            ? p.problem
                            : '',
                        }))
                      }
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            {cat && (!needType || f.ptype) && (
              <Field label={L('exactProblem')}>
                <select
                  className="inp"
                  value={f.problem}
                  onChange={(e) => set('problem', e.target.value)}
                >
                  <option value="">{L('select')}</option>
                  {probList.map((pr) => (
                    <option key={pr} value={pr}>
                      {pr}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </Field>
            )}
            {otherProblem && (
              <Field label={cat ? L('problemOtherLbl') : L('problemFree')}>
                <input
                  className="inp"
                  placeholder={L('problemOtherPh')}
                  value={f.problemOther}
                  onChange={(e) => set('problemOther', e.target.value)}
                />
              </Field>
            )}
            {!talkOk && <div className="req-note">{L('problemRequired')}</div>}
          </>
        )}

        {toStage === 'tech' && (
          <>
            <Field label={L('chooseTech')}>
              <select
                className="inp"
                value={f.tech}
                onChange={(e) => set('tech', e.target.value)}
              >
                <option value="">{L('select')}</option>
                {TECHNICIANS.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} · {t.phone}
                  </option>
                ))}
                <option value="Other">{L('techOtherOpt')}</option>
              </select>
            </Field>
            {f.tech && !otherTech && (
              <div className="tech-phone">
                <Phone size={15} />
                <span>
                  {L('techAutoPhone')} <b>{techPhoneOf(f.tech)}</b>
                </span>
              </div>
            )}
            {otherTech && (
              <>
                <Field label={L('techName')}>
                  <input
                    className="inp"
                    placeholder={L('techNamePh')}
                    value={f.techOther}
                    onChange={(e) => set('techOther', e.target.value)}
                  />
                </Field>
                <Field label={L('techPhone')}>
                  <input
                    className="inp"
                    type="tel"
                    inputMode="tel"
                    placeholder={L('techPhonePh')}
                    value={f.techPhoneOther}
                    onChange={(e) => set('techPhoneOther', e.target.value)}
                  />
                </Field>
                {(!f.techOther.trim() || !f.techPhoneOther.trim()) && (
                  <div className="req-note">{L('techOtherRequired')}</div>
                )}
              </>
            )}
            <Field label={L('expectedBy')}>
                <input
                  className="inp"
                  type="date"
                  value={f.expected}
                  min="2024-01-01"
                  max="2099-12-31"
                  onClick={openPicker}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && Number(v.slice(0, 4)) > 2099) return;
                    set('expected', v);
                  }}
                />
              {f.expected && (
                <span className="tp-preview">📅 {niceDate(f.expected)}</span>
              )}
            </Field>
            {!f.expected && (
              <div className="req-note">{L('expectedRequired')}</div>
            )}
          </>
        )}

        {toStage === 'resolution' && (
          <>
            {r.technician && r.technician !== 'null' && (
              <div className="prev-line">
                <Wrench size={14} />
                <span>
                  {L('techAssigned')}: <b>{r.technician}</b>
                  {r.technician_phone && r.technician_phone !== 'null'
                    ? ` · ${r.technician_phone}`
                    : ''}
                </span>
              </div>
            )}
            {realVal(r.expected_date) && (
              <div className="prev-line">
                <Clock size={14} />
                <span>
                  {L('expectedShort')}: <b>{niceDate(r.expected_date)}</b>
                </span>
              </div>
            )}
            <Field label={L('workDone')}>
              <select
                className="inp"
                value={f.action}
                onChange={(e) => set('action', e.target.value)}
              >
                <option value="">{L('select')}</option>
                {ACTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            {otherAction && (
              <Field label={L('workDoneOther')}>
                <input
                  className="inp"
                  placeholder={L('workDoneOtherPh')}
                  value={f.actionOther}
                  onChange={(e) => set('actionOther', e.target.value)}
                />
              </Field>
            )}
            {otherAction && !f.actionOther.trim() && (
              <div className="req-note">{L('otherRequired')}</div>
            )}
          </>
        )}

        {toStage === 'resolution' && (
          <>
            <Check1
              checked={f.resolved}
              onChange={() => set('resolved', !f.resolved)}
              label={L('markResolvedChk')}
            />
            {!f.resolved && (
              <div className="req-note">
                {L('resolvedRequired')}
              </div>
            )}
          </>
        )}

        <Field label={remarkLabel}>
          <textarea
            className="inp"
            rows={3}
            placeholder={remarkPh}
            value={f.remarks}
            onChange={(e) => set('remarks', e.target.value)}
          />
        </Field>
      </div>
      <div className="modal-foot">
        <button className="btn-ghost" onClick={onClose}>
          {L('cancel')}
        </button>
        <button
          className="btn-primary"
          disabled={!canSave}
          onClick={() => {
            // talk stage — save ke exact waqt ka live time bhejo
            let out = { ...f };
            if (toStage === 'talk' && mode !== 'edit') {
              const t = new Date();
              const p = (n) => String(n).padStart(2, '0');
              out.date = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
              out.time = `${p(t.getHours())}:${p(t.getMinutes())}`;
            }
            onSave(out);
          }}
        >
          <ShieldCheck size={16} />{' '}
          {mode === 'edit'
            ? L('update')
            : toStage === 'resolution'
              ? L('saveCompleted')
              : L('save')}
        </button>
      </div>
    </>
  );
  if (embedded) return <div className="inline-move">{inner}</div>;
  return (
    <div className="overlay center" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {inner}
      </div>
    </div>
  );
}
function Field({ label, children }) {
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

/* ═════════════════════════════════════════════════ ACTIVITY LOG (overall)
   Saari entries ke app_log events ek jagah, latest pehle — audit trail jaisa.
   Delete hui entries bhi yahan aati hain (view se hatti hain, log se nahi). */
const ACT_KINDS = [
  { id: 'all', label: 'Sab updates' },
  { id: 'move', label: 'Stage move' },
  { id: 'edit', label: 'Edit' },
  { id: 'closed', label: 'Closed' },
  { id: 'transfer', label: 'Store transfer' },
  { id: 'delete', label: 'Delete' },
];
function actKind(ev) {
  if (!ev) return 'move';
  if (ev.stage === 'deleted') return 'delete';
  if (ev.stage === 'transfer') return 'transfer';
  if (CLOSED[ev.stage]) return 'closed';
  if (ev.action === 'Edited') return 'edit';
  return 'move';
}
function actIconOf(k) {
  return k === 'delete'
    ? Trash2
    : k === 'transfer'
      ? Building2
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
  if (k === 'delete') return 'Entry delete ki';
  if (ev.stage === 'priority') {
    const f = ev.fields || {};
    return `Priority · ${f.From || 'Not set'} → ${f.To || 'Not set'}`;
  }
  if (ev.stage === 'techdone') return 'Technician ne kaam ho gaya mark kiya';
  if (k === 'transfer') {
    const f = ev.fields || {};
    return `Store transfer · ${f.From || ''} → ${f.To || ''}`;
  }
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

function ActivityLog({ tickets, session, onOpen, onClose }) {
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
    tickets.forEach((d) => {
      const log = d._raw && Array.isArray(d._raw.app_log) ? d._raw.app_log : [];
      log.forEach((ev, i) => {
        if (ev && ev.ts) out.push({ ev, d, key: `${d.ticket_id}#${i}` });
      });
    });
    out.sort((a, b) => String(b.ev.ts).localeCompare(String(a.ev.ts)));
    return out;
  }, [tickets]);

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

  // din ke hisaab se group
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
              placeholder="Customer, ticket, store, naam…"
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
            {session && session.isPower && (
              <select
                className="dash-inp"
                value={store}
                onChange={(e) => setStore(e.target.value)}
              >
                <option value="ALL">All stores</option>
                {STORE_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {branchLabel(c)}
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
                          {session && session.isPower && (
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

/* ══════════════════════════════════════════════════════════════ STYLES */
function StyleTag() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700;800&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
      body { color: ${T.ink}; background: ${T.beige}; letter-spacing: -0.1px; }
      #root { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; text-align: left !important; }
      button { color: inherit; font-family: inherit; }
      h1, h2, h3 { color: ${T.ink}; letter-spacing: -0.5px; }
      input, select, textarea { font-family: inherit; }
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

      .dash-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; flex-wrap: wrap; margin-bottom: 18px; }
      .dash-sub { font-size: 12.5px; color: ${T.inkSoft}; font-weight: 600; }
      .dash-filters { display: flex; gap: 8px; flex-wrap: wrap; }
      .dash-inp { border: 1px solid ${T.line}; border-radius: 10px; padding: 9px 12px; font-size: 13px; font-weight: 600; font-family: inherit; background: #fff; color: ${T.ink}; cursor: pointer; }
      .dash-cards { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 12px; margin-bottom: 20px; }
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
      .dash-store { font-weight: 700; color: ${T.ink}; }
      .dash-td-click { font-weight: 700; color: ${T.green}; cursor: pointer; }
      .dash-td-click:hover { background: ${T.mint}; }
      .dash-td-zero { color: #C9C7BE; }
      .dash-row { cursor: pointer; }
      .dash-row:hover { background: ${T.cream}; }
      .dash-chip { padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; }
      .dash-empty { text-align: center; color: ${T.inkSoft}; padding: 26px !important; }
      @media (max-width: 1100px) { .dash-cards { grid-template-columns: repeat(3,minmax(0,1fr)); } }
      @media (max-width: 760px) { .dash-cards { grid-template-columns: repeat(2,minmax(0,1fr)); } }
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

      .view-range { display: inline-flex; align-items: center; gap: 6px; }
      .mx-arrow { color: ${T.inkSoft}; font-weight: 700; }
      .layout-toggle { display: inline-flex; background: #fff; border: 1px solid ${T.line}; border-radius: 11px; padding: 3px; gap: 3px; }
      .lt-btn { display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent; padding: 8px 13px; border-radius: 9px; font-size: 12.5px; font-weight: 700; font-family: inherit; color: ${T.inkSoft}; cursor: pointer; }
      .lt-btn.active { background: ${T.forest}; color: #fff; }

      .cat-list { display: flex; flex-direction: column; gap: 14px; }
      .cat-sec { background: #fff; border: 1px solid ${T.line}; border-top: 3px solid ${T.line}; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 2px rgba(20,57,43,.04); }
      .cat-head { width: 100%; display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: #fff; border: none; cursor: pointer; font-family: inherit; color: ${T.ink}; }
      .cat-head:hover { background: ${T.cream}; }
      .cat-ico { width: 44px; height: 44px; border-radius: 13px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .cat-body { padding: 14px 16px 18px; border-top: 1px solid ${T.line}; background: ${T.cream}; }
      .cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }

      .hjs-complaints .board { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 12px; align-items: start; }
      .column { background: #FBF9F4; border: 1px solid ${T.line}; border-radius: 14px; padding: 6px; overflow: hidden; }
      .hjs-complaints .column:nth-child(1) { border-top: 3px solid ${T.slate}; }
      .hjs-complaints .column:nth-child(2) { border-top: 3px solid ${T.blue}; }
      .hjs-complaints .column:nth-child(3) { border-top: 3px solid ${T.violet}; }
      .hjs-complaints .column:nth-child(4) { border-top: 3px solid ${T.green}; }
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
      /* card ke andar wala inline form — lamba button bahar nikal jaata tha */
      .inline-move .modal-foot { flex-wrap: wrap; gap: 8px; }
      .inline-move .modal-foot .btn-ghost,
      .inline-move .modal-foot .btn-primary { flex: 1 1 auto; min-width: 0; padding: 12px 14px; text-align: center; }
      .card-next:hover { background: ${T.mint}; border-color: ${T.green}; }
      .card-tech { display: flex; align-items: center; gap: 6px; margin-top: 9px; background: ${T.violetSoft}; color: ${T.violet}; border-radius: 9px; padding: 6px 9px; font-size: 11.5px; font-weight: 600; }
      .card-tech b { font-weight: 800; }
      .card-tech svg { flex-shrink: 0; }
      .tech-phone { display: flex; align-items: center; gap: 8px; background: ${T.violetSoft}; border: 1px solid #ddd6ef; color: ${T.violet}; border-radius: 11px; padding: 11px 13px; font-size: 13px; line-height: 1.4; }
      .tech-phone b { font-weight: 800; }
      .tech-phone svg { flex-shrink: 0; }
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

      .flag-note { border-radius: 12px; padding: 11px 13px; font-size: 12.5px; font-weight: 600; line-height: 1.5; }
      .flag-note b { font-weight: 800; }
      .danger-zone { margin-top: 24px; padding-top: 16px; border-top: 1px dashed #e9cfc4; }
      .danger-confirm { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      .btn-danger { background: ${T.redSoft}; color: ${T.red}; border: 1px solid #e9cfc4; border-radius: 11px; padding: 11px 16px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 7px; transition: background .12s, border-color .12s; }
      .btn-danger:hover { background: #F2D9D0; border-color: #DFB9AC; }
      .req-note { font-size: 11.5px; font-weight: 600; color: ${T.amber}; background: ${T.amberSoft}; border-radius: 9px; padding: 7px 11px; margin-top: -4px; }
      .tp-preview { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 800; color: ${T.green}; margin-top: 6px; }
      .mbc-divider { font-size: 11.5px; font-weight: 800; color: ${T.green}; text-transform: uppercase; letter-spacing: .4px; padding-top: 4px; border-top: 1px dashed ${T.line}; margin-top: 2px; }
      .prev-line { display: flex; align-items: center; gap: 8px; background: ${T.cream}; border: 1px solid ${T.line}; border-radius: 11px; padding: 10px 13px; font-size: 13px; color: ${T.ink}; line-height: 1.4; }
      .prev-line b { font-weight: 800; }
      .prev-line svg { color: ${T.amber}; flex-shrink: 0; }
      .auto-time { display: flex; align-items: center; gap: 8px; background: ${T.blueSoft}; border: 1px solid #cfe0f0; border-radius: 11px; padding: 11px 13px; font-size: 13px; color: ${T.blue}; line-height: 1.4; }
      .auto-time b { font-weight: 800; }
      .auto-time svg { flex-shrink: 0; }

      .chip-row { display: flex; flex-wrap: wrap; gap: 8px; }
      .chip { border: 1.5px solid ${T.line}; background: #fff; color: ${T.ink}; border-radius: 11px; padding: 11px 14px; font-size: 13.5px; font-weight: 700; font-family: inherit; cursor: pointer; min-height: 44px; }
      .chip:hover { border-color: ${T.blue}; }
      .chip.on { background: ${T.blueSoft}; border-color: ${T.blue}; color: ${T.blue}; }
      .transfer-box { margin-top: 14px; background: #fff; border: 1px solid ${T.line}; border-radius: 14px; padding: 12px 14px; }
      .transfer-row { display: flex; gap: 8px; }
      .transfer-row .inp { flex: 1; min-width: 0; }
      .transfer-row .btn-primary { flex-shrink: 0; padding: 11px 14px; }
      .problem-line { display: flex; align-items: flex-start; gap: 8px; background: ${T.amberSoft}; border: 1px solid #eddcbf; color: ${T.ink}; border-radius: 11px; padding: 10px 13px; font-size: 13px; line-height: 1.45; }
      .problem-line svg { color: ${T.amber}; flex-shrink: 0; margin-top: 2px; }
      .problem-line b { font-weight: 800; }
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
      .head-edit-note { display: flex; align-items: center; gap: 7px; background: ${T.amberSoft}; border: 1px solid #eddcbf; color: ${T.amber}; border-radius: 11px; padding: 10px 13px; font-size: 12.5px; font-weight: 700; margin-bottom: 12px; line-height: 1.4; }
      .head-edit-note svg { flex-shrink: 0; }
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
      /* priority */
      .prio-badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 20px; font-weight: 800; white-space: nowrap; flex-shrink: 0; }
      .prio-badge .col-pip { width: 7px; height: 7px; }
      .prio-box { margin-top: 14px; border: 1px solid ${T.line}; border-radius: 13px; padding: 11px 12px; background: #fff; }
      .prio-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .prio-pick { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
      .prio-btn { border: 1.5px solid; border-radius: 10px; padding: 7px 13px; font-size: 12.5px; font-weight: 800; font-family: inherit; cursor: pointer; }
      .prio-clear { background: #fff !important; color: ${T.inkSoft} !important; border-color: ${T.line} !important; }
      .prio-meta { font-size: 11.5px; color: ${T.inkSoft}; margin-top: 8px; }
      .card-techdone { display: flex; align-items: center; gap: 6px; margin-top: 8px; background: ${T.mint}; color: ${T.green}; border-radius: 9px; padding: 6px 9px; font-size: 11.5px; font-weight: 700; }
      .techdone-note { display: flex; gap: 10px; margin-top: 12px; background: ${T.mint}; color: ${T.green}; border: 1px solid #cfe3d0; border-radius: 13px; padding: 11px 12px; font-size: 13px; }
      /* login tabs */
      .login-tabs { display: flex; gap: 6px; background: ${T.beige}; border-radius: 12px; padding: 4px; margin-bottom: 16px; }
      .login-tab { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; background: transparent; border-radius: 9px; padding: 9px; font-size: 13px; font-weight: 700; font-family: inherit; color: ${T.inkSoft}; cursor: pointer; }
      .login-tab.on { background: #fff; color: ${T.forest}; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
      /* technician view */
      .tech-wrap { background: ${T.beige}; min-height: 100vh; color: ${T.ink}; }
      .tech-top { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: ${T.forest}; color: #fff; padding: 14px 16px; }
      .tech-icon { min-width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(255,255,255,.25); background: rgba(255,255,255,.08); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; font-family: inherit; cursor: pointer; }
      .tech-body { max-width: 640px; margin: 0 auto; padding: 16px 14px 60px; }
      .tech-h { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; margin-bottom: 10px; }
      .tech-tabs { display: flex; gap: 6px; background: #fff; border: 1px solid ${T.line}; border-radius: 12px; padding: 4px; margin-bottom: 14px; }
      .tech-tab { flex: 1; border: none; background: transparent; border-radius: 9px; padding: 10px; font-size: 13.5px; font-weight: 700; font-family: inherit; color: ${T.inkSoft}; cursor: pointer; }
      .tech-tab.on { background: ${T.forest}; color: #fff; }
      .tech-count { display: inline-block; min-width: 20px; padding: 1px 6px; margin-left: 4px; border-radius: 10px; background: rgba(0,0,0,.08); font-size: 11.5px; }
      .tech-tab.on .tech-count { background: rgba(255,255,255,.2); }
      .tech-empty { text-align: center; color: ${T.inkSoft}; padding: 40px 10px; font-size: 14px; }
      .tech-card { background: #fff; border: 1px solid ${T.line}; border-radius: 15px; padding: 14px; margin-bottom: 12px; }
      .tech-note { margin-top: 8px; font-size: 12.5px; background: ${T.beige}; border-radius: 9px; padding: 7px 9px; color: ${T.ink}; }
      .tech-actions { display: flex; gap: 8px; margin-top: 12px; }
      .tech-call { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid ${T.line}; border-radius: 11px; padding: 12px; font-size: 14px; font-weight: 700; color: ${T.forest}; text-decoration: none; background: #fff; }
      .tech-done-btn { flex: 2; display: inline-flex; align-items: center; justify-content: center; gap: 6px; border: none; border-radius: 11px; padding: 12px; font-size: 14px; font-weight: 800; font-family: inherit; color: #fff; background: ${T.green}; cursor: pointer; }
      .tech-confirm { margin-top: 12px; }
      .tech-back { gap: 4px; padding: 0 10px; }
      /* TechBoard — app ke baaki pages jaisa look */
      .tb-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
      .tb-stat { background: #fff; border: 1.5px solid ${T.line}; border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; align-items: stretch; gap: 4px; text-align: left; font-family: inherit; cursor: pointer; transition: transform .12s, box-shadow .12s, border-color .12s, background .12s; }
      .tb-stat:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(20,57,43,.08); }
      .tb-stat.on { box-shadow: 0 4px 14px rgba(20,57,43,.10); }
      .tb-filter-note { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12.5px; color: ${T.inkSoft}; margin: -4px 0 12px; }
      .tb-filter-note b { color: ${T.ink}; }
      .tb-clear { display: inline-flex; align-items: center; gap: 4px; border: 1px solid ${T.line}; background: #fff; border-radius: 20px; padding: 3px 9px; font-size: 11.5px; font-weight: 700; font-family: inherit; color: ${T.inkSoft}; cursor: pointer; }
      .tb-stat-n { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; line-height: 1; }
      .tb-stat-l { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: ${T.inkSoft}; }
      .tb-chips { display: flex; gap: 7px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 12px; scrollbar-width: none; }
      .tb-chips::-webkit-scrollbar { display: none; }
      .tb-chip { flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px; border: 1px solid ${T.line}; background: #fff; color: ${T.ink}; border-radius: 20px; padding: 7px 12px; font-size: 12.5px; font-weight: 700; font-family: inherit; cursor: pointer; transition: background .12s, color .12s; }
      .tb-chip:hover { border-color: ${T.forest}; }
      .tb-chip.on { background: ${T.forest}; border-color: ${T.forest}; color: #fff; }
      .tb-chip-n { min-width: 18px; padding: 0 6px; border-radius: 10px; background: ${T.beige}; color: ${T.inkSoft}; font-size: 11px; text-align: center; }
      .tb-chip.on .tb-chip-n { background: rgba(255,255,255,.2); color: #fff; }
      .tb-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
      .tb-embedded .tb-grid { grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); align-items: start; }
      .tb-card { cursor: pointer; }
      .tb-card .tech-actions { margin-top: 12px; }
      .tb-card .tech-call, .tb-card .tech-done-btn { padding: 10px; font-size: 13px; }
      .techdone-box { margin-top: 12px; border: 1px solid #cfe3d0; background: ${T.mint}; border-radius: 13px; padding: 11px 12px; }
      @media (max-width: 760px) {
        .tb-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }

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

      .track-back { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid ${T.line}; border-radius: 10px; padding: 9px 14px; font-size: 13px; font-weight: 700; font-family: inherit; color: ${T.ink}; cursor: pointer; margin-bottom: 14px; }
      .track-back:hover { background: ${T.beige}; }

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

      @media (max-width: 1400px) { .hjs-complaints .board { gap: 10px; } }
      @media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .hjs-complaints .board { grid-template-columns: repeat(2,minmax(0,1fr)); } }
      @media (max-width: 860px) { .login-wrap { grid-template-columns: 1fr; } .login-hero { display: none; } .sidebar { display: none; } .hjs-complaints .board { grid-template-columns: 1fr; } }
      @media (max-width: 760px) {
        .topbar { height: auto; flex-wrap: wrap; padding: 8px 14px; gap: 8px 10px; }
        .tb-brand { display: flex; order: 0; flex: 1 1 auto; min-width: 0; }
        .tb-brand span { font-size: 14px; }
        /* icons apni poori line lete hain aur barabar faila jaate hain */
        .tb-actions { order: 1; flex: 1 1 100%; width: 100%; justify-content: space-between; align-items: center; gap: 6px; }
        .tb-user-text { display: none; }
        .tb-user { display: none; }
        .tb-search { order: 2; flex: 1 1 100%; max-width: none; }
        .lang-toggle { order: 3; }
        .icon-btn { width: 34px; height: 34px; flex-shrink: 0; }
        .lang-btn { padding: 6px 8px; }
        main { padding: 10px 14px 60px !important; }
        main > div:first-child { margin-bottom: 14px !important; }
        h2 { font-size: 22px !important; }
        .drawer { width: 100%; max-width: 100%; padding: 18px 16px; }
        .kv-grid { grid-template-columns: 1fr 1fr; }
        .modal { width: 100%; border-radius: 18px; }
        .glass-card { padding: 24px 20px; }
        .inp[type="time"], .inp[type="datetime-local"] { min-height: 44px; }
      }
      /* phone pe header ke controls ek doosre ke saath fit ho jaayein */
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

// Delivery app (App.tsx) ke login se technician login ke liye
/* Delivery app ke store login ke liye complaints session (sirf us store ka) */
function complaintStoreSession(store, deliveryCode) {
  return { ...sessionFor(store), deliveryCode: deliveryCode || null };
}
export {
  TECHNICIANS,
  TECH_ADMIN,
  techSession,
  sbTechLogin,
  sameName,
  complaintStoreSession,
};
