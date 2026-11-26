// @ts-nocheck
/* ══════════════════════════════════════════════════════════════════════
   HJS — Customer Complaint Form  (link: /?complaintform)
   Customer khud complaint daalta hai. Data seedha Supabase `tickets` table
   mein jaata hai — wahi table jo ComplaintApp (?complaints) padhta hai.

   Flow:
   1) Mobile number  → n8n webhook → Zoho Books (naam, invoices, products,
      store). Workflow: n8n/complaint_lookup_workflow.json Mila = form prefilled. Nahi mila = form phir bhi
      khulta hai, customer khud bharta hai (ticket pe "not in records" note).
   2) Product (+ Bed / Wheelchair type), invoice number, problem, photos (max 3, compressed),
      voice note (max 60 sec), city.
   3) Photos/voice → Storage bucket `complaint-media`, phir n8n pehle
      Zoho Desk ticket banata hai aur wahi Desk id/number Supabase tickets mein
      daalta hai (n8n/complaint_submit_workflow.json).
   4) Success: ticket number, "1 ghante mein contact", assigned store ka
      number aur emergency number.

   SQL (bucket + upload rule + naye columns): supabase/complaint_form.sql
   ══════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState } from 'react';

const CONFIG = {
  url: 'https://idcmfebqizovivuvsuns.supabase.co',
  key: 'sb_publishable_T6E3AVHgJE7KKmMV3Ko7tQ_qXvap_V_',
  bucket: 'complaint-media',
};
const HDRS = () => ({ apikey: CONFIG.key, Authorization: `Bearer ${CONFIG.key}` });

/* n8n "Complaint Form - Books customer lookup" workflow ka Production URL.
   n8n mein workflow kholo → Webhook node → Production URL copy karke yahan daalo. */
const N8N_LOOKUP_URL = 'https://n8n.srv1171323.hstgr.cloud/webhook/hjs-complaint-lookup';
/* n8n "Complaint Form (web) - Desk ticket + Supabase" — pehle Zoho Desk ticket,
   phir wahi Desk id/number Supabase tickets mein. Form khud Supabase mein
   ticket nahi daalta (Desk bypass nahi hota). */
const N8N_SUBMIT_URL = 'https://n8n.srv1171323.hstgr.cloud/webhook/hjs-complaint-submit';

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
/* Books lookup (n8n) — 12 sec mein jawab na aaye to customer ko rokte nahi,
   form "not in records" wala khul jaata hai. */
async function booksLookup(phone) {
  if (!N8N_LOOKUP_URL || N8N_LOOKUP_URL.includes('YOUR-N8N-DOMAIN')) return [];
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 12000);
  try {
    const res = await fetch(N8N_LOOKUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_phone: phone }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`lookup ${res.status}`);
    const j = await res.json();
    return Array.isArray(j) ? j : Array.isArray(j && j.rows) ? j.rows : [];
  } finally {
    clearTimeout(tm);
  }
}
async function submitToDesk(payload) {
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 45000);
  try {
    const res = await fetch(N8N_SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.ok || !j.ticket_number) throw new Error(`submit ${res.status} ${j.error || ''}`);
    return j;
  } finally {
    clearTimeout(tm);
  }
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
  // bed sheet / bed pan / over-the-bed table / sieve bed (OC) — bed nahi, accessory
  if (/bed|fowler|recliner/.test(t) && !/sheet|pan\b|table|locker|towel|cover|si[ee]ve|seive|traction|attandant|attendant|bath/.test(t)) return 'BED';
  if (/bipap|cpap|\bpap\b/.test(t)) return 'BIPAP / CPAP';
  if (/cylinder/.test(t)) return 'Oxygen Cylinder';
  if (/concentrat|\boc\b|oc-|\d\s*l(pm|tr)?\b/.test(t)) return 'OC-5L / OC-10L';
  if (/dvt/.test(t)) return 'DVT-PUMP';
  if (/monitor/.test(t)) return 'Monitor';
  if (/suction/.test(t)) return 'Suction Machine';
  return '';
}
/* Books item ke naam se type — HJS Books ke asli item naam dekh ke banaya
   (Nov 2026: 185 wheelchair + 89 bed items). Wheelchair/Bed ka type hamesha
   set hota hai; customer chahe to button daba ke badal sakta hai. */
