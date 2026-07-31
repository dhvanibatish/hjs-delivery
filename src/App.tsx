import React, { useState, useMemo } from 'react';
import {
  Package, CheckCircle2, Clock, AlertTriangle, Bell, Copy, X, BarChart3,
  Building2, User, MessageSquareWarning, ArrowLeft, Info,
} from 'lucide-react';

/* ─── ye sab tere App.jsx se hi liya hai (preview ke liye) ─── */
const T = {
  forest:'#14392B', forestSoft:'#1E5138', green:'#2E7D32', greenBright:'#3D9A42',
  mint:'#E7F0E8', beige:'#F5F1E8', cream:'#FBF9F4', card:'#FFFFFF',
  ink:'#1C2620', inkSoft:'#657069', line:'#E7E2D6', amber:'#C77D28', amberSoft:'#FBF0DE',
  blue:'#3E6B9E', blueSoft:'#E8EFF6', slate:'#64748B', slateSoft:'#EEF1F3',
  violet:'#6B5B9A', violetSoft:'#EEEAF7', red:'#B4472E', redSoft:'#F7E7E1',
};
const FONT = "'Plus Jakarta Sans','Inter',system-ui,-apple-system,sans-serif";
const BRANCH_NAMES = {
  MOH:'Mohali Showroom', CHD:'Head Office', GGN:'Gurgaon', NCR:'Delhi NCR',
  NOD:'Noida Showroom', LDH:'Ludhiana', JAL:'Jalandhar', JPR:'Jaipur',
  LKO:'Lucknow', NWD:'North West Delhi', JKP:'Janakpuri',
};
const branchLabel = (code) => BRANCH_NAMES[code] || code;
const DASH_STORES = ['MOH','CHD','GGN','NCR','NOD','LDH','JAL','JPR','LKO','NWD','JKP'];
const STAGES = [
  { id:'new', label:'New Delivery', short:'New Job', color:T.slate, soft:T.slateSoft },
  { id:'talked', label:'Talked to Customer', short:'Contacted', color:T.blue, soft:T.blueSoft },
  { id:'scheduled', label:'Delivery Scheduled', short:'Scheduled', color:T.amber, soft:T.amberSoft },
  { id:'dispatched', label:'Out for Delivery', short:'Dispatched', color:T.violet, soft:T.violetSoft },
  { id:'delivered', label:'Item Delivered', short:'Delivered', color:T.green, soft:T.mint },
];
const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);
const CLOSED = {
  cancelled:{ id:'cancelled', label:'Cancelled', short:'Cancelled', color:T.red, soft:T.redSoft },
  duplicate:{ id:'duplicate', label:'Duplicate Invoice', short:'Duplicate', color:T.slate, soft:T.slateSoft },
  renewal:{ id:'renewal', label:'Renewal Invoice', short:'Renewal', color:T.blue, soft:T.blueSoft },
  deleted:{ id:'deleted', label:'Deleted', short:'Deleted', color:T.slate, soft:T.slateSoft },
};
const isClosedStage = (s) => s==='cancelled'||s==='duplicate'||s==='renewal'||s==='deleted';
function stageMeta(id){ const s=STAGES[stageIndex(id)]; if(s) return s; if(CLOSED[id]) return CLOSED[id]; return STAGES[0]; }
function statusToStage(s){
  const t=String(s||'').toLowerCase();
  if(t.includes('delet')) return 'deleted';
  if(t.includes('duplicate')) return 'duplicate';
  if(t.includes('renew')) return 'renewal';
  if(t.includes('cancel')) return 'cancelled';
  if(t.includes('new')) return 'new';
  if(t.includes('out for')||t.includes('dispatch')) return 'dispatched';
  if(t.includes('schedul')) return 'scheduled';
  if(t.includes('deliver')) return 'delivered';
  if(t.includes('talk')) return 'talked';
  return 'new';
}
function dayStr(ts){ if(!ts) return ''; const d=new Date(ts); if(isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
const todayStr = () => dayStr(Date.now());
function createdTs(x){ const r=(x&&x._raw)||{}; return r.created_at||r.synced_at||r.updated_at||null; }
function deliveredTs(x){ const r=(x&&x._raw)||{}; const log=Array.isArray(r.app_log)?r.app_log:[];
  for(let i=log.length-1;i>=0;i--) if(log[i]&&log[i].stage==='delivered'&&log[i].ts) return log[i].ts;
  return r.updated_at||null; }
function fmtDateTime(iso){ if(!iso) return '—'; const d=new Date(iso); if(isNaN(d)) return String(iso);
  return d.toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:true}); }
function KV({ label, value, full }){ return (
  <div className="kv" style={full?{gridColumn:'1 / -1'}:null}>
    <div className="kv-label">{label}</div><div className="kv-val">{value}</div>
  </div>); }

/* ═══════════════════════════════════════════════ PROCESS & SLA (all stores)
   Do SLA:
   1. RESPONSE  — order aane ke 30 min (business hours 10AM–8PM) mein
                  "Talked to Customer" pe move hona chahiye
   2. DELIVERY  — jo confirmed date+time customer ko diya, us tak
                  "Item Delivered" ho jaana chahiye (exact wall clock)
   Dashboard ke hi dash-* classes use karta hai — koi naya CSS nahi.        */

const SLA_BIZ_START = 10; // 10 AM
const SLA_BIZ_END = 20; // 8 PM
const SLA_RESPONSE_MIN = 30; // business minutes

/* 30-min SLA duration hai isliye business-hours clock pe chalta hai.
   Confirmed date+time absolute hai (customer ko wahi bola gaya) — us pe
   normal wall clock. */
function slaBizAdd(from, mins) {
  const shift = (x) => {
    const y = new Date(x);
    const h = y.getHours() + y.getMinutes() / 60;
    if (h < SLA_BIZ_START) y.setHours(SLA_BIZ_START, 0, 0, 0);
    else if (h >= SLA_BIZ_END) {
      y.setDate(y.getDate() + 1);
      y.setHours(SLA_BIZ_START, 0, 0, 0);
    }
    return y;
  };
  let d = shift(new Date(from));
  let left = mins;
  for (let g = 0; g < 400 && left > 0; g++) {
    const end = new Date(d);
    end.setHours(SLA_BIZ_END, 0, 0, 0);
    const avail = (end - d) / 60000;
    if (left <= avail) return new Date(d.getTime() + left * 60000);
    left -= avail;
    d = shift(new Date(end.getTime() + 60000));
  }
  return d;
}

