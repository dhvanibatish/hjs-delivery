import { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Phone, Undo2 } from 'lucide-react';
import type { CaseLog, Settings, StuckCase } from '../types';
import { rpc } from '../api';
import { addDays, fmtDY, fmtGB, inr, iso } from '../format';
import { Drawer, useToast } from '../ui';
import { CLOSE_TYPES, calc, nextStep, stuckDays } from './calc';
import NoticeModal from './NoticeModal';

const ACTION: Record<string, string> = {
  notice_sent: 'Notice sent', notice_undo: 'Notice undone', note: 'Team note', close: 'Case closed', reopen: 'Case reopened', auto_close: 'Auto-closed (payment received)',
};

export function stageTag(c: StuckCase, s: Settings) {
  const n = nextStep(c, s);
  if (n.kind === 'closed') return <span className="tag t-green">Closed · {n.label}</span>;
  if (n.kind === 'due') return <span className={'tag ' + (n.notice === 2 ? 't-red' : 't-amber')}>{n.notice === 2 ? 'Final notice due' : 'Reminder due'}</span>;
  if (n.kind === 'wait') return <span className="tag t-blue">Waiting · {n.left}d left</span>;
  return <span className="tag t-violet">Final sent · legal next</span>;
}

export default function CaseDrawer({ c, settings, cap, onClose, reload }: {
  c: StuckCase; settings: Settings; cap: boolean; onClose: () => void; reload: () => Promise<void>;
}) {
  const toast = useToast();
  const k = calc(c, cap);
  const sent = c.state?.sent || {};
  const nx = nextStep(c, settings);
  const [notice, setNotice] = useState<1 | 2 | null>(null);
  const [note, setNote] = useState(c.state?.note || '');
  const [closeType, setCloseType] = useState('');
  const [hist, setHist] = useState<CaseLog[] | null>(null);
  const closed = !!c.state?.closed || c.excluded;

  useEffect(() => {
    rpc<CaseLog[]>('rec_case_history', { p_customer_id: c.id }).then(setHist).catch(() => setHist([]));
  }, [c.id, c.state?.at]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); toast(ok); await reload(); } catch (e) { toast('Not saved: ' + (e as Error).message, true); }
  };

  return (
    <Drawer onClose={onClose} head={<>
      {stageTag(c, settings)}
      <h2>{c.name}</h2>
      <div className="meta">{c.phone} · {c.location} · {c.agent || 'No salesperson'}</div>
    </>}>
      {c.flags.length > 0 && <div className="d-sec">{c.flags.map(f => <div className="flag" key={f}><AlertTriangle size={14} /> Check before notice: {f}</div>)}</div>}

      <div className="d-sec">
        <h3>Amount breakdown</h3>
        <div className="facts">
          <div><small>Billed till date</small><b>{inr(c.billed_total)}</b><div className="meta">{c.inv_count} bills</div></div>
          <div><small>A · Billed, not paid</small><b>{inr(c.billed_pending)}</b></div>
          <div><small>B · Unbilled till today</small><b>{inr(k.ub)}</b>{k.capped && <div className="meta">Capped at item value</div>}</div>
          <div><small>A + B</small><b>{inr(k.due)}</b></div>
          <div><small>C · Item value</small><b>{inr(k.iv)}</b></div>
          <div><small>Security held</small><b>{inr(c.security)}</b><div className="meta">Not added to claim</div></div>
          <div><small>Stuck since</small><b>{fmtDY(c.stuck_since)}</b><div className="meta">{stuckDays(c)} days</div></div>
          <div><small>Last payment</small><b>{fmtDY(c.last_payment)}</b></div>
          <div><small>Last bill</small><b>{fmtDY(c.last_bill)}</b></div>
          <div className="big"><small>Total claim (A + B + C)</small><b>{inr(k.total)}</b></div>
        </div>
        <div className="row-acts" style={{ marginTop: 12 }}>
          {c.phone && <a className="btn sm" href={`tel:${c.phone}`}><Phone size={14} />{c.phone}</a>}
        </div>
      </div>

      <div className="d-sec">
        <h3>Notices <span className="meta">Final notice {settings.gap2_days} days after the reminder</span></h3>
        <div className="timeline">
          {([1, 2] as const).map(n => {
            const d = sent[String(n) as '1' | '2'];
            const isDue = nx.kind === 'due' && nx.notice === n;
            const waitTxt = n === 2 && !d && sent['1'] ? `Due on ${fmtGB(addDays(sent['1'], settings.gap2_days))}` : '';
            return (
              <div key={n} className={'tl' + (d ? ' sent' : isDue ? ' due' : '')}>
                <span className="n">{n}</span>
                <div><b>{n === 1 ? 'Reminder letter' : 'Final notice'}</b>
                  <div className="meta">{d ? `Sent on ${fmtGB(d)}` : isDue ? (nx.late > 0 ? `Due · ${nx.late} days late` : 'Due today') : waitTxt || 'Not yet'}</div>
                </div>
                {!closed && <div className="acts">
                  {d ? <button className="btn sm" onClick={() => run(() => rpc('rec_undo_notice', { p_customer_id: c.id, p_no: n }), `Notice ${n} undone.`)}><Undo2 size={14} />Undo</button>
                    : (n === 1 || sent['1']) && <button className={'btn sm' + (isDue ? ' primary' : '')} onClick={() => setNotice(n)}><FileText size={14} />{isDue ? 'Draft & send' : 'Draft'}</button>}
                </div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="d-sec">
        <h3>All unpaid bills ({c.open_invoices.length})</h3>
        <table className="lines"><tbody>
          {c.open_invoices.map(i => (
            <tr key={i.no}><td><b>{i.no}</b><div className="meta">{fmtDY(i.date)} · {i.items}</div></td>
              <td className="r">{inr(i.balance)}{+i.balance !== +i.total && <div className="meta">of {inr(i.total)}</div>}</td></tr>
          ))}
          <tr className="tot"><td>Total</td><td className="r">{inr(c.open_invoices.reduce((s, i) => s + +i.balance, 0))}</td></tr>
        </tbody></table>
      </div>

      <div className="d-sec">
        <h3>Stuck bills & items</h3>
        <table className="lines"><tbody>
          {k.lines.map(l => (
            <tr key={l.no}><td><b>{l.no}</b><div className="meta">{fmtDY(l.date)} · rent {inr(l.rent)}/month · unbilled from {fmtGB(l.from)} ({l.days} days)</div></td><td className="r">{inr(l.amount)}</td></tr>
          ))}
          {c.items.map((it, i) => (
            <tr key={'i' + i}><td>{it.name}<div className="meta">{it.code || '—'} · qty {it.qty} · {it.src || 'no value source'}</div></td><td className="r">{it.value == null ? '—' : inr(it.value)}</td></tr>
          ))}
        </tbody></table>
        <p className="meta" style={{ margin: '8px 0 0' }}>Unbilled = monthly rent × days after the 30-day cycle ÷ 30. Address: {c.address || '—'}</p>
      </div>

      <div className="d-sec">
        <h3>Remarks</h3>
        <div className="rmk"><small>Zoho Books (Renewal status)</small>{c.remark || '—'}</div>
        <div className="rmk"><small>Collection remark</small>{c.coll_remark || '—'}</div>
        <div className="rmk"><small>Sales remark</small>{c.sales_remark || '—'}</div>
        <label className="rmk" style={{ display: 'block' }}><small>Team note (saves when you click outside)</small>
          <textarea className="inp" maxLength={500} value={note} onChange={e => setNote(e.target.value)}
            onBlur={() => { if (note !== (c.state?.note || '')) run(() => rpc('rec_set_note', { p_customer_id: c.id, p_note: note }), 'Note saved.'); }} />
        </label>
      </div>

      <div className="d-sec">
        <h3>Close case</h3>
        {c.excluded ? <p className="meta">Machine returned (Books remark) — closed automatically.</p>
          : c.state?.closed ? (
            <div className="row-acts"><span className="tag t-green">{c.state.closed.type}</span><span className="meta">on {fmtGB(c.state.closed.date)} by {c.state.closed.by}</span>
              <button className="btn sm" onClick={() => run(() => rpc('rec_reopen_case', { p_customer_id: c.id }), 'Case reopened.')}>Reopen</button></div>
          ) : (
            <div className="row-acts">
              <select className="inp" style={{ width: 240 }} value={closeType} onChange={e => setCloseType(e.target.value)}>
                <option value="">Recovered? Choose…</option>
                {CLOSE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <button className="btn sm primary" disabled={!closeType} onClick={() => run(() => rpc('rec_close_case', { p_customer_id: c.id, p_type: closeType }), 'Case closed.')}>Close case</button>
            </div>
          )}
      </div>

      <div className="d-sec">
        <h3>History</h3>
        <div className="log">
          {hist == null ? <div className="meta">Loading…</div> : hist.length === 0 ? <div className="meta">No history yet.</div>
            : hist.map(h => (
              <div key={h.id}><b>{ACTION[h.action] || h.action}</b>
                {h.detail && 'no' in h.detail ? ` · Notice ${String(h.detail.no)}` : ''}
                {h.detail && 'type' in h.detail ? ` · ${String(h.detail.type)}` : ''}
                {h.detail && 'note' in h.detail ? ` · ${String(h.detail.note)}` : ''}
                <div className="meta">{h.by_admin || '—'} · {new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>
            ))}
        </div>
      </div>

      {notice && <NoticeModal c={c} n={notice} settings={settings} cap={cap} onClose={() => setNotice(null)}
        onMark={async date => { await run(() => rpc('rec_mark_notice', { p_customer_id: c.id, p_no: notice, p_date: date || iso(new Date()) }), `Notice ${notice} marked as sent.`); }} />}
    </Drawer>
  );
}
