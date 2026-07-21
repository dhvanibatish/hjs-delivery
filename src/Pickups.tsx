// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck, Package, Phone, MapPin, User, Search, Clock, IndianRupee, LogOut,
  RefreshCw, ChevronRight, ArrowRight, ArrowLeft, Check, CheckCircle2, X,
  Camera, Upload, Trash2, History, Building2, Calendar, ClipboardCheck,
  ShieldCheck, LayoutDashboard, RotateCcw, MessageSquareWarning, Bell,
  Wind, BedDouble, Accessibility, Stethoscope, AlertTriangle, Info,
} from 'lucide-react';

/* ══════════════════════════════════════════════════════════════════════
   HJS PICKUPS — standalone app (delivery se alag file, delivery untouched)
   Same HJS Supabase project · pickup_* RPCs · dev-password gate.
   ══════════════════════════════════════════════════════════════════════ */
const PICKUP_CONFIG = {
  url: 'https://idcmfebqizovivuvsuns.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY21mZWJxaXpvdml2dXZzdW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NDgxODgsImV4cCI6MjA5OTMyNDE4OH0.miXziOcl5sEo8S6K1WsrHRhCbtEYRgnnUA4gAISUkmM',
  bucket: 'pickup-photos',
};
const HDRS = () => ({ apikey: PICKUP_CONFIG.key, Authorization: `Bearer ${PICKUP_CONFIG.key}` });