/* Do timestamps ke beech kitne BUSINESS minutes lage (band ghante count nahi).
   Mgr/Del/Avg time isse nikalte hain, warna raat ke ghante jud kar store
   bekaar mein kharab dikhta hai. */
function slaBizMins(a, b) {
  if (!a || !b || b <= a) return 0;
  let total = 0;
  let cur = new Date(a);
  for (let g = 0; g < 400 && cur < b; g++) {
    const s0 = new Date(cur);
    s0.setHours(SLA_BIZ_START, 0, 0, 0);
    const e0 = new Date(cur);
    e0.setHours(SLA_BIZ_END, 0, 0, 0);
    const s = cur < s0 ? s0 : cur;
    const e = b < e0 ? b : e0;
    if (e > s) total += (e - s) / 60000;
    const nx = new Date(cur);
    nx.setDate(nx.getDate() + 1);
    nx.setHours(0, 0, 0, 0);
    cur = nx;
  }
  return total;
}

const slaLog = (x) => {
  const r = (x && x._raw) || {};
  return Array.isArray(r.app_log) ? r.app_log : [];
};

/* Current cycle = aakhri baar "New Delivery" pe wapas jaane ke baad ka hissa.
   Iske bina re-opened orders galti se "stage skipped" dikhte hain.
   "Edited" stage move nahi hai, isliye chhod dete hain. */
function slaCycle(x) {
  const mv = slaLog(x)
    .filter((e) => e && e.stage && (e.action === 'Moved to' || e.action === 'Marked as'))
    .slice()
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
  let start = 0;
  for (let i = mv.length - 1; i >= 0; i--)
    if (mv[i].stage === 'new') {
      start = i;
      break;
    }
  return mv.slice(start);
}
function slaFirst(cycle, stage) {
  for (const e of cycle) if (e.stage === stage) return new Date(e.ts);
  return null;
}
/* MBC = customer khud le jaata hai — Scheduled se seedha Delivered.
   Ispe "Out for Delivery skip hua" count nahi hona chahiye. */
function slaIsMbc(x, cycle) {
  if (String(x.person || '').trim().toUpperCase() === 'MBC') return true;
  return cycle.some((e) =>
    String((e.fields && e.fields['Delivery person']) || '').toUpperCase().includes('MBC'),
  );
}
/* Promise = confirmed_date + confirmed_time (buildPatch inhe hamesha likhta hai) */
function slaPromise(x) {
  const r = (x && x._raw) || {};
  const d = r.confirmed_date;
  if (!d || d === 'null') return null;
  let t = r.confirmed_time && r.confirmed_time !== 'null' ? String(r.confirmed_time) : '20:00:00';
  if (t.length === 5) t += ':00';
  const dt = new Date(String(d).slice(0, 10) + 'T' + t);
  return isNaN(dt) ? null : dt;
}

/* ETA = app_eta column ("YYYY-MM-DDTHH:MM" ya "YYYY-MM-DD HH:MM"),
   Out for Delivery stage pe bhara jaata hai */
function slaEta(x) {
  const r = (x && x._raw) || {};
  const v = r.app_eta;
  if (!v || v === 'null') return null;
  const dt = new Date(String(v).replace(' ', 'T'));
  return isNaN(dt) ? null : dt;
}

const slaHrs = (h) =>
  h == null ? '—' : h < 1 ? Math.round(h * 60) + 'm' : h < 48 ? Math.round(h) + 'h' : (h / 24).toFixed(1) + 'd';
const slaMins = (m) => {
  if (m == null) return '—';
  const a = Math.abs(m);
  if (a < 60) return Math.round(a) + 'm';
  if (a < 2880) return Math.round(a / 60) + 'h';
  return (a / 1440).toFixed(1) + 'd';
};

/* ── ek order ka poora SLA picture ── */
function slaAnalyze(x) {
  const cycle = slaCycle(x);
  const mbc = slaIsMbc(x, cycle);
  const now = new Date();
  const created = new Date(createdTs(x));
  const okStart = !isNaN(created);
  // saare duration business hours mein — deadline logic ke saath consistent
  const span = (a, b) => (a && b && b >= a ? slaBizMins(a, b) / 60 : null);

  const delivered = x.stage === 'delivered';
  const delAt = delivered ? new Date(deliveredTs(x)) : null;

  /* SLA 1 — Response */
  const talkedAt = slaFirst(cycle, 'talked');
  const respDeadline = okStart ? slaBizAdd(created, SLA_RESPONSE_MIN) : null;
  const respEnd = talkedAt || now;
  const respBreach = !!(respDeadline && respEnd > respDeadline);
  const respOpen = !talkedAt;
  const respLateBy = respBreach ? (respEnd - respDeadline) / 60000 : 0;

  const promise = slaPromise(x);
  const dispAt = slaFirst(cycle, 'dispatched');
  const eta = slaEta(x);

  /* SLA 2 — ETA fill: jo delivery time customer ko diya tha, us tak order
     "Out for Delivery" hokar estimated arrival bhar jani chahiye. */
  const etaApplies = !!promise;
  const etaEnd = dispAt || now;
  const etaBreach = !!(etaApplies && etaEnd > promise);
  const etaOpen = !dispAt;
  const etaLateBy = etaBreach ? (etaEnd - promise) / 60000 : 0;

  /* SLA 3 — Delivery: jo estimated arrival bhara, us tak delivery ho jani chahiye */
  const delDeadline = eta;
  const delEnd = delAt || now;
  const delBreach = !!(delDeadline && delEnd > delDeadline);
  const delLateBy = delBreach ? (delEnd - delDeadline) / 60000 : 0;

  /* stage skip */
  const need = ['talked', 'scheduled', 'dispatched'];
  const missing = delivered ? need.filter((s) => !slaFirst(cycle, s)) : [];

  /* Manager response — entry aane se agli stage (Talked to Customer) tak.
     Jo order abhi Talked pe pahuncha hi nahi, uska respHrs null (average
     mein count nahi hoga — wo Response Breach column mein pakda jaata hai). */
  const respHrs = okStart && talkedAt ? span(created, talkedAt) : null;

  /* Delivery person ka hissa — Out for Delivery se Delivered tak */
  let delHrs = null;
  if (delAt && !isNaN(delAt) && dispAt) delHrs = span(dispAt, delAt);

  const graded = (respDeadline ? 1 : 0) + (etaApplies ? 1 : 0) + (delDeadline ? 1 : 0);
  const breaches = (respBreach ? 1 : 0) + (etaBreach ? 1 : 0) + (delBreach ? 1 : 0);

  return {
    x,
    branch: x.branch,
    delivered,
    mbc,
    respBreach,
    respOpen,
    respLateBy,
    respDeadline,
    talkedAt,
    promise,
    eta,
    dispAt,
    etaApplies,
    etaBreach,
    etaOpen,
    etaLateBy,
    delDeadline,
    delBreach,
    delLateBy,
    delAt,
    skipped: delivered && missing.length > 0,
    missing,
    graded,
    breaches,
    /* abhi action chahiye: pending order jiski koi bhi SLA nikal chuki hai */
    overdue: !delivered && ((respOpen && respBreach) || (etaOpen && etaBreach) || delBreach),
    totalHrs: okStart && delAt && !isNaN(delAt) ? span(created, delAt) : null,
    openHrs: okStart && !delivered ? span(created, now) : null,
    respHrs,
    delHrs,
  };
}

