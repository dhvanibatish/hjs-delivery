import { useMemo, useState } from 'react';
import type { Settings, StuckList } from '../types';
import { fmtDY, inr, short } from '../format';
import { Bar } from '../ui';
import { calc, nextStep, stuckDays } from './calc';
import CaseDrawer, { stageTag } from './CaseDrawer';
import { useCap } from './StuckCases';

const BUCKETS: [string, number, number][] = [['0–30 days', 0, 30], ['31–90 days', 31, 90], ['91–180 days', 91, 180], ['181–365 days', 181, 365], ['Over 1 year', 366, 1e9]];

export default function StuckDashboard({ data, settings, reload }: { data: StuckList; settings: Settings; reload: () => Promise<void> }) {
  const [cap, setCap] = useCap();
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => data.customers.map(c => ({ c, k: calc(c, cap), nx: nextStep(c, settings), d: stuckDays(c) })), [data, cap, settings]);
  const open = rows.filter(r => r.nx.kind !== 'closed');
  const closedN = rows.length - open.length;
  const S = (fn: (r: typeof open[number]) => number, list = open) => list.reduce((s, r) => s + fn(r), 0);
  const A = S(r => +r.c.billed_pending), B = S(r => r.k.ub), C = S(r => r.k.iv), T = A + B + C;
  const dueN = open.filter(r => r.nx.kind === 'due').length;

  const group = (key: (r: typeof open[number]) => string) => {
    const m = new Map<string, { n: number; claim: number }>();
    open.forEach(r => { const k = key(r); const g = m.get(k) || { n: 0, claim: 0 }; g.n++; g.claim += r.k.total; m.set(k, g); });
    return [...m.entries()].sort((a, b) => b[1].claim - a[1].claim);
  };
  const maxOf = (l: [string, { claim: number }][]) => Math.max(1, ...l.map(x => x[1].claim));
  const stores = group(r => r.c.location || 'No store');
  const agents = group(r => r.c.agent || 'Not tagged');
  const buckets = BUCKETS.map(([l, a, b]) => { const l2 = open.filter(r => r.d >= a && r.d <= b); return [l, { n: l2.length, claim: S(r => r.k.total, l2) }] as [string, { n: number; claim: number }]; });
  const top = [...open].sort((a, b) => b.k.total - a.k.total).slice(0, 10);
  const sel = data.customers.find(c => c.id === openId) || null;

  const list = (title: string, l: [string, { n: number; claim: number }][]) => (
    <div className="card card-pad"><h3>{title}</h3>
      {l.length === 0 ? <p className="meta">Nothing open.</p> : l.map(([k, g]) => (
        <div className="hrow" key={k}><span>{k} <span className="meta">· {g.n} case{g.n === 1 ? '' : 's'}</span></span><b>{inr(g.claim)}</b>
          <div className="hbar"><i style={{ width: `${(g.claim / maxOf(l)) * 100}%` }} /></div></div>
      ))}
    </div>
  );

  return (
    <>
      <div className="page-head">
        <div><h1>Stuck dashboard</h1><p>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} <span className="pill">Payment pending only · {closedN} closed · since {fmtDY(data.from)}</span></p></div>
        <label className="toggle"><input type="checkbox" checked={cap} onChange={e => setCap(e.target.checked)} />Cap unbilled at item value</label>
      </div>

      <div className="kpis">
        <div className="kpi k-green"><small>Open cases</small><b>{open.length}</b><span>{closedN} closed</span></div>
        <div className="kpi k-amber"><small>Notices due today</small><b>{dueN}</b><span>Reminder or final notice</span></div>
        <div className="kpi"><small>Billed, not paid (A)</small><b>{short(A)}</b><span>Open Books balance</span></div>
        <div className="kpi k-green"><small>Unbilled till today (B)</small><b>{short(B)}</b><span>Rent after the 30-day cycle</span></div>
        <div className="kpi k-gold"><small>Item value (C)</small><b>{short(C)}</b><span>Equipment with customers</span></div>
        <div className="kpi k-red"><small>Total claim</small><b>{short(T)}</b><span>A + B + C</span></div>
      </div>

      <div className="grid2">
        {([1, 2] as const).map(n => {
          const due = open.filter(r => r.nx.kind === 'due' && r.nx.notice === n);
          const wait = n === 2 ? open.filter(r => r.nx.kind === 'wait').length : 0;
          const sent = rows.filter(r => r.c.state?.sent?.[String(n) as '1' | '2']).length;
          return (
            <div className="card card-pad" key={n}><h3>Notice {n} · {n === 1 ? 'Reminder letter' : 'Final notice'}</h3>
              <div className="np">
                <div><small>Due</small><b>{due.length}</b><div className="meta">{inr(S(r => r.k.total, due))} claim</div></div>
                <div><small>Waiting</small><b>{n === 1 ? '—' : wait}</b><div className="meta">{n === 1 ? 'Sent right away when due' : `${settings.gap2_days}-day gap after Notice 1`}</div></div>
                <div><small>Sent</small><b>{sent}</b><div className="meta">all time</div></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <h3>What the total claim is made of</h3>
        <Bar total={T} parts={[[A, '#14392B'], [B, '#8BC48F'], [C, '#C9A227']]} />
        <div className="legend"><span style={{ ['--c' as string]: '#14392B' }}>Billed, not paid {inr(A)}</span><span style={{ ['--c' as string]: '#8BC48F' }}>Unbilled {inr(B)}</span><span style={{ ['--c' as string]: '#C9A227' }}>Item value {inr(C)}</span></div>
      </div>

      <div className="grid3">
        {list('How long stuck', buckets)}
        {list('Store-wise', stores)}
        {list('Salesperson-wise', agents)}
      </div>

      <div className="card tbl">
        <div className="card-pad" style={{ paddingBottom: 0 }}><h3>Top 10 claims</h3></div>
        <table className="t"><thead><tr><th>Customer</th><th>Store</th><th className="r">Days</th><th className="r">Billed + unbilled</th><th className="r">Item value</th><th className="r">Total</th><th>Notices</th><th>Next step</th></tr></thead>
          <tbody>
            {top.length === 0 && <tr><td colSpan={8} className="empty">No open cases.</td></tr>}
            {top.map(({ c, k, d }) => (
              <tr key={c.id} className="click" onClick={() => setOpenId(c.id)}>
                <td className="cn">{c.name}</td><td>{c.location}</td><td className="r">{d}</td><td className="r">{inr(k.due)}</td><td className="r">{inr(k.iv)}</td><td className="r"><b>{inr(k.total)}</b></td>
                <td className="nowrap">{['1', '2'].map(n => <span key={n} className={'tag ' + (c.state?.sent?.[n as '1' | '2'] ? 't-green' : 't-grey')} style={{ marginRight: 4 }}>N{n}</span>)}</td>
                <td>{stageTag(c, settings)}</td>
              </tr>
            ))}
          </tbody></table>
      </div>
      {sel && <CaseDrawer c={sel} settings={settings} cap={cap} onClose={() => setOpenId(null)} reload={reload} />}
    </>
  );
}
