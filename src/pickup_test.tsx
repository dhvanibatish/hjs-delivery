// @ts-nocheck
/* ═══════════════════════════════════════════════════════════════════════
   PICKUP TEST — settlement / security refund ka naya flow, ALAG page pe.
   Link: ?pickuptest

   Ye file live Pickups app (Pickups.tsx) ya Delivery app (App.tsx) ka koi
   code use ya change nahi karti. Supabase ko bhi call nahi karti — sab
   sample data pe, browser ki memory mein chalta hai. Refresh = sab reset.
   Jab flow theek lage, tab ise asli pickup app mein jodenge.

   Flow (har Picked Up entry ke liye):
     1. Hisaab    — Security (Books) − Outstanding (Books) − Pickup charges
                    (Books mein pehle se planned) = aaj kitna lautana hai
     2. Inspection — item theek hai / damage (photo + amount)
     3. Approval  — damage ho to Kanu Mam approve / amount badle / reject
     4. Refund note + customer ka UPI QR
     5. Finance   — payment ka screenshot (GPay/PhonePe) + UTR
     6. Customer  — "mil gaya" / "nahi mila" → Closed / Disputed
   ═══════════════════════════════════════════════════════════════════════ */
import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, ArrowRight, Check, X, Camera, Upload, IndianRupee, ShieldCheck,
  AlertTriangle, FileText, QrCode, Wallet, MessageSquare, RotateCcw, CheckCircle2,
  ClipboardCheck, Truck, Info,
} from 'lucide-react';

const C = {
  forest: '#14392B', green: '#2E7D32', greenBright: '#3D9A42', mint: '#E7F0E8',
  beige: '#F5F1E8', cream: '#FBF9F4', ink: '#1C2620', inkSoft: '#657069', line: '#E7E2D6',
  amber: '#C77D28', amberSoft: '#FBF0DE', blue: '#3E6B9E', blueSoft: '#E8EFF6',
  red: '#B4472E', redSoft: '#F7E7E1', violet: '#6B5B9A', violetSoft: '#EEEAF7',
};
const FONT = "'Plus Jakarta Sans','Inter',system-ui,-apple-system,sans-serif";
const STORE = { MOH: 'Mohali Showroom', CHD: 'Head Office', GGN: 'Gurgaon', NCR: 'Delhi NCR', JPR: 'Jaipur', LDH: 'Ludhiana' };

/* Sample entries — asli Books jaise fields:
   security_amount  = Books mein security kitni li thi
   pending_amount   = Books ka outstanding (customer pe bakaya)
   planned_charges  = Books mein pehle se planned pickup charges
   charges_collected= pickup ke waqt store ne cash/online le liye (live app ka field) */
const SAMPLE = [
  { id: 't1', inv: 'MOH/10/2026/1042', name: 'Baldev Raj', phone: '+9198150xxxxx', store: 'MOH', item: 'Oxygen Concentrator 5L', security: 5000, secMode: 'Online', pending: 1200, planned: 300, collected: 0, pendingCollected: 0, pickedOn: '2026-10-24', boy: 'Ghola Singh' },
  { id: 't2', inv: 'GGN/10/2026/1784', name: 'Senocare Services Pvt Ltd', phone: '+9198110xxxxx', store: 'GGN', item: '5F Motorised Hospital Bed', security: 15000, secMode: 'Cheque', pending: 0, planned: 1000, collected: 1000, pendingCollected: 0, pickedOn: '2026-10-24', boy: 'Amit' },
  { id: 't3', inv: 'NCR/10/2026/3898', name: 'Housepital Pvt Ltd', phone: '+9198220xxxxx', store: 'NCR', item: 'Semi Fowler Bed + Monitor', security: 6000, secMode: 'Online', pending: 4100, planned: 800, collected: 0, pendingCollected: 0, pickedOn: '2026-10-24', boy: 'Shiva' },
  { id: 't4', inv: 'JPR/10/2026/0612', name: 'Kamla Devi', phone: '+9198290xxxxx', store: 'JPR', item: 'Wheelchair', security: 2000, secMode: 'Cash', pending: 1800, planned: 400, collected: 0, pendingCollected: 0, pickedOn: '2026-10-24', boy: 'Mandeep' },
];

const STEPS = [
  { id: 'calc', label: 'Hisaab', icon: IndianRupee },
  { id: 'inspect', label: 'Inspection', icon: ClipboardCheck },
  { id: 'approve', label: 'Approval', icon: ShieldCheck },
  { id: 'note', label: 'Refund note', icon: FileText },
  { id: 'pay', label: 'Finance', icon: Wallet },
  { id: 'confirm', label: 'Customer', icon: MessageSquare },
];

