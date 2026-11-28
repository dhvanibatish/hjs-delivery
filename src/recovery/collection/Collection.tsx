import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { CollList } from '../types';
import { rpc } from '../api';
import { DAY, csvCopy, daysFromToday, fmtD, fmtDY, inr, iso, short, today0 } from '../format';
import { Bar, Select, nameOptions, persisted, sameName, useToast, SALES_TEAM, STORES } from '../ui';
import { COLORS, LIVE, STATUS_LABEL, derive, type CustStatus, type Derived } from './calc';
import CollectionDrawer from './CollectionDrawer';

type Amt = 'all' | 'lt5' | '5-10' | '10-25' | '25-50' | '50-1l' | 'gt1l' | 'custom';
type St = 'all' | CustStatus | 'week';
type Age = 'all' | '0-30' | '31-60' | '61-90' | '90+';
type Stk = 'show' | 'hide' | 'only';
type View = 'list' | 'cal' | 'sp';
type Sort = 'pending' | 'name' | 'agent' | 'promised' | 'unpromised' | 'next' | 'age';
type F = { amt: Amt; min: string; max: string; st: St; age: Age; stuck: Stk; sp: string; loc: string; view: View; sort: Sort; dir: 1 | -1 };

const AMT: [Amt, string, number, number][] = [
  ['all', 'Any amount', 0, Infinity], ['lt5', 'Under ₹5,000', 0, 5000], ['5-10', '₹5,000 – ₹10,000', 5000, 10000],
  ['10-25', '₹10,000 – ₹25,000', 10000, 25000], ['25-50', '₹25,000 – ₹50,000', 25000, 50000], ['50-1l', '₹50,000 – ₹1 lakh', 50000, 100000],
  ['gt1l', 'Over ₹1 lakh', 100000, Infinity], ['custom', 'Custom range (min – max)', 0, Infinity]];
const AGE: [Age, string, number, number][] = [['all', 'Any age', -1e9, 1e9], ['0-30', 'Up to 30 days', -1e9, 30], ['31-60', '31 – 60 days', 31, 60], ['61-90', '61 – 90 days', 61, 90], ['90+', 'Over 90 days', 91, 1e9]];
const DEF: F = { amt: 'all', min: '', max: '', st: 'all', age: 'all', stuck: 'show', sp: '', loc: '', view: 'list', sort: 'pending', dir: -1 };
const [F0, saveF] = persisted<F>('hjsRecovery.collF2', DEF);

