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
  url: 'https://bkiorfluddgdujpkcfjm.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW9yZmx1ZGRnZHVqcGtjZmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MjE1MzEsImV4cCI6MjEwMDA5NzUzMX0.dqggpSuocXcxPYeCfXmVQqPrxfCbR2LiZ-lVN_mOJas',
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
const branchLabel = (code) => BRANCH_NAMES[code] || code;

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

const ACTIONS = [
  'Technician ghar bheja',
  'Part / spare order kiya',
  'Naya saman diya (replace)',
  'Store pe repair kiya',
  'Company / warehouse bheja',
  'Customer ko samjhaya',
  'Other',
];

/* ══════════════════════════════════════════════════════════════════════
   LOGIN  ── store dropdown se choose karke store-wise PIN daalo.
   Head login se saare stores dikhte hain.
   ══════════════════════════════════════════════════════════════════════ */
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
/* All stores = 2222, baaki 1001 se shuru */
const LOCAL_PW = (() => {
  const m = { ALL: '2222' };
  STORE_ORDER.forEach((c, i) => {
    m[c] = String(1001 + i);
  });
  return m;
})();
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
    id: 'received',
    label: 'Ticket Received',
    short: 'Received',
    status: 'Open',
    color: T.slate,
    soft: T.slateSoft,
  },
  {
    id: 'talk',
    label: 'Talked to Customer',
    short: 'Contacted',
    status: 'Talked To Customer',
    color: T.blue,
    soft: T.blueSoft,
  },
  {
    id: 'status',
    label: 'Work in Progress',
    short: 'In Progress',
    status: 'In Progress',
    color: T.amber,
    soft: T.amberSoft,
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
  talk: { talk_date: null, talk_time: null, stage1_remarks: null },
  status: {
    action_taken: null,
    action_other: null,
    expected_date: null,
    stage2_remarks: null,
  },
  resolution: { is_resolved: false, stage3_remarks: null },
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
  talk: { label: 'Customer Se Baat Hui', short: 'Baat Hui' },
  status: { label: 'Kaam Jaari Hai', short: 'Jaari' },
  resolution: { label: 'Samasya Hal Hui', short: 'Hal Hui' },
};
const HINDI_MOVE = {
  talk: 'Customer se baat karein',
  status: 'Kaam shuru karein',
  resolution: 'Hal hua mark karein',
};
const ENG_MOVE = {
  talk: 'Talk to customer',
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
  // header / chips
  complaints: { en: 'complaints', hi: 'ki shikayatein' },
  storeManager: { en: 'Store manager', hi: 'Store manager' },
  today: { en: 'Today', hi: 'Aaj' },
  archived: { en: 'Archived', hi: 'Purani' },
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
    en: 'Only the head can delete. It disappears from view but stays in the database as "Deleted".',
    hi: 'Sirf head delete kar sakta hai. View se hat jayega par database mein "Deleted" ke saath safe rahega.',
  },
  locked: { en: 'locked', hi: 'locked' },
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
  workDone: { en: 'What work was done? *', hi: 'Kya kaam kiya? *' },
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
  workDoneShort: { en: 'Work done', hi: 'Kya kaam kiya' },
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
  spotFixNote: {
    en: 'Repaired on the spot. No need to wait — tick below and the ticket will be marked Resolved directly.',
    hi: 'Wahin theek ho gaya. Wait karne ki zarurat nahi — neeche tick karein, ticket seedha Resolved ho jayega.',
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
  saveResolved: { en: 'Save · Mark Resolved', hi: 'Save · Resolved' },
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
  if (t.includes('progress') || t.includes('chalu')) return 'status';
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
    en: 'Call the customer and note the issue',
    hi: 'Customer ko call karke dikkat note karein',
  },
  status: {
    en: 'Enter the work done and expected resolution date',
    hi: 'Kya kaam kiya aur kab tak theek hoga bharein',
  },
  resolution: {
    en: 'Tick once resolved — the ticket will close',
    hi: 'Hal hone par tick karein — ticket band ho jayega',
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
function stageFields(toStage, f) {
  const rmk = f.remarks ? { Remarks: f.remarks } : {};
  if (toStage === 'received') return {};
  if (toStage === 'talk')
    return { Date: f.date || '—', Time: f.time || '—', ...rmk };
  if (toStage === 'status')
    return {
      Action: (f.action === 'Other' ? f.actionOther : f.action) || '—',
      'Kab tak': f.expected ? niceDate(f.expected) || f.expected : '—',
      ...rmk,
    };
  if (toStage === 'resolution')
    return { Resolved: f.resolved ? 'Yes' : 'No', ...rmk };
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
function inView(x, viewMode) {
  const st = x.stage;
  const pending = st !== 'resolution' && !isClosedStage(st);
  if (pending) return viewMode === 'today';
  const h = hoursSince(closedTs(x));
  if (h < 24) return viewMode === 'today'; // abhi band hui
  if (h < 48) return viewMode === 'archived'; // 24h baad archived
  return false; // 48h baad view se gayab
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

function rowToTicket(r) {
  const branch = clean(r.city) || '—';
  return {
    ticket_id: r.ticket_id,
    id: r.ticket_number || r.ticket_id,
    branch,
    manager: STORE_MANAGERS[branch] || '—',
    customer: r.full_name || '—',
    phone: clean(r.mobile) || '—',
    email: clean(r.email_id) || '—',
    area: clean(r.city) || '—',
    equipment: clean(r.product) || 'Equipment',
    subject: clean(r.subject) || '—',
    opened: r.opening_time || r.created_at || null,
    expected: clean(r.expected_date) || '—',
    stage: statusToStage(r.status),
    rawStatus: r.status,
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
export default function App({ session: extSession = null, view = 'board' }) {
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
  const [viewMode, setViewMode] = useState('today'); // today | archived
  const [layoutMode, setLayoutMode] = useState('board'); // board | categories
  const [lang, setLang] = useState(HJS_LANG);
  const [lastMove, setLastMove] = useState(null);
  const jumpMobile = (toStage) => setLastMove({ stage: toStage, n: Date.now() });
  const [ownPage, setOwnPage] = useState('tickets'); // tickets | dashboard
  // hosted mode mein page delivery app ka sidebar decide karta hai
  const page = hosted ? (view === 'dashboard' ? 'dashboard' : 'tickets') : ownPage;
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

  const scoped = useMemo(() => {
    if (!session) return [];
    const base = tickets.filter((x) => x.stage !== 'deleted');
    if (session.branch === 'ALL') return base;
    return base.filter((x) => x.branch === session.branch);
  }, [tickets, session]);

  const viewItems = useMemo(
    () => scoped.filter((x) => inView(x, viewMode)),
    [scoped, viewMode],
  );

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

  const buildPatch = (toStage, f, mode) => {
    const patch = { updated_at: new Date().toISOString() };
    if (mode === 'move') patch.status = stageToStatus(toStage);
    if (toStage === 'talk') {
      patch.talk_date = f.date || null;
      patch.talk_time = f.time || null;
      patch.stage1_remarks = f.remarks || null;
    } else if (toStage === 'status') {
      patch.action_taken = f.action || null;
      patch.action_other = f.action === 'Other' ? f.actionOther || null : null;
      patch.expected_date = f.expected || null;
      patch.stage2_remarks = f.remarks || null;
      // On-spot fix — wahin theek ho gaya, seedha Resolved.
      if (f.spotFix) {
        if (mode === 'move') patch.status = stageToStatus('resolution');
        patch.is_resolved = !!f.resolved;
        patch.stage3_remarks = f.remarks || null;
      }
    } else if (toStage === 'resolution') {
      patch.is_resolved = !!f.resolved;
      patch.stage3_remarks = f.remarks || null;
    }
    return patch;
  };

  const applyMove = async (ticketId, toStage, fields, mode) => {
    const patch = buildPatch(toStage, fields, mode);
    const cur = tickets.find((x) => x.ticket_id === ticketId);
    const spot = toStage === 'status' && fields.spotFix && mode === 'move';
    patch.app_log = [
      ...existingLog(cur),
      makeEvent(toStage, fields, mode),
      ...(spot ? [makeEvent('resolution', fields, 'move')] : []),
    ];
    const landed = spot ? 'resolution' : toStage;
    try {
      await sbPatch(ticketId, patch);
      ping(
        mode === 'edit'
          ? `${L('tUpdated')} ✓`
          : `${L('tSaved')} ✓ · ${sLabel(landed)}`,
      );
      if (mode === 'move') jumpMobile(landed);
      load();
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
      load();
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
        },
      ],
    };
    try {
      await sbPatch(ticketId, patch);
      setActiveId(null);
      ping(L('tDeleted'));
      load();
    } catch (e) {
      ping(`${L('tDeleteFail')}: ` + e.message);
    }
  };

  if (!session) return <Login onLogin={setSession} />;

  // ── HOSTED: delivery app ke <main> ke andar — sirf content, koi chrome nahi
  if (hosted) {
    return (
      <>
        <StyleTag />
        {page === 'dashboard' ? (
          <Dashboard tickets={scoped} onOpen={(x) => setActiveId(x.ticket_id)} />
        ) : (
          <>
            <Header
              session={session}
              live={CONFIGURED}
              count={viewItems.length}
              viewMode={viewMode}
              onViewMode={setViewMode}
              layoutMode={layoutMode}
              onLayoutMode={setLayoutMode}
              onSwitchStore={() => {}}
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
            canDelete={session.isHead}
            onDelete={() => removeEntry(active.ticket_id)}
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
        {toast && <Toast msg={toast} />}
      </>
    );
  }

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
        <Sidebar
          session={session}
          page={session.branch === 'ALL' ? page : 'tickets'}
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
            lang={lang}
            onLang={switchLang}
          />
          <main style={{ padding: '26px 30px 60px', flex: 1 }}>
            {session.branch === 'ALL' && page === 'dashboard' ? (
              <Dashboard
                tickets={scoped}
                onOpen={(x) => setActiveId(x.ticket_id)}
              />
            ) : (
              <>
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
          canDelete={session.isHead}
          onDelete={() => removeEntry(active.ticket_id)}
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
  const [sel, setSel] = useState({ kind: 'all', store: null });

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
    status: (x) => x.stage === 'status',
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
            {DASH_STORES.map((s) => (
              <option key={s} value={s}>
                {branchLabel(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="dash-cards">
        {cards.map((c) => {
          const n = cnt(metric[c.kind], base);
          const on = sel.kind === c.kind && !sel.store;
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
                <th>{sShort('status')}</th>
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
                      {['received', 'talk', 'status', 'resolution'].map((k) => (
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
  const [branch, setBranch] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
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
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>
              Store login
            </div>
            <div style={{ fontSize: 13.5, color: T.inkSoft, marginTop: 4 }}>
              Choose your store and enter the PIN.
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
              ? 'Live · Connected to Supabase'
              : 'Not connected · check Supabase key'}
            <br />
            Store PIN: starts at <b>1001</b> · All stores: <b>2222</b>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════ SIDEBAR */
function Sidebar({ session, page, onNav }) {
  const isAll = session.branch === 'ALL';
  const nav = [
    { id: 'tickets', icon: LayoutDashboard, label: 'Complaints' },
    ...(isAll ? [{ id: 'dashboard', icon: BarChart3, label: 'Dashboard' }] : []),
    { id: 'pickups', icon: RotateCcw, label: 'Pickups', soon: true },
    { id: 'reports', icon: ClipboardCheck, label: 'Reports', soon: true },
  ];
  const mgr = session.branch === 'ALL' ? null : STORE_MANAGERS[session.branch];
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
        <button className="icon-btn" onClick={onReload} title="Reload">
          <RefreshCw size={17} color={T.ink} className={loading ? 'spin' : ''} />
        </button>
        <button className="icon-btn">
          <Bell size={18} color={T.ink} />
          <span className="dot" />
        </button>
        <div
          className="tb-user"
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
        >
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
            <option value="archived">{L('archived')}</option>
          </select>
        </div>
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
                  {branchLabel(c)}
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
            ? `${viewMode === 'archived' ? L('archived') : L('today')} · ${L('totalTickets')} · ${count}`
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
  return (
    <div className={cancelled ? 'card is-cancelled' : 'card'} onClick={onOpen}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div className="eq-ico" style={{ background: stage.soft }}>
          <Icon size={17} color={stage.color} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="card-name">{d.customer}</div>
          <div className="ellip card-id">#{d.id}</div>
        </div>
      </div>
      <div className="card-equip">{d.subject}</div>
      <div className="card-meta">
        <span className="ellip" style={{ maxWidth: 150 }}>
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
function Drawer({ d, onClose, onAdvance, onSetStage, onEditStage, canDelete, onDelete }) {
  const [confirmDel, setConfirmDel] = useState(false);
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
  const r = d._raw || {};

  const blocks = [
    {
      id: 'talk',
      i: 1,
      rows: [
        [L('kvDate'), show(niceDate(r.talk_date))],
        [L('kvTime'), show(niceTime(r.talk_time))],
        [L('whatSaidShort'), show(r.stage1_remarks)],
      ],
    },
    {
      id: 'status',
      i: 2,
      rows: [
        [
          L('workDoneShort'),
          show(r.action_taken === 'Other' ? r.action_other : r.action_taken),
        ],
        [L('expectedShort'), show(niceDate(r.expected_date))],
        [L('remarksShort'), show(r.stage2_remarks)],
      ],
    },
    {
      id: 'resolution',
      i: 3,
      rows: [
        [L('resolvedShort'), r.is_resolved ? L('yes') : L('no')],
        [
          L('workDoneShort'),
          show(r.action_taken === 'Other' ? r.action_other : r.action_taken),
        ],
        [L('remarksShort'), show(r.stage3_remarks)],
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
        ) : (
          <>
            <div className="sec-title" style={{ marginTop: 16 }}>
              {L('moveToStage')}
            </div>
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
          <KV label={L('kvIssue')} value={d.subject} full />
          <KV label={L('kvStore')} value={branchLabel(d.branch)} />
          <KV label={L('kvOpened')} value={niceDateTime(d.opened) || '—'} />
          <KV label={L('kvManager')} value={d.manager} full />
        </div>

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
                  <button className="mini-edit" onClick={() => onEditStage(b.id)}>
                    <Pencil size={13} /> Edit
                  </button>
                ) : cancelled ? (
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
                      full={k === L('remarksShort') || k === L('whatSaidShort')}
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
        : toStage === 'status'
          ? r.stage2_remarks
          : r.stage1_remarks) || '',
    action: (r.action_taken && r.action_taken !== 'null' && r.action_taken) || '',
    actionOther:
      (r.action_other && r.action_other !== 'null' && r.action_other) || '',
    expected:
      mode === 'edit' && r.expected_date && r.expected_date !== 'null'
        ? String(r.expected_date).slice(0, 10)
        : soonDate,
    resolved: !!r.is_resolved,
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const openPicker = (e) => {
    try {
      e.currentTarget.showPicker();
    } catch (_) {}
  };
  const otherAction = f.action === 'Other';
  // On-spot fix — wahin theek ho gaya, seedha Resolved.
  const spot = toStage === 'status' && f.action === 'Store pe repair kiya';
  const canSave =
    toStage === 'talk'
      ? !!f.remarks.trim() // customer ne kya kaha — MANDATORY
      : toStage === 'status'
        ? spot
          ? !!(f.action && f.resolved)
          : !!(f.action && (!otherAction || f.actionOther.trim()) && f.expected)
        : toStage === 'resolution'
          ? !!f.resolved
          : true;

  // neeche wala textarea — stage ke hisaab se label
  const remarkLabel =
    toStage === 'talk'
      ? L('whatCustomerSaid')
      : toStage === 'resolution'
        ? L('remarksResolve')
        : L('remarks');
  const remarkPh =
    toStage === 'talk'
      ? L('whatCustomerSaidPh')
      : toStage === 'resolution'
        ? L('remarksResolvePh')
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

        {toStage === 'status' && (
          <>
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
            {spot ? (
              <div
                className="flag-note"
                style={{ background: T.mint, color: T.green }}
              >
                {L('spotFixNote')}
              </div>
            ) : (
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
            )}

            {spot && (
              <>
                <div className="mbc-divider">{L('finalResolution')}</div>
                <Check1
                  checked={f.resolved}
                  onChange={() => set('resolved', !f.resolved)}
                  label={L('markResolvedChk')}
                />
              </>
            )}
          </>
        )}

        {toStage === 'resolution' && (
          <>
            {r.action_taken && r.action_taken !== 'null' && (
              <div className="prev-line">
                <Wrench size={14} />
                <span>
                  {L('workWasDone')}:{' '}
                  <b>
                    {r.action_taken === 'Other'
                      ? r.action_other
                      : r.action_taken}
                  </b>
                </span>
              </div>
            )}
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
        {toStage === 'talk' && !f.remarks.trim() && (
          <div className="req-note">{L('saidRequired')}</div>
        )}
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
            onSave(spot ? { ...out, spotFix: true } : out);
          }}
        >
          <ShieldCheck size={16} />{' '}
          {mode === 'edit'
            ? L('update')
            : spot
              ? L('saveResolved')
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

      .board { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 12px; align-items: start; }
      .column { background: #FBF9F4; border: 1px solid ${T.line}; border-radius: 14px; padding: 6px; overflow: hidden; }
      .column:nth-child(1) { border-top: 3px solid ${T.slate}; }
      .column:nth-child(2) { border-top: 3px solid ${T.blue}; }
      .column:nth-child(3) { border-top: 3px solid ${T.amber}; }
      .column:nth-child(4) { border-top: 3px solid ${T.green}; }
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

      @media (max-width: 1400px) { .board { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; } }
      @media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .board { grid-template-columns: repeat(2,minmax(0,1fr)); } }
      @media (max-width: 860px) { .login-wrap { grid-template-columns: 1fr; } .login-hero { display: none; } .sidebar { display: none; } .board { grid-template-columns: 1fr; } }
      @media (max-width: 760px) {
        .topbar { height: auto; flex-wrap: wrap; padding: 8px 14px; gap: 8px 10px; }
        .tb-brand { display: flex; order: 0; flex: 1 1 auto; min-width: 0; }
        .tb-brand span { font-size: 14px; }
        .tb-actions { order: 1; flex: 0 0 auto; width: auto; justify-content: flex-end; gap: 8px; }
        .tb-user-text { display: none; }
        .tb-search { order: 2; flex: 1 1 100%; max-width: none; }
        .lang-toggle { order: 3; }
        .icon-btn { width: 34px; height: 34px; }
        main { padding: 10px 14px 60px !important; }
        main > div:first-child { margin-bottom: 14px !important; }
        h2 { font-size: 22px !important; }
        .drawer { width: 100%; max-width: 100%; padding: 18px 16px; }
        .kv-grid { grid-template-columns: 1fr 1fr; }
        .modal { width: 100%; border-radius: 18px; }
        .glass-card { padding: 24px 20px; }
        .inp[type="time"], .inp[type="datetime-local"] { min-height: 44px; }
      }
      @media (max-width: 400px) { .stat-grid { grid-template-columns: 1fr 1fr; gap: 12px; } .stat-grid.three { grid-template-columns: 1fr 1fr; } }
      @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
    `}</style>
  );
}
