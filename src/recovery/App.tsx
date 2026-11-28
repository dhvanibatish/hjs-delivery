import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Hourglass, LayoutDashboard, LogOut, RefreshCw, Search, ShieldCheck, Wallet, Wrench } from 'lucide-react';
import { getCode, rpc, setCode } from './api';
import type { Session, Settings, StuckList } from './types';
import { useToast } from './ui';
import StuckCases from './stuck/StuckCases';
import StuckDashboard from './stuck/StuckDashboard';
import Collection from './collection/Collection';

type PageId = 'stuck' | 'stuck-dash' | 'collection' | 'faulty';
const PAGES: { id: PageId; label: string; group: string; icon: typeof Wallet; soon?: boolean }[] = [
  { id: 'stuck', label: 'Stuck cases', group: 'Stuck', icon: Hourglass },
  { id: 'stuck-dash', label: 'Stuck dashboard', group: 'Stuck', icon: LayoutDashboard },
  { id: 'collection', label: 'Collection', group: 'Collection', icon: Wallet },
  { id: 'faulty', label: 'Faulty', group: 'Coming next', icon: Wrench, soon: true },
];
const pageFromHash = (): PageId => {
  const h = location.hash.replace('#', '') as PageId;
  return PAGES.some(p => p.id === h) ? h : 'stuck';
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const code = getCode();
    if (!code) { setBooting(false); return; }
    rpc<{ name: string; settings: Settings }>('rec_login', {}, code)
      .then(r => setSession({ code, name: r.name, settings: r.settings }))
      .catch(() => setCode(null))
      .finally(() => setBooting(false));
  }, []);

  if (booting) return <div className="loading">Loading…</div>;
  if (!session) return <Login onIn={setSession} />;
  return <Shell session={session} setSession={setSession} onOut={() => { setCode(null); setSession(null); }} />;
}

/* ── Login ─────────────────────────────────────────── */
function Login({ onIn }: { onIn: (s: Session) => void }) {
  const [code, setC] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) { setErr('Enter the access code.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await rpc<{ name: string; settings: Settings }>('rec_login', {}, c);
      setCode(c); onIn({ code: c, name: r.name, settings: r.settings });
    } catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="hero-glow" />
        <div className="brand" style={{ padding: 0, position: 'relative' }}>
          <div className="brand-badge"><ShieldCheck size={20} /></div>
          <div><b>Healthy Jeena Sikho</b><small>Recovery Control</small></div>
        </div>
        <h1 className="hero-h1">Every stuck case,<br />one place.</h1>
        <p className="hero-p">Track stuck Zoho Books bills — billed, unbilled and item value — plus collections, reminders, final notices and recovery, store by store.</p>
        <div className="hero-chips"><span className="hero-chip">Stuck</span><span className="hero-chip">Collection</span><span className="hero-chip">Faulty</span></div>
        <div className="hero-flow">
          {['Stuck', 'Reminder', 'Final notice'].map(s => <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span><span className="flow-dot" />{s}</span><span className="flow-pip" /></span>)}
          <span style={{ color: '#8fd19e', fontWeight: 700 }}><span className="flow-dot" style={{ background: '#3D9A42' }} />Recovered</span>
        </div>
      </div>
      <div className="login-form">
        <form className="glass-card" onSubmit={submit}>
          <h2>Admin login</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>Admins only. Enter your access code.</p>
          <label className="field"><span className="field-label">Access code</span>
            <input className="inp" type="password" inputMode="numeric" autoComplete="current-password" placeholder="••••••••" value={code} onChange={e => setC(e.target.value)} autoFocus />
          </label>
          <div className="login-err">{err}</div>
          <button className="btn primary" style={{ width: '100%' }} disabled={busy}>{busy ? 'Checking…' : <>Sign in <ArrowRight size={16} /></>}</button>
          <p className="meta" style={{ marginTop: 14 }}>Data is only served after the access code is verified.</p>
        </form>
      </div>
    </div>
  );
}

/* ── Shell ─────────────────────────────────────────── */
function Shell({ session, setSession, onOut }: { session: Session; setSession: (s: Session) => void; onOut: () => void }) {
  const toast = useToast();
  const [page, setPage] = useState<PageId>(pageFromHash);
  const [search, setSearch] = useState('');
  const [stuck, setStuck] = useState<StuckList | null>(null);
  const [stuckErr, setStuckErr] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const h = () => setPage(pageFromHash());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const go = (p: PageId) => { location.hash = p; setPage(p); };

  const loadStuck = useCallback(async () => {
    try { setStuckErr(''); setStuck(await rpc<StuckList>('rec_stuck_list')); }
    catch (e) { setStuckErr((e as Error).message); }
  }, []);
  useEffect(() => { loadStuck(); }, [loadStuck]);

  const reload = () => { loadStuck(); setReloadKey(k => k + 1); toast('Reloading data…'); };
  const setSettings = (s: Settings) => setSession({ ...session, settings: s });

  const groups = [...new Set(PAGES.map(p => p.group))];
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-badge"><ShieldCheck size={20} /></div><div><b>HJS Recovery</b><small>Control Panel</small></div></div>
        {groups.map(g => (
          <div className="nav-group" key={g}>
            <h6>{g}</h6>
            {PAGES.filter(p => p.group === g).map(p => (
              <button key={p.id} className={'nav-item' + (page === p.id ? ' active' : '')} onClick={() => go(p.id)}>
                <p.icon size={17} />{p.label}{p.soon && <span className="soon">Soon</span>}
              </button>
            ))}
          </div>
        ))}
        <div className="side-foot"><b>{session.name}</b><span className="dot" />Live · Supabase</div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span className="tb-brand">HJS Recovery</span>
          <div className="tb-search"><Search size={16} />
            <input type="search" placeholder="Search by customer, invoice, phone, item…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="tb-actions">
            <select className="page-switch" aria-label="Page" value={page} onChange={e => go(e.target.value as PageId)}>
              {PAGES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <button className="icon-btn" title="Reload data" aria-label="Reload data" onClick={reload}><RefreshCw size={17} /></button>
            <button className="icon-btn" title="Log out" aria-label="Log out" onClick={onOut}><LogOut size={17} /></button>
            <span className="avatar">{(session.name || 'A').slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        <main className="content">
          {(page === 'stuck' || page === 'stuck-dash') && !stuck && (
            stuckErr ? <div className="card empty"><AlertTriangle size={20} /><br />{stuckErr}<br /><br /><button className="btn" onClick={loadStuck}>Try again</button></div>
              : <div className="loading">Loading stuck cases…</div>
          )}
          {page === 'stuck' && stuck && <StuckCases data={stuck} settings={session.settings} setSettings={setSettings} search={search} reload={loadStuck} />}
          {page === 'stuck-dash' && stuck && <StuckDashboard data={stuck} settings={session.settings} reload={loadStuck} />}
          {page === 'collection' && <Collection key={reloadKey} search={search} />}
          {page === 'faulty' && (
            <div className="card soon-page"><div className="ic"><Wrench size={26} /></div><h2 style={{ margin: 0, color: 'var(--forest)' }}>Faulty</h2>
              <p className="muted">Coming soon — faulty items and their store-wise value will show here.</p></div>
          )}
        </main>
      </div>
    </div>
  );
}