export default function Collection({ search }: { search: string }) {
  const toast = useToast();
  const [data, setData] = useState<CollList | null>(null);
  const [err, setErr] = useState('');
  const [f, setF] = useState<F>(F0);
  const [openId, setOpenId] = useState<string | null>(null);
  const upd = (p: Partial<F>) => { const n = { ...f, ...p }; setF(n); saveF(n); };

  const load = useCallback(async () => {
    try { setErr(''); setData(await rpc<CollList>('rec_coll_list')); } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const all = useMemo(() => (data?.customers || []).map(derive), [data]);
  const L = useMemo(() => {
    const a = AMT.find(x => x[0] === f.amt)!, g = AGE.find(x => x[0] === f.age)!;
    const cust = f.amt === 'custom';
    const mn = cust && f.min !== '' ? +f.min : -Infinity, mx = cust && f.max !== '' ? +f.max : Infinity;
    const q = search.trim().toLowerCase();
    const out = all.filter(d => {
      const p = +d.c.pending;
      if (!(p >= a[2] && p < a[3] && p >= mn && p <= mx)) return false;
      if (!(d.age >= g[2] && d.age <= g[3])) return false;
      if (f.sp && !sameName(d.c.agent, f.sp)) return false;
      if (f.loc && !sameName(d.c.location, f.loc)) return false;
      if (f.stuck === 'hide' && d.c.stuck) return false;
      if (f.stuck === 'only' && !d.c.stuck) return false;
      if (f.st === 'week') { if (!(d.next && daysFromToday(d.next.due) >= 0 && daysFromToday(d.next.due) <= 7)) return false; }
      else if (f.st !== 'all' && d.status !== f.st) return false;
      if (q && ![d.c.name, d.c.phone, d.c.location, d.c.agent, ...d.c.invoices.map(i => i.no + ' ' + i.items)].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
    const key: Record<Sort, (d: Derived) => string | number> = {
      pending: d => +d.c.pending, name: d => d.c.name.toLowerCase(), agent: d => (d.c.agent || '').toLowerCase(), promised: d => d.promised,
      unpromised: d => d.unpromised, next: d => d.next ? d.next.due : '9999', age: d => d.age,
    };
    return out.sort((x, y) => { const a1 = key[f.sort](x), b1 = key[f.sort](y); return (a1 > b1 ? 1 : a1 < b1 ? -1 : 0) * f.dir; });
  }, [all, f, search]);

  if (!data) return err
    ? <div className="card empty"><AlertTriangle size={20} /><br />{err}<br /><br /><button className="btn" onClick={load}>Try again</button></div>
    : <div className="loading">Loading collection…</div>;

  const sum = (k: 'promised' | 'unpromised' | 'overdue' | 'today' | 'received' | 'up') => L.reduce((s, d) => s + d[k], 0);
  const P = L.reduce((s, d) => s + +d.c.pending, 0), C = sum('promised'), U = sum('unpromised'), B = sum('overdue'), T = sum('today'), R = sum('received'), UP = sum('up');
  let week = 0, closed = 0, kept = 0;
  L.forEach(d => d.commits.forEach(m => {
    if ((m.st === 'upcoming' || m.st === 'today') && daysFromToday(m.due) <= 7) week += m.amount - m.received;
    if (m.st === 'kept') { closed++; kept++; } else if (m.st === 'missed' || m.st === 'overdue') closed++;
  }));
  const n = (fn: (d: Derived) => boolean) => L.filter(fn).length;
  const ppl = (x: number) => `${x} customer${x === 1 ? '' : 's'}`;
  const nAct = (['amt', 'st', 'age'] as const).filter(k => f[k] !== 'all').length + (f.sp ? 1 : 0) + (f.loc ? 1 : 0) + (f.stuck !== 'show' ? 1 : 0);
  const sel = all.find(d => d.c.id === openId) || null;

  const kpi = (label: string, val: string, note: string, st: St, cls: string) => (
    <button className={`kpi ${cls}${f.st === st ? ' on' : ''}`} onClick={() => upd({ st, view: 'list' })} title="Show only these customers">
      <small>{label}</small><b>{val}</b><span>{note}</span></button>
  );
  const th = (k: Sort, label: string, right = false) => (
    <th className={'sort' + (right ? ' r' : '')} onClick={() => upd({ sort: k, dir: f.sort === k ? (f.dir === 1 ? -1 : 1) : -1 })}>{label}{f.sort === k ? (f.dir < 0 ? ' ▾' : ' ▴') : ''}</th>
  );
  const copy = () => csvCopy([
    ['Customer', 'Phone', 'Salesperson', 'Store', 'Pending', 'Promised', 'No promise', 'Date passed', 'Next amount', 'Next date', 'Status', 'Days pending', 'Stuck'],
    ...L.map(d => [d.c.name, d.c.phone, d.c.agent, d.c.location, d.c.pending, d.promised, d.unpromised, d.overdue, d.next ? d.next.amount - d.next.received : '', d.next?.due || '', STATUS_LABEL[d.status][0], d.age, d.c.stuck ? 'Yes' : '']),
  ]).then(() => toast('List copied — paste into Sheets / Excel.'), () => toast('Browser blocked copying.', true));

  return (
    <>
      <div className="page-head">
        <div><h1>Collection</h1>
          <p>How much each customer owes, and who has promised to pay when. <span className="pill">Books data: {data.as_of ? fmtDY(data.as_of) : 'not synced yet'}</span></p></div>
        <div className="row-acts" style={{ marginTop: 0 }}><button className="btn" onClick={copy}>Copy list (CSV)</button></div>
      </div>

      <div className="kpis">
        {kpi('Total pending', short(P), ppl(L.length), 'all', 'k-green')}
        {kpi('Promised', short(C), `${Math.round((C / Math.max(P, 1)) * 100)}% of pending`, 'partial', 'k-blue')}
        {kpi('No promise yet', short(U), `${ppl(n(d => d.status === 'none'))} to call`, 'none', 'k-grey')}
        {kpi('Due today', short(T), ppl(n(d => d.today > 0)), 'today', 'k-amber')}
        {kpi('Next 7 days', short(week), 'as per promises', 'week', 'k-blue')}
        {kpi('Promise broken', short(B), `${ppl(n(d => d.status === 'broken'))} to follow up`, 'broken', 'k-red')}
      </div>

      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <b style={{ color: 'var(--forest)' }}>Where the pending money stands</b>
          {closed > 0 && <span className="meta">Promises kept: <b>{Math.round((kept / closed) * 100)}%</b> · {short(R)} received</span>}
        </div>
        <Bar total={P + R} parts={[[R, COLORS.received], [UP, COLORS.promised], [T, COLORS.today], [B, COLORS.overdue]]} />
        <div className="legend">
          <span style={{ ['--c' as string]: COLORS.received }}>Paid against promises {short(R)}</span>
          <span style={{ ['--c' as string]: COLORS.promised }}>Promised, date ahead {short(UP)}</span>
          <span style={{ ['--c' as string]: COLORS.today }}>Due today {short(T)}</span>
          <span style={{ ['--c' as string]: COLORS.overdue }}>Date passed {short(B)}</span>
          <span style={{ ['--c' as string]: '#e9e3d4' }}>No promise {short(U)}</span>
        </div>
      </div>

      <div className="card filters">
        <Select label="Salesperson" value={f.sp} onChange={v => upd({ sp: v })} options={nameOptions(SALES_TEAM, all.map(d => d.c.agent), 'All salespersons', 'No salesperson')} />
        <Select label="Store" value={f.loc} onChange={v => upd({ loc: v })} options={nameOptions(STORES, all.map(d => d.c.location), 'All stores', 'No store')} />
        <Select<Amt> label="Pending amount" value={f.amt} onChange={v => upd({ amt: v, ...(v !== 'custom' ? { min: '', max: '' } : {}) })} options={AMT.map(a => [a[0], a[1]])} />
        {f.amt === 'custom' && (
          <div className="fld"><span>Range (₹)</span><div className="pair">
            <input type="number" inputMode="numeric" placeholder="Min" value={f.min} onChange={e => upd({ min: e.target.value })} />
            <input type="number" inputMode="numeric" placeholder="Max" value={f.max} onChange={e => upd({ max: e.target.value })} /></div></div>
        )}
        <Select<St> label="Promise status" value={f.st} onChange={v => upd({ st: v })} options={[
          ['all', 'All'], ['none', 'No promise yet'], ['broken', 'Promise broken (date passed)'], ['today', 'Payment due today'],
          ['week', 'Due in the next 7 days'], ['partial', 'Part of the amount promised'], ['full', 'Full amount promised']]} />
        <Select<Age> label="Pending for" value={f.age} onChange={v => upd({ age: v })} options={AGE.map(a => [a[0], a[1]])} />
        <Select<Stk> label="Stuck cases" value={f.stuck} onChange={v => upd({ stuck: v })} options={[['show', 'Include stuck'], ['hide', 'Hide stuck'], ['only', 'Only stuck']]} />
        <div className="fld"><span>&nbsp;</span><button className={'btn' + (nAct ? ' warn' : '')} disabled={!nAct} onClick={() => upd({ ...DEF, view: f.view, sort: f.sort, dir: f.dir })}>{nAct ? `Clear filters (${nAct})` : 'No filters'}</button></div>
      </div>

      <div className="bar-row">
        <div className="tabs">
          {([['list', 'Customer list'], ['cal', 'Payment calendar'], ['sp', 'By salesperson']] as [View, string][]).map(([v, l]) =>
            <button key={v} className={'tab' + (f.view === v ? ' on' : '')} onClick={() => upd({ view: v })}>{l}</button>)}
        </div>
        <span className="count"><b>{L.length}</b> customers{L.length !== all.length ? ` (of ${all.length})` : ''} · <b>{inr(P)}</b> pending</span>
      </div>

      {all.length === 0 ? (
        <div className="card empty"><b>No data yet.</b><br />Customers will show here once Zoho Books pending data is synced.</div>
      ) : f.view === 'list' ? (
        <div className="card tbl"><table className="t">
          <thead><tr>{th('name', 'Customer')}{th('agent', 'Salesperson')}{th('pending', 'Pending', true)}<th className="hm">Promise split</th>
            {th('promised', 'Promised', true)}{th('unpromised', 'No promise', true)}{th('next', 'Next payment')}<th>Status</th>{th('age', 'Pending for', true)}</tr></thead>
          <tbody>
            {L.length === 0 && <tr><td colSpan={9} className="empty">No customers match these filters.</td></tr>}
            {L.map(d => {
              const dd = d.next ? daysFromToday(d.next.due) : 0;
              return (
                <tr key={d.c.id} className="click" onClick={() => setOpenId(d.c.id)}>
                  <td><span className="cn">{d.c.name}</span>{d.c.stuck && <> <span className="tag t-forest">Stuck</span></>}<span className="sub">{d.c.location} · {d.c.invoices.length} bill{d.c.invoices.length === 1 ? '' : 's'}</span></td>
                  <td>{d.c.agent || <span className="meta">—</span>}</td>
                  <td className="r"><b>{inr(d.c.pending)}</b></td>
                  <td className="hm"><Bar mini total={+d.c.pending + d.received} parts={[[d.received, COLORS.received], [d.up, COLORS.promised], [d.today, COLORS.today], [d.overdue, COLORS.overdue]]} /></td>
                  <td className="r">{d.promised ? inr(d.promised) : '—'}</td>
                  <td className="r">{d.unpromised > 0.5 ? inr(d.unpromised) : '—'}</td>
                  <td>{d.next ? <><b>{inr(d.next.amount - d.next.received)}</b><span className="sub">{fmtD(d.next.due)} · {dd < 0 ? `${-dd} days late` : dd === 0 ? 'today' : `in ${dd} days`}</span></> : <span className="meta">—</span>}</td>
                  <td><span className={'tag ' + STATUS_LABEL[d.status][1]}>{STATUS_LABEL[d.status][0]}</span></td>
                  <td className="r">{d.c.oldest_due ? `${d.age} days` : '—'}</td>
                </tr>
              );
            })}
          </tbody></table></div>
      ) : f.view === 'cal' ? (
        <Calendar L={L} open={setOpenId} />
      ) : (
        <BySalesperson L={L} pick={sp => upd({ sp, view: 'list' })} />
      )}

      {sel && <CollectionDrawer d={sel} onClose={() => setOpenId(null)} reload={load} />}
    </>
  );
}

function Calendar({ L, open }: { L: Derived[]; open: (id: string) => void }) {
  const items = L.flatMap(d => d.commits.filter(m => LIVE.includes(m.st)).map(m => ({ d, m, rest: m.amount - m.received })));
  const t = today0();
  const cell = (title: string, list: typeof items, cls: string) => (
    <div className={'day ' + cls} key={title}>
      <h4>{title}</h4><b>{list.length ? inr(list.reduce((s, x) => s + x.rest, 0)) : '—'}</b>
      <ul>{list.map(x => <li key={x.m.id} onClick={() => open(x.d.c.id)}><span>{x.d.c.name}</span><span>{short(x.rest)}</span></li>)}</ul>
    </div>
  );
  const later = items.filter(x => daysFromToday(x.m.due) >= 13);
  return (
    <>
      <div className="cal">
        {cell('Date passed', items.filter(x => daysFromToday(x.m.due) < 0), 'past')}
        {Array.from({ length: 13 }, (_, i) => {
          const day = iso(+t + i * DAY);
          return cell((i === 0 ? 'Today · ' : '') + new Date(+t + i * DAY).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), items.filter(x => x.m.due === day), i === 0 ? 'today' : '');
        })}
      </div>
      {later.length > 0 && <p className="meta" style={{ marginTop: 8 }}>After 13 days: {later.length} promises · {inr(later.reduce((s, x) => s + x.rest, 0))}</p>}
    </>
  );
}

function BySalesperson({ L, pick }: { L: Derived[]; pick: (sp: string) => void }) {
  const m = new Map<string, { n: number; pending: number; promised: number; overdue: number; none: number; received: number; up: number; today: number; closed: number; kept: number }>();
  L.forEach(d => {
    const k = d.c.agent || '—';
    const g = m.get(k) || { n: 0, pending: 0, promised: 0, overdue: 0, none: 0, received: 0, up: 0, today: 0, closed: 0, kept: 0 };
    g.n++; g.pending += +d.c.pending; g.promised += d.promised; g.overdue += d.overdue; g.received += d.received; g.up += d.up; g.today += d.today;
    if (d.status === 'none') g.none++;
    d.commits.forEach(c => { if (c.st === 'kept') { g.closed++; g.kept++; } else if (c.st === 'missed' || c.st === 'overdue') g.closed++; });
    m.set(k, g);
  });
  const rows = [...m.entries()].sort((a, b) => b[1].pending - a[1].pending);
  return (
    <div className="card tbl"><table className="t">
      <thead><tr><th>Salesperson</th><th className="r">Customers</th><th className="r">Pending</th><th className="r">Promised</th><th className="r">Promise broken</th><th className="r">No promise</th><th className="r">Promises kept</th><th className="hm">Promise split</th></tr></thead>
      <tbody>{rows.map(([k, g]) => (
        <tr key={k} className="click" onClick={() => pick(k)} title="Show this salesperson's customers">
          <td className="cn">{k === '—' ? 'No salesperson' : k}</td><td className="r">{g.n}</td><td className="r"><b>{inr(g.pending)}</b></td><td className="r">{inr(g.promised)}</td>
          <td className="r">{g.overdue ? inr(g.overdue) : '—'}</td><td className="r">{g.none}</td><td className="r">{g.closed ? `${Math.round((g.kept / g.closed) * 100)}%` : '—'}</td>
          <td className="hm" style={{ width: 170 }}><Bar mini total={g.pending + g.received} parts={[[g.received, COLORS.received], [g.up, COLORS.promised], [g.today, COLORS.today], [g.overdue, COLORS.overdue]]} /></td>
        </tr>))}</tbody>
    </table></div>
  );
}