/* Heading ke saath ⓘ — hover (mobile pe tap) karne se definition ka chhota box.
   position:fixed use karte hain kyunki dash-block mein overflow:hidden hai —
   warna kam rows hone pe tooltip cut ho jaata. */
function SlaTh({ label, info, w, colSpan, rowSpan, center, group, div }) {
  const [pos, setPos] = useState(null);
  const ref = React.useRef(null);
  /* nowrap hata dete hain taaki lambi heading 2 line mein aa jaye aur
     table horizontally scroll na karni pade */
  const thStyle = {
    whiteSpace: 'normal',
    verticalAlign: 'bottom',
    width: w || 'auto',
    textAlign: center || group ? 'center' : 'left',
    ...(group
      ? { color: T.forestSoft, borderBottom: '1px solid ' + T.line, paddingBottom: 6 }
      : {}),
    /* group ke shuru mein vertical line — kaunsa column kis group ka hai saaf rahe */
    ...(div ? { borderLeft: '1px solid ' + T.line } : {}),
  };
  const span = { colSpan, rowSpan };
  if (!info) return <th style={thStyle} {...span}>{label}</th>;

  const show = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = 250;
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - w - 12)),
      top: r.bottom + 6,
      w,
    });
  };

  return (
    <th style={thStyle} {...span}>
      <span
        ref={ref}
        style={{ cursor: 'help' }}
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
        onClick={() => (pos ? setPos(null) : show())}
      >
        {label}{' '}
        <Info size={12} color="#B3AFA4" style={{ verticalAlign: '-1px' }} />
      </span>
      {pos && (
        <div
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            width: pos.w,
            zIndex: 90,
            background: T.forest,
            color: '#fff',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 11.5,
            fontWeight: 500,
            lineHeight: 1.55,
            letterSpacing: 0,
            textTransform: 'none',
            whiteSpace: 'normal',
            boxShadow: '0 10px 26px rgba(20,57,43,.3)',
            pointerEvents: 'none',
          }}
        >
          {info}
        </div>
      )}
    </th>
  );
}