async function pkRpc(fn, body) {
  const res = await fetch(`${PICKUP_CONFIG.url}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { ...HDRS(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
const pkList = (dev) => pkRpc('pickup_list', { p_dev: dev });
const pkUpdate = (dev, invoice, patch) => pkRpc('pickup_update', { p_dev: dev, p_invoice: invoice, p_patch: patch });

async function pkUploadPhoto(invoiceNumber, kind, file) {
  const safe = String(invoiceNumber || 'inv').replace(/[^a-zA-Z0-9]+/g, '-');
  const ext = (file.name && file.name.split('.').pop()) || 'jpg';
  const path = `${safe}_${kind}_${Date.now()}.${ext}`.toLowerCase();
  const res = await fetch(`${PICKUP_CONFIG.url}/storage/v1/object/${PICKUP_CONFIG.bucket}/${path}`, {
    method: 'POST', headers: { ...HDRS(), 'Content-Type': file.type || 'image/jpeg', 'x-upsert': 'true' }, body: file,
  });
  if (!res.ok) throw new Error(`upload ${res.status} ${await res.text()}`);
  return `${PICKUP_CONFIG.url}/storage/v1/object/public/${PICKUP_CONFIG.bucket}/${path}`;
}

/* ── THEME (delivery se same) ─────────────────────────────────────────── */
const T = {
  forest: '#14392B', forestSoft: '#1E5138', green: '#2E7D32', greenBright: '#3D9A42',
  mint: '#E7F0E8', beige: '#F5F1E8', cream: '#FBF9F4', card: '#FFFFFF', ink: '#1C2620',
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
const CANCELLED_META = {
  cancelled: { id: 'cancelled', label: 'Cancelled', short: 'Cancelled', color: T.red, soft: T.redSoft },
  deleted:   { id: 'deleted',   label: 'Deleted',   short: 'Deleted',   color: T.slate, soft: T.slateSoft },
};
const stageMeta = (id) => STAGES[stageIndex(id)] || CANCELLED_META[id] || STAGES[0];
const isClosed = (id) => id === 'cancelled' || id === 'deleted';

function statusToStage(s) {
  const t = String(s || '').toLowerCase();
  if (t.includes('delet')) return 'deleted';
  if (t.includes('cancel')) return 'cancelled';
  if (t.includes('new')) return 'new';
  if (t.includes('schedul')) return 'scheduled';
  if (t.includes('out for')) return 'outfor';
  if (t.includes('contact')) return 'contacted';
  if (t.includes('picked')) return 'picked';
  return 'new';
}

const STAGE_COLS = {
  contacted: { confirmed_date: null, confirmed_time: null, stage1_remarks: null },
  scheduled: { app_pickup_person: null, app_vehicle: null, stage2_remarks: null },
  outfor:    { app_eta: null, stage3_remarks: null },
  picked:    { item_inspected: false, actual_pickup_date: null, pickup_charges_collected: null, pickup_image: null, pickup_done: false, stage4_remarks: null },
};
function clearAhead(toStage) {
  const t = stageIndex(toStage); let patch = {};
  STAGES.forEach((s, i) => { if (i > t && STAGE_COLS[s.id]) patch = { ...patch, ...STAGE_COLS[s.id] }; });
  return patch;
}

/* ── app_log timeline ─────────────────────────────────────────────────── */
function stageFields(toStage, f) {
  const rmk = f.remarks ? { Remarks: f.remarks } : {};
  if (toStage === 'contacted') return { Date: f.date || '—', Time: f.time || '—', ...rmk };
  if (toStage === 'scheduled') return { Person: f.person || '—', Vehicle: f.vehicle || '—', ...rmk };
  if (toStage === 'outfor') return { ETA: f.eta ? niceDateTime(f.eta) || f.eta : '—', ...rmk };
  if (toStage === 'picked') return { Inspected: f.inspected ? 'Yes' : 'No', Date: f.pickDate || '—', Charges: `₹${f.charges || 0}`, Done: f.done ? 'Yes' : 'No', ...rmk };
  return {};
}
function makeEvent(toStage, fields, mode) {
  return {
    ts: new Date().toISOString(), stage: toStage,
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
  const p = String(v).split(':'); if (p.length < 2) return String(v);
  let hh = +p[0]; const ap = hh >= 12 ? 'PM' : 'AM'; hh = hh % 12 || 12;
  return `${hh}:${p[1]} ${ap}`;
}
function niceDateTime(v) {
  if (!v || v === 'null') return null;
  const t = String(v).replace(' ', 'T');
  return [niceDate(t.slice(0, 10)), niceTime(t.slice(11, 16))].filter(Boolean).join(', ');
}
const todayStr = () => new Date().toISOString().slice(0, 10);

function equipIcon(items) {
  const s = String(items || '').toLowerCase();
  if (s.includes('oxygen') || s.includes('concentrator') || s.includes('cylinder') || s.includes('cpap') || s.includes('bipap')) return Wind;
  if (s.includes('bed') || s.includes('mattress')) return BedDouble;
  if (s.includes('wheel')) return Accessibility;
  if (s.includes('dvt') || s.includes('pump') || s.includes('monitor')) return Stethoscope;
  return Package;
}

function rowToPickup(r) {
  return {
    invoice_id: r.invoice_id, id: r.invoice_number || '—', store: r.store || '—',
    customer: r.customer_name || 'Unknown', phone: r.phone || '', address: r.address || '',
    manager: r.store_manager || '', salePerson: r.sale_person || '',
    items: r.line_items || '', itemCount: r.item_count || 0, mentionedDate: r.mentioned_pickup_date || '',
    stage: statusToStage(r.status), rawStatus: r.status, _raw: r,
  };
}

/* ══════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [dev, setDev] = useState(() => { try { return localStorage.getItem('hjsPickupDev') || ''; } catch (_) { return ''; } });
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
    try { setPickups(((await pkList(pw || dev)) || []).map(rowToPickup)); setAuthed(true); }
    catch (e) { setError(e.message); if (/unauthorized/i.test(e.message)) { setAuthed(false); } }
    setLoading(false);
  };
  useEffect(() => { if (authed) load(); /* eslint-disable-next-line */ }, [authed]);

  const doLogin = async (pw) => { try { localStorage.setItem('hjsPickupDev', pw); } catch (_) {} setDev(pw); await load(pw); };
  const logout = () => { try { localStorage.removeItem('hjsPickupDev'); } catch (_) {} setDev(''); setAuthed(false); setPickups([]); };

  const active = pickups.find((x) => x.invoice_id === activeId) || null;

  const buildPatch = (toStage, f, mode) => {
    const patch = {};
    if (mode === 'move') patch.status = stageToStatus(toStage);
    if (toStage === 'contacted') { patch.confirmed_date = f.date || null; patch.confirmed_time = f.time || null; patch.stage1_remarks = f.remarks || null; }
    else if (toStage === 'scheduled') { patch.app_pickup_person = f.person || null; patch.app_vehicle = f.vehicle || null; patch.stage2_remarks = f.remarks || null; }
    else if (toStage === 'outfor') { patch.app_eta = f.eta || null; patch.stage3_remarks = f.remarks || null; }
    else if (toStage === 'picked') {
      patch.item_inspected = !!f.inspected; patch.actual_pickup_date = f.pickDate || null;
      patch.pickup_charges_collected = f.charges === '' || f.charges == null ? null : Number(f.charges);
      patch.pickup_image = f.photo || null; patch.pickup_done = !!f.done; patch.stage4_remarks = f.remarks || null;
    }
    return patch;
  };

  const applyMove = async (invoiceId, toStage, fields, mode) => {
    const patch = buildPatch(toStage, fields, mode);
    const cur = pickups.find((x) => x.invoice_id === invoiceId);
    patch.app_log = [...existingLog(cur), makeEvent(toStage, fields, mode)];
    try { await pkUpdate(dev, invoiceId, patch); ping(mode === 'edit' ? 'Updated ✓' : `Saved ✓  ${stageMeta(toStage).label}`); load(); }
    catch (e) { ping('Save failed: ' + e.message); }
  };

  const setStage = async (invoiceId, toStage) => {
    const cur = pickups.find((x) => x.invoice_id === invoiceId);
    const goingBack = cur && stageIndex(toStage) < stageIndex(cur.stage || 'new');
    if (goingBack) {
      const ok = typeof window === 'undefined' ? true : window.confirm(`Entry ko "${stageMeta(toStage).label}" pe wapas le jaayein?\n\nAage ki bhari hui details (person, gaadi, charges, photo) hat jaayengi.`);
      if (!ok) return;
    }
    const patch = { status: stageToStatus(toStage), app_log: [...existingLog(cur), makeEvent(toStage, {}, 'move')] };
    if (goingBack) Object.assign(patch, clearAhead(toStage));
    try { await pkUpdate(dev, invoiceId, patch); ping(`Moved to ${stageMeta(toStage).label}`); load(); }
    catch (e) { ping('Save failed: ' + e.message); }
  };

  const closeEntry = async (invoiceId, flag, remarks) => {
    const cur = pickups.find((x) => x.invoice_id === invoiceId);
    const patch = {
      status: flag === 'deleted' ? 'Deleted' : 'Cancelled',
      app_log: [...existingLog(cur), { ts: new Date().toISOString(), stage: flag, label: CANCELLED_META[flag].label, action: 'Marked as', fields: remarks ? { Remarks: remarks } : {} }],
    };
    try { await pkUpdate(dev, invoiceId, patch); setActiveId(null); ping(flag === 'deleted' ? 'Deleted' : 'Cancelled'); load(); }
    catch (e) { ping('Save failed: ' + e.message); }
  };

  const visible = useMemo(() => {
    let list = pickups.filter((x) => x.stage !== 'deleted');
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((x) => x.customer.toLowerCase().includes(q) || String(x.id).toLowerCase().includes(q) || String(x.phone).toLowerCase().includes(q) || x.items.toLowerCase().includes(q));
    return list;
  }, [pickups, search]);

  const stats = useMemo(() => {
    const total = visible.length;
    const done = visible.filter((x) => x.stage === 'picked').length;
    const cancelled = visible.filter((x) => x.stage === 'cancelled').length;
    const pending = visible.filter((x) => !isClosed(x.stage) && x.stage !== 'picked').length;
    return { total, pending, done, cancelled };
  }, [visible]);

  if (!authed) return <Login onLogin={doLogin} error={error} />;

  return (
    <div style={{ display: 'flex', fontFamily: FONT, background: T.beige, minHeight: '100vh' }}>
      <StyleTag />
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar search={search} setSearch={setSearch} onReload={() => load()} onLogout={logout} loading={loading} />
        <main style={{ padding: '24px 30px 70px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: T.inkSoft, fontWeight: 600 }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6, margin: '4px 0 0' }}>Pending Pickups</h2>
          </div>

          <div className="stat-grid">
            <Stat ico={RotateCcw} color={T.forest} soft={T.mint} n={stats.total} label="Total Pickups" />
            <Stat ico={Package} color={T.amber} soft={T.amberSoft} n={stats.pending} label="Pending" />
            <Stat ico={CheckCircle2} color={T.green} soft={T.mint} n={stats.done} label="Picked Up" />
            <Stat ico={AlertTriangle} color={T.red} soft={T.redSoft} n={stats.cancelled} label="Cancelled" />
          </div>

          <Board items={visible} loading={loading} onOpen={(x) => setActiveId(x.invoice_id)}
            onCommit={(d, toStage, fields) => applyMove(d.invoice_id, toStage, fields, 'move')} />
        </main>
      </div>

      {active && (
        <Drawer x={active} onClose={() => setActiveId(null)}
          onSave={(toStage, fields, mode) => applyMove(active.invoice_id, toStage, fields, mode)}
          onBack={(toStage) => setStage(active.invoice_id, toStage)}
          onClosePickup={(flag, remarks) => closeEntry(active.invoice_id, flag, remarks)} />
      )}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

/* ── STAT CARD ────────────────────────────────────────────────────────── */
function Stat({ ico: Ico, color, soft, n, label }) {
  return (
    <div className="stat-card" style={{ cursor: 'default' }}>
      <div className="stat-ico" style={{ background: soft }}><Ico size={22} color={color} /></div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>{n}</div>
        <div style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 600, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

/* ── LOGIN (split-screen, delivery jaisa) ─────────────────────────────── */
function Login({ onLogin, error }) {
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => { if (!pw.trim()) return; setBusy(true); await onLogin(pw.trim()); setBusy(false); };
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
              onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
          </Field>
          {error && /unauthorized/i.test(error) && <div className="login-err">Galat password</div>}
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

/* ── SIDEBAR ──────────────────────────────────────────────────────────── */
function Sidebar() {
  const goDelivery = () => { window.location.href = window.location.origin + window.location.pathname; };
  const nav = [
    { icon: LayoutDashboard, label: 'Deliveries', onClick: goDelivery },
    { icon: RotateCcw, label: 'Pickups', active: true },
    { icon: MessageSquareWarning, label: 'Complaints', soon: true },
    { icon: ClipboardCheck, label: 'Reports', soon: true },
  ];
  return (
    <aside className="sidebar">
      <div className="brand" style={{ padding: '22px 20px 18px' }}>
        <div className="brand-badge"><RotateCcw size={20} color="#fff" /></div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15.5, color: '#fff' }}>HJS Pickups</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)' }}>Control Panel · DEV</div>
        </div>
      </div>
      <nav style={{ padding: '8px 12px', flex: 1 }}>
        {nav.map((n) => (
          <div key={n.label} className="nav-item" onClick={n.onClick}
            style={{ background: n.active ? 'rgba(255,255,255,.12)' : 'transparent', color: n.active ? '#fff' : 'rgba(255,255,255,.62)', cursor: n.soon ? 'default' : 'pointer' }}>
            <n.icon size={18} /><span style={{ flex: 1 }}>{n.label}</span>{n.soon && <span className="soon">soon</span>}
          </div>
        ))}
      </nav>
      <div className="store-tag">
        <Building2 size={15} color={T.greenBright} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>All stores</div>
          <div className="ellip" style={{ fontSize: 10.5, color: 'rgba(255,255,255,.6)' }}>Dev mode</div>
        </div>
      </div>
    </aside>
  );
}

/* ── TOPBAR ───────────────────────────────────────────────────────────── */
function Topbar({ search, setSearch, onReload, onLogout, loading }) {
  return (
    <div className="topbar">
      <div className="tb-brand"><RotateCcw size={18} color={T.forest} /><span>HJS Pickups</span></div>
      <div className="tb-search">
        <Search size={16} color={T.inkSoft} style={{ position: 'absolute', left: 14, top: 12 }} />
        <input className="topbar-search" placeholder="Search by customer, invoice, phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="tb-actions">
        <button className="icon-btn" onClick={onReload} title="Refresh"><RefreshCw size={17} className={loading ? 'spin' : ''} /></button>
        <button className="icon-btn" title="Notifications"><Bell size={17} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div className="avatar">P</div>
          <div className="tb-user-text">
            <div style={{ fontSize: 13, fontWeight: 700 }}>Dev</div>
            <div style={{ fontSize: 11, color: T.inkSoft }}>Pickups</div>
          </div>
        </div>
        <button className="icon-btn" onClick={onLogout} title="Logout"><LogOut size={17} /></button>
      </div>
    </div>
  );
}

/* ── BOARD ────────────────────────────────────────────────────────────── */
function Board({ items, loading, onOpen, onCommit }) {
  if (loading && items.length === 0) return <div className="loading">Supabase se pickups load ho rahe hain…</div>;
  return (
    <div className="board">
      {STAGES.map((stage) => {
        const cards = items.filter((x) => x.stage === stage.id);
        return (
          <section key={stage.id} className="column">
            <div className="col-head">
              <span className="col-pip" style={{ background: stage.color }} />
              <span style={{ fontWeight: 700, fontSize: 13.5 }}>{stage.label}</span>
              <span className="col-count" style={{ background: stage.soft, color: stage.color }}>{cards.length}</span>
            </div>
            <div className="col-body">
              {cards.length === 0 && <div className="empty">Koi pickup nahi</div>}
              {cards.map((x) => <Card key={x.invoice_id} d={x} stage={stage} onOpen={() => onOpen(x)} onCommit={onCommit} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Card({ d, stage, onOpen, onCommit }) {
  const Icon = equipIcon(d.items);
  const next = STAGES[stageIndex(d.stage) + 1];
  const [expand, setExpand] = useState(false);
  return (
    <div className="card" onClick={onOpen}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div className="eq-ico" style={{ background: stage.soft }}><Icon size={17} color={stage.color} /></div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="card-name">{d.customer}</div>
          <div className="ellip card-id">{d.id} · {d.store}</div>
        </div>
      </div>
      {d.items && <div className="card-equip">{d.items}</div>}
      <div className="card-meta">
        {d.itemCount > 0 && <span style={{ color: T.forest, fontWeight: 800 }}><Package size={12} /> {d.itemCount} item{d.itemCount > 1 ? 's' : ''}</span>}
        {d.mentionedDate && <span className="ellip" style={{ maxWidth: 130 }}><Calendar size={12} /> {niceDate(d.mentionedDate)}</span>}
      </div>
      {d.phone && <div className="card-meta"><span className="ellip" style={{ maxWidth: '100%' }}><Phone size={12} /> {d.phone}</span></div>}
      {d.manager && <div className="card-meta"><span className="ellip" style={{ maxWidth: '100%' }}><User size={12} /> {d.manager}</span></div>}
      {next ? (
        <>
          <button className={expand ? 'card-next is-open' : 'card-next'} onClick={(e) => { e.stopPropagation(); setExpand((v) => !v); }}>
            Move to {next.short} <ChevronRight size={14} style={{ transform: expand ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {expand && (
            <div onClick={(e) => e.stopPropagation()} className="inline-move">
              <StageForm toStage={next.id} invoiceNumber={d.id} embedded onCancel={() => setExpand(false)}
                onSave={(fields) => { setExpand(false); onCommit(d, next.id, fields); }} />
            </div>
          )}
        </>
      ) : (
        <div className="card-done"><Check size={13} /> Picked Up</div>
      )}
    </div>
  );
}

/* ── DRAWER ───────────────────────────────────────────────────────────── */
function Drawer({ x, onClose, onSave, onBack, onClosePickup }) {
  const idx = stageIndex(x.stage);
  const cancelled = x.stage === 'cancelled';
  const next = STAGES[idx + 1] || null;
  const [showForm, setShowForm] = useState(false);
  const [danger, setDanger] = useState(false);
  const log = existingLog(x);
  const r = x._raw || {};
  const meta = stageMeta(x.stage);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>{x.customer}</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 2 }}>{x.id} · {x.store}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="stage-badge" style={{ background: meta.soft, color: meta.color }}>
          <span className="col-pip" style={{ background: meta.color }} /> {meta.label}
        </div>

        <div className="kv-grid" style={{ marginTop: 14 }}>
          <KV label="Phone" value={x.phone ? <a href={`tel:${x.phone}`} style={{ color: T.blue, fontWeight: 700, textDecoration: 'none' }}>{x.phone}</a> : null} />
          <KV label="Items" value={x.items} />
          <KV label="Item count" value={x.itemCount || null} />
          <KV label="Store manager" value={x.manager} />
          <KV label="Sale person" value={x.salePerson} />
          <KV label="Customer ne kaha" value={niceDate(x.mentionedDate)} />
          <KV label="Address" value={x.address} />
          {r.confirmed_date && <KV label="Pickup date (tay)" value={`${niceDate(r.confirmed_date) || ''}${r.confirmed_time ? ', ' + niceTime(r.confirmed_time) : ''}`} />}
          {r.app_pickup_person && <KV label="Pickup person" value={r.app_pickup_person} />}
          {r.app_vehicle && <KV label="Transport" value={r.app_vehicle} />}
          {r.app_eta && <KV label="ETA" value={niceDateTime(r.app_eta)} />}
          {r.actual_pickup_date && <KV label="Actual pickup" value={niceDate(r.actual_pickup_date)} />}
          {r.pickup_charges_collected != null && <KV label="Charges collected" value={`₹${r.pickup_charges_collected}`} />}
          {r.item_inspected && <KV label="Inspected" value="Yes" />}
          {r.pickup_done && <KV label="Pickup done" value="Yes" />}
          {r.pickup_image && <a className="kv-photo" href={r.pickup_image} target="_blank" rel="noreferrer"><img src={r.pickup_image} alt="pickup" /></a>}
        </div>

        {!cancelled && next && !showForm && (
          <div className="next-hint" style={{ marginTop: 16 }}>
            <span className="col-pip" style={{ background: next.color }} />
            <span>Agla step: <b>{next.label}</b></span>
          </div>
        )}
        {!cancelled && next && !showForm && (
          <button className="btn-primary" style={{ width: '100%', marginTop: 10 }} onClick={() => setShowForm(true)}>
            Move to {next.short} <ArrowRight size={16} />
          </button>
        )}
        {!cancelled && !next && (
          <div className="next-hint done" style={{ marginTop: 16 }}><CheckCircle2 size={16} /> Pickup complete</div>
        )}
        {showForm && next && (
          <div style={{ marginTop: 14, background: '#fff', border: `1px solid ${T.line}`, borderRadius: 14, padding: 16 }}>
            <StageForm toStage={next.id} invoiceNumber={x.id} onCancel={() => setShowForm(false)}
              onSave={(fields) => { setShowForm(false); onSave(next.id, fields, 'move'); }} />
          </div>
        )}

        {!cancelled && idx > 0 && (
          <button className="edit-btn" onClick={() => onBack(STAGES[idx - 1].id)}>
            <ArrowLeft size={15} /> {STAGES[idx - 1].short} pe wapas
          </button>
        )}

        {log.length > 0 && (
          <>
            <div className="sec-title"><History size={14} /> Timeline</div>
            <div className="timeline">
              {[...log].reverse().map((ev, i, arr) => (
                <div className="tl-row" key={i}>
                  <div className="tl-marker">
                    <span className="tl-dot" style={{ background: stageMeta(ev.stage).color }} />
                    {i < arr.length - 1 && <span className="tl-line" style={{ background: T.line }} />}
                  </div>
                  <div style={{ paddingBottom: 14 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{ev.action} {ev.label}</div>
                    {ev.fields && Object.entries(ev.fields).map(([k, v]) => <div className="tl-field" key={k}><b>{k}:</b> {String(v)}</div>)}
                    <div className="tl-note">{niceDateTime(ev.ts)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!cancelled && (
          <div className="danger-zone">
            {!danger ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-danger" style={{ flex: 1 }} onClick={() => { const rr = window.prompt('Cancel karein? Reason (optional):', ''); if (rr !== null) onClosePickup('cancelled', rr); }}><X size={15} /> Cancel pickup</button>
                <button className="btn-danger" style={{ flex: 1 }} onClick={() => setDanger(true)}><Trash2 size={15} /> Delete</button>
              </div>
            ) : (
              <div className="danger-confirm">
                <span style={{ fontSize: 13, fontWeight: 700, color: T.red }}>Pakka delete?</span>
                <button className="btn-danger" onClick={() => onClosePickup('deleted', '')}>Haan, delete</button>
                <button className="btn-ghost" onClick={() => setDanger(false)}>Nahi</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
const KV = ({ label, value }) => (value === null || value === undefined || value === '') ? null : (
  <div className="kv"><div className="kv-label">{label}</div><div className="kv-val">{value}</div></div>
);

/* ── STAGE FORM (per target stage) ────────────────────────────────────── */
function StageForm({ toStage, invoiceNumber, onSave, onCancel, embedded }) {
  const [f, setF] = useState({ date: todayStr(), time: '', remarks: '', person: '', vehicle: '', eta: '', inspected: false, pickDate: todayStr(), charges: '', done: false, photo: '' });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  let canSave = true;
  if (toStage === 'contacted') canSave = !!f.date;
  if (toStage === 'scheduled') canSave = !!(f.person && f.vehicle);
  if (toStage === 'outfor') canSave = !!f.eta;
  if (toStage === 'picked') canSave = !!(f.inspected && f.done && f.photo);

  return (
    <div className="modal-body" style={{ padding: embedded ? 0 : undefined }}>
      {toStage === 'contacted' && (
        <div className="two-col">
          <Field label="Pickup date (tay)"><input className="inp" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></Field>
          <Field label="Time (optional)"><input className="inp" type="time" value={f.time} onChange={(e) => set('time', e.target.value)} /></Field>
        </div>
      )}
      {toStage === 'scheduled' && (
        <>
          <Field label="Pickup person"><input className="inp" value={f.person} onChange={(e) => set('person', e.target.value)} placeholder="Naam" /></Field>
          <Field label="Transport / vehicle"><input className="inp" value={f.vehicle} onChange={(e) => set('vehicle', e.target.value)} placeholder="Bike / Van / Auto…" /></Field>
        </>
      )}
      {toStage === 'outfor' && (
        <Field label="Estimated arrival"><input className="inp" type="datetime-local" value={f.eta} onChange={(e) => set('eta', e.target.value)} /></Field>
      )}
      {toStage === 'picked' && (
        <>
          <Check1 checked={f.inspected} onChange={(v) => set('inspected', v)} icon={ClipboardCheck} label="Item inspected" />
          <Field label="Actual pickup date"><input className="inp" type="date" value={f.pickDate} onChange={(e) => set('pickDate', e.target.value)} /></Field>
          <Field label="Pickup charges collected (₹)"><input className="inp" type="number" value={f.charges} onChange={(e) => set('charges', e.target.value)} placeholder="0" /></Field>
          <PhotoUpload label="Pickup photo (proof)" invoiceNumber={invoiceNumber} kind="picked" value={f.photo} onChange={(url) => set('photo', url)} />
          <Check1 checked={f.done} onChange={(v) => set('done', v)} icon={Check} label="Pickup done" />
        </>
      )}
      <Field label="Remarks (optional)"><textarea className="inp" rows={2} value={f.remarks} onChange={(e) => set('remarks', e.target.value)} /></Field>
      {!canSave && <div className="req-note">* Mandatory fields bharo</div>}
      <div className="modal-foot" style={{ padding: embedded ? '12px 0 2px' : undefined }}>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={!canSave} onClick={() => onSave(f)}><Check size={15} /> Save</button>
      </div>
    </div>
  );
}

/* ── small bits ───────────────────────────────────────────────────────── */
const Field = ({ label, children }) => (<div className="field"><label className="field-label">{label}</label>{children}</div>);

function Check1({ checked, onChange, icon: Ico, label }) {
  return (
    <button type="button" className="check1" onClick={() => onChange(!checked)}>
      <span className="check-box" style={{ borderColor: checked ? T.green : T.line, background: checked ? T.green : '#fff' }}>{checked && <Check size={13} color="#fff" />}</span>
      <Ico size={16} color={T.inkSoft} /><span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

function PhotoUpload({ label, invoiceNumber, kind, value, onChange }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const camRef = React.useRef(null); const fileRef = React.useRef(null);
  const handle = async (e) => {
    const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return;
    setErr(''); setBusy(true);
    try { onChange(await pkUploadPhoto(invoiceNumber, kind, file)); } catch (er) { setErr('Upload fail — dobara try karo'); }
    setBusy(false);
  };
  return (
    <div className="photo-up">
      <div className="photo-up-label">{label}</div>
      {value ? (
        <div className="photo-preview"><img src={value} alt={label} /><button className="photo-remove" onClick={() => onChange('')} type="button"><X size={13} /> Hatao</button></div>
      ) : (
        <div className="photo-btns">
          <button type="button" className="photo-btn" onClick={() => camRef.current && camRef.current.click()} disabled={busy}><Camera size={15} /> {busy ? 'Upload…' : 'Camera'}</button>
          <button type="button" className="photo-btn alt" onClick={() => fileRef.current && fileRef.current.click()} disabled={busy}><Upload size={15} /> Device se</button>
        </div>
      )}
      <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handle} />
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handle} />
      {err && <div className="req-note">{err}</div>}
    </div>
  );
}

function Toast({ msg }) { return <div className="toast"><CheckCircle2 size={17} color={T.greenBright} /> {msg}</div>; }

/* ── STYLES (delivery se copy) ────────────────────────────────────────── */
function StyleTag() {
  return (<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { color: ${T.ink}; background: ${T.beige}; }
    #root { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; text-align: left !important; }
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
    .avatar { width: 36px; height: 36px; border-radius: 50%; background: ${T.green}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
    .tb-search { position: relative; flex: 1; max-width: 420px; }
    .tb-brand { display: none; align-items: center; gap: 9px; }
    .tb-brand span { font-weight: 800; font-size: 15px; letter-spacing: -0.3px; color: ${T.forest}; }
    .tb-actions { display: flex; align-items: center; gap: 12px; }
    .login-err { background: ${T.redSoft}; border: 1px solid #e9cfc4; color: ${T.red}; padding: 10px 13px; border-radius: 11px; font-size: 12.5px; font-weight: 600; text-align: center; }
    .loading { text-align: center; color: ${T.inkSoft}; padding: 50px; font-size: 14px; }

    .stat-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; margin-bottom: 26px; }
    .stat-card { background: #fff; border: 1px solid ${T.line}; border-radius: 18px; padding: 18px 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 1px 2px rgba(20,57,43,.04); text-align: left; }
    .stat-ico { width: 46px; height: 46px; border-radius: 13px; display: flex; align-items: center; justify-content: center; }

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
    .card-next.is-open { background: ${T.mint}; border-style: solid; border-color: ${T.green}; }
    .card-next:hover { background: ${T.mint}; border-color: ${T.green}; }
    .inline-move { margin-top: 10px; border-top: 1px solid ${T.line}; padding-top: 12px; }
    .inline-move .modal-body { display: flex; flex-direction: column; gap: 13px; max-height: none; overflow: visible; padding: 0; }
    .card-done { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; font-size: 12.5px; font-weight: 700; color: ${T.green}; background: ${T.mint}; border-radius: 10px; padding: 8px; }

    .overlay { position: fixed; inset: 0; background: rgba(20,40,32,.42); backdrop-filter: blur(3px); z-index: 50; display: flex; animation: fade .18s ease; }
    @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
    .drawer { margin-left: auto; width: 470px; max-width: 94vw; height: 100%; background: ${T.cream}; overflow-y: auto; padding: 22px; animation: slidein .24s cubic-bezier(.2,.8,.2,1); text-align: left; }
    @keyframes slidein { from { transform: translateX(30px); opacity: .6 } to { transform: none; opacity: 1 } }
    .drawer-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; gap: 10px; }
    .stage-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 6px 11px; border-radius: 20px; }

    .kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; background: #fff; border: 1px solid ${T.line}; border-radius: 14px; padding: 14px; }
    .kv { min-width: 0; }
    .kv-label { font-size: 10px; color: ${T.inkSoft}; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }
    .kv-val { font-size: 13px; font-weight: 600; margin-top: 2px; color: ${T.ink}; word-break: break-word; }
    .kv-photo { grid-column: 1 / -1; display: block; border-radius: 10px; overflow: hidden; border: 1px solid ${T.line}; }
    .kv-photo img { width: 100%; max-height: 220px; object-fit: cover; display: block; }
    .sec-title { font-size: 12.5px; font-weight: 800; margin: 18px 0 8px; color: ${T.ink}; display: flex; align-items: center; gap: 6px; }
    .edit-btn { width: 100%; margin-top: 14px; border: 1px solid ${T.green}; background: ${T.mint}; color: ${T.green}; border-radius: 11px; padding: 11px; font-weight: 700; font-size: 13px; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .edit-btn:hover { background: #dcebdd; }

    .next-hint { display: flex; align-items: center; gap: 9px; background: ${T.cream}; border: 1px solid ${T.line}; border-radius: 12px; padding: 12px 14px; font-size: 14px; color: ${T.ink}; line-height: 1.4; }
    .next-hint b { font-weight: 800; }
    .next-hint.done { background: ${T.mint}; border-color: #cfe3d0; color: ${T.green}; font-weight: 800; }

    .danger-zone { margin-top: 24px; padding-top: 16px; border-top: 1px dashed #e9cfc4; }
    .danger-confirm { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .btn-danger { background: ${T.redSoft}; color: ${T.red}; border: 1px solid #e9cfc4; border-radius: 11px; padding: 11px 16px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
    .btn-danger:hover { background: #F2D9D0; border-color: #DFB9AC; }
    .req-note { font-size: 11.5px; font-weight: 600; color: ${T.amber}; background: ${T.amberSoft}; border-radius: 9px; padding: 7px 11px; }

    .photo-up { border: 1px dashed ${T.line}; border-radius: 12px; padding: 12px; background: ${T.cream}; }
    .photo-up-label { font-size: 12px; font-weight: 700; color: ${T.ink}; margin-bottom: 9px; }
    .photo-btns { display: flex; gap: 9px; }
    .photo-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid ${T.green}; background: ${T.green}; color: #fff; border-radius: 10px; padding: 11px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; }
    .photo-btn.alt { background: #fff; color: ${T.green}; }
    .photo-btn:disabled { opacity: .6; cursor: default; }
    .photo-preview { position: relative; }
    .photo-preview img { width: 100%; max-height: 240px; object-fit: cover; border-radius: 10px; display: block; border: 1px solid ${T.line}; }
    .photo-remove { position: absolute; top: 8px; right: 8px; display: inline-flex; align-items: center; gap: 5px; background: rgba(20,32,26,.82); color: #fff; border: none; border-radius: 8px; padding: 6px 10px; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; }

    .timeline { margin-bottom: 8px; }
    .tl-row { display: flex; gap: 12px; }
    .tl-marker { display: flex; flex-direction: column; align-items: center; }
    .tl-dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 3px; box-shadow: 0 0 0 3px ${T.cream}; z-index: 1; }
    .tl-line { flex: 1; width: 2px; margin: 2px 0; min-height: 14px; }
    .tl-note { font-size: 11.5px; color: ${T.inkSoft}; margin-top: 2px; }
    .tl-field { font-size: 12px; color: ${T.inkSoft}; margin-top: 2px; font-weight: 500; line-height: 1.4; }
    .tl-field b { font-weight: 700; color: ${T.ink}; }

    .modal-body { padding: 0; display: flex; flex-direction: column; gap: 14px; }
    .modal-foot { padding: 14px 0 2px; display: flex; gap: 10px; justify-content: flex-end; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 12px; font-weight: 700; color: ${T.ink}; }
    .inp { width: 100%; border: 1px solid ${T.line}; border-radius: 11px; padding: 11px 13px; font-size: 13.5px; font-family: inherit; background: #fff; outline: none; color: ${T.ink}; }
    .inp:focus { border-color: ${T.green}; box-shadow: 0 0 0 3px rgba(46,125,50,.12); }
    .inp[type="date"], .inp[type="time"], .inp[type="datetime-local"] { cursor: pointer; }
    textarea.inp { resize: vertical; }
    .check1 { display: flex; align-items: center; gap: 10px; border: 1px solid ${T.line}; background: #fff; border-radius: 11px; padding: 12px 13px; cursor: pointer; font-family: inherit; text-align: left; width: 100%; }
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

    @media (max-width: 1400px) { .board { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; } }
    @media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .board { grid-template-columns: repeat(2,minmax(0,1fr)); } }
    @media (max-width: 860px) { .login-wrap { grid-template-columns: 1fr; } .login-hero { display: none; } .sidebar { display: none; } .board { grid-template-columns: 1fr; } }
    @media (max-width: 760px) {
      .topbar { height: auto; flex-wrap: wrap; padding: 8px 14px; gap: 8px 10px; }
      .tb-brand { display: flex; flex: 1 1 auto; min-width: 0; }
      .tb-actions { flex: 0 0 auto; }
      .tb-user-text { display: none; }
      .tb-search { flex: 1 1 100%; max-width: none; }
      .icon-btn { width: 34px; height: 34px; }
      main { padding: 12px 14px 60px !important; }
      h2 { font-size: 22px !important; }
      .drawer { width: 100%; max-width: 100%; padding: 18px 16px; }
      .glass-card { padding: 24px 20px; }
    }
    @media (max-width: 460px) { .stat-grid { grid-template-columns: 1fr 1fr; gap: 12px; } .two-col { grid-template-columns: 1fr; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  `}</style>);
}