const rs = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const num = (v) => (v === '' || v == null ? 0 : Number(v) || 0);

/* ── Paisa ka poora hisaab — ek hi jagah, taaki har step same number dikhaye ── */
function calc(e, s) {
  const owed = Math.max(0, num(e.pending) - num(s.pendingCollected ?? e.pendingCollected));
  // pickup charges: agar store ne pickup pe le liye, to security se nahi katenge
  const mode = s.chargesMode || (num(e.collected) > 0 ? 'collected' : 'deduct');
  const chargesFromSec = mode === 'collected' ? 0 : num(s.charges ?? e.planned);
  const damage = s.condition === 'damaged'
    ? (s.approval === 'approved' ? num(s.approvedAmt) : s.approval === 'rejected' ? 0 : num(s.damageAmt))
    : 0;
  const balance = num(e.security) - owed - chargesFromSec - damage;
  return { owed, chargesFromSec, damage, balance };
}

function readFiles(files, cb) {
  const arr = Array.from(files || []);
  Promise.all(arr.map((f) => new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(f);
  }))).then(cb);
}

export default function PickupTest() {
  const [state, setState] = useState({}); // id → settlement state
  const [openId, setOpenId] = useState(null);
  const [refSeq, setRefSeq] = useState({}); // store → last ref no.

  const st = (id) => state[id] || { step: 0 };
  const patch = (id, p) => setState((s) => ({ ...s, [id]: { ...st(id), ...p } }));
  const open = SAMPLE.find((e) => e.id === openId);

  const statusOf = (e) => {
    const s = st(e.id);
    if (s.closed) return s.closed === 'Closed' ? { t: 'Closed', c: C.green, s: C.mint } : { t: 'Disputed', c: C.red, s: C.redSoft };
    if (s.step === 0 && !s.started) return { t: 'Shuru karo', c: C.inkSoft, s: C.beige };
    return { t: STEPS[s.step].label + ' pe', c: C.amber, s: C.amberSoft };
  };

  return (
    <div style={{ fontFamily: FONT, background: C.beige, minHeight: '100vh', color: C.ink }}>
      <TestStyle />
      <div className="pt-top">
        <div className="pt-brand"><div className="pt-badge"><Truck size={18} color="#fff" /></div>
          <div><b>Pickup Test</b><span>Settlement &amp; security refund · naya flow</span></div>
        </div>
        <button className="pt-ghost" onClick={() => { setState({}); setRefSeq({}); setOpenId(null); }}>
          <RotateCcw size={14} /> Test reset
        </button>
      </div>

      <div className="pt-body">
        <div className="pt-note">
          <Info size={16} style={{ flexShrink: 0 }} />
          <div><b>Sirf test.</b> Sample data hai, kahin save nahi hota, live Pickups app se bilkul alag.
            Refresh karte hi sab reset.</div>
        </div>

        {!open ? (
          <>
            <h2 className="pt-h2">Picked Up — settlement baaki</h2>
            <div className="pt-list">
              {SAMPLE.map((e) => {
                const s = st(e.id);
                const k = calc(e, s);
                const ss = statusOf(e);
                return (
                  <button key={e.id} className="pt-row" onClick={() => { setOpenId(e.id); if (!s.started) patch(e.id, { started: true }); }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="pt-row-top">
                        <b className="pt-ellip">{e.name}</b>
                        <span className="pt-chip" style={{ background: ss.s, color: ss.c }}>{ss.t}</span>
                      </div>
                      <div className="pt-sub pt-ellip">{e.item} · #{e.inv} · {STORE[e.store]}</div>
                      <div className="pt-mini">
                        <span>Security {rs(e.security)}</span>
                        <span>Outstanding {rs(e.pending)}</span>
                        <span>Charges {rs(e.planned)}</span>
                        <b style={{ color: k.balance > 0 ? C.green : k.balance < 0 ? C.red : C.ink }}>
                          {k.balance > 0 ? `Refund ${rs(k.balance)}` : k.balance < 0 ? `Lena hai ${rs(-k.balance)}` : 'Nil'}
                        </b>
                      </div>
                    </div>
                    <ArrowRight size={16} color={C.inkSoft} />
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <Wizard e={open} s={st(open.id)} set={(p) => patch(open.id, p)}
            onBack={() => setOpenId(null)}
            nextRef={() => {
              const n = (refSeq[open.store] || 0) + 1;
              setRefSeq((r) => ({ ...r, [open.store]: n }));
              return `REF-${open.store}-${String(n).padStart(4, '0')}`;
            }} />
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════ WIZARD */
function Wizard({ e, s, set, onBack, nextRef }) {
  const k = calc(e, s);
  const step = s.step || 0;
  const go = (n) => set({ step: n });
  const needApproval = s.condition === 'damaged';
  const refundCase = k.balance > 0;

  // kaunsa step khul sakta hai (pichhle pure hone chahiye)
  const doneUpTo = (() => {
    if (!s.calcOk) return 0;
    if (!s.condition || (s.condition === 'damaged' && ((s.photos || []).length < 2 || !num(s.damageAmt)))) return 1;
    if (needApproval && !s.approval) return 2;
    if (!s.refNo || (refundCase && !s.qr)) return 3;
    if (refundCase && (!s.paidSS || !String(s.utr || '').trim())) return 4;
    if (refundCase && !s.closed) return 5;
    return 6;
  })();

  return (
    <div>
      <button className="pt-back" onClick={onBack}><ArrowLeft size={15} /> Sab entries</button>

      <div className="pt-card pt-head">
        <div style={{ minWidth: 0 }}>
          <div className="pt-name">{e.name}</div>
          <div className="pt-sub">#{e.inv} · {STORE[e.store]} · {e.item}</div>
          <div className="pt-sub">Picked up {e.pickedOn} · {e.boy} · {e.phone}</div>
        </div>
        <div className="pt-bal" style={{ background: k.balance > 0 ? C.mint : k.balance < 0 ? C.redSoft : C.beige, color: k.balance > 0 ? C.green : k.balance < 0 ? C.red : C.ink }}>
          <span>{k.balance > 0 ? 'Aaj lautana hai' : k.balance < 0 ? 'Customer se lena hai' : 'Nil settlement'}</span>
          <b>{rs(Math.abs(k.balance))}</b>
        </div>
      </div>

      {/* stepper */}
      <div className="pt-steps">
        {STEPS.map((x, i) => {
          const skipped = (x.id === 'approve' && s.condition === 'ok') || ((x.id === 'pay' || x.id === 'confirm') && s.calcOk && s.condition && !refundCase);
          const can = i <= doneUpTo;
          const cls = i === step ? 'pt-step on' : i < doneUpTo ? 'pt-step done' : 'pt-step';
          return (
            <button key={x.id} className={cls} disabled={!can || skipped} onClick={() => can && !skipped && go(i)} title={skipped ? 'Is case mein zaroori nahi' : ''}>
              <span className="pt-step-i">{i < doneUpTo ? <Check size={13} /> : <x.icon size={13} />}</span>
              <span style={skipped ? { textDecoration: 'line-through', opacity: 0.6 } : null}>{x.label}</span>
            </button>
          );
        })}
      </div>

      <div className="pt-card">
        {step === 0 && <StepCalc e={e} s={s} k={k} set={set} next={() => { set({ calcOk: true, step: 1 }); }} />}
        {step === 1 && <StepInspect e={e} s={s} set={set} next={() => go(s.condition === 'damaged' ? 2 : 3)} />}
        {step === 2 && <StepApprove e={e} s={s} k={k} set={set} next={() => go(3)} />}
        {step === 3 && <StepNote e={e} s={s} k={k} set={set} nextRef={nextRef}
          next={() => (refundCase ? go(4) : set({ closed: k.balance < 0 ? 'Collect' : 'Closed', step: 3 }))} />}
        {step === 4 && <StepPay e={e} s={s} k={k} set={set} next={() => go(5)} />}
        {step === 5 && <StepConfirm e={e} s={s} k={k} set={set} />}
      </div>
    </div>
  );
}

/* ── 1. Hisaab ─────────────────────────────────────────────────────── */
function StepCalc({ e, s, k, set, next }) {
  const chargesMode = s.chargesMode || (num(e.collected) > 0 ? 'collected' : 'deduct');
  const charges = s.charges ?? e.planned;
  const pc = s.pendingCollected ?? e.pendingCollected;
  return (
    <>
      <h3 className="pt-h3">1. Hisaab — Books se</h3>
      <p className="pt-p">Security mein se pehle customer ka bakaya, phir pickup charges katenge. Jo bache wahi aaj lautana hai.</p>
      <div className="pt-calc">
        <Row l="Security li thi" sub={`Books · ${e.secMode}`} v={rs(e.security)} />
        <Row l="Outstanding (bakaya)" sub="Books ka pending amount" v={`− ${rs(e.pending)}`} red={e.pending > 0} />
        <div className="pt-inrow">
          <span>Pickup pe bakaya mein se kitna mila?</span>
          <input className="pt-inp" inputMode="numeric" value={pc}
            onChange={(ev) => set({ pendingCollected: ev.target.value.replace(/\D/g, '') })} />
        </div>
        {num(pc) > 0 && <Row l="Bakaya jo mil gaya" v={`+ ${rs(Math.min(num(pc), e.pending))}`} green />}
        <Row l="Pickup charges" sub="Books mein pehle se planned" v={chargesMode === 'collected' ? `${rs(charges)} (le liye)` : `− ${rs(charges)}`} red={chargesMode !== 'collected' && num(charges) > 0} />
        <div className="pt-inrow">
          <span>Pickup charges ka kya hua?</span>
          <div className="pt-seg">
            <button className={chargesMode === 'deduct' ? 'on' : ''} onClick={() => set({ chargesMode: 'deduct' })}>Security se kaato</button>
            <button className={chargesMode === 'collected' ? 'on' : ''} onClick={() => set({ chargesMode: 'collected' })}>Pickup pe le liye</button>
          </div>
        </div>
        <div className="pt-inrow">
          <span>Charges amount (badalna ho to)</span>
          <input className="pt-inp" inputMode="numeric" value={charges}
            onChange={(ev) => set({ charges: ev.target.value.replace(/\D/g, '') })} />
        </div>
        <Row total l={k.balance > 0 ? 'Aaj lautana hai' : k.balance < 0 ? 'Customer se lena hai' : 'Nil settlement'} v={rs(Math.abs(k.balance))}
          color={k.balance > 0 ? C.green : k.balance < 0 ? C.red : C.ink} />
      </div>
      <div className="pt-hint">Damage ho to agle step mein woh bhi minus hoga.</div>
      <Foot><button className="pt-primary" onClick={() => { set({ chargesMode }); next(); }}>Hisaab sahi hai · Aage <ArrowRight size={15} /></button></Foot>
    </>
  );
}

/* ── 2. Inspection ─────────────────────────────────────────────────── */
function StepInspect({ s, set, next }) {
  const photos = s.photos || [];
  const ok = s.condition === 'ok' || (s.condition === 'damaged' && photos.length >= 2 && num(s.damageAmt) > 0);
  return (
    <>
      <h3 className="pt-h3">2. Inspection — customer ke ghar pe</h3>
      <p className="pt-p">Item ki condition dekho. Damage ho to kam se kam 2 photo aur damage ka amount.</p>
      <div className="pt-seg big">
        <button className={s.condition === 'ok' ? 'on' : ''} onClick={() => set({ condition: 'ok', approval: null })}><Check size={15} /> Item theek hai</button>
        <button className={s.condition === 'damaged' ? 'on red' : ''} onClick={() => set({ condition: 'damaged' })}><AlertTriangle size={15} /> Damage hai</button>
      </div>
      {s.condition === 'damaged' && (
        <div className="pt-stack">
          <Photos label="Damage photos (kam se kam 2)" list={photos} onChange={(l) => set({ photos: l })} />
          <div className="pt-inrow">
            <span>Damage ka amount (store ka claim)</span>
            <input className="pt-inp" inputMode="numeric" value={s.damageAmt || ''} placeholder="0"
              onChange={(ev) => set({ damageAmt: ev.target.value.replace(/\D/g, ''), approval: null })} />
          </div>
          <textarea className="pt-ta" rows={2} placeholder="Kya toota / kharab hai…" value={s.damageNote || ''}
            onChange={(ev) => set({ damageNote: ev.target.value })} />
          {photos.length < 2 && <div className="pt-warn">Abhi {photos.length} photo — 2 chahiye.</div>}
        </div>
      )}
      <Foot>
        <button className="pt-primary" disabled={!ok} onClick={next}>
          {s.condition === 'damaged' ? 'Approval ke liye bhejo' : 'Aage'} <ArrowRight size={15} />
        </button>
      </Foot>
    </>
  );
}

/* ── 3. Approval (sirf damage pe) ──────────────────────────────────── */
function StepApprove({ e, s, k, set, next }) {
  const [edit, setEdit] = useState(false);
  const [amt, setAmt] = useState(String(s.damageAmt || ''));
  const [why, setWhy] = useState('');
  return (
    <>
      <h3 className="pt-h3">3. Approval — Kanu Mam</h3>
      <p className="pt-p">Test mein yahin se approve kar ke dekho. Asli mein ye Mam ke screen pe jayega.</p>
      <div className="pt-claim">
        <b>Store claim: {rs(s.damageAmt)}</b>
        {s.damageNote && <div>{s.damageNote}</div>}
        <div className="pt-thumbs">{(s.photos || []).map((u, i) => <img key={i} src={u} alt="" />)}</div>
      </div>
      {s.approval ? (
        <div className="pt-done" style={s.approval === 'rejected' ? { background: C.redSoft, color: C.red } : null}>
          {s.approval === 'approved' ? <>Approved · damage {rs(s.approvedAmt)}</> : <>Reject · damage nahi katega{s.rejectWhy ? ` (${s.rejectWhy})` : ''}</>}
          <button className="pt-link" onClick={() => set({ approval: null })}>Badlo</button>
        </div>
      ) : edit ? (
        <div className="pt-stack">
          <div className="pt-inrow"><span>Approved amount</span>
            <input className="pt-inp" inputMode="numeric" value={amt} onChange={(ev) => setAmt(ev.target.value.replace(/\D/g, ''))} /></div>
          <div className="pt-btns">
            <button className="pt-primary" disabled={amt === ''} onClick={() => set({ approval: 'approved', approvedAmt: num(amt) })}>Approve {rs(amt)}</button>
            <button className="pt-ghost" onClick={() => setEdit(false)}>Rehne do</button>
          </div>
        </div>
      ) : (
        <div className="pt-stack">
          <div className="pt-btns">
            <button className="pt-primary" onClick={() => set({ approval: 'approved', approvedAmt: num(s.damageAmt) })}><Check size={15} /> Approve {rs(s.damageAmt)}</button>
            <button className="pt-ghost" onClick={() => setEdit(true)}>Amount badlo</button>
          </div>
          <div className="pt-inrow"><span>Ya reject (kaaran)</span>
            <input className="pt-inp wide" value={why} placeholder="jaise: normal wear & tear" onChange={(ev) => setWhy(ev.target.value)} /></div>
          <button className="pt-danger" disabled={!why.trim()} onClick={() => set({ approval: 'rejected', rejectWhy: why.trim() })}><X size={15} /> Reject</button>
        </div>
      )}
      <div className="pt-hint">Naya balance: <b>{k.balance > 0 ? `Refund ${rs(k.balance)}` : k.balance < 0 ? `Lena hai ${rs(-k.balance)}` : 'Nil'}</b></div>
      <Foot><button className="pt-primary" disabled={!s.approval} onClick={next}>Aage <ArrowRight size={15} /></button></Foot>
    </>
  );
}

/* ── 4. Refund note + customer QR ──────────────────────────────────── */
function StepNote({ e, s, k, set, nextRef, next }) {
  const ref = s.refNo;
  const refundCase = k.balance > 0;
  return (
    <>
      <h3 className="pt-h3">4. Refund note {refundCase ? '+ customer ka UPI QR' : ''}</h3>
      <p className="pt-p">Ye statement hai, invoice nahi. Customer ko WhatsApp pe jayega (test mein sirf dikh raha hai).</p>
      {!ref ? (
        <button className="pt-primary" onClick={() => set({ refNo: nextRef() })}><FileText size={15} /> Refund note banao</button>
      ) : (
        <div className="pt-ref">
          <div className="pt-ref-h"><b>Healthy Jeena Sikho</b><span>{ref}</span></div>
          <div className="pt-ref-sub">Security settlement statement · {e.name} · #{e.inv}</div>
          <Row l="Security" v={rs(e.security)} />
          <Row l="Bakaya adjust" v={`− ${rs(k.owed)}`} />
          <Row l="Pickup charges" v={`− ${rs(k.chargesFromSec)}`} />
          {k.damage > 0 && <Row l="Damage (approved)" v={`− ${rs(k.damage)}`} />}
          <Row total l={refundCase ? 'Refund amount' : k.balance < 0 ? 'Aapko dena hai' : 'Nil settlement'} v={rs(Math.abs(k.balance))} />
        </div>
      )}
      {ref && refundCase && (
        <div className="pt-stack" style={{ marginTop: 14 }}>
          <Photos label="Customer ka UPI QR (store upload karega)" list={s.qr ? [s.qr] : []} single onChange={(l) => set({ qr: l[0] || null })} />
        </div>
      )}
      {ref && k.balance < 0 && <div className="pt-warn">Customer se {rs(-k.balance)} lena hai — refund nahi banega. Collect hone ke baad close.</div>}
      <Foot>
        <button className="pt-primary" disabled={!ref || (refundCase && !s.qr)} onClick={next}>
          {refundCase ? <>Finance ko bhejo <ArrowRight size={15} /></> : <>Close karo <Check size={15} /></>}
        </button>
      </Foot>
      {s.closed && !refundCase && <div className="pt-done" style={{ marginTop: 12 }}>{s.closed === 'Collect' ? 'Collect From Customer — band' : 'Nil settlement — Closed'} ✓</div>}
    </>
  );
}

/* ── 5. Finance payment ────────────────────────────────────────────── */
function StepPay({ e, s, k, set, next }) {
  return (
    <>
      <h3 className="pt-h3">5. Finance — payment</h3>
      <p className="pt-p">Finance customer ke QR pe {rs(k.balance)} bheje, phir GPay/PhonePe ka screenshot aur UTR yahan.</p>
      <div className="pt-two">
        <div><div className="pt-lbl">Customer ka QR</div>{s.qr && <img className="pt-qr" src={s.qr} alt="QR" />}</div>
        <div className="pt-stack">
          <Photos label="Payment screenshot" list={s.paidSS ? [s.paidSS] : []} single onChange={(l) => set({ paidSS: l[0] || null })} />
          <div className="pt-inrow"><span>UTR / Transaction ID</span>
            <input className="pt-inp wide" value={s.utr || ''} placeholder="12 digit UTR" onChange={(ev) => set({ utr: ev.target.value })} /></div>
        </div>
      </div>
      <Foot><button className="pt-primary" disabled={!s.paidSS || !String(s.utr || '').trim()} onClick={next}>Paid · Customer ko batao <ArrowRight size={15} /></button></Foot>
    </>
  );
}

/* ── 6. Customer confirm ───────────────────────────────────────────── */
function StepConfirm({ e, s, k, set }) {
  const msg = `Namaste ${e.name}, aapka security refund ${rs(k.balance)} (${s.refNo}) bhej diya gaya hai. UTR: ${s.utr}. Kripya batayein paisa mila ya nahi.`;
  return (
    <>
      <h3 className="pt-h3">6. Customer se confirm</h3>
      <p className="pt-p">WhatsApp #2 (payment screenshot ke saath). Test mein customer ka jawab yahin chuno.</p>
      <div className="pt-wa"><MessageSquare size={15} /> {msg}</div>
      {s.closed ? (
        <div className="pt-done" style={s.closed === 'Disputed' ? { background: C.redSoft, color: C.red } : null}>
          {s.closed === 'Closed' ? 'Customer ne bola mil gaya — Closed ✓' : 'Customer ne bola nahi mila — Disputed, finance check karega'}
          <button className="pt-link" onClick={() => set({ closed: null })}>Badlo</button>
        </div>
      ) : (
        <div className="pt-btns">
          <button className="pt-primary" onClick={() => set({ closed: 'Closed' })}><CheckCircle2 size={15} /> Received</button>
          <button className="pt-danger" onClick={() => set({ closed: 'Disputed' })}><X size={15} /> Not received</button>
        </div>
      )}
    </>
  );
}

/* ── chhote parts ──────────────────────────────────────────────────── */
function Row({ l, sub, v, red, green, total, color }) {
  return (
    <div className={total ? 'pt-r total' : 'pt-r'} style={color ? { color } : null}>
      <span>{l}{sub && <em>{sub}</em>}</span>
      <b style={red ? { color: C.red } : green ? { color: C.green } : null}>{v}</b>
    </div>
  );
}
function Foot({ children }) { return <div className="pt-foot">{children}</div>; }
function Photos({ label, list, onChange, single }) {
  const ref = React.useRef(null);
  return (
    <div>
      <div className="pt-lbl">{label}</div>
      <div className="pt-thumbs">
        {list.map((u, i) => (
          <span key={i} className="pt-th">
            <img src={u} alt="" />
            <button onClick={() => onChange(list.filter((_, x) => x !== i))}><X size={11} /></button>
          </span>
        ))}
        {(!single || list.length === 0) && (
          <button className="pt-add" onClick={() => ref.current && ref.current.click()}><Camera size={16} /><span>Photo</span></button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple={!single} style={{ display: 'none' }}
        onChange={(ev) => { readFiles(ev.target.files, (urls) => onChange(single ? urls.slice(0, 1) : [...list, ...urls])); ev.target.value = ''; }} />
    </div>
  );
}

function TestStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      * { box-sizing: border-box; }
      html, body { margin: 0; color-scheme: light; }
      #root { max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; text-align: left !important; }
      button { font-family: inherit; }
      .pt-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 20px; background: #fff; border-bottom: 1px solid ${C.line}; position: sticky; top: 0; z-index: 5; }
      .pt-brand { display: flex; align-items: center; gap: 10px; }
      .pt-brand b { display: block; font-size: 15px; }
      .pt-brand span { font-size: 11.5px; color: ${C.inkSoft}; }
      .pt-badge { width: 36px; height: 36px; border-radius: 11px; background: ${C.violet}; display: flex; align-items: center; justify-content: center; }
      .pt-body { max-width: 860px; margin: 0 auto; padding: 18px 16px 60px; }
      .pt-note { display: flex; gap: 10px; background: ${C.violetSoft}; color: ${C.violet}; border-radius: 12px; padding: 11px 13px; font-size: 13px; margin-bottom: 16px; }
      .pt-h2 { font-size: 20px; font-weight: 800; margin: 4px 0 12px; }
      .pt-list { display: flex; flex-direction: column; gap: 9px; }
      .pt-row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; background: #fff; border: 1px solid ${C.line}; border-radius: 14px; padding: 13px 14px; cursor: pointer; color: ${C.ink}; }
      .pt-row:hover { border-color: #d3ccbb; box-shadow: 0 6px 18px rgba(20,57,43,.07); }
      .pt-row-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
      .pt-ellip { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .pt-sub { font-size: 12px; color: ${C.inkSoft}; margin-top: 3px; }
      .pt-mini { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 7px; font-size: 12px; color: ${C.inkSoft}; }
      .pt-chip { flex-shrink: 0; font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px; }
      .pt-back { display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid ${C.line}; border-radius: 10px; padding: 8px 13px; font-size: 13px; font-weight: 700; cursor: pointer; margin-bottom: 12px; color: ${C.ink}; }
      .pt-card { background: #fff; border: 1px solid ${C.line}; border-radius: 16px; padding: 16px; }
      .pt-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
      .pt-name { font-size: 18px; font-weight: 800; }
      .pt-bal { border-radius: 12px; padding: 9px 14px; text-align: right; }
      .pt-bal span { display: block; font-size: 11.5px; font-weight: 700; }
      .pt-bal b { font-size: 22px; font-weight: 800; }
      .pt-steps { display: flex; gap: 6px; overflow-x: auto; margin-bottom: 12px; padding-bottom: 2px; }
      .pt-step { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; border: 1px solid ${C.line}; background: #fff; border-radius: 999px; padding: 6px 11px 6px 6px; font-size: 12.5px; font-weight: 700; color: ${C.inkSoft}; cursor: pointer; }
      .pt-step:disabled { opacity: .5; cursor: default; }
      .pt-step-i { width: 22px; height: 22px; border-radius: 50%; background: ${C.beige}; display: inline-flex; align-items: center; justify-content: center; }
      .pt-step.on { border-color: ${C.forest}; background: ${C.forest}; color: #fff; }
      .pt-step.on .pt-step-i { background: rgba(255,255,255,.2); }
      .pt-step.done { color: ${C.green}; border-color: #CFE3D1; }
      .pt-step.done .pt-step-i { background: ${C.green}; color: #fff; }
      .pt-h3 { font-size: 16px; font-weight: 800; margin: 0 0 4px; }
      .pt-p { font-size: 13px; color: ${C.inkSoft}; margin: 0 0 14px; line-height: 1.5; }
      .pt-calc, .pt-ref { border: 1px solid ${C.line}; border-radius: 12px; padding: 4px 14px; }
      .pt-r { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid ${C.cream}; font-size: 13.5px; }
      .pt-r em { display: block; font-style: normal; font-size: 11px; color: ${C.inkSoft}; }
      .pt-r b { font-weight: 800; white-space: nowrap; }
      .pt-r.total { border-bottom: none; border-top: 1.5px solid ${C.line}; font-size: 15.5px; font-weight: 800; }
      .pt-inrow { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid ${C.cream}; font-size: 12.5px; color: ${C.inkSoft}; flex-wrap: wrap; }
      .pt-inp { width: 110px; border: 1px solid ${C.line}; border-radius: 9px; padding: 8px 10px; font-family: inherit; font-size: 13.5px; text-align: right; outline: none; }
      .pt-inp.wide { width: 220px; text-align: left; }
      .pt-inp:focus, .pt-ta:focus { border-color: ${C.green}; }
      .pt-ta { width: 100%; border: 1px solid ${C.line}; border-radius: 10px; padding: 9px 11px; font-family: inherit; font-size: 13px; outline: none; resize: vertical; }
      .pt-seg { display: inline-flex; background: ${C.beige}; border-radius: 10px; padding: 3px; gap: 3px; flex-wrap: wrap; }
      .pt-seg button { border: none; background: transparent; padding: 7px 11px; border-radius: 8px; font-size: 12.5px; font-weight: 700; color: ${C.inkSoft}; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
      .pt-seg button.on { background: ${C.forest}; color: #fff; }
      .pt-seg button.on.red { background: ${C.red}; }
      .pt-seg.big button { padding: 11px 16px; font-size: 14px; }
      .pt-stack { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
      .pt-lbl { font-size: 12px; font-weight: 800; margin-bottom: 7px; }
      .pt-thumbs { display: flex; flex-wrap: wrap; gap: 8px; }
      .pt-thumbs img { width: 70px; height: 70px; object-fit: cover; border-radius: 9px; border: 1px solid ${C.line}; display: block; }
      .pt-th { position: relative; }
      .pt-th button { position: absolute; top: 3px; right: 3px; width: 20px; height: 20px; border-radius: 6px; border: none; background: rgba(20,32,26,.8); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .pt-add { width: 70px; height: 70px; border-radius: 9px; border: 1.5px dashed ${C.line}; background: ${C.cream}; color: ${C.green}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 11px; font-weight: 700; cursor: pointer; }
      .pt-warn { font-size: 12px; font-weight: 700; color: ${C.amber}; background: ${C.amberSoft}; border-radius: 9px; padding: 8px 11px; }
      .pt-hint { font-size: 12px; color: ${C.inkSoft}; margin-top: 10px; }
      .pt-claim { background: ${C.redSoft}; color: ${C.red}; border-radius: 12px; padding: 12px; font-size: 13px; display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
      .pt-done { display: flex; justify-content: space-between; align-items: center; gap: 10px; background: ${C.mint}; color: ${C.green}; border-radius: 12px; padding: 12px 14px; font-size: 13.5px; font-weight: 800; }
      .pt-link { border: none; background: none; color: inherit; text-decoration: underline; font-weight: 700; cursor: pointer; font-size: 12.5px; }
      .pt-btns { display: flex; gap: 8px; flex-wrap: wrap; }
      .pt-foot { display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 14px; border-top: 1px solid ${C.cream}; }
      .pt-primary { display: inline-flex; align-items: center; justify-content: center; gap: 7px; background: ${C.green}; color: #fff; border: none; border-radius: 11px; padding: 11px 16px; font-size: 13.5px; font-weight: 800; cursor: pointer; }
      .pt-primary:disabled { opacity: .45; cursor: not-allowed; }
      .pt-ghost { display: inline-flex; align-items: center; gap: 6px; background: #fff; color: ${C.ink}; border: 1px solid ${C.line}; border-radius: 11px; padding: 10px 14px; font-size: 13px; font-weight: 700; cursor: pointer; }
      .pt-danger { display: inline-flex; align-items: center; justify-content: center; gap: 7px; background: ${C.redSoft}; color: ${C.red}; border: 1px solid #E9CFC4; border-radius: 11px; padding: 10px 14px; font-size: 13px; font-weight: 800; cursor: pointer; align-self: flex-start; }
      .pt-danger:disabled { opacity: .45; cursor: not-allowed; }
      .pt-ref { background: ${C.cream}; }
      .pt-ref-h { display: flex; justify-content: space-between; padding-top: 10px; font-size: 14px; }
      .pt-ref-h span { font-weight: 800; color: ${C.violet}; }
      .pt-ref-sub { font-size: 11.5px; color: ${C.inkSoft}; padding-bottom: 6px; border-bottom: 1px dashed ${C.line}; }
      .pt-two { display: grid; grid-template-columns: 180px 1fr; gap: 18px; }
      .pt-qr { width: 170px; height: 170px; object-fit: contain; border: 1px solid ${C.line}; border-radius: 12px; background: #fff; }
      .pt-wa { display: flex; gap: 9px; background: #E7F6EA; color: #1E5B2C; border-radius: 12px; padding: 12px; font-size: 13px; line-height: 1.5; margin-bottom: 12px; }
      @media (max-width: 600px) { .pt-two { grid-template-columns: 1fr; } .pt-bal { width: 100%; text-align: left; } .pt-foot > button { width: 100%; } }
    `}</style>
  );
}
