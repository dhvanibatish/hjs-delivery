import { useEffect, useState } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import type { CaseLog } from '../types';
import { rpc } from '../api';
import { DAY, fmtD, fmtDY, inr, iso, today0 } from '../format';
import { Bar, Drawer, useToast } from '../ui';
import { COLORS, COMMIT_LABEL, LIVE, STATUS_LABEL, type Derived } from './calc';

const LOG: Record<string, string> = {
  commit_add: 'Promise added', received: 'Marked received', auto_received: 'Payment seen in Books (auto)', missed: 'Marked missed',
  reschedule: 'Rescheduled', cancel: 'Promise deleted', reopen: 'Reopened', note: 'Note',
};

export default function CollectionDrawer({ d, onClose, reload }: { d: Derived; onClose: () => void; reload: () => Promise<void> }) {
  const toast = useToast();
  const c = d.c;
  const [amt, setAmt] = useState('');
  const [due, setDue] = useState('');
  const [mode, setMode] = useState('UPI');
  const [to, setTo] = useState(c.agent);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [box, setBox] = useState<{ id: number; kind: 'rec' | 'res' | 'del' } | null>(null);
  const [boxVal, setBoxVal] = useState('');
  const [follow, setFollow] = useState('');
  const [hist, setHist] = useState<CaseLog[] | null>(null);
  const minDate = iso(today0());

  useEffect(() => { rpc<CaseLog[]>('rec_coll_history', { p_customer_id: c.id }).then(setHist).catch(() => setHist([])); }, [c.id, c.commits.length, c.pending]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    if (busy) return; setBusy(true); setErr('');
    try { await fn(); toast(ok); setBox(null); await reload(); }
    catch (e) { setErr((e as Error).message); toast((e as Error).message, true); }
    finally { setBusy(false); }
  };
  const addItems = (items: { amount: number; due: string }[]) =>
    run(() => rpc('rec_coll_commit_add', { p_customer_id: c.id, p_items: items, p_mode: mode, p_note: note, p_to: to }), 'Promise saved.')
      .then(() => { setAmt(''); setDue(''); setNote(''); });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = Math.round(+amt);
    if (!(a > 0)) { setErr('Enter an amount.'); return; }
    if (!due) { setErr('Pick a date.'); return; }
    if (a > Math.round(d.unpromised)) { setErr(`Only ${inr(d.unpromised)} is without a promise. Reschedule or delete an old promise first.`); return; }
    addItems([{ amount: a, due }]);
  };
  const split = (n: number) => {
    const total = Math.round(d.unpromised);
    if (total <= 0) { setErr('Nothing left without a promise.'); return; }
    const base = Math.floor(total / n / 100) * 100, t = today0(), items = [];
    for (let i = 0; i < n; i++) {
      const date = n === 2 ? new Date(+t + (i + 1) * 7 * DAY) : new Date(t.getFullYear(), t.getMonth() + i + 1, Math.min(t.getDate(), 28));
      items.push({ amount: i === n - 1 ? total - base * (n - 1) : base, due: iso(date) });
    }
    addItems(items);
  };

  const phone = (c.phone || '').replace(/\D/g, '').slice(-10);
  const wa = `https://wa.me/91${phone}?text=${encodeURIComponent(
    `Hello ${c.name}, this is Healthy Jeena Sikho. An amount of ${inr(c.pending)} is pending on your account.` +
    (d.next ? ` You had promised to pay ${inr(d.next.amount - d.next.received)} by ${fmtD(d.next.due)}.` : '') + ' Kindly make the payment. Thank you.')}`;

  return (
    <Drawer onClose={onClose} head={<>
      <span className={'tag ' + STATUS_LABEL[d.status][1]}>{STATUS_LABEL[d.status][0]}</span>{c.stuck && <> <span className="tag t-forest">Stuck</span></>}
      <h2>{c.name}</h2>
      <div className="meta">{c.phone} · {c.location} · {c.agent || 'No salesperson'}</div>
    </>}>
      <div className="d-sec">
        <div className="facts">
          <div><small>Pending (Books)</small><b>{inr(c.pending)}</b></div>
          <div><small>Promised</small><b>{inr(d.promised)}</b></div>
          <div><small>No promise yet</small><b>{inr(d.unpromised)}</b></div>
          <div><small>Paid against promises</small><b>{inr(d.received)}</b></div>
          <div><small>Pending since</small><b>{c.oldest_due ? `${d.age} days` : '—'}</b></div>
          <div><small>Last payment</small><b>{fmtDY(c.last_payment)}</b></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Bar total={+c.pending + d.received} parts={[[d.received, COLORS.received], [d.up, COLORS.promised], [d.today, COLORS.today], [d.overdue, COLORS.overdue]]} />
        </div>
        {c.coll_remark && <p className="meta" style={{ margin: '8px 0 0' }}>Books remark: {c.coll_remark}</p>}
        <div className="row-acts">
          <a className="btn sm" href={wa} target="_blank" rel="noopener"><MessageCircle size={14} />WhatsApp reminder</a>
          {phone && <a className="btn sm" href={`tel:${c.phone}`}><Phone size={14} />{c.phone}</a>}
        </div>
      </div>

      <div className="d-sec">
        <h3>Add a promise {d.unpromised > 0.5 && <span className="meta">{inr(d.unpromised)} has no promise yet</span>}</h3>
        <form className="form" onSubmit={submit}>
          <div><label htmlFor="ca">Amount (₹)</label><input id="ca" className="inp" type="number" inputMode="numeric" min={1} value={amt} onChange={e => setAmt(e.target.value)} /></div>
          <div><label htmlFor="cd">Promised date</label><input id="cd" className="inp" type="date" min={minDate} value={due} onChange={e => setDue(e.target.value)} /></div>
          <div className="full quick">
            <button type="button" className="btn sm" onClick={() => setAmt(String(Math.round(d.unpromised)))}>Full remaining</button>
            <button type="button" className="btn sm" onClick={() => setAmt(String(Math.round(d.unpromised / 2)))}>50%</button>
            <button type="button" className="btn sm" onClick={() => setAmt(String(Math.round(d.unpromised / 4)))}>25%</button>
            <button type="button" className="btn sm" onClick={() => split(2)} title="Two equal parts, one and two weeks from today">Split over 2 weeks</button>
            <button type="button" className="btn sm" onClick={() => split(3)} title="Three equal parts, one per month">Split over 3 months</button>
          </div>
          <div><label htmlFor="cm">Payment mode</label>
            <select id="cm" className="inp" value={mode} onChange={e => setMode(e.target.value)}>{['UPI', 'Bank transfer', 'Cash', 'Cheque', 'Payment link'].map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label htmlFor="ct">Promised to</label><input id="ct" className="inp" value={to} onChange={e => setTo(e.target.value)} /></div>
          <div className="full"><label htmlFor="cn">Note</label><input id="cn" className="inp" placeholder="e.g. after salary, when insurance claim comes" value={note} onChange={e => setNote(e.target.value)} /></div>
          <div className="full err">{err}</div>
          <div className="full"><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save promise'}</button></div>
        </form>
      </div>

      <div className="d-sec">
        <h3>Promises ({d.commits.length})</h3>
        {d.commits.length === 0 && <p className="meta">No promises yet.</p>}
        {[...d.commits].reverse().map(m => {
          const live = LIVE.includes(m.st);
          const open = box?.id === m.id ? box.kind : null;
          return (
            <div key={m.id} className={'cm' + (live ? '' : ' closed')}>
              <div className="top">
                <div><b>{inr(m.amount)}</b> by <b>{fmtD(m.due)}</b> <span className="meta">{m.mode}</span></div>
                <span className={'tag ' + COMMIT_LABEL[m.st][1]}>{COMMIT_LABEL[m.st][0]}{+m.received > 0 && m.st !== 'kept' ? ` · ${inr(m.received)} paid` : ''}</span>
              </div>
              {m.note && <div className="meta">{m.note}</div>}
              <div className="meta">Promised to {m.to || '—'} · added by {m.by} · {fmtD(m.at)}</div>
              {(live || m.st === 'missed') && (
                <div className="row-acts">
                  {live && <button className="btn sm" onClick={() => { setBox({ id: m.id, kind: 'rec' }); setBoxVal(String(m.amount - m.received)); }}>Mark received</button>}
                  <button className="btn sm" onClick={() => { setBox({ id: m.id, kind: 'res' }); setBoxVal(''); }}>{live ? 'Change date' : 'Give new date'}</button>
                  {live && <button className="btn sm" onClick={() => run(() => rpc('rec_coll_commit_action', { p_id: m.id, p_action: 'missed' }), 'Marked as missed.')}>Missed</button>}
                  {m.st === 'missed' && <button className="btn sm" onClick={() => run(() => rpc('rec_coll_commit_action', { p_id: m.id, p_action: 'reopen' }), 'Promise reopened.')}>Reopen</button>}
                  {live && <button className="btn sm danger" onClick={() => setBox({ id: m.id, kind: 'del' })}>Delete</button>}
                </div>
              )}
              {open === 'rec' && <div className="row-acts"><input className="inp" type="number" inputMode="numeric" aria-label="Amount received" value={boxVal} onChange={e => setBoxVal(e.target.value)} />
                <button className="btn sm primary" disabled={busy} onClick={() => +boxVal > 0 && run(() => rpc('rec_coll_commit_action', { p_id: m.id, p_action: 'received', p_amount: +boxVal }), 'Payment recorded.')}>Save</button>
                <button className="btn sm" onClick={() => setBox(null)}>Cancel</button></div>}
              {open === 'res' && <div className="row-acts"><input className="inp" type="date" min={minDate} aria-label="New date" value={boxVal} onChange={e => setBoxVal(e.target.value)} />
                <button className="btn sm primary" disabled={busy || !boxVal} onClick={() => run(() => rpc('rec_coll_commit_action', { p_id: m.id, p_action: 'reschedule', p_date: boxVal }), 'Date changed.')}>Move</button>
                <button className="btn sm" onClick={() => setBox(null)}>Cancel</button></div>}
              {open === 'del' && <div className="row-acts"><span className="meta">Delete this promise?</span>
                <button className="btn sm danger" disabled={busy} onClick={() => run(() => rpc('rec_coll_commit_action', { p_id: m.id, p_action: 'cancel' }), 'Promise deleted.')}>Yes, delete</button>
                <button className="btn sm" onClick={() => setBox(null)}>Cancel</button></div>}
            </div>
          );
        })}
      </div>

      <div className="d-sec">
        <h3>Unpaid bills ({c.invoices.length})</h3>
        <table className="lines"><tbody>
          {c.invoices.map(i => (
            <tr key={i.no}><td><b>{i.no}</b><div className="meta">{fmtDY(i.date)} · {i.items}</div></td>
              <td className="r">{inr(i.balance)}{+i.balance !== +i.total && <div className="meta">of {inr(i.total)}</div>}</td></tr>
          ))}
          <tr className="tot"><td>Total</td><td className="r">{inr(c.invoices.reduce((s, i) => s + +i.balance, 0))}</td></tr>
        </tbody></table>
      </div>

      <div className="d-sec">
        <h3>Follow-up</h3>
        <div className="row-acts" style={{ marginTop: 0 }}>
          <input className="inp" style={{ flex: '1 1 220px', width: 'auto' }} placeholder="Called — customer said…" value={follow} onChange={e => setFollow(e.target.value)} />
          <button className="btn sm primary" disabled={!follow.trim() || busy} onClick={() => run(() => rpc('rec_coll_note', { p_customer_id: c.id, p_text: follow }), 'Note added.').then(() => setFollow(''))}>Add</button>
        </div>
        <div className="log" style={{ marginTop: 8 }}>
          {hist == null ? <div className="meta">Loading…</div> : hist.length === 0 ? <div className="meta">No history yet.</div> : hist.map(h => {
            const dt = h.detail || {};
            const extra = h.action === 'note' ? String(dt.text ?? '')
              : h.action === 'commit_add' ? ((dt.items as { amount: number; due: string }[] | undefined) || []).map(i => `${inr(i.amount)} by ${fmtD(i.due)}`).join(', ')
                : h.action === 'reschedule' ? `${fmtD(String(dt.due ?? ''))} → ${fmtD(String(dt.new_date ?? ''))}`
                  : dt.amount ? inr(+dt.amount) : '';
            return <div key={h.id}><b>{LOG[h.action] || h.action}</b> {extra}
              <div className="meta">{h.by_admin || '—'} · {new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>;
          })}
        </div>
      </div>
    </Drawer>
  );
}