function SlaReport({ deliveries, onOpen }) {
  const [range, setRange] = useState('today'); // today|yesterday|7d|custom
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [store, setStore] = useState('ALL');
  const [view, setView] = useState('stores'); // stores | boys
  const [sel, setSel] = useState(null); // null = drill band
  const [alertOn, setAlertOn] = useState(null);

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
    return [from, to];
  }, [range, from, to]);

  /* Closed entries (Cancelled / Duplicate / Renewal / Deleted) SLA mein nahi aati */
  const live = useMemo(
    () => deliveries.filter((d) => !isClosedStage(d.stage)),
    [deliveries],
  );

  const inRange = useMemo(() => {
    const [s, e] = bounds;
    return live.filter((d) => {
      const cd = dayStr(createdTs(d));
      if (cd < s || cd > e) return false;
      if (store !== 'ALL' && d.branch !== store) return false;
      return true;
    });
  }, [live, bounds, store]);

  /* MBC = customer khud le jaata hai — store ki SLA uspe lagti hi nahi,
     isliye poori report se bahar (Total mein bhi nahi). */
  const rows = useMemo(() => inRange.map(slaAnalyze).filter((a) => !a.mbc), [inRange]);

  /* Overdue = abhi ka metric, date range se filter nahi hota. 3 din se atka
     order "Aaj" filter mein chhup jaata to report jhooth bolti. */
  const overdueAll = useMemo(
    () =>
      live
        .filter((d) => d.stage !== 'delivered')
        .map(slaAnalyze)
        .filter((a) => a.overdue && !a.mbc && (store === 'ALL' || a.branch === store)),
    [live, store],
  );

  const pick = {
    all: () => true,
    delivered: (a) => a.delivered,
    pending: (a) => !a.delivered,
    resp: (a) => a.respBreach,
    eta: (a) => a.etaBreach,
    del: (a) => a.delBreach,
  };

  const statOf = (list, ov) => {
    const dl = list.filter((a) => a.delivered);

    const avg = (k) => {
      const v = dl.map((a) => a[k]).filter((n) => n != null);
      return v.length ? v.reduce((p, q) => p + q, 0) / v.length : null;
    };
    /* response time delivered hone ka intezaar nahi karta — pending bhi count */
    const avgAll = (k) => {
      const v = list.map((a) => a[k]).filter((n) => n != null);
      return v.length ? v.reduce((p, q) => p + q, 0) / v.length : null;
    };

    return {
      total: list.length,
      delivered: dl.length,
      pending: list.length - dl.length,
      respBreach: list.filter((a) => a.respBreach).length,
      etaBreach: list.filter((a) => a.etaBreach).length,
      delBreach: list.filter((a) => a.delBreach).length,
      /* sirf breach hue orders ka average — deadline se kitna upar nikle */
      avgRespLate: (() => {
        const v = list.filter((a) => a.respBreach).map((a) => a.respLateBy);
        return v.length ? v.reduce((p, q) => p + q, 0) / v.length : null;
      })(),
      overdue: ov.length,
      avgCycle: avg('totalHrs'),
      avgResp: avgAll('respHrs'),
      avgDel: avg('delHrs'),
    };
  };

  const overall = statOf(rows, overdueAll);

  const cards = [
    { kind: 'all', label: 'Total', n: overall.total, icon: Package, color: T.slate, soft: T.slateSoft },
    { kind: 'delivered', label: 'Delivered', n: overall.delivered, icon: CheckCircle2, color: T.green, soft: T.mint },
    { kind: 'resp', label: 'Response breach', n: overall.respBreach, icon: Clock, color: T.red, soft: T.redSoft },
    { kind: 'eta', label: 'ETA breach', n: overall.etaBreach, icon: MessageSquareWarning, color: T.red, soft: T.redSoft },
    { kind: 'del', label: 'Delivery breach', n: overall.delBreach, icon: AlertTriangle, color: T.red, soft: T.redSoft },
    { kind: 'overdue', label: 'Overdue', n: overall.overdue, icon: Bell, color: T.amber, soft: T.amberSoft },
  ];

  /* delivery boy ka naam — MBC self-pickup hai, assign na hua to "Not assigned" */
  const personOf = (a) => {
    const p = String(a.x.person || '').trim();
    if (!p || p === 'null') return 'Not assigned';
    return p;
  };

  const drill = useMemo(() => {
    if (!sel) return [];
    let list = sel.kind === 'overdue' ? overdueAll : rows;
    if (sel.store) list = list.filter((a) => a.branch === sel.store);
    if (sel.person) list = list.filter((a) => personOf(a) === sel.person);
    const fn = sel.kind === 'overdue' ? () => true : pick[sel.kind] || (() => true);
    return list
      .filter(fn)
      .sort((a, b) => (createdTs(b.x) || 0) - (createdTs(a.x) || 0));
    // eslint-disable-next-line
  }, [rows, overdueAll, sel]);

  /* Stores wahi order mein jo Dashboard mein hai — koi ranking nahi */
  const storeStats = DASH_STORES.filter((st) => store === 'ALL' || store === st)
    .map((st) => ({
      st,
      s: statOf(
        rows.filter((a) => a.branch === st),
        overdueAll.filter((a) => a.branch === st),
      ),
    }))
    .filter((r) => r.s.total > 0 || r.s.overdue > 0);

  /* delivery boy wise — person + store ke hisaab se group */
  const boyStats = useMemo(() => {
    // bina-assign wale orders kisi bande ki performance nahi hain
    const skip = (a) => personOf(a) === 'Not assigned';
    const keys = new Set();
    rows.filter((a) => !skip(a)).forEach((a) => keys.add(personOf(a) + '|' + a.branch));
    overdueAll.filter((a) => !skip(a)).forEach((a) => keys.add(personOf(a) + '|' + a.branch));
    return [...keys]
      .map((k) => {
        const [person, br] = k.split('|');
        return {
          person,
          br,
          st: br,
          s: statOf(
            rows.filter((a) => personOf(a) === person && a.branch === br),
            overdueAll.filter((a) => personOf(a) === person && a.branch === br),
          ),
        };
      })
      .filter((r) => r.s.total > 0 || r.s.overdue > 0)
      .sort((a, b) => a.person.localeCompare(b.person));
    // eslint-disable-next-line
  }, [rows, overdueAll]);

  const rangeLabel =
    range === 'today'
      ? 'Aaj'
      : range === 'yesterday'
        ? 'Kal'
        : range === '7d'
          ? 'Pichhle 7 din'
          : `${from} → ${to}`;

  /* dobara wahi click = band (dropdown jaisa) */
  const toggleSel = (next) =>
    setSel((cur) =>
      cur && cur.kind === next.kind && cur.store === next.store && cur.person === next.person
        ? null
        : next,
    );

  const cellFor = (target) => (kind, n, color, div) => (
    <td
      className={n ? 'dash-td-click' : 'dash-td-zero'}
      style={{
        textAlign: 'center',
        ...(div ? { borderLeft: '1px solid ' + T.line } : {}),
        ...(n ? { color } : {}),
      }}
      onClick={() => n && toggleSel({ kind, store: null, person: null, ...target })}
    >
      {n}
    </td>
  );

  /* Kisi number pe click → poora view badal jaata hai: sirf us subset ki list
     dikhti hai, cards aur upar wali table chhup jaati hai. Back se wapas. */
  if (sel) {
    const selLabel = cards.find((c) => c.kind === sel.kind)?.label || 'All';
    return (
      <div>
        <button className="track-back" onClick={() => setSel(null)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="dash-head">
          <div>
            <div className="dash-sub">
              {selLabel}
              {sel.store ? ` · ${branchLabel(sel.store)}` : ''}
              {sel.person ? ` · ${sel.person}` : ''} · {rangeLabel}
            </div>
            <h2 style={{ margin: '2px 0 0' }}>
              {drill.length} {drill.length === 1 ? 'entry' : 'entries'}
            </h2>
          </div>
        </div>
      <div className="dash-block">
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <SlaTh label="Invoice" />
                <SlaTh label="Customer" />
                <SlaTh label="Store" />
                <SlaTh label="Stage" />
                <SlaTh
                  label="Response"
                  info={`Entry aane se "Talked to Customer" tak kitna time laga. Lal ho to ${SLA_RESPONSE_MIN} min ki deadline paar ho gayi thi.`}
                />
                <SlaTh
                  label="Promise"
                  info="Jo date aur time customer ko diya gaya tha — Talked stage pe bhara hua confirmed slot. Is time tak ETA bhar jani chahiye."
                />
                <SlaTh
                  label="ETA"
                  info="Out for Delivery stage pe bhara hua Estimated arrival. Is time tak delivery ho jani chahiye."
                />
                <SlaTh label="Delivered" />
                <SlaTh label="Late by" info="Jo SLA breach hui hai, us deadline se kitna time nikal gaya." />
                <SlaTh label="Delivery boy" />
              </tr>
            </thead>
            <tbody>
              {drill.length === 0 ? (
                <tr>
                  <td colSpan={10} className="dash-empty">
                    Koi entry nahi
                  </td>
                </tr>
              ) : (
                drill.map((a) => {
                  const stg = stageMeta(a.x.stage);
                  return (
                    <tr key={a.x.invoice_id} className="dash-row" onClick={() => onOpen(a.x)}>
                      <td>{a.x.id}</td>
                      <td>{a.x.customer}</td>
                      <td>{branchLabel(a.branch)}</td>
                      <td>
                        <span className="dash-chip" style={{ background: stg.soft, color: stg.color }}>
                          {stg.short}
                        </span>
                      </td>
                      <td style={{ color: a.respBreach ? T.red : T.ink, fontWeight: a.respBreach ? 700 : 500 }}>
                        {a.respOpen ? 'abhi tak nahi' : slaHrs(a.respHrs)}
                      </td>
                      <td style={{ color: a.etaBreach ? T.red : T.ink, fontWeight: a.etaBreach ? 700 : 500 }}>
                        {a.promise ? fmtDateTime(a.promise.toISOString()) : '—'}
                      </td>
                      <td>
                        {a.eta ? (
                          fmtDateTime(a.eta.toISOString())
                        ) : (
                          <span style={{ color: a.etaBreach ? T.red : T.inkSoft, fontWeight: a.etaBreach ? 700 : 500 }}>
                            {a.etaBreach ? 'bhari nahi' : '—'}
                          </span>
                        )}
                      </td>
                      <td>
                        {a.delAt && !isNaN(a.delAt) ? (
                          fmtDateTime(a.delAt.toISOString())
                        ) : (
                          <span style={{ color: a.delBreach ? T.red : T.inkSoft, fontWeight: a.delBreach ? 700 : 500 }}>
                            {a.delBreach ? 'nahi hui' : '—'}
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          color: a.delBreach || a.etaBreach ? T.red : T.inkSoft,
                          fontWeight: a.delBreach || a.etaBreach ? 700 : 500,
                        }}
                      >
                        {a.delBreach
                          ? slaMins(a.delLateBy)
                          : a.etaBreach
                            ? slaMins(a.etaLateBy)
                            : '—'}
                      </td>
                      <td>{personOf(a)}</td>
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
          <div className="dash-sub">All stores · Process &amp; SLA</div>
          <h2 style={{ margin: '2px 0 0' }}>Process &amp; SLA</h2>
        </div>
        <div className="dash-filters">
          <div className="layout-toggle">
            <button
              className={view === 'stores' ? 'lt-btn active' : 'lt-btn'}
              onClick={() => {
                setView('stores');
                setSel(null);
              }}
            >
              <Building2 size={14} /> Stores
            </button>
            <button
              className={view === 'boys' ? 'lt-btn active' : 'lt-btn'}
              onClick={() => {
                setView('boys');
                setSel(null);
              }}
            >
              <User size={14} /> Delivery boys
            </button>
          </div>
          <select className="dash-inp" value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Aaj</option>
            <option value="yesterday">Kal</option>
            <option value="7d">Pichhle 7 din</option>
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
              setSel(null);
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
          const on = !!sel && sel.kind === c.kind && !sel.store && !sel.person;
          return (
            <button
              key={c.label}
              className={on ? 'dash-card on' : 'dash-card'}
              style={{
                ...(on ? { borderColor: c.color } : {}),
                ...(c.n ? {} : { cursor: 'default' }),
              }}
              onClick={() => c.n && toggleSel({ kind: c.kind, store: null, person: null })}
            >
              <div className="dash-card-ico" style={{ background: c.soft, color: c.color }}>
                <c.icon size={16} />
              </div>
              <div className="dash-card-n" style={{ color: c.n ? c.color : T.ink }}>
                {c.n}
              </div>
              <div className="dash-card-l">{c.label}</div>
            </button>
          );
        })}
      </div>

      {view === 'stores' ? (
        <div className="dash-block">
          <div className="dash-block-h">
            Store-wise · {rangeLabel}
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <SlaTh label="Store" rowSpan={2} />
                  <SlaTh label="Orders" colSpan={2} group div />
                  <SlaTh label="Response" colSpan={3} group div />
                  <SlaTh label="Delivery" colSpan={3} group div />
                  <SlaTh
                    label="Overdue"
                    rowSpan={2}
                    center
                    div
                    info={`Pending orders jinki koi bhi SLA nikal chuki hai — ${SLA_RESPONSE_MIN} min ka response, ETA fill, ya ETA tak delivery. Inpe abhi action chahiye. Ye ek hi column hai jo date filter follow nahi karta, purane atke orders bhi isme aate hain, isliye ye Total se zyada ho sakta hai.`}
                  />
                  <SlaTh label="Alert" rowSpan={2} center w={70} div />
                </tr>
                <tr>
                  <SlaTh
                    label="Total"
                    center
                    div
                    info="Is date range ke orders. MBC (customer khud le jaata hai) aur cancelled / duplicate / renewal entries isme nahi aatin — un pe store ki SLA lagti hi nahi."
                  />
                  <SlaTh label="Delivered" center />
                  <SlaTh
                    label="Avg Time"
                    center
                    div
                    info={`Entry aane se "Talked to Customer" tak ka average. Business hours (${SLA_BIZ_START}AM–${SLA_BIZ_END - 12}PM) mein gina jaata hai, band ghante count nahi hote.`}
                  />
                  <SlaTh
                    label="Breach"
                    center
                    info={`Kitne orders ${SLA_RESPONSE_MIN} min ke andar "Talked to Customer" pe move nahi hue. Ye store manager ki zimmedari hai.`}
                  />
                  <SlaTh
                    label="Avg Breach Time"
                    center
                    info={`Jo orders ${SLA_RESPONSE_MIN} min ki deadline paar kar gaye, unka average kitna upar nikle.`}
                  />
                  <SlaTh
                    label="Avg Time"
                    center
                    div
                    info="Entry aane se Item Delivered tak ka poora average. Sirf delivered orders ka."
                  />
                  <SlaTh
                    label="ETA Breach"
                    center
                    info="Jo delivery time customer ko diya tha, us tak order Out for Delivery hokar Estimated arrival bhar jani chahiye thi — nahi hui."
                  />
                  <SlaTh
                    label="Del Breach"
                    center
                    info="Jo Estimated arrival bhara tha, us tak delivery nahi hui (ya abhi tak hui hi nahi)."
                  />
                </tr>
              </thead>
              <tbody>
                {storeStats.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="dash-empty">
                      Is duration mein koi entry nahi
                    </td>
                  </tr>
                ) : (
                  storeStats.map(({ st, s }) => {
                    const cell = cellFor({ store: st, person: null });
                    return (
                      <tr key={st}>
                        <td className="dash-store">{branchLabel(st)}</td>
                        {cell('all', s.total, T.green, true)}
                        {cell('delivered', s.delivered, T.green)}
                        <td style={{ textAlign: 'center', borderLeft: '1px solid ' + T.line }}>
                          {slaHrs(s.avgResp)}
                        </td>
                        {cell('resp', s.respBreach, T.red)}
                        <td
                          style={{
                            textAlign: 'center',
                            color: s.avgRespLate == null ? '#C9C7BE' : T.red,
                          }}
                        >
                          {s.avgRespLate == null ? '—' : '+' + slaMins(s.avgRespLate)}
                        </td>
                        <td style={{ textAlign: 'center', borderLeft: '1px solid ' + T.line }}>
                          {slaHrs(s.avgCycle)}
                        </td>
                        {cell('eta', s.etaBreach, T.red)}
                        {cell('del', s.delBreach, T.red)}
                        {cell('overdue', s.overdue, T.amber, true)}
                        <td style={{ textAlign: 'center', borderLeft: '1px solid ' + T.line }}>
                          <button
                            className="mini-edit"
                            style={
                              s.overdue || s.respBreach || s.delBreach
                                ? { background: T.redSoft, borderColor: '#e9cfc4', color: T.red }
                                : {}
                            }
                            onClick={() => setAlertOn({ title: branchLabel(st), s })}
                          >
                            <Bell size={12} /> Alert
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="dash-block">
          <div className="dash-block-h">
            Delivery boy wise · {rangeLabel}
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <SlaTh
                    label="Delivery boy"
                    rowSpan={2}
                    info="Bina-assign wale orders is view mein nahi aate, isliye yahan ke totals Stores view se thode kam ho sakte hain."
                  />
                  <SlaTh label="Store" rowSpan={2} />
                  <SlaTh label="Orders" colSpan={2} group div />
                  <SlaTh label="Delivery" colSpan={3} group div />
                  <SlaTh
                    label="Overdue"
                    rowSpan={2}
                    center
                    div
                    info="Pending orders jinki koi bhi SLA nikal chuki hai. Ye column date filter follow nahi karta."
                  />
                </tr>
                <tr>
                  <SlaTh label="Total" center div />
                  <SlaTh label="Delivered" center />
                  <SlaTh
                    label="Del Time"
                    center
                    div
                    info="Out for Delivery se Delivered tak ka average — sirf delivery boy ka hissa."
                  />
                  <SlaTh
                    label="Avg Time"
                    center
                    info="Entry aane se Item Delivered tak ka poora average, jisme manager ka time bhi shaamil hai."
                  />
                  <SlaTh
                    label="Breach"
                    center
                    info="Jo Estimated arrival bhara tha, us tak delivery nahi hui (ya abhi tak hui hi nahi)."
                  />
                </tr>
              </thead>
              <tbody>
                {boyStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="dash-empty">
                      Is duration mein koi entry nahi
                    </td>
                  </tr>
                ) : (
                  boyStats.map(({ person, br, s }) => {
                    const cell = cellFor({ person, store: null });
                    return (
                      <tr key={person + br}>
                        <td className="dash-store">{person}</td>
                        <td style={{ color: T.inkSoft }}>{branchLabel(br)}</td>
                        {cell('all', s.total, T.green, true)}
                        {cell('delivered', s.delivered, T.green)}
                        <td style={{ textAlign: 'center', borderLeft: '1px solid ' + T.line }}>
                          {slaHrs(s.avgDel)}
                        </td>
                        <td style={{ textAlign: 'center' }}>{slaHrs(s.avgCycle)}</td>
                        {cell('del', s.delBreach, T.red)}
                        {cell('overdue', s.overdue, T.amber, true)}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {alertOn && <SlaAlert title={alertOn.title} s={alertOn.s} onClose={() => setAlertOn(null)} />}
    </div>
  );
}

/* ── Alert modal — abhi sirf UI, backend baad mein ── */
function SlaAlert({ title, s, onClose }) {
  const problems = [];
  if (s.overdue)
    problems.push([
      'Overdue orders',
      `${s.overdue} order ka time nikal chuka hai aur abhi tak pending hain — inpe turant action chahiye.`,
    ]);
  if (s.respBreach)
    problems.push([
      'Response late',
      `${s.respBreach} order mein ${SLA_RESPONSE_MIN} min ke andar customer se baat nahi hui` +
        (s.avgRespLate ? ` — average ${slaMins(s.avgRespLate)} deadline se upar.` : '.'),
    ]);
  if (s.etaBreach)
    problems.push([
      'ETA bhari nahi gayi',
      `${s.etaBreach} order diye hue delivery time tak Out for Delivery nahi hue — estimated arrival hi nahi bhari.`,
    ]);
  if (s.delBreach)
    problems.push(['Delivery breach', `${s.delBreach} order apni estimated arrival se late gaye.`]);

  return (
    <div className="overlay center" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft }}>Store head ko bhejne wali summary</div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} color={T.ink} />
          </button>
        </div>
        <div className="modal-body">
          <div className="kv-grid">
            <KV label="Overdue" value={s.overdue} />
            <KV label="Avg response time" value={slaHrs(s.avgResp)} />
            <KV label="Avg delivery time" value={slaHrs(s.avgCycle)} />
            <KV label="Response breach" value={s.respBreach} />
            <KV label="ETA breach" value={s.etaBreach} />
          </div>

          <div className="sec-title" style={{ margin: '4px 0 0' }}>
            Main problems
          </div>
          {problems.length === 0 ? (
            <div style={{ fontSize: 13, color: T.inkSoft }}>Koi major issue nahi mila.</div>
          ) : (
            problems.slice(0, 2).map(([t, d], i) => (
              <div key={i} className="flag-note" style={{ background: T.redSoft, color: T.red }}>
                <b>{t}</b>
                <div style={{ marginTop: 2, opacity: 0.9 }}>{d}</div>
              </div>
            ))
          )}
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" disabled>
            <Bell size={15} /> Send alert
          </button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════ DEMO DATA (preview only) ═══════════════ */
let _s = 20260731;
function rnd() {
  _s = (_s + 0x6d2b79f5) | 0;
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pk = (a) => a[Math.floor(rnd() * a.length)];

/* Business hours ke andar ka base time — preview kabhi bhi kholo, sensible rahe */
function bizBase() {
  const n = new Date();
  const h = n.getHours();
  if (h >= 11 && h < 20) return n;
  const d = new Date(n);
  if (h < 11) d.setDate(d.getDate() - 1);
  d.setHours(19, 0, 0, 0);
  return d;
}
const BASE = bizBase();
const back = (min) => new Date(BASE.getTime() - min * 60000);
const fwd = (min) => new Date(Date.now() + min * 60000);
const pad = (n) => String(n).padStart(2, '0');
const hhmmss = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const localDT = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const NAMES = ['Rajesh Kumar','Sunita Devi','Amrit Kaur','Mohd. Irfan','Pooja Sharma','Harpreet Singh',
  'Anita Gupta','Vikas Yadav','Shabana Khan','Deepak Verma','Kavita Rani','Suresh Patel','Neha Bansal',
  'Gurmeet Singh','Farhan Ali','Ritu Malhotra','Sanjay Mehra','Bhavna Joshi'];
const EQUIP = ['Oxygen Concentrator','Hospital Bed','Wheelchair','CPAP Machine','BiPAP Machine','Walker'];
const DRIVERS = { CHD:['Ghola Singh','Vikas','Niranjan'], MOH:['Ghola Singh','Sanjay'],
  NCR:['Shiva','Dinesh','Sikandar'], NOD:['Gauri','Arvind'], GGN:['Hemant','Arjun'],
  LDH:['Jagmeet','Shubham Soni'], JAL:['Karandeep','Neeraj'], JPR:['Mandeep','Brijesh'],
  LKO:['Aleem','Sharique','Junaid'], NWD:['Rahul Kumar','Uday'], JKP:['Monu','Anil'] };

let _n = 100;
const ev = (ts, stage, fields = {}) => ({
  ts: new Date(ts).toISOString(),
  stage,
  label: (STAGES[stageIndex(stage)] || {}).label || stage,
  action: 'Moved to',
  fields,
});

/* kinds: clean | respLate | etaLate | delLate | openOk | openNoEta | openNoTalk | mbc */
function mkOrder(store, kind, dayOff = 0) {
  _n++;
  const sh = dayOff * 1440;
  const created = back(300 + sh);
  const person = kind === 'mbc' ? 'MBC' : pk(DRIVERS[store] || ['Anil']);
  const equip = pk(EQUIP);
  const log = [];
  let status = 'New Delivery';
  let promise = null;
  let eta = null;

  const talk = (min) => {
    log.push(ev(back(min + sh), 'talked', {}));
    log.push(ev(back(min - 10 + sh), 'scheduled', { 'Delivery person': person, Inspected: 'Yes' }));
  };
  const dispatch = (min, etaDate) => {
    eta = etaDate;
    log.push(ev(back(min + sh), 'dispatched', { 'Estimated arrival': '—' }));
  };
  const deliver = (min) => {
    log.push(ev(back(min + sh), 'delivered', { Delivered: 'Yes' }));
    status = 'Item Delivered';
  };

  if (kind === 'openNoTalk') {
    // 5 ghante se New pe pada — response breach + overdue
  } else if (kind === 'openNoEta') {
    talk(290);
    promise = back(90 + sh); // promise nikal gaya, dispatch hua hi nahi
    status = 'Delivery Scheduled';
  } else if (kind === 'openOk') {
    talk(290);
    promise = fwd(180);
    dispatch(45, fwd(240));
    status = 'Out For Delivery';
  } else if (kind === 'respLate') {
    talk(120); // 3 ghante baad baat hui
    promise = back(60 + sh);
    dispatch(80, back(40 + sh));
    deliver(50);
  } else if (kind === 'etaLate') {
    talk(290);
    promise = back(200 + sh); // promise 200 min pehle tha
    dispatch(120, back(60 + sh)); // dispatch 120 min pehle — late
    deliver(70);
  } else if (kind === 'delLate') {
    talk(290);
    promise = back(200 + sh);
    dispatch(220, back(150 + sh)); // ETA 150 min pehle thi
    deliver(40); // deliver 40 min pehle — ETA se late
  } else if (kind === 'mbc') {
    talk(290);
    promise = back(120 + sh);
    deliver(110); // MBC: dispatch hota hi nahi
  } else {
    talk(292);
    promise = back(150 + sh);
    dispatch(200, back(120 + sh));
    deliver(140); // ETA se pehle
  }

  const inv = `${store}/07/2026/${String(_n).padStart(4, '0')}`;
  const raw = {
    invoice_id: inv,
    invoice_number: inv,
    store_code: store,
    customer_name: pk(NAMES),
    customer_phone: '+9199xxxxxxxx',
    city: branchLabel(store),
    line_items: equip,
    item_name: equip,
    status,
    total_amount: 1000 + Math.floor(rnd() * 8000),
    created_at: created.toISOString(),
    updated_at: (log.length ? new Date(log[log.length - 1].ts) : created).toISOString(),
    confirmed_date: promise ? dayStr(promise) : null,
    confirmed_time: promise ? hhmmss(promise) : null,
    app_eta: eta ? localDT(eta) : null,
    app_delivery_person: kind === 'openNoTalk' ? null : person,
    app_log: log,
  };
  return {
    invoice_id: raw.invoice_id,
    id: raw.invoice_number,
    branch: store,
    customer: raw.customer_name,
    phone: raw.customer_phone,
    area: raw.city,
    equipment: equip,
    amount: raw.total_amount,
    expected: '—',
    person: raw.app_delivery_person,
    vehicle: null,
    stage: statusToStage(status),
    rawStatus: status,
    _raw: raw,
  };
}

/* store-wise mix — jaan-boojh ke alag-alag quality */
const PLAN = {
  CHD: ['clean','clean','clean','clean','openOk','etaLate','mbc'],
  MOH: ['clean','clean','clean','openOk','mbc'],
  NCR: ['clean','clean','respLate','etaLate','delLate','openOk','openNoEta'],
  NOD: ['clean','clean','openOk','respLate'],
  GGN: ['clean','respLate','etaLate','openNoEta','openNoTalk','delLate'],
  LDH: ['clean','clean','clean','openOk'],
  JAL: ['clean','clean','openOk'],
  JPR: ['clean','etaLate','delLate','openNoEta'],
  LKO: ['respLate','respLate','etaLate','delLate','openNoEta','openNoTalk'],
  NWD: ['clean','clean','delLate','openOk','openNoEta'],
  JKP: ['respLate','etaLate','openNoTalk','openNoEta','delLate'],
};
function demoRows() {
  const out = [];
  Object.entries(PLAN).forEach(([store, kinds]) => {
    kinds.forEach((k) => out.push(mkOrder(store, k, 0)));
    if (kinds.length > 4) {
      out.push(mkOrder(store, 'clean', 1));
      out.push(mkOrder(store, 'delLate', 1));
    }
  });
  // closed entries — SLA se poori tarah bahar rehni chahiye
  ['Cancelled Invoice', 'Duplicate Invoice', 'Renewal Invoice', 'Deleted'].forEach((st) => {
    const o = mkOrder('CHD', 'clean', 0);
    o._raw.status = st;
    o.rawStatus = st;
    o.stage = statusToStage(st);
    out.push(o);
  });
  return out;
}
const DEMO_ROWS = demoRows();

/* ═══════════════════════════════ PREVIEW SHELL ══════════════════════════ */
export default function Preview() {
  return (
    <div style={{ fontFamily: FONT, background: T.beige, minHeight: '100vh' }}>
      <PreviewStyle />
      <div style={{ padding: '26px 30px 60px' }}>
        <SlaReport deliveries={DEMO_ROWS} onOpen={() => {}} />
      </div>
    </div>
  );
}

function PreviewStyle() {
  return (
    <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; }
    h2 { color:${T.ink}; font-size:25px; font-weight:800; letter-spacing:-0.5px; }
    button { font-family: inherit; color: inherit; }
    .ellip { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .dash-head { display:flex; justify-content:space-between; align-items:flex-end; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
    .dash-sub { font-size:12.5px; color:${T.inkSoft}; font-weight:600; }
    .dash-filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    .dash-inp { border:1px solid ${T.line}; border-radius:10px; padding:9px 12px; font-size:13px; font-weight:600; font-family:inherit; background:#fff; color:${T.ink}; cursor:pointer; }
    .dash-cards { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:12px; margin-bottom:20px; }
    .dash-card { text-align:left; border:1.5px solid ${T.line}; background:#fff; border-radius:14px; padding:14px; cursor:pointer; font-family:inherit; transition:transform .1s, box-shadow .12s; }
    .dash-card:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(20,57,43,.08); }
    .dash-card.on { box-shadow:0 4px 16px rgba(20,57,43,.12); }
    .dash-card-ico { width:30px; height:30px; border-radius:9px; display:flex; align-items:center; justify-content:center; margin-bottom:10px; }
    .dash-card-n { font-size:26px; font-weight:800; color:${T.ink}; line-height:1; }
    .dash-card-l { font-size:11.5px; font-weight:600; color:${T.inkSoft}; margin-top:5px; }
    .dash-block { background:#fff; border:1px solid ${T.line}; border-radius:16px; padding:6px; margin-bottom:20px; overflow:hidden; }
    .dash-block-h { font-size:13px; font-weight:800; color:${T.ink}; padding:12px 12px 10px; }
    .dash-table-wrap { overflow-x:auto; }
    .dash-table { width:100%; border-collapse:collapse; font-size:13px; }
    .dash-table th { text-align:left; font-size:11px; font-weight:700; color:${T.inkSoft}; text-transform:uppercase; letter-spacing:.3px; padding:9px 12px; border-bottom:1px solid ${T.line}; white-space:nowrap; }
    .dash-table td { padding:11px 12px; border-bottom:1px solid ${T.cream}; white-space:nowrap; color:${T.ink}; }
    .dash-store { font-weight:700; color:${T.ink}; }
    .dash-td-click { font-weight:700; color:${T.green}; cursor:pointer; }
    .dash-td-click:hover { background:${T.mint}; }
    .dash-td-zero { color:#C9C7BE; }
    .dash-row { cursor:pointer; }
    .dash-row:hover { background:${T.cream}; }
    .dash-chip { padding:3px 9px; border-radius:999px; font-size:11px; font-weight:700; display:inline-block; }
    .dash-empty { text-align:center; color:${T.inkSoft}; padding:26px !important; }
    .mini-edit { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; color:${T.green}; background:${T.mint}; border:1px solid ${T.mint}; border-radius:8px; padding:4px 9px; cursor:pointer; font-family:inherit; }
    .mini-edit:hover { filter:brightness(.97); }
    .track-back { display:inline-flex; align-items:center; gap:6px; background:#fff; border:1px solid ${T.line}; border-radius:10px; padding:9px 14px; font-size:13px; font-weight:700; font-family:inherit; color:${T.ink}; cursor:pointer; margin-bottom:14px; }
    .track-back:hover { background:${T.beige}; }
    .layout-toggle { display:inline-flex; background:#fff; border:1px solid ${T.line}; border-radius:11px; padding:3px; gap:3px; }
    .lt-btn { display:inline-flex; align-items:center; gap:6px; border:none; background:transparent; padding:8px 13px; border-radius:9px; font-size:12.5px; font-weight:700; font-family:inherit; color:${T.inkSoft}; cursor:pointer; }
    .lt-btn.active { background:${T.forest}; color:#fff; }
    .overlay { position:fixed; inset:0; background:rgba(20,40,32,.42); backdrop-filter:blur(3px); z-index:50; display:flex; }
    .overlay.center { align-items:center; justify-content:center; padding:20px; }
    .modal { width:470px; max-width:100%; max-height:90vh; overflow-y:auto; background:${T.cream}; border-radius:20px; text-align:left; }
    .modal-head { display:flex; justify-content:space-between; align-items:flex-start; padding:20px 20px 14px; border-bottom:1px solid ${T.line}; gap:10px; }
    .modal-body { padding:18px 20px; display:flex; flex-direction:column; gap:14px; }
    .modal-foot { padding:14px 20px; border-top:1px solid ${T.line}; display:flex; gap:10px; justify-content:flex-end; }
    .icon-btn { position:relative; width:38px; height:38px; border-radius:10px; border:1px solid ${T.line}; background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; }
    .stage-badge { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; padding:6px 11px; border-radius:20px; }
    .col-pip { width:8px; height:8px; border-radius:50%; flex-shrink:0; display:inline-block; }
    .kv-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; background:#fff; border:1px solid ${T.line}; border-radius:14px; padding:14px; }
    .kv-label { font-size:10px; color:${T.inkSoft}; font-weight:700; text-transform:uppercase; letter-spacing:.4px; }
    .kv-val { font-size:13px; font-weight:600; margin-top:2px; color:${T.ink}; word-break:break-word; }
    .sec-title { font-size:12.5px; font-weight:800; margin:18px 0 8px; color:${T.ink}; display:flex; align-items:center; gap:6px; }
    .flag-note { border-radius:12px; padding:11px 13px; font-size:12.5px; font-weight:600; line-height:1.5; }
    .btn-primary { background:${T.green}; color:#fff; border:none; border-radius:11px; padding:12px 18px; font-size:13.5px; font-weight:700; font-family:inherit; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px; }
    .btn-primary:disabled { opacity:.45; cursor:not-allowed; box-shadow:none; }
    .btn-ghost { background:#fff; color:${T.ink}; border:1px solid ${T.line}; border-radius:11px; padding:12px 18px; font-size:13.5px; font-weight:700; font-family:inherit; cursor:pointer; }
    @media (max-width:1100px){ .dash-cards { grid-template-columns:repeat(3,minmax(0,1fr)); } }
    @media (max-width:760px){ .dash-cards { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  `}</style>
  );
}
