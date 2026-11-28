import { useMemo, useRef, useState } from 'react';
import { Copy, Printer, Send } from 'lucide-react';
import type { Settings, StuckCase } from '../types';
import { addDays, fmtGB, inWords, inr, iso, parseD, rs, today0 } from '../format';
import { Modal, useToast } from '../ui';
import { calc } from './calc';

/* Notice 1 = Reminder letter, Notice 2 = Final notice.
   Amounts: A = all unpaid billed invoices, B = unbilled rent (30-day cycle), C = item value (Final notice only). */
export default function NoticeModal({ c, n, settings, cap, onClose, onMark }: {
  c: StuckCase; n: 1 | 2; settings: Settings; cap: boolean;
  onClose: () => void; onMark: (date: string) => Promise<void>;
}) {
  const toast = useToast();
  const [date, setDate] = useState(iso(today0()));
  const [police, setPolice] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const k = useMemo(() => calc(c, cap), [c, cap]);
  const already = c.state?.sent?.[String(n) as '1' | '2'];

  const A = c.open_invoices.length ? c.open_invoices : c.stuck_invoices.map(s => ({ no: s.no, date: s.date, due: null, total: s.rent, balance: s.balance, items: '' }));
  const aTotal = c.open_invoices.length ? c.open_invoices.reduce((s, i) => s + +i.balance, 0) : +c.billed_pending;
  const ab = aTotal + k.ub;
  const grand = n === 2 ? ab + k.iv : ab;
  const overdueDays = Math.max(0, Math.round((+today0() - +(parseD(c.stuck_since) || today0())) / 864e5));
  const letterDate = parseD(date) || today0();
  const deadline = addDays(letterDate, settings.final_days);
  // address in a few readable lines (~42 chars each) instead of one line per comma
  const addr = (c.address || '').split(/,\s*/).filter(Boolean).reduce<string[]>((out, part) => {
    const last = out[out.length - 1];
    if (last && (last + ', ' + part).length <= 42) out[out.length - 1] = last + ', ' + part; else out.push(part);
    return out;
  }, []);
  const itemsByName = c.items;

  const copy = async () => {
    try { await navigator.clipboard.writeText(ref.current?.innerText || ''); toast('Letter text copied.'); }
    catch { toast('Browser blocked copying.', true); }
  };
  const mark = async () => { setBusy(true); try { await onMark(date); onClose(); } finally { setBusy(false); } };

  return (
    <Modal title={n === 1 ? 'Notice 1 — Reminder letter' : 'Notice 2 — Final notice'} onClose={onClose}
      foot={<>
        <div className="left">
          <label className="fld" style={{ minWidth: 160 }}><span>Letter date</span><input type="date" max={iso(today0())} value={date} onChange={e => setDate(e.target.value)} /></label>
          {n === 2 && <label className="fld" style={{ minWidth: 200 }}><span>Police station (optional)</span><input value={police} placeholder="e.g. Phase 1, Mohali" onChange={e => setPolice(e.target.value)} /></label>}
        </div>
        <button className="btn" onClick={copy}><Copy size={15} />Copy text</button>
        <button className="btn" onClick={() => window.print()}><Printer size={15} />Print / PDF</button>
        {!already && <button className="btn primary" disabled={busy} onClick={mark}><Send size={15} />{busy ? 'Saving…' : `Mark Notice ${n} as sent`}</button>}
      </>}>
      {already && <div className="flag" style={{ marginTop: 0, marginBottom: 12 }}>This notice was marked sent on {fmtGB(already)}.</div>}
      <div className="letter" ref={ref}>
        <div className="lh">
          <div>
            To,<br /><b>Sh. {c.name}</b><br />
            {addr.map((l, i) => <span key={i}>{l}<br /></span>)}
            {c.phone && <>Ph: {c.phone}</>}
          </div>
          <div className="logo"><b>HEALTHY JEENA SIKHO</b><span>Date- {fmtGB(letterDate)}</span></div>
        </div>

        {n === 1 ? (
          <>
            <p><b>Subject: Reminder letter regarding overdue outstanding.</b></p>
            <p>Dear Sir,</p>
            <p>This is to bring to your kind notice that an amount of <b>{rs(ab)} (Rupees {inWords(ab)} only)</b> is outstanding against your account with Healthy Jeena Sikho and has remained overdue for more than <b>{overdueDays} days</b>. The break-up of the outstanding amount is given below:</p>
          </>
        ) : (
          <>
            <h4>FINAL NOTICE</h4>
            <p><b>Subject: Final notice for return of company equipment and clearance of outstanding dues.</b></p>
            <p><b>Ref:</b> Our reminder letter dated {fmtGB(c.state?.sent?.['1'] || null)}.</p>
            <p>Dear Sir,</p>
            <p>This is with reference to our reminder letter dated {fmtGB(c.state?.sent?.['1'] || null)}, wherein you were requested to clear your outstanding dues. It has been noted that, despite the reminder, the company equipment has not been returned and the outstanding payment has not been received. Your continued failure to comply raises serious concern regarding your intentions.</p>
            <p>This is a <b>FINAL RECOVERY NOTICE</b>, giving you a last opportunity to resolve the matter amicably, failing which the company will be compelled to initiate legal action and lodge a police complaint for a fraudulent act. You are hereby required to:</p>
            <ol>
              <li>Return the company equipment / property in working condition; and</li>
              <li>Clear the full outstanding amount of <b>{rs(grand)} (Rupees {inWords(grand)} only)</b>.</li>
            </ol>
          </>
        )}

        <table>
          <thead><tr><th>Particulars</th><th>Date</th><th>Details</th><th className="r">Amount (₹)</th></tr></thead>
          <tbody>
            <tr className="sec"><td colSpan={4}>A. Billed rent pending</td></tr>
            {A.map(i => (
              <tr key={i.no}><td>Invoice {i.no}</td><td>{fmtGB(i.date)}</td><td>{i.items || '—'}{+i.balance !== +i.total ? ` (of ${inr(i.total)})` : ''}</td><td className="r">{Math.round(+i.balance).toLocaleString('en-IN')}</td></tr>
            ))}
            <tr className="tot"><td colSpan={3}>Total A</td><td className="r">{Math.round(aTotal).toLocaleString('en-IN')}</td></tr>
            <tr className="sec"><td colSpan={4}>B. Unbilled rent (equipment still with you)</td></tr>
            {k.lines.map(l => (
              <tr key={l.no}><td>Rent after {l.no}</td><td>From {fmtGB(l.from)}</td><td>{inr(l.rent)}/month × {l.days} days ÷ 30</td><td className="r">{l.amount.toLocaleString('en-IN')}</td></tr>
            ))}
            {k.capped && <tr><td colSpan={3}>Unbilled limited to item value</td><td className="r">−{(k.ubRaw - k.ub).toLocaleString('en-IN')}</td></tr>}
            <tr className="tot"><td colSpan={3}>Total B</td><td className="r">{Math.round(k.ub).toLocaleString('en-IN')}</td></tr>
            {n === 2 && <>
              <tr className="sec"><td colSpan={4}>C. Company equipment not returned (value)</td></tr>
              {itemsByName.map((it, i) => (
                <tr key={i}><td>{it.name}</td><td></td><td>Qty {it.qty}</td><td className="r">{it.value == null ? '—' : Math.round(it.value).toLocaleString('en-IN')}</td></tr>
              ))}
              <tr className="tot"><td colSpan={3}>Total C</td><td className="r">{Math.round(k.iv).toLocaleString('en-IN')}</td></tr>
            </>}
            <tr className="tot"><td colSpan={3}>{n === 2 ? 'Grand total (A + B + C)' : 'Total outstanding (A + B)'}</td><td className="r">{Math.round(grand).toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table>

        {n === 1 ? (
          <>
            <p>Despite repeated reminders through WhatsApp messages, phone calls and visits by our team, the payment has not been received so far.</p>
            <p>You are requested to clear the above outstanding amount within <b>{settings.reply_days} days</b> of receipt of this letter.</p>
            <p>For any queries, please contact our office. Please note that if the dues are not cleared within the stipulated time, the company shall be constrained to initiate appropriate legal proceedings for recovery, without any further notice.</p>
            <p>If the payment has been made recently, kindly ignore this letter and share the payment details with us.</p>
            <div className="sign">Regards,<br /><br /><b>Abhimanyu Katal</b><br />Senior Finance Manager<br />(Healthy Jeena Sikho)</div>
          </>
        ) : (
          <>
            <p><b>By or before {fmtGB(deadline)}.</b></p>
            <p>If you fail to comply within the above time, the company shall initiate legal proceedings against you without any further notice, including recovery of the equipment and dues, damages, legal expenses and any other relief available under applicable law.</p>
            <p>The company may also lodge a complaint with {police ? <b>{police}</b> : '[Police Station]'} regarding the unauthorized retention of company property.</p>
            <p>Please treat this as our <b>FINAL COMMUNICATION</b>. Any failure to act within the above time will be treated as deliberate non-compliance, and legal action will be taken at your sole risk, cost and responsibility.</p>
            <div className="sign"><b>Regards,</b><br /><br /><b>Abhimanyu Katal</b><br />Legal &amp; Compliance Officer<br />(Healthy Jeena Sikho)<br />Ph: 9004193098</div>
          </>
        )}
      </div>
    </Modal>
  );
}
