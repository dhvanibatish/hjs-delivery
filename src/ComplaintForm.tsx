// @ts-nocheck
/* ══════════════════════════════════════════════════════════════════════
   HJS — Customer Complaint Form  (link: /?complaintform)
   Customer khud complaint daalta hai. Data seedha Supabase `tickets` table
   mein jaata hai — wahi table jo ComplaintApp (?complaints) padhta hai.

   Flow:
   1) Mobile number  → complaint_customer_lookup RPC (deliveries se naam,
      products, store). Mila = form prefilled. Nahi mila = form phir bhi
      khulta hai, customer khud bharta hai (ticket pe "not in records" note).
   2) Product (+ Bed / Wheelchair type), invoice number, problem, photos (max 3, compressed),
      voice note (max 60 sec), city.
   3) Photos/voice → Storage bucket `complaint-media`, phir complaint_submit
      RPC ticket banata hai (status "Open").
   4) Success: ticket number, "1 ghante mein contact", assigned store ka
      number aur emergency number.

   SQL (bucket + 2 RPCs + 4 columns): supabase/complaint_form.sql
   ══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState } from 'react';

const CONFIG = {
  url: 'https://idcmfebqizovivuvsuns.supabase.co',
  key: 'sb_publishable_T6E3AVHgJE7KKmMV3Ko7tQ_qXvap_V_',
  bucket: 'complaint-media',
};
const HDRS = () => ({ apikey: CONFIG.key, Authorization: `Bearer ${CONFIG.key}` });

/* Emergency / helpline — healthyjeenasikho.com ka official call number */
const EMERGENCY = '+91 98769 78488';

/* Zoho "Product Service Request" form wali lists — same naam, same order */
const PRODUCTS = [
  'BED',
  'OC-5L / OC-10L',
  'BIPAP / CPAP',
  'Wheelchair',
  'DVT-PUMP',
  'Monitor',
  'Oxygen Cylinder',
  'Suction Machine',
];
const CITIES = [
  'NCR',
  'Gurgaon',
  'Shastri Nagar',
  'Janakpuri',
  'Jaipur',
  'Chandigarh',
  'Ludhiana',
  'Jalandhar',
  'Lucknow',
];
/* Bed / Wheelchair type — value = ComplaintApp CATALOG ka type naam
   (taaki Stage 1 mein type pehle se chuna aaye) */
const TYPES = {
  BED: {
    label: 'Bed Type',
    opts: [
      ['Manual Bed', 'Manual Bed'],
      ['Electric Bed', 'Electric Bed'],
      ['Paramount Bed', 'Paramount Bed'],
      ['Recliner Bed', 'Recliner Bed'],
    ],
  },
  Wheelchair: {
    label: 'Wheelchair Type',
    opts: [
      ['Manual Wheelchair', 'Manual Wheelchair'],
      ['Motorized Wheelchair', 'Motorized Wheelchair'],
      ['Stair-Climbing', 'Stair Climbing Wheelchair'],
    ],
  },
};

/* Form ki city → ComplaintApp ka store (ComplaintApp ke CITY_ALIAS jaisa) */
const CITY_TO_STORE = {
  NCR: 'Noida',
  Gurgaon: 'Gurugram',
  'Shastri Nagar': 'Shastri Nagar',
  Janakpuri: 'Janakpuri',
  Jaipur: 'Jaipur',
  Chandigarh: 'Mohali',
  Ludhiana: 'Ludhiana',
  Jalandhar: 'Jalandhar',
  Lucknow: 'Lucknow',
};
/* Delivery invoice ka store code → form ki city */
const CODE_TO_CITY = {
  GGN: 'Gurgaon',
  CHD: 'Chandigarh',
  MOH: 'Chandigarh',
  NCR: 'NCR',
  NOD: 'NCR',
  LDH: 'Ludhiana',
  JPR: 'Jaipur',
  LKO: 'Lucknow',
  NWD: 'Shastri Nagar',
  JAL: 'Jalandhar',
  JKP: 'Janakpuri',
};
/* Store ka contact — success screen pe dikhta hai. ⚠ Store managers ke
   numbers (delivery app / complaint app se). Store ka landline ho to
   yahan badal do. */
const STORE_CONTACT = {
  Mohali: { name: 'HJS Mohali / Chandigarh', person: 'Niranjan', phone: '+91 98110 69030' },
  Ludhiana: { name: 'HJS Ludhiana', person: 'Gursajan', phone: '+91 83606 87306' },
  Jalandhar: { name: 'HJS Jalandhar', person: 'Bhupinder', phone: '+91 85588 92244' },
  Jaipur: { name: 'HJS Jaipur', person: 'Niraj', phone: '+91 83407 10549' },
  Lucknow: { name: 'HJS Lucknow', person: 'Akhlaque', phone: '+91 70808 09820' },
  Janakpuri: { name: 'HJS Janakpuri, Delhi', person: 'Rajan', phone: '+91 85953 53451' },
  'Shastri Nagar': { name: 'HJS Shastri Nagar, Delhi', person: 'Nitin', phone: '+91 70074 13101' },
  Gurugram: { name: 'HJS Gurugram', person: 'Hemant', phone: '+91 97736 41804' },
  Noida: { name: 'HJS Delhi NCR / Noida', person: 'Dharmendra', phone: '+91 93155 73166' },
};

const MAX_PHOTOS = 3;
const PHOTO_SIDE = 1280;
const PHOTO_KB = 500;
const VOICE_SEC = 60;
const AUDIO_MB = 3;

