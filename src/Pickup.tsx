// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import {
  Package, Phone, MapPin, User, Search, Truck, Camera, Upload, X, Check,
  CheckCircle2, ArrowLeft, ArrowRight, Clock, IndianRupee, LogOut, RefreshCw,
  ChevronRight, Trash2, History, Building2, Calendar, ClipboardCheck, ShieldCheck,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════
   HJS PICKUPS — standalone app (delivery se alag file, delivery untouched)
   Backend: same HJS Supabase project, pickup_* RPCs, dev-password gate.
   ══════════════════════════════════════════════════════════════════════ */
const PICKUP_CONFIG = {
  url: 'https://idcmfebqizovivuvsuns.supabase.co',                 // same project as delivery
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY21mZWJxaXpvdml2dXZzdW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NDgxODgsImV4cCI6MjA5OTMyNDE4OH0.miXziOcl5sEo8S6K1WsrHRhCbtEYRgnnUA4gAISUkmM',
  bucket: 'pickup-photos',
};
const HDRS = () => ({ apikey: PICKUP_CONFIG.key, Authorization: `Bearer ${PICKUP_CONFIG.key}` });

async function pkRpc(fn, body) {
  const res = await fetch(`${PICKUP_CONFIG.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { ...HDRS(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
// dev-locked list — galat password => RPC exception
const pkList = (dev) => pkRpc('pickup_list', { p_dev: dev });
const pkUpdate = (dev, invoice, patch) =>
  pkRpc('pickup_update', { p_dev: dev, p_invoice: invoice, p_patch: patch });

// photo → pickup-photos bucket. <invoice>_<kind>_<ts>.jpg → public URL
async function pkUploadPhoto(invoiceNumber, kind, file) {
  const safe = String(invoiceNumber || 'inv').replace(/[^a-zA-Z0-9]+/g, '-');
  const ext = (file.name && file.name.split('.').pop()) || 'jpg';
  const path = `${safe}_${kind}_${Date.now()}.${ext}`.toLowerCase();
  const res = await fetch(`${PICKUP_CONFIG.url}/storage/v1/object/${PICKUP_CONFIG.bucket}/${path}`, {
    method: 'POST',
    headers: { ...HDRS(), 'Content-Type': file.type || 'image/jpeg', 'x-upsert': 'true' },
    body: file,
  });
  if (!res.ok) throw new Error(`upload ${res.status} ${await res.text()}`);
  return `${PICKUP_CONFIG.url}/storage/v1/object/public/${PICKUP_CONFIG.bucket}/${path}`;
}

/* ── THEME (delivery se same) ─────────────────────────────────────────── */
const T = {
  forest: '#14392B', green: '#2E7D32', greenBright: '#3D9A42', mint: '#E7F0E8',
  beige: '#F5F1E8', cream: '#FBF9F4', card: '#FFFFFF', ink: '#1C2620',
  inkSoft: '#657069', line: '#E7E2D6', amber: '#C77D28', amberSoft: '#FBF0DE',
  blue: '#3E6B9E', blueSoft: '#E8EFF6', slate: '#64748B', slateSoft: '#EEF1F3',
  violet: '#6B5B9A', violetSoft: '#EEEAF7', red: '#B4472E', redSoft: '#F7E7E1',
};
const FONT = "'Plus Jakarta Sans','Inter',system-ui,-apple-system,sans-serif";

/* ── STAGES (5) ───────────────────────────────────────────────────────── */
const STAGES = [
  { id: 'new',       label: 'New Pickup',       short: 'New',       status: 'New Pickup',       color: T.slate,  soft: T.slateSoft },
  { id: 'contacted', label: 'Contacted',        short: 'Contacted', status: 'Contacted',        color: T.blue,   soft: T.blueSoft },
  { id: 'scheduled', label: 'Pickup Scheduled', short: 'Scheduled', status: 'Pickup Scheduled', color: T.amber,  soft: T.amberSoft },
  { id: 'outfor',    label: 'Out for Pickup',   short: 'Out',       status: 'Out for Pickup',   color: T.violet, soft: T.violetSoft },
  { id: 'picked',    label: 'Picked Up',        short: 'Picked Up', status: 'Picked Up',        color: T.green,  soft: T.mint },
];
const stageIndex = (id) => STAGES.findIndex((s) => s.id === id);
const stageToStatus = (id) => (STAGES.find((s) => s.id === id) || {}).status || 'New Pickup';
const stageMeta = (id) => STAGES[stageIndex(id)] || CANCELLED_META[id] || STAGES[0];

function statusToStage(s) {
  const t = String(s || '').toLowerCase();
  if (t.includes('delet')) return 'deleted';
  if (t.includes('cancel')) return 'cancelled';
  if (t.includes('new')) return 'new';           // "New Pickup"
  if (t.includes('schedul')) return 'scheduled'; // "Pickup Scheduled"
  if (t.includes('out for')) return 'outfor';    // "Out for Pickup"
  if (t.includes('contact')) return 'contacted';
  if (t.includes('picked')) return 'picked';     // "Picked Up" (note: 'picked' not 'pickup')
  return 'new';
}

const CANCELLED_META = {
  cancelled: { id: 'cancelled', label: 'Cancelled', short: 'Cancelled', color: T.red, soft: T.redSoft },
  deleted:   { id: 'deleted',   label: 'Deleted',   short: 'Deleted',   color: T.slate, soft: T.slateSoft },
};

// move-back: target ke AAGE ke stages ke fields null
const STAGE_COLS = {
  contacted: { confirmed_date: null, confirmed_time: null, stage1_remarks: null },
  scheduled: { app_pickup_person: null, app_vehicle: null, stage2_remarks: null },
  outfor:    { app_eta: null, stage3_remarks: null },
  picked:    {
    item_inspected: false, actual_pickup_date: null, pickup_charges_collected: null,
    pickup_image: null, pickup_done: false, stage4_remarks: null,
  },
};
function clearAhead(toStage) {
  const t = stageIndex(toStage);
  let patch = {};
  STAGES.forEach((s, i) => { if (i > t && STAGE_COLS[s.id]) patch = { ...patch, ...STAGE_COLS[s.id] }; });
  return patch;
}

/* ── app_log timeline (delivery jaisa) ────────────────────────────────── */
function stageFields(toStage, f) {
  const rmk = f.remarks ? { Remarks: f.remarks } : {};
  if (toStage === 'contacted') return { Date: f.date || '—', Time: f.time || '—', ...rmk };
  if (toStage === 'scheduled') return { Person: f.person || '—', Vehicle: f.vehicle || '—', ...rmk };
  if (toStage === 'outfor') return { ETA: f.eta ? niceDateTime(f.eta) || f.eta : '—', ...rmk };
  if (toStage === 'picked')
    return {
      Inspected: f.inspected ? 'Yes' : 'No',
      Date: f.pickDate || '—',
      Charges: `₹${f.charges || 0}`,
      Done: f.done ? 'Yes' : 'No',
      ...rmk,
    };
  return {};
}
function makeEvent(toStage, fields, mode) {
  return {
    ts: new Date().toISOString(),
    stage: toStage,
    label: (STAGES[stageIndex(toStage)] || CANCELLED_META[toStage] || {}).label || toStage,
    action: mode === 'edit' ? 'Edited' : 'Moved to',
    fields: stageFields(toStage, fields || {}),
  };
}
const existingLog = (d) => (d && d._raw && Array.isArray(d._raw.app_log) ? d._raw.app_log : []);

/* ── date helpers ─────────────────────────────────────────────────────── */
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function niceDate(v) {
  if (!v || v === 'null') return null;
  const p = String(v).slice(0, 10).split('-');
  if (p.length !== 3) return String(v);
  return `${+p[2]} ${MON[+p[1] - 1] || ''} ${p[0]}`;
}
function niceTime(v) {
  if (!v) return null;
  const p = String(v).split(':');
  if (p.length < 2) return String(v);
  let hh = +p[0]; const ap = hh >= 12 ? 'PM' : 'AM'; hh = hh % 12 || 12;
  return `${hh}:${p[1]} ${ap}`;
}
function niceDateTime(v) {
  if (!v || v === 'null') return null;
  const t = String(v).replace(' ', 'T');
  return [niceDate(t.slice(0, 10)), niceTime(t.slice(11, 16))].filter(Boolean).join(', ');
}
const todayStr = () => new Date().toISOString().slice(0, 10);

/* ── row → pickup object ──────────────────────────────────────────────── */
function rowToPickup(r) {
  const stage = statusToStage(r.status);
  return {
    invoice_id: r.invoice_id,
    invoice_number: r.invoice_number || '—',
    store: r.store || '—',
    customer: r.customer_name || 'Unknown',
    phone: r.phone || '',
    address: r.address || '',
    manager: r.store_manager || '',
    salePerson: r.sale_person || '',
    items: r.line_items || '',
    itemCount: r.item_count || 0,
    mentionedDate: r.mentioned_pickup_date || '',
    stage,
    rawStatus: r.status,
    _raw: r,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   APP
   ══════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [dev, setDev] = useState(() => {
    try { return localStorage.getItem('hjsPickupDev') || ''; } catch (_) { return ''; }
  });
  const [authed, setAuthed] = useState(false);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const ping = (m) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const load = async (pw) => {
    setLoading(true); setError(null);
    try {
      const rows = await pkList(pw || dev);
      setPickups((rows || []).map(rowToPickup));
      setAuthed(true);
    } catch (e) {
      setError(e.message);
      if (/unauthorized/i.test(e.message)) { setAuthed(false); ping('Galat dev password'); }
    }
    setLoading(false);
  };
  useEffect(() => { if (authed) load(); /* eslint-disable-next-line */ }, [authed]);

  const doLogin = async (pw) => {
    try { localStorage.setItem('hjsPickupDev', pw); } catch (_) {}
    setDev(pw);
    await load(pw);
  };
  const logout = () => {
    try { localStorage.removeItem('hjsPickupDev'); } catch (_) {}
    setDev(''); setAuthed(false); setPickups([]);
  };

  const active = pickups.find((x) => x.invoice_id === activeId) || null;

  /* ── build patch per target stage ── */
  const buildPatch = (toStage, f, mode) => {
    const patch = {};
    if (mode === 'move') patch.status = stageToStatus(toStage);
    if (toStage === 'contacted') {
      patch.confirmed_date = f.date || null;
      patch.confirmed_time = f.time || null;
      patch.stage1_remarks = f.remarks || null;
    } else if (toStage === 'scheduled') {
      patch.app_pickup_person = f.person || null;
      patch.app_vehicle = f.vehicle || null;
      patch.stage2_remarks = f.remarks || null;
    } else if (toStage === 'outfor') {
      patch.app_eta = f.eta || null;
      patch.stage3_remarks = f.remarks || null;
    } else if (toStage === 'picked') {
      patch.item_inspected = !!f.inspected;
      patch.actual_pickup_date = f.pickDate || null;
      patch.pickup_charges_collected = f.charges === '' || f.charges == null ? null : Number(f.charges);
      patch.pickup_image = f.photo || null;
      patch.pickup_done = !!f.done;
      patch.stage4_remarks = f.remarks || null;
    }
    return patch;
  };

  const applyMove = async (invoiceId, toStage, fields, mode) => {
    const patch = buildPatch(toStage, fields, mode);
    const cur = pickups.find((x) => x.invoice_id === invoiceId);
    patch.app_log = [...existingLog(cur), makeEvent(toStage, fields, mode)];
    try {
      await pkUpdate(dev, invoiceId, patch);
      ping(mode === 'edit' ? 'Updated ✓' : `Saved ✓  ${stageMeta(toStage).label}`);
      load();
    } catch (e) { ping('Save failed: ' + e.message); }
  };

  // backward move (no form) — confirm + clearAhead
  const setStage = async (invoiceId, toStage) => {
    const cur = pickups.find((x) => x.invoice_id === invoiceId);
    const goingBack = cur && stageIndex(toStage) < stageIndex(cur.stage || 'new');
    if (goingBack) {
      const ok = typeof window === 'undefined' ? true : window.confirm(
        `Entry ko "${stageMeta(toStage).label}" pe wapas le jaayein?\n\nAage ki bhari hui details (person, gaadi, charges, photo) hat jaayengi — dobara bharni hongi.`,
      );
      if (!ok) return;
    }
    const patch = {
      status: stageToStatus(toStage),
      app_log: [...existingLog(cur), makeEvent(toStage, {}, 'move')],
    };
    if (goingBack) Object.assign(patch, clearAhead(toStage));
    try {
      await pkUpdate(dev, invoiceId, patch);
      ping(`Moved to ${stageMeta(toStage).label}`);
      load();
    } catch (e) { ping('Save failed: ' + e.message); }
  };

  const closeEntry = async (invoiceId, flag, remarks) => {
    const cur = pickups.find((x) => x.invoice_id === invoiceId);
    const patch = {
      status: flag === 'deleted' ? 'Deleted' : 'Cancelled',
      app_log: [...existingLog(cur), {
        ts: new Date().toISOString(), stage: flag,
        label: CANCELLED_META[flag].label, action: 'Marked as',
        fields: remarks ? { Remarks: remarks } : {},
      }],
    };
    try {
      await pkUpdate(dev, invoiceId, patch);
      setActiveId(null);
      ping(flag === 'deleted' ? 'Deleted' : 'Cancelled');
      load();
    } catch (e) { ping('Save failed: ' + e.message); }
  };

  /* ── filtering ── */
  const visible = useMemo(() => {
    let list = pickups.filter((x) => x.stage !== 'deleted');
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((x) =>
      x.customer.toLowerCase().includes(q) ||
      String(x.invoice_number).toLowerCase().includes(q) ||
      String(x.phone).toLowerCase().includes(q) ||
      x.items.toLowerCase().includes(q));
    return list;
  }, [pickups, search]);

  const counts = useMemo(() => {
    const c = {};
    STAGES.forEach((s) => { c[s.id] = 0; });
    c.cancelled = 0;
    visible.forEach((x) => { c[x.stage] = (c[x.stage] || 0) + 1; });
    return c;
  }, [visible]);

  if (!authed) return <Login onLogin={doLogin} error={error} />;

  return (
    <div className="pk-root">
      <Style />
      <header className="pk-head">
        <div className="pk-head-l">
          <div className="pk-logo"><Truck size={18} /></div>
          <div>
            <div className="pk-title">HJS Pickups <span className="pk-wip">DEV</span></div>
            <div className="pk-sub">Equipment returns · {visible.length} active</div>
          </div>
        </div>
        <div className="pk-head-r">
          <div className="pk-search">
            <Search size={15} color={T.inkSoft} />
            <input placeholder="Search naam / invoice / phone…" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="pk-icbtn" onClick={() => load()} title="Refresh"><RefreshCw size={16} /></button>
          <button className="pk-icbtn" onClick={logout} title="Logout"><LogOut size={16} /></button>
        </div>
      </header>

      {error && !/unauthorized/i.test(error) && <div className="pk-err">{error}</div>}
      {loading && <div className="pk-loading">Loading…</div>}

      <div className="pk-board">
        {STAGES.map((stage) => {
          const items = visible.filter((x) => x.stage === stage.id);
          return (
            <div className="pk-col" key={stage.id}>
              <div className="pk-col-head" style={{ borderTopColor: stage.color }}>
                <span className="pk-col-dot" style={{ background: stage.color }} />
                <span className="pk-col-name">{stage.label}</span>
                <span className="pk-col-count" style={{ background: stage.soft, color: stage.color }}>{counts[stage.id] || 0}</span>
              </div>
              <div className="pk-col-body">
                {items.length === 0 && <div className="pk-empty">—</div>}
                {items.map((x) => <Card key={x.invoice_id} x={x} onOpen={() => setActiveId(x.invoice_id)} />)}
              </div>
            </div>
          );
        })}
      </div>

      {active && (
        <Drawer
          x={active}
          onClose={() => setActiveId(null)}
          onSave={(toStage, fields, mode) => applyMove(active.invoice_id, toStage, fields, mode)}
          onBack={(toStage) => setStage(active.invoice_id, toStage)}
          onClosePickup={(flag, remarks) => closeEntry(active.invoice_id, flag, remarks)}
        />
      )}

      {toast && <Toast msg={toast} />}
    </div>
  );
}

/* ── LOGIN ────────────────────────────────────────────────────────────── */
function Login({ onLogin, error }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); await onLogin(pw.trim()); setBusy(false); };
  return (
    <div className="pk-login-wrap">
      <Style />
      <div className="pk-login">
        <div className="pk-logo big"><ShieldCheck size={22} /></div>
        <div className="pk-login-title">HJS Pickups</div>
        <div className="pk-login-sub">Dev access — internal WIP</div>
        <input
          type="password" placeholder="Dev password" value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
          autoFocus
        />
        <button onClick={go} disabled={busy || !pw.trim()}>{busy ? 'Checking…' : 'Enter'}</button>
        {error && /unauthorized/i.test(error) && <div className="pk-login-err">Galat password</div>}
      </div>
    </div>
  );
}

/* ── CARD ─────────────────────────────────────────────────────────────── */
function Card({ x, onOpen }) {
  return (
    <button className="pk-card" onClick={onOpen}>
      <div className="pk-card-top">
        <span className="pk-card-name">{x.customer}</span>
        <ChevronRight size={15} color={T.inkSoft} />
      </div>
      <div className="pk-card-inv">{x.invoice_number} · <span className="pk-store">{x.store}</span></div>
      {x.items && <div className="pk-card-items"><Package size={12} /> {x.items}</div>}
      <div className="pk-card-meta">
        {x.itemCount > 0 && <span className="pk-tag">{x.itemCount} item{x.itemCount > 1 ? 's' : ''}</span>}
        {x.mentionedDate && <span className="pk-tag amber"><Calendar size={11} /> {niceDate(x.mentionedDate)}</span>}
      </div>
    </button>
  );
}

/* ── DRAWER (details + advance form + timeline) ───────────────────────── */
function Drawer({ x, onClose, onSave, onBack, onClosePickup }) {
  const idx = stageIndex(x.stage);
  const cancelled = x.stage === 'cancelled';
  const next = STAGES[idx + 1] || null;
  const [showForm, setShowForm] = useState(false);
  const log = existingLog(x);

  return (
    <div className="pk-drawer-wrap" onClick={onClose}>
      <div className="pk-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="pk-dr-head">
          <div>
            <div className="pk-dr-name">{x.customer}</div>
            <div className="pk-dr-inv">{x.invoice_number} · {x.store}</div>
          </div>
          <button className="pk-icbtn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="pk-dr-stage" style={{ background: stageMeta(x.stage).soft, color: stageMeta(x.stage).color }}>
          {stageMeta(x.stage).label}
        </div>

        <div className="pk-dr-body">
          {/* info */}
          <div className="pk-info">
            {x.phone && <a className="pk-info-row" href={`tel:${x.phone}`}><Phone size={14} /> {x.phone}</a>}
            {x.address && <div className="pk-info-row"><MapPin size={14} /> {x.address}</div>}
            {x.items && <div className="pk-info-row"><Package size={14} /> {x.items}</div>}
            {x.manager && <div className="pk-info-row"><Building2 size={14} /> {x.manager}</div>}
            {x.salePerson && <div className="pk-info-row"><User size={14} /> {x.salePerson}</div>}
            {x.mentionedDate && <div className="pk-info-row"><Calendar size={14} /> Customer ne kaha: {niceDate(x.mentionedDate)}</div>}
          </div>

          {/* advance */}
          {!cancelled && next && !showForm && (
            <button className="pk-adv" onClick={() => setShowForm(true)} style={{ background: next.color }}>
              <ArrowRight size={16} /> {next.label} pe le jaao
            </button>
          )}
          {!cancelled && !next && (
            <div className="pk-done-badge"><CheckCircle2 size={16} /> Pickup complete</div>
          )}
          {showForm && next && (
            <AdvanceForm
              toStage={next.id}
              invoiceNumber={x.invoice_number}
              onCancel={() => setShowForm(false)}
              onSave={(fields) => { setShowForm(false); onSave(next.id, fields, 'move'); }}
            />
          )}

          {/* back + close actions */}
          {!cancelled && (
            <div className="pk-actions">
              {idx > 0 && (
                <button className="pk-mini" onClick={() => onBack(STAGES[idx - 1].id)}>
                  <ArrowLeft size={13} /> {STAGES[idx - 1].short} pe wapas
                </button>
              )}
              <button className="pk-mini red" onClick={() => {
                const r = window.prompt('Cancel karein? Reason (optional):', '');
                if (r !== null) onClosePickup('cancelled', r);
              }}><X size={13} /> Cancel</button>
              <button className="pk-mini red" onClick={() => {
                if (window.confirm('Delete? App ke views se hat jaayega (soft delete).')) onClosePickup('deleted', '');
              }}><Trash2 size={13} /> Delete</button>
            </div>
          )}

          {/* timeline */}
          {log.length > 0 && (
            <div className="pk-timeline">
              <div className="pk-tl-title"><History size={14} /> Timeline</div>
              {[...log].reverse().map((ev, i) => (
                <div className="pk-tl-item" key={i}>
                  <div className="pk-tl-dot" style={{ background: stageMeta(ev.stage).color }} />
                  <div>
                    <div className="pk-tl-line">{ev.action} <b>{ev.label}</b></div>
                    {ev.fields && Object.keys(ev.fields).length > 0 && (
                      <div className="pk-tl-fields">
                        {Object.entries(ev.fields).map(([k, v]) => <span key={k}>{k}: {String(v)}</span>)}
                      </div>
                    )}
                    <div className="pk-tl-ts">{niceDateTime(ev.ts)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── ADVANCE FORM (per target stage) ──────────────────────────────────── */
function AdvanceForm({ toStage, invoiceNumber, onCancel, onSave }) {
  const [f, setF] = useState({
    date: todayStr(), time: '', remarks: '', person: '', vehicle: '',
    eta: '', inspected: false, pickDate: todayStr(), charges: '', done: false, photo: '',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  let canSave = true;
  if (toStage === 'contacted') canSave = !!f.date;
  if (toStage === 'scheduled') canSave = !!(f.person && f.vehicle);
  if (toStage === 'outfor') canSave = !!f.eta;
  if (toStage === 'picked') canSave = !!(f.inspected && f.done && f.photo);

  return (
    <div className="pk-form">
      {toStage === 'contacted' && (
        <>
          <L t="Pickup date (customer se tay)"><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></L>
          <L t="Time (optional)"><input type="time" value={f.time} onChange={(e) => set('time', e.target.value)} /></L>
        </>
      )}
      {toStage === 'scheduled' && (
        <>
          <L t="Pickup person"><input value={f.person} onChange={(e) => set('person', e.target.value)} placeholder="Naam" /></L>
          <L t="Transport / vehicle"><input value={f.vehicle} onChange={(e) => set('vehicle', e.target.value)} placeholder="Bike / Van / Auto…" /></L>
        </>
      )}
      {toStage === 'outfor' && (
        <L t="Estimated arrival"><input type="datetime-local" value={f.eta} onChange={(e) => set('eta', e.target.value)} /></L>
      )}
      {toStage === 'picked' && (
        <>
          <label className="pk-check"><input type="checkbox" checked={f.inspected} onChange={(e) => set('inspected', e.target.checked)} /> <ClipboardCheck size={14} /> Item inspected</label>
          <L t="Actual pickup date"><input type="date" value={f.pickDate} onChange={(e) => set('pickDate', e.target.value)} /></L>
          <L t="Pickup charges collected (₹)"><input type="number" value={f.charges} onChange={(e) => set('charges', e.target.value)} placeholder="0" /></L>
          <PhotoUpload label="Pickup photo (proof)" invoiceNumber={invoiceNumber} kind="picked" value={f.photo} onChange={(url) => set('photo', url)} />
          <label className="pk-check"><input type="checkbox" checked={f.done} onChange={(e) => set('done', e.target.checked)} /> <Check size={14} /> Pickup done</label>
        </>
      )}
      <L t="Remarks (optional)"><textarea value={f.remarks} onChange={(e) => set('remarks', e.target.value)} rows={2} /></L>
      {!canSave && <div className="pk-req">* Mandatory fields bharo</div>}
      <div className="pk-form-btns">
        <button className="pk-mini" onClick={onCancel}>Cancel</button>
        <button className="pk-save" disabled={!canSave} onClick={() => onSave(f)}><Check size={15} /> Save</button>
      </div>
    </div>
  );
}
const L = ({ t, children }) => (<div className="pk-l"><span>{t}</span>{children}</div>);

/* ── PHOTO UPLOAD (delivery se same) ──────────────────────────────────── */
function PhotoUpload({ label, invoiceNumber, kind, value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const camRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const handle = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setBusy(true);
    try { onChange(await pkUploadPhoto(invoiceNumber, kind, file)); }
    catch (er) { setErr('Upload fail — dobara try karo'); }
    setBusy(false);
  };
  return (
    <div className="pk-photo">
      <div className="pk-l"><span>{label}</span></div>
      {value ? (
        <div className="pk-photo-prev">
          <img src={value} alt={label} />
          <button className="pk-photo-x" onClick={() => onChange('')} type="button"><X size={13} /> Hatao</button>
        </div>
      ) : (
        <div className="pk-photo-btns">
          <button type="button" className="pk-photo-b" onClick={() => camRef.current && camRef.current.click()} disabled={busy}><Camera size={15} /> {busy ? 'Upload…' : 'Camera'}</button>
          <button type="button" className="pk-photo-b alt" onClick={() => fileRef.current && fileRef.current.click()} disabled={busy}><Upload size={15} /> Device</button>
        </div>
      )}
      <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handle} />
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handle} />
      {err && <div className="pk-req">{err}</div>}
    </div>
  );
}

function Toast({ msg }) {
  return <div className="pk-toast"><CheckCircle2 size={17} color={T.greenBright} /> {msg}</div>;
}

/* ── STYLES ───────────────────────────────────────────────────────────── */
function Style() {
  return (<style>{`
    * { box-sizing: border-box; }
    .pk-root { min-height: 100vh; background: ${T.cream}; font-family: ${FONT}; color: ${T.ink}; }
    .pk-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; background:${T.card}; border-bottom:1px solid ${T.line}; position:sticky; top:0; z-index:20; flex-wrap:wrap; }
    .pk-head-l { display:flex; align-items:center; gap:10px; }
    .pk-logo { width:34px; height:34px; border-radius:9px; background:${T.forest}; color:#fff; display:grid; place-items:center; }
    .pk-logo.big { width:48px; height:48px; border-radius:12px; margin:0 auto 4px; }
    .pk-title { font-weight:800; font-size:15px; display:flex; align-items:center; gap:6px; }
    .pk-wip { font-size:9px; font-weight:800; background:${T.amberSoft}; color:${T.amber}; padding:2px 6px; border-radius:5px; letter-spacing:.5px; }
    .pk-sub { font-size:11px; color:${T.inkSoft}; }
    .pk-head-r { display:flex; align-items:center; gap:8px; }
    .pk-search { display:flex; align-items:center; gap:6px; background:${T.beige}; border:1px solid ${T.line}; border-radius:9px; padding:7px 10px; }
    .pk-search input { border:none; background:none; outline:none; font-family:${FONT}; font-size:13px; width:180px; }
    .pk-icbtn, .pk-icbtn { border:1px solid ${T.line}; background:${T.card}; border-radius:9px; padding:8px; cursor:pointer; color:${T.inkSoft}; display:grid; place-items:center; }
    .pk-icbtn:hover, .pk-icbtn:hover { background:${T.beige}; }
    .pk-err { margin:10px 16px; padding:10px; background:${T.redSoft}; color:${T.red}; border-radius:9px; font-size:13px; }
    .pk-loading { padding:10px 16px; color:${T.inkSoft}; font-size:13px; }
    .pk-board { display:flex; gap:12px; padding:16px; overflow-x:auto; align-items:flex-start; }
    .pk-col { flex:0 0 260px; background:${T.beige}; border:1px solid ${T.line}; border-radius:12px; }
    .pk-col-head { display:flex; align-items:center; gap:7px; padding:11px 12px; border-top:3px solid; border-radius:12px 12px 0 0; background:${T.card}; }
    .pk-col-dot { width:8px; height:8px; border-radius:50%; }
    .pk-col-name { font-weight:700; font-size:13px; flex:1; }
    .pk-col-count { font-size:11px; font-weight:800; padding:2px 8px; border-radius:20px; }
    .pk-col-body { padding:10px; display:flex; flex-direction:column; gap:8px; min-height:60px; }
    .pk-empty { text-align:center; color:${T.inkSoft}; font-size:20px; opacity:.4; padding:8px; }
    .pk-card { text-align:left; background:${T.card}; border:1px solid ${T.line}; border-radius:10px; padding:11px; cursor:pointer; font-family:${FONT}; display:flex; flex-direction:column; gap:5px; }
    .pk-card:hover { border-color:${T.green}; box-shadow:0 2px 8px rgba(0,0,0,.05); }
    .pk-card-top { display:flex; align-items:center; justify-content:space-between; }
    .pk-card-name { font-weight:700; font-size:14px; }
    .pk-card-inv { font-size:11px; color:${T.inkSoft}; }
    .pk-store { font-weight:700; color:${T.forest}; }
    .pk-card-items { font-size:12px; color:${T.ink}; display:flex; align-items:center; gap:5px; }
    .pk-card-meta { display:flex; gap:6px; flex-wrap:wrap; margin-top:2px; }
    .pk-tag { font-size:10px; font-weight:700; background:${T.slateSoft}; color:${T.slate}; padding:2px 7px; border-radius:6px; display:flex; align-items:center; gap:3px; }
    .pk-tag.amber { background:${T.amberSoft}; color:${T.amber}; }
    /* drawer */
    .pk-drawer-wrap { position:fixed; inset:0; background:rgba(20,30,25,.4); z-index:40; display:flex; justify-content:flex-end; }
    .pk-drawer { width:min(440px,100%); background:${T.cream}; height:100%; overflow-y:auto; display:flex; flex-direction:column; }
    .pk-dr-head { display:flex; align-items:flex-start; justify-content:space-between; padding:16px; background:${T.card}; border-bottom:1px solid ${T.line}; position:sticky; top:0; }
    .pk-dr-name { font-weight:800; font-size:17px; }
    .pk-dr-inv { font-size:12px; color:${T.inkSoft}; margin-top:2px; }
    .pk-icbtn { border:none; }
    .pk-dr-stage { margin:14px 16px 0; padding:8px 12px; border-radius:9px; font-weight:800; font-size:13px; text-align:center; }
    .pk-dr-body { padding:16px; display:flex; flex-direction:column; gap:14px; }
    .pk-info { display:flex; flex-direction:column; gap:9px; }
    .pk-info-row { display:flex; align-items:center; gap:9px; font-size:13px; color:${T.ink}; text-decoration:none; }
    a.pk-info-row { color:${T.blue}; font-weight:600; }
    .pk-adv { border:none; color:#fff; border-radius:10px; padding:13px; font-weight:800; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; font-family:${FONT}; }
    .pk-done-badge { display:flex; align-items:center; justify-content:center; gap:8px; background:${T.mint}; color:${T.green}; padding:13px; border-radius:10px; font-weight:800; }
    .pk-actions { display:flex; gap:8px; flex-wrap:wrap; }
    .pk-mini { border:1px solid ${T.line}; background:${T.card}; border-radius:8px; padding:8px 11px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px; font-family:${FONT}; color:${T.ink}; }
    .pk-mini:hover { background:${T.beige}; }
    .pk-mini.red { color:${T.red}; border-color:${T.redSoft}; }
    /* form */
    .pk-form { background:${T.card}; border:1px solid ${T.line}; border-radius:11px; padding:14px; display:flex; flex-direction:column; gap:11px; }
    .pk-l { display:flex; flex-direction:column; gap:5px; }
    .pk-l > span { font-size:12px; font-weight:700; color:${T.inkSoft}; }
    .pk-l input, .pk-l textarea, .pk-form input, .pk-form textarea { border:1px solid ${T.line}; border-radius:8px; padding:9px 10px; font-family:${FONT}; font-size:13px; outline:none; }
    .pk-l input:focus, .pk-l textarea:focus { border-color:${T.green}; }
    .pk-check { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:600; cursor:pointer; }
    .pk-req { font-size:11px; color:${T.red}; font-weight:700; }
    .pk-form-btns { display:flex; gap:8px; justify-content:flex-end; }
    .pk-save { background:${T.green}; color:#fff; border:none; border-radius:8px; padding:9px 16px; font-weight:800; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px; font-family:${FONT}; }
    .pk-save:disabled { opacity:.45; cursor:not-allowed; }
    /* photo */
    .pk-photo-btns { display:flex; gap:8px; }
    .pk-photo-b { flex:1; border:1px solid ${T.line}; background:${T.beige}; border-radius:8px; padding:10px; font-weight:700; font-size:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; font-family:${FONT}; }
    .pk-photo-b.alt { background:${T.card}; }
    .pk-photo-prev { position:relative; }
    .pk-photo-prev img { width:100%; border-radius:8px; max-height:180px; object-fit:cover; }
    .pk-photo-x { position:absolute; top:6px; right:6px; background:rgba(0,0,0,.6); color:#fff; border:none; border-radius:6px; padding:5px 8px; font-size:11px; cursor:pointer; display:flex; align-items:center; gap:4px; }
    /* timeline */
    .pk-timeline { border-top:1px solid ${T.line}; padding-top:14px; }
    .pk-tl-title { display:flex; align-items:center; gap:6px; font-weight:800; font-size:13px; margin-bottom:10px; }
    .pk-tl-item { display:flex; gap:10px; padding-bottom:12px; }
    .pk-tl-dot { width:9px; height:9px; border-radius:50%; margin-top:4px; flex-shrink:0; }
    .pk-tl-line { font-size:13px; }
    .pk-tl-fields { display:flex; flex-wrap:wrap; gap:8px; margin-top:3px; font-size:11px; color:${T.inkSoft}; }
    .pk-tl-ts { font-size:10px; color:${T.inkSoft}; margin-top:2px; }
    /* login */
    .pk-login-wrap { min-height:100vh; display:grid; place-items:center; background:${T.forest}; font-family:${FONT}; padding:20px; }
    .pk-login { background:${T.card}; border-radius:16px; padding:30px; width:min(340px,100%); text-align:center; display:flex; flex-direction:column; gap:10px; }
    .pk-login .pk-logo { background:${T.forest}; color:#fff; }
    .pk-login-title { font-weight:800; font-size:20px; }
    .pk-login-sub { font-size:12px; color:${T.inkSoft}; margin-bottom:6px; }
    .pk-login input { border:1px solid ${T.line}; border-radius:9px; padding:12px; font-size:14px; font-family:${FONT}; outline:none; }
    .pk-login input:focus { border-color:${T.green}; }
    .pk-login button { background:${T.green}; color:#fff; border:none; border-radius:9px; padding:12px; font-weight:800; font-size:14px; cursor:pointer; font-family:${FONT}; }
    .pk-login button:disabled { opacity:.5; }
    .pk-login-err { font-size:12px; color:${T.red}; font-weight:700; }
    /* toast */
    .pk-toast { position:fixed; bottom:22px; left:50%; transform:translateX(-50%); background:${T.card}; border:1px solid ${T.line}; box-shadow:0 6px 20px rgba(0,0,0,.12); border-radius:11px; padding:11px 16px; font-size:13px; font-weight:700; display:flex; align-items:center; gap:8px; z-index:60; }
    @media (max-width:640px){ .pk-search input{ width:120px; } .pk-col{ flex-basis:230px; } }
  `}</style>);
}
