import { useMemo, useState } from 'react';
import { AlertTriangle, Settings2 } from 'lucide-react';
import type { Settings, StuckCase, StuckList } from '../types';
import { rpc } from '../api';
import { csvCopy, fmtDY, inr, short } from '../format';
import { Modal, Select, nameOptions, persisted, sameName, useToast, SALES_TEAM, STORES } from '../ui';
import { calc, nextStep, stuckDays, workRank } from './calc';
import CaseDrawer, { stageTag } from './CaseDrawer';

type St = 'open' | 'n1' | 'n2' | 'wait' | 'done' | 'closed' | 'all';
type Sort = 'work' | 'claim' | 'old';
type F = { st: St; loc: string; sp: string; sort: Sort };
const FKEY = 'hjsRecovery.stuckF';
const [F0, saveF] = persisted<F>(FKEY, { st: 'open', loc: '', sp: '', sort: 'work' });

export function useCap(): [boolean, (v: boolean) => void] {
  const [cap, setCap] = useState(() => { try { return localStorage.getItem('hjsRecovery.cap') === '1'; } catch { return false; } });
  return [cap, v => { setCap(v); try { localStorage.setItem('hjsRecovery.cap', v ? '1' : '0'); } catch { /* ignore */ } }];
}

export function matchSearch(c: StuckCase, q: string) {
  if (!q) return true;
  const s = q.toLowerCase();
  return [c.name, c.phone, c.location, c.agent, ...c.open_invoices.map(i => i.no + ' ' + i.items), ...c.stuck_invoices.map(i => i.no), ...c.items.map(i => i.name)]
    .join(' ').toLowerCase().includes(s);
}