function guessType(cat, name) {
  const t = String(name || '').toLowerCase();
  if (cat === 'BED') {
    if (/paramount/.test(t)) return 'Paramount Bed';
    if (/recliner|reclining/.test(t)) return 'Recliner Bed';
    if (/manual|semi\s*fowler|full+y?\s*fowler|crank/.test(t) && !/motori[sz]/.test(t)) return 'Manual Bed';
    if (/electric|motori[sz]|\bmot\b|icu|hybrid|\b[1-7]\s*-?\s*f\b|[1-7]\s*-?\s*f(unc|n)|[1-7]\s*function|remote|power supply/.test(t)) return 'Electric Bed';
    return 'Manual Bed';
  }
  if (cat === 'Wheelchair') {
    if (/stair|climb/.test(t)) return 'Stair-Climbing';
    if (/motori[sz]|\bmot\b|mot-|electric|power|joystick|remote|evox|e-?flexx|tetra|zip lite|jazzy|urja|mayra|\bkp[\s-]?\d|morgan|sp 100|mhl[\s-]?1007|freedom e\b|hs-6100/.test(t)) return 'Motorized Wheelchair';
    return 'Manual Wheelchair';
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
  const [editInv, setEditInv] = useState(false);
  const [photos, setPhotos] = useState([]); // {blob,url}
  const [photoErr, setPhotoErr] = useState('');
  const [busyPhotos, setBusyPhotos] = useState(false);
  const [voice, setVoice] = useState(null); // {blob,url,dur,note}
  const [voiceErr, setVoiceErr] = useState('');
  const [rec, setRec] = useState({ on: false, sec: 0 });
  const recRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const [tried, setTried] = useState(false); // Submit dabaya aur kuch baaki tha
  const [done, setDone] = useState(null);
  // ek complaint ki saari files ek hi folder mein: <mobile>/<date-time>-<random>/
  // Submit fail hua aur dobara dabaya to wahi folder + pehle se upload hui
  // files dobara use hoti hain (duplicate files nahi banti).
  const upRef = useRef({ folder: '', urls: new Map() });

  useEffect(() => {
    document.title = 'Product Service Request · Healthy Jeena Sikho';
    // phone dark mode mein bhi form light hi rahe (Zoho form jaisa)
    const add = (name, content) => {
      let m = document.querySelector(`meta[name="${name}"]`);
      if (!m) {
        m = document.createElement('meta');
        m.setAttribute('name', name);
        document.head.appendChild(m);
      }
      m.setAttribute('content', content);
    };
    add('color-scheme', 'light only');
    add('theme-color', '#eef3ea');
  }, []);

  /* product options: registered → uske products; warna saari list */
  const prodOptions = useMemo(() => {
    if (cust && cust.registered && cust.products.length)
      return cust.products.map((p, i) => ({ value: `p${i}`, label: `${p.name} (${p.cat})`, cat: p.cat, type: p.type, name: p.name, invoice: p.invoice, store: p.store }));
    return PRODUCTS.map((c) => ({ value: `c:${c}`, label: c, cat: c, type: '', name: c }));
  }, [cust]);
  const picked = prod === 'other' ? { cat: 'Other', name: other.trim() } : prodOptions.find((o) => o.value === prod) || null;
  const typeDef = picked ? TYPES[picked.cat] : null;
  // Books item se type mila (registered) → sirf wahi dikhao, baaki options nahi
  const typeAuto = !!(typeDef && picked && picked.type && ptype === picked.type);
  const typeLabel = typeDef ? ((typeDef.opts.find((o) => o[0] === ptype) || [ptype, ptype])[1]) : '';

  // Invoice ka store code (CHD/…, NWD/…) → city. Mila to city ka sawaal nahi puchte.
  const invCode = String(invoice || '').split('/')[0].trim().toUpperCase();
  const cityFromInvoice = invoice && invoice.includes('/') ? CODE_TO_CITY[invCode] || '' : '';
  useEffect(() => {
    if (cityFromInvoice && city !== cityFromInvoice) setCity(cityFromInvoice);
  }, [cityFromInvoice]); // eslint-disable-line
  const storeContact = STORE_CONTACT[CITY_TO_STORE[cityFromInvoice || city]] || null;
  // Chip sirf Books se aayi invoice pe; khud type karne wale ko text box hi dikhe
  const invKnown = !!(cust && cust.registered && cust.invoices.some((x) => x.invoice === invoice));

  // kya bharna baaki hai — [label, field id]. Problem likhna optional hai.
  const need = [];
  if (step === 'form') {
    if (!(cust && cust.registered && cust.name) && name.trim().length < 2) need.push(['Your name', 'cf-name']);
    if (!picked) need.push(['Product', 'cf-prod']);
    if (prod === 'other' && !other.trim()) need.push(['Product name', 'cf-other']);
    if (typeDef && !ptype) need.push([typeDef.label, 'cf-type']);
    if (!city) need.push(['City', 'cf-city']);
    if (busyPhotos) need.push(['Wait - photos are still loading', '']);
    if (rec.on) need.push(['Stop the voice recording', '']);
  }
  const missing = need.map((x) => x[0]);
  const bad = (id) => tried && need.some((x) => x[1] === id);

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
      c = toCustomer(await booksLookup(num), num);
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
    setEditInv(false);
    setOther('');
    setDesc('');
    setCity(cu ? cu.city : '');
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setPhotoErr('');
    clearVoice();
    setSendErr('');
    setTried(false);
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
    if (sending) return;
    if (need.length) {
      // Submit hamesha dabta hai — jo baaki hai wo laal ho jaata hai aur
      // pehle khali field pe scroll + focus
      setTried(true);
      const first = need.find((x) => x[1]);
      const el = first && document.getElementById(first[1]);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (el.focus) setTimeout(() => el.focus({ preventScroll: true }), 350);
      }
      return;
    }
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
      const out = await submitToDesk({
        name: (cust.registered ? cust.name || name : name).trim(),
        phone: num,
        email: email.trim() || null,
        city,
        product,
        product_type: typeDef ? ptype : null,
        item_name: picked.cat !== 'Other' && picked.name !== picked.cat ? picked.name : null,
        description: desc.trim() || 'Problem not written by customer - see photos / voice note or call',
        photos: photoUrls,
        voice: voiceUrl,
        invoice: invoice.trim() || null,
        store: storeContact ? storeContact.name : null,
        registered: !!cust.registered,
      });
      const store = CITY_TO_STORE[city] || '';
      setDone({
        ticket: (out && out.ticket_number) || '',
        duplicate: !!(out && out.duplicate),
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
          <img
            src="https://static.wixstatic.com/media/246422_fd02ae3467bf4541aaaaed938b7a5bdb~mv2.jpeg/v1/crop/x_69,y_226,w_656,h_151/fill/w_656,h_151,al_c,q_90/hjs-logo.jpg"
            alt="Healthy Jeena Sikho"
            width="218"
            height="50"
          />
        </div>
        <h1>{step === 'done' ? 'Request received' : 'Product Service Request'}</h1>
        <div className="rule" />

        {step === 'gate' && (
          <>
          <section className="intro">
            <div className="intro-ic" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="intro-t">Product not working right?</div>
              <div className="intro-s">Tell us here and our team will call you within 1 hour.</div>
            </div>
          </section>
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
          <section className="card steps">
            <div className="steps-h">How it works</div>
            {[
              ['Enter your mobile number', 'We find your name and products'],
              ['Tell us the problem', 'Add photos or a voice note if you like'],
              ['We call you within 1 hour', 'Your nearest HJS store takes it up'],
            ].map(([a, b], i) => (
              <div className="st" key={a}>
                <span className="st-n">{i + 1}</span>
                <span>
                  <b>{a}</b>
                  <small>{b}</small>
                </span>
              </div>
            ))}
          </section>
          <div className="help-line">
            Urgent? Call <a href={tel(EMERGENCY)}>{EMERGENCY}</a>
          </div>
          </>
        )}

        {step === 'form' && (
          <form onSubmit={submit} noValidate>
            {/* ── Kaun hai: number mila to sirf naam + number, Back button ── */}
            <div className="card who">
              <button type="button" className="back" onClick={backToGate} aria-label="Back - change number">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
              <div className="who-main">
                <span className="av" aria-hidden="true">
                  {((reg && cust.name) || name || '?').trim().charAt(0).toUpperCase() || '?'}
                </span>
                <span className="who-txt">
                  <b>{reg && cust.name ? cust.name : name.trim() || 'New customer'}</b>
                  <small>
                    {fmtPhone(num)}
                    {reg ? ' · HJS customer' : ''}
                  </small>
                </span>
              </div>
              {(!reg || !cust.name) && (
                <div className="unreg-box">
                  {!reg && <div className="unreg-t">Number not in our records - please add your name</div>}
                  <input
                    id="cf-name"
                    className={bad('cf-name') ? 'bad' : ''}
                    type="text"
                    placeholder="Full name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    autoComplete="name"
                  />
                  <input
                    id="cf-email"
                    type="email"
                    placeholder="Email (optional)"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={120}
                    style={{ marginTop: 8 }}
                  />
                </div>
              )}
            </div>

            {/* ── Product + type + invoice + store (ek hi card) ── */}
            <div className="card">
              <label className="l" htmlFor="cf-prod">
                Product <span className="req">*</span>
              </label>
              <div>
                <select
                  id="cf-prod"
                  className={bad('cf-prod') ? 'bad' : ''}
                  value={prod}
                  onChange={(e) => {
                    const v = e.target.value;
                    setProd(v);
                    const o = prodOptions.find((x) => x.value === v);
                    setPtype(o ? o.type : '');
                    setEditInv(false);
                    // registered: product ka invoice apne aap (store/city invoice se)
                    if (o && o.invoice) setInvoice(o.invoice);
                  }}
                >
                  {!(reg && prodOptions.length === 1) && <option value="">-Select product-</option>}
                  {prodOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  <option value="other">{reg ? 'Other product' : 'Other'}</option>
                </select>
              </div>
              {typeAuto && (
                <div className="facts">
                  <span className="fact">
                    <small>{typeDef.label}</small>
                    <b>{typeLabel}</b>
                  </span>
                </div>
              )}
              {typeDef && !typeAuto && (
                <div id="cf-type" tabIndex={-1} className={'types' + (bad('cf-type') ? ' bad' : '')} role="radiogroup" aria-label={typeDef.label}>
                  <span className="tl">
                    {typeDef.label} <span className="req">*</span>
                  </span>
                  <div className="tchips">
                    {typeDef.opts.map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={ptype === v}
                        className={'tchip' + (ptype === v ? ' on' : '')}
                        onClick={() => setPtype(v)}
                      >
                        {l.replace(/ (Bed|Wheelchair)$/, '')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {prod === 'other' && (
                <input
                  id="cf-other"
                  className={bad('cf-other') ? 'bad' : ''}
                  type="text"
                  placeholder="Product name *"
                  maxLength={60}
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  style={{ marginTop: 8 }}
                />
              )}

              {/* Invoice mila → chip; city/store invoice se, city sawaal chhup jaata hai */}
              {invKnown && !editInv ? (
                <div className="facts">
                  <span className="fact">
                    <small>Invoice</small>
                    <b>{invoice}</b>
                  </span>
                  {storeContact && (
                    <span className="fact">
                      <small>Store</small>
                      <b>{storeContact.name.replace(/^HJS /, '')}</b>
                    </span>
                  )}
                  <button type="button" className="chg" onClick={() => setEditInv(true)}>
                    Change
                  </button>
                </div>
              ) : reg && cust.invoices.length > 0 ? (
                <select id="cf-inv" value={invoice} onChange={(e) => setInvoice(e.target.value)} style={{ marginTop: 8 }}>
                  <option value="">Invoice number - not sure</option>
                  {cust.invoices.map((x) => (
                    <option key={x.invoice} value={x.invoice}>
                      {x.invoice}
                      {x.items ? ` · ${x.items.length > 34 ? x.items.slice(0, 34) + '…' : x.items}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="cf-inv"
                  type="text"
                  autoCapitalize="characters"
                  placeholder="Invoice number (optional) e.g. NWD/25-26/1234"
                  maxLength={40}
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value.toUpperCase())}
                  style={{ marginTop: 8 }}
                />
              )}
              {!cityFromInvoice && (
                <select id="cf-city" className={bad('cf-city') ? 'bad' : ''} value={city} onChange={(e) => setCity(e.target.value)} style={{ marginTop: 8 }} aria-label="City">
                  {!city && <option value="">Select your city *</option>}
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ── Problem + photo + voice (ek hi card) ── */}
            <div className="card">
              <label className="l" htmlFor="cf-desc">
                What's the problem? <span className="opt">(optional)</span>
              </label>
              <textarea
                id="cf-desc"
                maxLength={500}
                placeholder="e.g. Bed remote stopped working since morning"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
              <div className="count">{desc.length}/500</div>

              <div className="media">
                <label className={photos.length >= MAX_PHOTOS || busyPhotos ? 'mbtn off' : 'mbtn'}>
                  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="6" width="18" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
                    <circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  {busyPhotos ? 'Processing…' : `Photo ${photos.length}/${MAX_PHOTOS}`}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={photos.length >= MAX_PHOTOS || busyPhotos}
                    onChange={(e) => {
                      addPhotos(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
                {!voice && (
                  <button type="button" className={rec.on ? 'mbtn recon' : 'mbtn'} onClick={toggleRec}>
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
                      <path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    {rec.on ? `Stop ${mmss(rec.sec)}` : 'Voice note'}
                  </button>
                )}
              </div>
              {rec.on && (
                <div className="track" style={{ marginTop: 8 }}>
                  <i style={{ width: `${Math.min(100, (rec.sec / VOICE_SEC) * 100)}%` }} />
                </div>
              )}
              {photos.length > 0 && (
                <div className="thumbs">
                  {photos.map((p, i) => (
                    <div className="th" key={p.url}>
                      <img src={p.url} alt={`Photo ${i + 1}`} />
                      <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => removePhoto(i)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {voice && (
                <div className="vrow">
                  <audio src={voice.url} controls />
                  <button type="button" className="linkbtn" onClick={clearVoice} aria-label="Delete voice note">
                    Delete
                  </button>
                </div>
              )}
              {!voice && !rec.on && (
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
              )}
              {(photoErr || voiceErr) && <div className="err">{photoErr || voiceErr}</div>}
            </div>

            {sendErr && <div className="card senderr">{sendErr}</div>}
            <div className="btnrow">
              <button className="btn" type="submit" disabled={sending}>
                {sending ? 'Sending…' : 'Submit complaint'}
              </button>
              {tried && need.length > 0 && (
                <div className="missing bad-msg" role="alert">
                  Please fill: <b>{missing.join(', ')}</b>
                </div>
              )}
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
                <h2>{done.duplicate ? 'Your complaint is already registered' : 'Your complaint has been registered'}</h2>
                <div className="muted">Thank you, {done.name}</div>
                {done.ticket && <div className="tid">Ticket #{done.ticket}</div>}
                {done.duplicate && (
                  <div className="muted" style={{ marginTop: 8, fontSize: 14 }}>
                    You already raised a complaint for this product today - our team is working on it.
                  </div>
                )}
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
html,body{margin:0;padding:0;background:#eef3ea;color-scheme:light}
#root{max-width:none!important;width:100%!important;margin:0!important;padding:0!important;text-align:left!important}
.hjs-cform{color-scheme:light;--bg:#eef3ea;--card:#fbfaf5;--ink:#1f2a1f;--mute:#6b7a68;--leaf:#6aae3c;--leafd:#3f7d1f;--line:#b9d6a3;--inbg:#fff;--lock:#f2f6ee;--soft:#e6f2dc;--red:#c0392b;--redbg:#fdecea;--ring:#dcefcd;
  min-height:100vh;color:var(--ink);font:16px/1.5 Lora,Georgia,serif;overflow-x:hidden;position:relative;
  background:var(--bg) radial-gradient(1200px 500px at 50% -120px,#dcebd0,transparent)}
.hjs-cform *{box-sizing:border-box;min-width:0}
.hjs-cform .leaves{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:.5}
.hjs-cform .wrap{position:relative;z-index:1;max-width:640px;margin:0 auto;padding:22px max(4vw,12px) 60px}
.hjs-cform .logo{display:flex;justify-content:center;align-items:center;height:44px}
.hjs-cform .logo img{height:40px;width:auto;max-width:72vw;mix-blend-mode:multiply;display:block}
.hjs-cform .types{margin-top:10px}
.hjs-cform .tl{display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:var(--ink)}
.hjs-cform .tchips{display:flex;flex-wrap:wrap;gap:8px}
.hjs-cform .tchip{flex:1 1 auto;min-height:40px;padding:8px 14px;border-radius:999px;border:1.5px solid var(--line);background:#fff;color:var(--ink);font:600 14px system-ui,sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent}
.hjs-cform .tchip.on{background:var(--leaf);border-color:var(--leaf);color:#fff}
.hjs-cform h1{font-family:Lora,Georgia,serif;letter-spacing:normal;text-align:center;font-size:clamp(26px,5vw,32px);line-height:1.1;margin:14px 0 6px;font-weight:700;color:var(--ink)}
.hjs-cform .rule{height:1px;background:var(--line);margin:0 0 18px}
.hjs-cform .intro{display:flex;gap:14px;align-items:center;background:linear-gradient(135deg,#6aae3c,#3f7d1f);color:#fff;border-radius:14px;padding:18px 18px;margin-bottom:16px;box-shadow:0 6px 18px rgba(63,125,31,.25)}
.hjs-cform .intro-ic{width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex:none}
.hjs-cform .intro-t{font-size:19px;font-weight:700;line-height:1.25}
.hjs-cform .intro-s{font:14.5px/1.45 system-ui,sans-serif;opacity:.95;margin-top:3px}
.hjs-cform .steps-h{font-weight:700;font-size:16px;margin-bottom:10px}
.hjs-cform .st{display:flex;gap:12px;align-items:flex-start;padding:9px 0;border-top:1px dashed var(--line)}
.hjs-cform .steps-h + .st{border-top:0}
.hjs-cform .st-n{width:30px;height:30px;border-radius:50%;background:var(--soft);color:var(--leafd);font:700 15px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;flex:none}
.hjs-cform .st b{display:block;font-weight:600;font-size:15.5px}
.hjs-cform .st small{display:block;color:var(--mute);font:13.5px system-ui,sans-serif;margin-top:1px}
.hjs-cform .help-line{text-align:center;color:var(--mute);font:14.5px system-ui,sans-serif;margin-top:4px}
.hjs-cform .help-line a{color:var(--leafd);font-weight:700;white-space:nowrap;text-decoration:none;display:inline-block;padding:10px 4px}
.hjs-cform .btn:disabled{background:#a9cf8c;opacity:1;color:#fff}
.hjs-cform .who{padding:12px 14px}
.hjs-cform .back{display:inline-flex;align-items:center;gap:2px;background:none;border:0;color:var(--leafd);font:600 15px system-ui,sans-serif;cursor:pointer;padding:6px 8px 6px 0;min-height:40px}
.hjs-cform .who-main{display:flex;align-items:center;gap:12px;margin-top:2px}
.hjs-cform .av{width:42px;height:42px;border-radius:50%;background:var(--soft);color:var(--leafd);display:flex;align-items:center;justify-content:center;font:700 18px system-ui,sans-serif;flex:none}
.hjs-cform .who-txt b{display:block;font-size:17px;line-height:1.2}
.hjs-cform .who-txt small{display:block;color:var(--mute);font:14px system-ui,sans-serif;margin-top:2px}
.hjs-cform .unreg-box{margin-top:12px;padding-top:12px;border-top:1px dashed var(--line)}
.hjs-cform .unreg-t{font:600 13.5px system-ui,sans-serif;color:#8a6a10;background:#fff8e6;border-radius:8px;padding:6px 10px;margin-bottom:8px}
.hjs-cform .row2{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:8px}
.hjs-cform .facts{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px}
.hjs-cform .fact{background:var(--soft);border-radius:10px;padding:5px 10px;font-family:system-ui,sans-serif;line-height:1.25}
.hjs-cform .fact small{display:block;color:var(--mute);font-size:11px}
.hjs-cform .fact b{font-size:14px;color:var(--ink);font-weight:600}
.hjs-cform .media{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px;margin-top:10px}
.hjs-cform .mbtn{position:relative;display:flex;align-items:center;justify-content:center;gap:7px;min-height:46px;border:1.5px dashed var(--line);border-radius:12px;background:var(--inbg);color:var(--leafd);font:600 15px system-ui,sans-serif;cursor:pointer;padding:0 8px}
.hjs-cform .mbtn input{position:absolute;opacity:0;width:1px;height:1px}
.hjs-cform .mbtn.off{opacity:.5;cursor:default}
.hjs-cform .mbtn.recon{border-style:solid;border-color:#c0392b;color:#c0392b;background:#fdecea}
.hjs-cform .vrow{display:flex;align-items:center;gap:6px;margin-top:10px}
.hjs-cform .vrow audio{flex:1;min-width:0;height:40px}
.hjs-cform .thumbs{margin-top:10px;margin-bottom:0}
@media(max-width:360px){.hjs-cform .row2{grid-template-columns:minmax(0,1fr)}}
.hjs-cform .card{background:var(--card);border-radius:10px;padding:18px 20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(30,60,20,.08)}
.hjs-cform .l{display:block;font-size:15px;margin-bottom:6px;font-weight:500}
.hjs-cform .req{color:var(--red)}
.hjs-cform .opt{color:var(--mute);font-size:13px;font-weight:400}
.hjs-cform .row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
.hjs-cform input[type=text],.hjs-cform input[type=email],.hjs-cform input[type=tel],.hjs-cform select,.hjs-cform textarea{width:100%;font:16px/1.4 system-ui,sans-serif;color:var(--ink);background:var(--inbg);border:1px solid var(--line);border-radius:999px;padding:10px 16px;min-height:44px;outline:none}
.hjs-cform textarea{border-radius:16px;min-height:84px;resize:vertical}
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
.hjs-cform .bad-msg{color:var(--red);background:var(--redbg);border-radius:10px;padding:8px 12px;margin:10px auto 0;max-width:420px}
.hjs-cform select.bad,.hjs-cform input.bad{border-color:var(--red)!important;box-shadow:0 0 0 3px var(--redbg)!important}
.hjs-cform .types.bad{outline:none;border-radius:12px;padding:6px;margin-left:-6px;margin-right:-6px;background:var(--redbg)}
.hjs-cform .types.bad .tl{color:var(--red)}
.hjs-cform .opt{color:var(--mute);font-weight:400;font-size:13px;font-family:system-ui,sans-serif}
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