/* ─── Supabase ─────────────────────────────────────────────────────────── */
async function sbRpc(fn, body) {
  const res = await fetch(`${CONFIG.url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { ...HDRS(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
async function sbUpload(blob, name) {
  const type = String(blob.type || 'application/octet-stream').split(';')[0];
  const res = await fetch(`${CONFIG.url}/storage/v1/object/${CONFIG.bucket}/${name}`, {
    method: 'POST',
    headers: { ...HDRS(), 'Content-Type': type },
    body: blob,
  });
  if (!res.ok) throw new Error(`upload ${res.status} ${await res.text()}`);
  return `${CONFIG.url}/storage/v1/object/public/${CONFIG.bucket}/${name}`;
}

/* ─── helpers ──────────────────────────────────────────────────────────── */
const digits10 = (s) => String(s || '').replace(/\D/g, '').slice(-10);
const fmtPhone = (n) => `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
const tel = (s) => 'tel:' + String(s).replace(/[^\d+]/g, '');
function catOf(name) {
  const t = String(name || '').toLowerCase();
  if (/wheel\s*chair/.test(t)) return 'Wheelchair';
  if (/bed|fowler|recliner/.test(t)) return 'BED';
  if (/bipap|cpap|\bpap\b/.test(t)) return 'BIPAP / CPAP';
  if (/cylinder/.test(t)) return 'Oxygen Cylinder';
  if (/concentrat|\boc\b|oc-|\d\s*l(pm|tr)?\b/.test(t)) return 'OC-5L / OC-10L';
  if (/dvt/.test(t)) return 'DVT-PUMP';
  if (/monitor/.test(t)) return 'Monitor';
  if (/suction/.test(t)) return 'Suction Machine';
  return '';
}
function guessType(cat, name) {
  const t = String(name || '').toLowerCase();
  if (cat === 'BED') {
    if (/paramount/.test(t)) return 'Paramount Bed';
    if (/recliner/.test(t)) return 'Recliner Bed';
    if (/electric|motor|5\s*func|3\s*func/.test(t)) return 'Electric Bed';
    if (/manual|semi|fowler|crank/.test(t)) return 'Manual Bed';
  }
  if (cat === 'Wheelchair') {
    if (/stair/.test(t)) return 'Stair-Climbing';
    if (/motor|electric|power/.test(t)) return 'Motorized Wheelchair';
    if (/manual|fold|standard/.test(t)) return 'Manual Wheelchair';
  }
  return '';
}
/* delivery row ke line_items / item_name → item names (delivery app jaisa) */
function itemNames(row) {
  let li = row.line_items;
  if (typeof li === 'string') {
    const s = li.trim();
    if (/^[[{"]/.test(s)) {
      try {
        li = JSON.parse(s);
      } catch (_) {}
    }
  }
  if (Array.isArray(li)) {
    const n = li.map((x) => (typeof x === 'string' ? x : x && x.name) || '').filter(Boolean);
    if (n.length) return n;
  }
  if (typeof li === 'string' && li.trim() && li !== 'null')
    return li.split(',').map((s) => s.trim()).filter(Boolean);
  if (row.item_name && row.item_name !== 'null')
    return String(row.item_name).split('|').map((s) => s.split(' x')[0].trim()).filter(Boolean);
  return [];
}
/* lookup rows → customer (naam, city, products) */
function toCustomer(rows, num) {
  if (!Array.isArray(rows) || !rows.length) return null;
  const seen = new Set();
  const products = [];
  const invoices = [];
  rows.forEach((r) => {
    const inv = String(r.invoice || '').trim();
    if (inv && !invoices.some((x) => x.invoice === inv))
      invoices.push({ invoice: inv, store: String(r.store || '').toUpperCase(), items: itemNames(r).join(', ') });
    itemNames(r).forEach((n) => {
      const cat = catOf(n);
      const k = n.toLowerCase();
      if (!cat || seen.has(k)) return;
      seen.add(k);
      // product jis (latest) invoice pe aaya — wahi invoice + store
      products.push({ name: n, cat, type: guessType(cat, n), invoice: inv, store: String(r.store || '').toUpperCase() });
    });
  });
  const code = String(rows[0].store || '').toUpperCase();
  return {
    registered: true,
    name: rows.find((r) => r.name)?.name || '',
    phone: num,
    city: CODE_TO_CITY[code] || '',
    products,
    invoices,
  };
}
function shrinkImage(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(u);
      const s = Math.min(1, PHOTO_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * s);
      c.height = Math.round(im.naturalHeight * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      const tryQ = (q) =>
        c.toBlob(
          (b) => {
            if (!b) return rej(new Error('photo'));
            if (b.size > PHOTO_KB * 1024 && q > 0.45) return tryQ(q - 0.15);
            res(b);
          },
          'image/jpeg',
          q,
        );
      tryQ(0.8);
    };
    im.onerror = () => {
      URL.revokeObjectURL(u);
      rej(new Error('photo'));
    };
    im.src = u;
  });
}
function audioMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return (
    ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'].find((m) =>
      MediaRecorder.isTypeSupported(m),
    ) || ''
  );
}
const extOf = (type) =>
  /mp4|m4a|aac/.test(type) ? 'm4a' : /ogg/.test(type) ? 'ogg' : /mpeg|mp3/.test(type) ? 'mp3' : /wav/.test(type) ? 'wav' : 'webm';
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* ═══════════════════════════════════════════════════════════════ FORM */
export default function ComplaintForm() {
  const [step, setStep] = useState('gate'); // gate | form | done
  const [num, setNum] = useState('');
  const [gateErr, setGateErr] = useState('');
  const [checking, setChecking] = useState(false);
  const [cust, setCust] = useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [prod, setProd] = useState('');
  const [ptype, setPtype] = useState('');
  const [other, setOther] = useState('');
  const [desc, setDesc] = useState('');
  const [city, setCity] = useState('');
  const [invoice, setInvoice] = useState('');
  const [photos, setPhotos] = useState([]); // {blob,url}
  const [photoErr, setPhotoErr] = useState('');
  const [busyPhotos, setBusyPhotos] = useState(false);
  const [voice, setVoice] = useState(null); // {blob,url,dur,note}
  const [voiceErr, setVoiceErr] = useState('');
  const [rec, setRec] = useState({ on: false, sec: 0 });
  const recRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const [done, setDone] = useState(null);
  // ek complaint ki saari files ek hi folder mein: <mobile>/<date-time>-<random>/
  // Submit fail hua aur dobara dabaya to wahi folder + pehle se upload hui
  // files dobara use hoti hain (duplicate files nahi banti).
  const upRef = useRef({ folder: '', urls: new Map() });

  useEffect(() => {
    document.title = 'Product Service Request · Healthy Jeena Sikho';
  }, []);

  /* product options: registered → uske products; warna saari list */
  const prodOptions = useMemo(() => {
    if (cust && cust.registered && cust.products.length)
      return cust.products.map((p, i) => ({ value: `p${i}`, label: `${p.name} (${p.cat})`, cat: p.cat, type: p.type, name: p.name, invoice: p.invoice, store: p.store }));
    return PRODUCTS.map((c) => ({ value: `c:${c}`, label: c, cat: c, type: '', name: c }));
  }, [cust]);
  const picked = prod === 'other' ? { cat: 'Other', name: other.trim() } : prodOptions.find((o) => o.value === prod) || null;
  const typeDef = picked ? TYPES[picked.cat] : null;

  const missing = [];
  if (step === 'form') {
    if (!(cust && cust.registered) && name.trim().length < 2) missing.push('full name');
    if (!picked) missing.push('product');
    if (prod === 'other' && !other.trim()) missing.push('product name');
    if (typeDef && !ptype) missing.push(typeDef.label.toLowerCase());
    if (!desc.trim()) missing.push('problem description');
    if (!city) missing.push('city');
    if (busyPhotos) missing.push('photos to finish processing');
    if (rec.on) missing.push('voice recording to stop');
  }

  /* ── number check ── */
  const check = async () => {
    if (!/^[6-9]\d{9}$/.test(num)) {
      setGateErr('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setChecking(true);
    setGateErr('');
    let c = null;
    try {
      c = toCustomer(await sbRpc('complaint_customer_lookup', { p_phone: num }), num);
    } catch (e) {
      console.warn('[complaint lookup]', e);
      c = null; // lookup fail ho to bhi customer complaint daal sake
    }
    const cu = c || { registered: false, name: '', phone: num, city: '', products: [], invoices: [] };
    setCust(cu);
    resetForm(cu);
    setChecking(false);
    setStep('form');
    window.scrollTo(0, 0);
  };
  const resetForm = (cu) => {
    setName(cu ? cu.name : '');
    setEmail('');
    const only = cu && cu.registered && cu.products.length === 1;
    setProd(only ? 'p0' : '');
    setPtype(only ? cu.products[0].type : '');
    setInvoice(only ? cu.products[0].invoice || '' : cu && cu.registered && cu.invoices.length === 1 ? cu.invoices[0].invoice : '');
    setOther('');
    setDesc('');
    setCity(cu ? cu.city : '');
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setPhotoErr('');
    clearVoice();
    setSendErr('');
  };
  const backToGate = () => {
    upRef.current = { folder: '', urls: new Map() };
    resetForm(null);
    setCust(null);
    setNum('');
    setStep('gate');
    setDone(null);
    window.scrollTo(0, 0);
  };

  /* ── photos ── */
  const addPhotos = async (files) => {
    setPhotoErr('');
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    const room = MAX_PHOTOS - photos.length;
    if (list.length > room) setPhotoErr(`Only ${MAX_PHOTOS} photos allowed - added the first ${room}.`);
    setBusyPhotos(true);
    const out = [];
    for (const f of list.slice(0, room)) {
      try {
        const b = await shrinkImage(f);
        out.push({ blob: b, url: URL.createObjectURL(b) });
      } catch (_) {
        setPhotoErr('One photo could not be read. Please try another.');
      }
    }
    setPhotos((p) => [...p, ...out]);
    setBusyPhotos(false);
  };
  const removePhoto = (i) =>
    setPhotos((p) => {
      URL.revokeObjectURL(p[i].url);
      return p.filter((_, j) => j !== i);
    });

  /* ── voice ── */
  function clearVoice() {
    const r = recRef.current;
    if (r && r.rec && r.rec.state !== 'inactive') {
      r.rec.onstop = null;
      r.rec.stop();
      r.stream.getTracks().forEach((t) => t.stop());
    }
    if (r) clearInterval(r.timer);
    recRef.current = null;
    setRec({ on: false, sec: 0 });
    setVoice((v) => {
      if (v) URL.revokeObjectURL(v.url);
      return null;
    });
    setVoiceErr('');
  }
  const toggleRec = async () => {
    const cur = recRef.current;
    if (cur && cur.rec.state === 'recording') {
      cur.rec.stop();
      return;
    }
    setVoiceErr('');
    const mime = audioMime();
    if (mime === null || !navigator.mediaDevices) {
      setVoiceErr('Recording is not supported in this browser. Please upload a voice note instead.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (_) {
      setVoiceErr('Microphone permission was blocked. Allow the mic in your browser, or upload a voice note below.');
      return;
    }
    const chunks = [];
    const r = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
    const start = Date.now();
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      clearInterval(recRef.current && recRef.current.timer);
      const d = (Date.now() - start) / 1000;
      setRec({ on: false, sec: 0 });
      if (d < 1) {
        setVoiceErr('Too short - tap the mic to record again.');
        return;
      }
      const blob = new Blob(chunks, { type: r.mimeType || 'audio/webm' });
      setVoice({ blob, url: URL.createObjectURL(blob), dur: Math.min(d, VOICE_SEC), note: '' });
    };
    r.start(250);
    const timer = setInterval(() => {
      const s = (Date.now() - start) / 1000;
      setRec({ on: true, sec: s });
      if (s >= VOICE_SEC && r.state === 'recording') r.stop();
    }, 200);
    recRef.current = { rec: r, stream, timer };
    setRec({ on: true, sec: 0 });
  };
  const uploadVoice = (f) => {
    setVoiceErr('');
    if (!f) return;
    if (!f.type.startsWith('audio/')) {
      setVoiceErr('Please choose an audio file.');
      return;
    }
    if (f.size > AUDIO_MB * 1048576) {
      setVoiceErr(`This voice note is ${(f.size / 1048576).toFixed(1)} MB. Please keep it under 1 minute (max ${AUDIO_MB} MB).`);
      return;
    }
    setVoice({ blob: f, url: URL.createObjectURL(f), dur: 0, note: 'uploaded' });
  };
  useEffect(() => () => clearVoice(), []); // eslint-disable-line

  /* ── submit ── */
  const submit = async (e) => {
    e.preventDefault();
    if (missing.length || sending) return;
    setSending(true);
    setSendErr('');
    try {
      const up = upRef.current;
      if (!up.folder || !up.folder.startsWith(num + '/')) {
        const d = new Date();
        const p2 = (n) => String(n).padStart(2, '0');
        const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
        const rand = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('');
        up.folder = `${num}/${stamp}-${rand}`;
        up.urls = new Map();
      }
      const put = async (blob, file) => {
        const key = `${file}|${blob.size}`;
        if (!up.urls.has(key)) up.urls.set(key, await sbUpload(blob, `${up.folder}/${file}`));
        return up.urls.get(key);
      };
      const photoUrls = [];
      for (let i = 0; i < photos.length; i++) photoUrls.push(await put(photos[i].blob, `photo-${i + 1}.jpg`));
      const voiceUrl = voice ? await put(voice.blob, `voice.${extOf(voice.blob.type)}`) : null;
      const product = picked.cat === 'Other' ? picked.name : picked.cat;
      const res = await sbRpc('complaint_submit', {
        p_name: (cust.registered ? cust.name || name : name).trim(),
        p_phone: num,
        p_email: email.trim() || null,
        p_city: city,
        p_product: product,
        p_product_type: typeDef ? ptype : null,
        p_item_name: picked.cat !== 'Other' && picked.name !== picked.cat ? picked.name : null,
        p_description: desc.trim(),
        p_photos: photoUrls,
        p_voice: voiceUrl,
        p_invoice: invoice.trim() || null,
      });
      const out = Array.isArray(res) ? res[0] : res;
      const store = CITY_TO_STORE[city] || '';
      setDone({
        ticket: (out && (out.ticket_number || out.ticket_id)) || '',
        registered: out && typeof out.registered === 'boolean' ? out.registered : cust.registered,
        store,
        contact: STORE_CONTACT[store] || null,
        name: (cust.registered ? cust.name || name : name).trim(),
        product: `${picked.cat === 'Other' ? picked.name : picked.name}${typeDef ? ' · ' + (typeDef.opts.find((o) => o[0] === ptype) || [ptype, ptype])[1] : ''}`,
        city,
        invoice: invoice.trim(),
        desc: desc.trim(),
        photos: photoUrls.length,
        voice: !!voiceUrl,
      });
      setStep('done');
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('[complaint submit]', err);
      setSendErr(`Your complaint could not be sent. Please check your internet and try again, or call ${EMERGENCY}.`);
    }
    setSending(false);
  };

  const reg = !!(cust && cust.registered);
  return (
    <div className="hjs-cform">
      <style>{CSS}</style>
      <Leaves />
      <main className="wrap">
        <div className="logo">
          <svg width="30" height="34" viewBox="0 0 30 34" aria-hidden="true">
            <path d="M15 2c7 6 10 13 6 21-2 4-6 7-6 9 0-2-4-5-6-9C5 15 8 8 15 2z" fill="#6aae3c" opacity=".35" />
            <path d="M15 6v26M15 14l-5-4M15 20l6-5" stroke="#6aae3c" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </svg>
          Healthy Jeena Sikho
        </div>
        <h1>{step === 'done' ? 'Request received' : 'Product Service Request'}</h1>
        <div className="rule" />

        {step === 'gate' && (
          <section className="card">
            <label className="l" htmlFor="cf-phone">
              Registered Mobile Number <span className="req">*</span>
            </label>
            <p className="help" style={{ margin: '0 0 10px' }}>
              Enter the mobile number you used when renting from HJS
            </p>
            <div className="phonebox">
              <span>+91</span>
              <input
                id="cf-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Mobile number"
                autoComplete="tel-national"
                value={num}
                onChange={(e) => {
                  setNum(e.target.value.replace(/\D/g, '').slice(0, 10));
                  setGateErr('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && num.length === 10 && check()}
              />
            </div>
            {gateErr && <div className="err">{gateErr}</div>}
            <div className="btnrow" style={{ marginTop: 14 }}>
              <button className="btn" type="button" disabled={num.length !== 10 || checking} onClick={check}>
                {checking ? 'Checking…' : 'Continue'}
              </button>
            </div>
          </section>
        )}

        {step === 'form' && (
          <form onSubmit={submit} noValidate>
            {!reg && (
              <div className="card unreg" role="status">
                <b>We couldn't find this number in our records.</b> No problem, you can still raise your complaint. Please fill your details
                below and our team will verify them.
              </div>
            )}
            <div className="card">
              <label className="l" htmlFor="cf-name">
                Full Name <span className="req">*</span>
              </label>
              <input
                id="cf-name"
                type="text"
                readOnly={reg && !!cust.name}
                placeholder={reg && cust.name ? '' : 'Enter your full name'}
                value={reg && cust.name ? cust.name : name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="card">
              <div className="row">
                <div>
                  <label className="l" htmlFor="cf-mob">
                    Registered Mobile Number <span className="req">*</span>
                  </label>
                  <input id="cf-mob" type="tel" readOnly value={fmtPhone(num)} />
                </div>
                <div>
                  <label className="l" htmlFor="cf-email">
                    Email Address
                  </label>
                  <input id="cf-email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
                </div>
              </div>
              <div className="lockt">
                <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
                <span className="locktxt">{reg ? 'Name and mobile are taken from your HJS account' : 'Mobile number you entered'}</span>
                <button type="button" className="chg" onClick={backToGate}>
                  Not you? Change number
                </button>
              </div>
            </div>

            <div className="card">
              <label className="l" htmlFor="cf-prod">
                Product <span className="req">*</span>
              </label>
              <select
                id="cf-prod"
                value={prod}
                onChange={(e) => {
                  const v = e.target.value;
                  setProd(v);
                  const o = prodOptions.find((x) => x.value === v);
                  setPtype(o ? o.type : '');
                  // registered: product ka invoice aur store apne aap
                  if (o && o.invoice) {
                    setInvoice(o.invoice);
                    if (CODE_TO_CITY[o.store]) setCity(CODE_TO_CITY[o.store]);
                  }
                }}
              >
                {!(reg && prodOptions.length === 1) && <option value="">-Select-</option>}
                {prodOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                <option value="other">{reg ? 'Other product' : 'Other'}</option>
              </select>
              <p className="help">{reg ? (prodOptions.length === 1 ? 'Your product with us' : 'Only products you have with us are shown') : 'Select the product you have from HJS'}</p>
              {typeDef && (
                <div className="sub">
                  <label className="l" htmlFor="cf-type">
                    {typeDef.label} <span className="req">*</span>
                  </label>
                  <select id="cf-type" value={ptype} onChange={(e) => setPtype(e.target.value)}>
                    <option value="">-Select-</option>
                    {typeDef.opts.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {prod === 'other' && (
                <div className="sub">
                  <label className="l" htmlFor="cf-other">
                    Product name <span className="req">*</span>
                  </label>
                  <input id="cf-other" type="text" maxLength={60} value={other} onChange={(e) => setOther(e.target.value)} />
                </div>
              )}
            </div>

            <div className="card">
              <label className="l" htmlFor="cf-inv">
                Invoice Number <span className="opt">(optional)</span>
              </label>
              {reg && cust.invoices.length > 0 ? (
                <select id="cf-inv" value={invoice} onChange={(e) => setInvoice(e.target.value)}>
                  <option value="">Not sure</option>
                  {cust.invoices.map((x) => (
                    <option key={x.invoice} value={x.invoice}>
                      {x.invoice}
                      {x.items ? ` · ${x.items.length > 40 ? x.items.slice(0, 40) + '…' : x.items}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="cf-inv"
                  type="text"
                  autoCapitalize="characters"
                  placeholder="e.g. NWD/25-26/1234"
                  maxLength={40}
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value.toUpperCase())}
                />
              )}
              <p className="help">{reg && cust.invoices.length > 0 ? 'Picked from the product you chose - change it if needed' : 'Written on your HJS bill or WhatsApp invoice'}</p>
            </div>

            <div className="card">
              <label className="l" htmlFor="cf-desc">
                Problem Description <span className="req">*</span>
              </label>
              <textarea
                id="cf-desc"
                maxLength={500}
                placeholder="e.g. Bed remote stopped working since morning, bed is stuck in upright position"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
              <div className="count">{desc.length}/500</div>
            </div>

            <div className="card">
              <span className="l">
                Product Photos <span className="opt">(optional, up to 3)</span>
              </span>
              {photos.length > 0 && (
                <div className="thumbs">
                  {photos.map((p, i) => (
                    <div className="th" key={p.url}>
                      <img src={p.url} alt={`Photo ${i + 1}`} />
                      <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => removePhoto(i)}>
                        ×
                      </button>
                      <small>{Math.round(p.blob.size / 1024)} KB</small>
                    </div>
                  ))}
                </div>
              )}
              {photos.length < MAX_PHOTOS && (
                <label className="drop">
                  <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="6" width="18" height="14" rx="3" fill="none" stroke="#6aae3c" strokeWidth="1.8" />
                    <circle cx="12" cy="13" r="3.5" fill="none" stroke="#6aae3c" strokeWidth="1.8" />
                    <path d="M8 6l1.5-2.5h5L16 6" fill="none" stroke="#6aae3c" strokeWidth="1.8" />
                  </svg>
                  <strong>{busyPhotos ? 'Processing photo…' : 'Take or upload a photo'}</strong>
                  <div className="pills">
                    <span>Auto-compressed to under 500 KB</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      addPhotos(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
              {photoErr && <div className="err">{photoErr}</div>}
            </div>

            <div className="card">
              <span className="l">
                Voice Note <span className="opt">(optional, up to 60 sec)</span>
              </span>
              <p className="help" style={{ margin: '0 0 10px' }}>
                Tell us the problem in your own words, in Hindi or English
              </p>
              {!voice ? (
                <>
                  <div className="rec">
                    <button type="button" className={rec.on ? 'mic on' : 'mic'} aria-label={rec.on ? 'Stop recording' : 'Start recording'} onClick={toggleRec}>
                      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="9" y="3" width="6" height="11" rx="3" fill="#fff" />
                        <path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                    <div className="recinfo">
                      <b>{rec.on ? 'Recording… tap to stop' : 'Tap to record'}</b>
                      <span>
                        {mmss(rec.sec)} / 1:00
                      </span>
                      <div className="track">
                        <i style={{ width: `${Math.min(100, (rec.sec / VOICE_SEC) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  <label className="altup">
                    Mic not working? <span>Upload a voice note</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        uploadVoice(e.target.files[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </>
              ) : (
                <div>
                  <audio src={voice.url} controls />
                  <div className="vmeta">
                    <span>
                      {voice.dur ? mmss(voice.dur) + ' · ' : ''}
                      {Math.round(voice.blob.size / 1024)} KB{voice.note ? ' · ' + voice.note : ''}
                    </span>
                    <button type="button" className="linkbtn" onClick={clearVoice}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
              {voiceErr && <div className="err">{voiceErr}</div>}
            </div>

            <div className="card">
              <label className="l" htmlFor="cf-city">
                Select the city <span className="req">*</span>
              </label>
              <select id="cf-city" value={city} onChange={(e) => setCity(e.target.value)}>
                {!city && <option value="">-Select-</option>}
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {sendErr && <div className="card senderr">{sendErr}</div>}
            <div className="btnrow">
              <button className="btn" type="submit" disabled={missing.length > 0 || sending}>
                {sending ? 'Sending…' : 'Submit'}
              </button>
              <div className="missing">{missing.length ? 'Please fill: ' + missing.join(', ') : ''}</div>
            </div>
          </form>
        )}

        {step === 'done' && done && (
          <section aria-live="polite">
            <div className="stub">
              <div className="head">
                <div className="okc">
                  <svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2>Your complaint has been registered</h2>
                <div className="muted">Thank you, {done.name}</div>
                {done.ticket && <div className="tid">Ticket {done.ticket}</div>}
              </div>
              <div className="perf" />
              <div className="sec">
                <div className="hour">
                  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" style={{ flex: 'none' }}>
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Our team will contact you within 1 hour
                </div>
                {done.registered && done.contact && (
                  <div className="store">
                    <small>Your complaint is assigned to</small>
                    <div className="nm">{done.contact.name}</div>
                    <div className="ad">{done.contact.person}</div>
                    <a className="call" href={tel(done.contact.phone)}>
                      Call store <span className="num">{done.contact.phone}</span>
                    </a>
                  </div>
                )}
                <div className="emg">
                  If you have an emergency, please contact <a href={tel(EMERGENCY)}>{EMERGENCY}</a>
                </div>
                <div className="sum">
                  Product: <b>{done.product}</b>
                  {done.invoice && (
                    <>
                      <br />
                      Invoice: <b>{done.invoice}</b>
                    </>
                  )}
                  <br />
                  City: <b>{done.city}</b>
                  <br />
                  Problem: <b>{done.desc}</b>
                  {done.photos > 0 && (
                    <>
                      <br />
                      Photos: <b>{done.photos} attached</b>
                    </>
                  )}
                  {done.voice && (
                    <>
                      <br />
                      Voice note: <b>attached</b>
                    </>
                  )}
                  {!done.registered && (
                    <>
                      <br />
                      Note: <b>number not in our records - our team will verify</b>
                    </>
                  )}
                </div>
                <button className="btn again" type="button" onClick={backToGate}>
                  Raise another complaint
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Leaves() {
  return (
    <svg className="leaves" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <path id="cf-lf" d="M0 0C30-40 90-50 130-30 100 10 40 30 0 0z" />
      </defs>
      <g fill="#b9d6a3" opacity=".55">
        <use href="#cf-lf" transform="translate(40 120) rotate(-30) scale(1.6)" />
        <use href="#cf-lf" transform="translate(90 300) rotate(20) scale(1.3)" />
        <use href="#cf-lf" transform="translate(20 520) rotate(-50) scale(1.8)" />
        <use href="#cf-lf" transform="translate(1160 90) rotate(150) scale(1.6)" />
        <use href="#cf-lf" transform="translate(1110 330) rotate(200) scale(1.4)" />
        <use href="#cf-lf" transform="translate(1180 600) rotate(160) scale(1.9)" />
      </g>
    </svg>
  );
}

/* Zoho form jaisa look — leafy green, cream cards, Lora serif. Purane
   phones ke liye light-dark() / :has() / aspect-ratio use nahi kiye. */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap');
html,body{margin:0;padding:0}
#root{max-width:none!important;width:100%!important;margin:0!important;padding:0!important;text-align:left!important}
.hjs-cform{--bg:#eef3ea;--card:#fbfaf5;--ink:#1f2a1f;--mute:#6b7a68;--leaf:#6aae3c;--leafd:#3f7d1f;--line:#b9d6a3;--inbg:#fff;--lock:#f2f6ee;--soft:#e6f2dc;--red:#c0392b;--redbg:#fdecea;--ring:#dcefcd;
  min-height:100vh;color:var(--ink);font:16px/1.5 Lora,Georgia,serif;overflow-x:hidden;position:relative;
  background:var(--bg) radial-gradient(1200px 500px at 50% -120px,#dcebd0,transparent)}
@media(prefers-color-scheme:dark){.hjs-cform{--bg:#0f1a12;--card:#18241b;--ink:#e5ede3;--mute:#9fb09c;--leafd:#9ad270;--line:#3a5a2c;--inbg:#111a13;--lock:#1d2b20;--soft:#22351f;--red:#ff8a7a;--redbg:#3a1c18;--ring:#2c4a22;background:var(--bg)}}
.hjs-cform *{box-sizing:border-box;min-width:0}
.hjs-cform .leaves{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:.5}
.hjs-cform .wrap{position:relative;z-index:1;max-width:640px;margin:0 auto;padding:22px max(4vw,12px) 60px}
.hjs-cform .logo{display:flex;justify-content:center;align-items:center;gap:8px;color:var(--leaf);font-weight:700;font-size:24px;font-family:system-ui,sans-serif}
.hjs-cform h1{font-family:Lora,Georgia,serif;letter-spacing:normal;text-align:center;font-size:clamp(26px,5vw,32px);line-height:1.1;margin:14px 0 6px;font-weight:700;color:var(--ink)}
.hjs-cform .rule{height:1px;background:var(--line);margin:0 0 18px}
.hjs-cform .card{background:var(--card);border-radius:10px;padding:18px 20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(30,60,20,.08)}
.hjs-cform .l{display:block;font-size:15px;margin-bottom:6px;font-weight:500}
.hjs-cform .req{color:var(--red)}
.hjs-cform .opt{color:var(--mute);font-size:13px;font-weight:400}
.hjs-cform .row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
.hjs-cform input[type=text],.hjs-cform input[type=email],.hjs-cform input[type=tel],.hjs-cform select,.hjs-cform textarea{width:100%;font:16px/1.4 system-ui,sans-serif;color:var(--ink);background:var(--inbg);border:1px solid var(--line);border-radius:999px;padding:10px 16px;min-height:44px;outline:none}
.hjs-cform textarea{border-radius:16px;min-height:110px;resize:vertical}
.hjs-cform select{-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6' fill='none' stroke='%236aae3c' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-size:18px;padding-right:42px}
.hjs-cform input:focus,.hjs-cform select:focus,.hjs-cform textarea:focus{border-color:var(--leaf);box-shadow:0 0 0 3px var(--ring)}
.hjs-cform input[readonly]{background:var(--lock)}
.hjs-cform .phonebox{display:flex;align-items:center;border:1px solid var(--line);border-radius:999px;background:var(--inbg);padding-left:16px}
.hjs-cform .phonebox span{font:600 16px system-ui,sans-serif;color:var(--mute);padding-right:8px;border-right:1px solid var(--line)}
.hjs-cform .phonebox input{border:0!important;box-shadow:none!important;background:transparent;letter-spacing:.04em}
.hjs-cform .phonebox:focus-within{border-color:var(--leaf);box-shadow:0 0 0 3px var(--ring)}
.hjs-cform .lockt{display:flex;flex-wrap:wrap;align-items:center;gap:5px;color:var(--leafd);font-size:12.5px;margin-top:8px;font-family:system-ui,sans-serif}
.hjs-cform .lockt svg{flex:none}.hjs-cform .locktxt{flex:1 1 200px}
.hjs-cform .chg{margin-left:auto;background:none;border:0;color:var(--leafd);font:600 13px system-ui,sans-serif;text-decoration:underline;cursor:pointer;min-height:32px;padding:0}
.hjs-cform .unreg{background:#fff8e6;border:1px solid #f0d48a;color:#6b5310;font:14.5px/1.5 system-ui,sans-serif}
.hjs-cform .unreg b{display:block;margin-bottom:2px}
.hjs-cform .sub{margin-top:14px;padding-top:14px;border-top:1px dashed var(--line)}
.hjs-cform .help{color:var(--mute);font-size:13.5px;margin:4px 0 0;font-family:system-ui,sans-serif}
.hjs-cform .count{text-align:right;color:var(--mute);font-size:12.5px;font-family:system-ui,sans-serif;margin-top:4px}
.hjs-cform .drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;text-align:center;border:2px dashed var(--line);border-radius:14px;padding:14px;cursor:pointer;min-height:110px;color:var(--mute);font-family:system-ui,sans-serif}
.hjs-cform .drop:hover,.hjs-cform .drop:focus-within{border-color:var(--leaf);background:var(--soft)}
.hjs-cform .drop strong{color:var(--ink);font-size:16px}
.hjs-cform .drop input,.hjs-cform .altup input{position:absolute;opacity:0;width:1px;height:1px}
.hjs-cform .pills{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:6px}
.hjs-cform .pills span{background:var(--soft);color:var(--leafd);border-radius:999px;padding:2px 10px;font-size:12.5px}
.hjs-cform .thumbs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px}
.hjs-cform .th{position:relative;height:0;padding-bottom:100%;border-radius:12px;overflow:hidden;background:var(--soft)}
.hjs-cform .th img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;display:block}
.hjs-cform .th button{position:absolute;top:4px;right:4px;width:32px;height:32px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font:700 18px/1 system-ui;cursor:pointer}
.hjs-cform .th small{position:absolute;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);color:#fff;font:11.5px system-ui,sans-serif;padding:2px 6px}
.hjs-cform .rec{display:flex;align-items:center;gap:14px;border:1px solid var(--line);border-radius:999px;padding:8px 18px 8px 8px;background:var(--inbg)}
.hjs-cform .mic{width:56px;height:56px;border-radius:50%;border:0;background:var(--leaf);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
.hjs-cform .mic.on{background:#c0392b;animation:cfpulse 1.2s infinite}
.hjs-cform .mic.on svg{display:none}.hjs-cform .mic.on:after{content:"";width:18px;height:18px;border-radius:3px;background:#fff}
@keyframes cfpulse{0%{box-shadow:0 0 0 0 rgba(192,57,43,.45)}100%{box-shadow:0 0 0 14px rgba(192,57,43,0)}}
.hjs-cform .recinfo{flex:1;font-family:system-ui,sans-serif}
.hjs-cform .recinfo b{display:block;font-weight:600;font-size:15px}
.hjs-cform .recinfo span{color:var(--mute);font-size:13px;font-variant-numeric:tabular-nums}
.hjs-cform .track{height:6px;border-radius:99px;background:var(--soft);overflow:hidden;margin-top:4px}
.hjs-cform .track i{display:block;height:100%;width:0;background:var(--leaf)}
.hjs-cform audio{width:100%;display:block}
.hjs-cform .vmeta{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:6px;font:14px system-ui,sans-serif;color:var(--mute)}
.hjs-cform .linkbtn{background:none;border:0;color:var(--red);font:600 15px system-ui,sans-serif;cursor:pointer;min-height:44px;padding:0 6px}
.hjs-cform .altup{position:relative;display:block;text-align:center;margin-top:10px;font:13.5px system-ui,sans-serif;color:var(--mute);cursor:pointer}
.hjs-cform .altup span{color:var(--leafd);text-decoration:underline}
.hjs-cform .err{color:var(--red);font:14px system-ui,sans-serif;margin-top:8px}
.hjs-cform .senderr{background:var(--redbg);color:var(--red);font:14.5px/1.5 system-ui,sans-serif}
.hjs-cform .btnrow{text-align:center;margin-top:6px}
.hjs-cform .btn{min-width:180px;min-height:48px;border:0;border-radius:999px;background:var(--leaf);color:#fff;font:600 17px Lora,Georgia,serif;cursor:pointer;padding:0 28px}
.hjs-cform .btn:disabled{opacity:.45;cursor:not-allowed}
.hjs-cform .btn:focus-visible,.hjs-cform .linkbtn:focus-visible,.hjs-cform .call:focus-visible,.hjs-cform .mic:focus-visible{outline:3px solid var(--ink);outline-offset:2px}
.hjs-cform .missing{text-align:center;color:var(--mute);font:13.5px system-ui,sans-serif;margin-top:8px;min-height:20px}
.hjs-cform .stub{background:var(--card);border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(30,60,20,.12)}
.hjs-cform .head{padding:26px 20px 18px;text-align:center}
.hjs-cform .muted{color:var(--mute)}
.hjs-cform .okc{width:70px;height:70px;margin:0 auto 10px;border-radius:50%;background:var(--leaf);display:flex;align-items:center;justify-content:center;animation:cfpop .45s ease-out}
@keyframes cfpop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
.hjs-cform .stub h2{font-family:Lora,Georgia,serif;letter-spacing:normal;font-size:25px;line-height:1.15;margin:0 0 6px;color:var(--ink)}
.hjs-cform .tid{display:inline-block;margin-top:8px;background:var(--soft);color:var(--leafd);border-radius:8px;padding:3px 12px;font:700 15px system-ui,sans-serif}
.hjs-cform .perf{border-top:2px dashed var(--line);position:relative}
.hjs-cform .perf:before,.hjs-cform .perf:after{content:"";position:absolute;top:-12px;width:22px;height:22px;border-radius:50%;background:var(--bg)}
.hjs-cform .perf:before{left:-11px}.hjs-cform .perf:after{right:-11px}
.hjs-cform .sec{padding:18px 20px}
.hjs-cform .hour{display:flex;gap:12px;align-items:center;background:var(--soft);border-radius:12px;padding:12px 14px;color:var(--leafd);font-weight:600}
.hjs-cform .store{margin-top:14px;border:1px solid var(--line);border-radius:12px;padding:14px}
.hjs-cform .store small{color:var(--mute);font:13px system-ui,sans-serif}
.hjs-cform .store .nm{font-size:19px;font-weight:700;line-height:1.2}
.hjs-cform .store .ad{color:var(--mute);font:14px system-ui,sans-serif;margin:2px 0 10px}
.hjs-cform .call{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border-radius:999px;background:var(--leaf);color:#fff;text-decoration:none;font:700 16px system-ui,sans-serif}
.hjs-cform .num{white-space:nowrap}
.hjs-cform .emg{margin-top:14px;background:var(--redbg);border-radius:12px;padding:12px 14px;color:var(--red);font-size:15px}
.hjs-cform .emg a{color:inherit;font-weight:700;white-space:nowrap;display:inline-block;padding:8px 0;margin:-8px 0}
.hjs-cform .sum{font:14px/1.6 system-ui,sans-serif;color:var(--mute);margin-top:14px;overflow-wrap:anywhere}
.hjs-cform .sum b{color:var(--ink);font-weight:600}
.hjs-cform .again{margin-top:14px;background:transparent;color:var(--leafd);border:1.5px solid var(--leaf);width:100%}
@media(max-width:520px){.hjs-cform .row{grid-template-columns:minmax(0,1fr);gap:14px}.hjs-cform .card{padding:16px}}
@media(prefers-reduced-motion:reduce){.hjs-cform .okc,.hjs-cform .mic.on{animation:none}}
`;