export default function StuckCases({ data, settings, setSettings, search, reload }: {
  data: StuckList; settings: Settings; setSettings: (s: Settings) => void; search: string; reload: () => Promise<void>;
}) {
  const toast = useToast();
  const [f, setF] = useState<F>(F0);
  const [cap, setCap] = useCap();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showSet, setShowSet] = useState(false);
  const upd = (p: Partial<F>) => { const n = { ...f, ...p }; setF(n); saveF(n); };

  const rows = useMemo(() => data.customers.map(c => ({ c, k: calc(c, cap), nx: nextStep(c, settings) })), [data, cap, settings]);
  const L = useMemo(() => {
    const out = rows.filter(({ c, nx }) => {
      const closed = nx.kind === 'closed';
      if (f.st === 'open' && closed) return false;
      if (f.st === 'n1' && !(nx.kind === 'due' && nx.notice === 1)) return false;
      if (f.st === 'n2' && !(nx.kind === 'due' && nx.notice === 2)) return false;
      if (f.st === 'wait' && nx.kind !== 'wait') return false;
      if (f.st === 'done' && nx.kind !== 'done') return false;
      if (f.st === 'closed' && !closed) return false;
      if (f.loc && !sameName(c.location, f.loc)) return false;
      if (f.sp && !sameName(c.agent, f.sp)) return false;
      return matchSearch(c, search);
    });
    if (f.sort === 'claim') out.sort((a, b) => b.k.total - a.k.total);
    else if (f.sort === 'old') out.sort((a, b) => a.c.stuck_since.localeCompare(b.c.stuck_since));
    else out.sort((a, b) => workRank(a.nx) - workRank(b.nx));
    return out;
  }, [rows, f, search]);

  const open = rows.filter(r => r.nx.kind !== 'closed');
  const cnt = (fn: (r: typeof rows[number]) => boolean) => open.filter(fn).length;
  const sum = (k: 'due' | 'total') => L.reduce((s, r) => s + r.k[k], 0);
  const nAct = (f.st !== 'open' ? 1 : 0) + (f.loc ? 1 : 0) + (f.sp ? 1 : 0);
  const sel = data.customers.find(c => c.id === openId) || null;

  const copyCsv = () => csvCopy([
    ['Customer', 'Phone', 'Store', 'Salesperson', 'Stuck since', 'Days', 'Billed not paid', 'Unbilled', 'Billed + unbilled', 'Item value', 'Total claim', 'Notice 1', 'Notice 2', 'Next step'],
    ...L.map(({ c, k, nx }) => [c.name, c.phone, c.location, c.agent, c.stuck_since, stuckDays(c), c.billed_pending, k.ub, k.due, k.iv, k.total, c.state?.sent?.['1'] || '', c.state?.sent?.['2'] || '', nx.label]),
  ]).then(() => toast('List copied — paste into Sheets / Excel.'), () => toast('Browser blocked copying.', true));

  return (
    <>
      <div className="page-head">
        <div><h1>Stuck cases</h1>
          <p>Only cases with payment still pending · since {fmtDY(data.from)} · Books data {data.as_of ? fmtDY(data.as_of) : '—'}</p></div>
        <div className="row-acts" style={{ marginTop: 0 }}>
          <label className="toggle"><input type="checkbox" checked={cap} onChange={e => setCap(e.target.checked)} />Cap unbilled at item value</label>
          <button className="btn" onClick={() => setShowSet(true)}><Settings2 size={15} />Notice timing</button>
          <button className="btn" onClick={copyCsv}>Copy list (CSV)</button>
        </div>
      </div>

      <div className="kpis">
        <button className={'kpi k-amber' + (f.st === 'n1' ? ' on' : '')} onClick={() => upd({ st: 'n1' })}><small>Reminder due</small><b>{cnt(r => r.nx.kind === 'due' && r.nx.notice === 1)}</b><span>Notice 1 to send</span></button>
        <button className={'kpi k-red' + (f.st === 'n2' ? ' on' : '')} onClick={() => upd({ st: 'n2' })}><small>Final notice due</small><b>{cnt(r => r.nx.kind === 'due' && r.nx.notice === 2)}</b><span>Notice 2 to send</span></button>
        <button className={'kpi k-blue' + (f.st === 'wait' ? ' on' : '')} onClick={() => upd({ st: 'wait' })}><small>Waiting period</small><b>{cnt(r => r.nx.kind === 'wait')}</b><span>Reminder sent, final not yet due</span></button>
        <button className={'kpi k-grey' + (f.st === 'done' ? ' on' : '')} onClick={() => upd({ st: 'done' })}><small>Final notice sent</small><b>{cnt(r => r.nx.kind === 'done')}</b><span>Legal next</span></button>
        <button className={'kpi k-green' + (f.st === 'open' ? ' on' : '')} onClick={() => upd({ st: 'open' })}><small>Open claim</small><b>{short(open.reduce((s, r) => s + r.k.total, 0))}</b><span>{open.length} open cases</span></button>
      </div>

      <div className="card filters">
        <Select<St> label="Status" value={f.st} onChange={v => upd({ st: v })} options={[
          ['open', 'All open cases'], ['n1', 'Reminder due (Notice 1)'], ['n2', 'Final notice due (Notice 2)'], ['wait', 'Waiting period'], ['done', 'Final notice sent'], ['closed', 'Closed'], ['all', 'Everything']]} />
        <Select label="Store" value={f.loc} onChange={v => upd({ loc: v })} options={nameOptions(STORES, data.customers.map(c => c.location), 'All stores', 'No store')} />
        <Select label="Salesperson" value={f.sp} onChange={v => upd({ sp: v })} options={nameOptions(SALES_TEAM, data.customers.map(c => c.agent), 'All salespersons', 'Not tagged')} />
        <Select<Sort> label="Sort by" value={f.sort} onChange={v => upd({ sort: v })} options={[['work', "Today's work first"], ['claim', 'Biggest claim first'], ['old', 'Oldest stuck first']]} />
        <div className="fld"><span>&nbsp;</span><button className={'btn' + (nAct ? ' warn' : '')} disabled={!nAct} onClick={() => upd({ st: 'open', loc: '', sp: '' })}>{nAct ? `Clear filters (${nAct})` : 'No filters'}</button></div>
      </div>

      <div className="bar-row"><span className="count"><b>{L.length}</b> cases · A + B <b>{inr(sum('due'))}</b> · total claim <b>{inr(sum('total'))}</b></span></div>

      <div className="card tbl">
        <table className="t">
          <thead><tr>
            <th>Customer</th><th>Stuck since</th><th className="r hm2">Billed till date</th><th className="r">Billed, not paid</th><th className="r">Unbilled till today</th>
            <th className="r">Billed + unbilled</th><th className="hm2">Item</th><th className="r">Item value</th><th className="r">Total claim</th><th>Notices</th><th>Next step</th>
          </tr></thead>
          <tbody>
            {L.length === 0 && <tr><td colSpan={11} className="empty">{data.customers.length ? 'No cases match these filters.' : 'No stuck cases yet — they appear here after the Books sync.'}</td></tr>}
            {L.map(({ c, k }) => (
              <tr key={c.id} className="click" onClick={() => setOpenId(c.id)}>
                <td><span className="cn">{c.name}</span>{c.flags.length > 0 && <> <span className="tag t-amber" title={c.flags.join(', ')}><AlertTriangle size={11} />Check before notice</span></>}
                  <span className="sub">{c.phone} · {c.location} · {c.agent || 'Not tagged'}</span></td>
                <td className="nowrap">{fmtDY(c.stuck_since)}<span className="sub">{stuckDays(c)} days</span></td>
                <td className="r hm2">{inr(c.billed_total)}<span className="sub">{c.inv_count} bills</span></td>
                <td className="r">{inr(c.billed_pending)}</td>
                <td className="r">{inr(k.ub)}{k.capped && <span className="sub">capped</span>}</td>
                <td className="r"><b>{inr(k.due)}</b></td>
                <td className="hm2" style={{ maxWidth: 190 }}><span className="sub clamp" style={{ color: 'var(--ink)' }}>{c.items.map(i => i.name).join(', ') || '—'}</span></td>
                <td className="r">{inr(k.iv)}</td>
                <td className="r"><b>{inr(k.total)}</b></td>
                <td className="nowrap">{['1', '2'].map(n => <span key={n} className={'tag ' + (c.state?.sent?.[n as '1' | '2'] ? 't-green' : 't-grey')} style={{ marginRight: 4 }}>N{n}</span>)}</td>
                <td>{stageTag(c, settings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && <CaseDrawer c={sel} settings={settings} cap={cap} onClose={() => setOpenId(null)} reload={reload} />}
      {showSet && <NoticeSettings settings={settings} onClose={() => setShowSet(false)} onSaved={s => { setSettings(s); toast('Notice timing saved.'); }} />}
    </>
  );
}

function NoticeSettings({ settings, onClose, onSaved }: { settings: Settings; onClose: () => void; onSaved: (s: Settings) => void }) {
  const [gap2, setGap2] = useState(settings.gap2_days);
  const [reply, setReply] = useState(settings.reply_days);
  const [fin, setFin] = useState(settings.final_days);
  const [err, setErr] = useState('');
  const save = async () => {
    try { await rpc('rec_save_settings', { p_gap2: gap2, p_reply: reply, p_final: fin }); onSaved({ ...settings, gap2_days: gap2, reply_days: reply, final_days: fin }); onClose(); }
    catch (e) { setErr((e as Error).message); }
  };
  const num = (label: string, help: string, v: number, set: (n: number) => void) => (
    <label className="fld" style={{ marginBottom: 12 }}><span>{label}</span><input type="number" min={1} max={120} value={v} onChange={e => set(+e.target.value)} /><span className="meta" style={{ fontWeight: 500, color: 'var(--ink-soft)' }}>{help}</span></label>
  );
  return (
    <Modal small title="Notice timing" onClose={onClose} foot={<><span className="err" style={{ marginRight: 'auto' }}>{err}</span><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
      {num('Days given in the reminder (Notice 1)', 'Written in the letter: "pay within N days of receipt".', reply, setReply)}
      {num('Gap: reminder → final notice', 'Final notice becomes due this many days after Notice 1 is sent.', gap2, setGap2)}
      {num('Deadline in the final notice', '"By or before" date = letter date + N days.', fin, setFin)}
    </Modal>
  );
}
