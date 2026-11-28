// @ts-nocheck
/* ══════════════════════════════════════════════════════════════════════
   MANAGED LISTS  ── delivery persons, store managers, vehicles, payment modes
   Pehle ye lists App.tsx aur Pickups.tsx mein hardcoded thi — har naye
   delivery boy ke liye code change + deploy karna padta tha. Ab ye Supabase
   ki `app_lists` table mein hain aur All stores login ke "Manage Lists" tab
   se add / edit / remove hoti hain.

   Kaise chalta hai:
   • App.tsx / Pickups.tsx apne hardcoded constants registerListTargets() se
     yahan register karte hain. Wahi constants FALLBACK hain — Supabase na
     mile ya table khaali ho to app pehle jaisa hi chalta hai.
   • loadSharedLists() page load pe ek baar get_app_lists RPC chalata hai aur
     registered objects/arrays ko IN-PLACE update karta hai (isliye baaki
     9000 lines mein kuch badalna nahi pada — personsFor, VEHICLES.map,
     STORE_MANAGERS[code] sab wahi hain).
   • Save → admin_save_list RPC (sirf ALL login + password, DB verify karta).
   ══════════════════════════════════════════════════════════════════════ */
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pencil,
  Check,
  X,
  RefreshCw,
  ListChecks,
  Save,
  Undo2,
} from 'lucide-react';

const SB_URL = 'https://idcmfebqizovivuvsuns.supabase.co';
const SB_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkY21mZWJxaXpvdml2dXZzdW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NDgxODgsImV4cCI6MjA5OTMyNDE4OH0.miXziOcl5sEo8S6K1WsrHRhCbtEYRgnnUA4gAISUkmM';

async function rpc(fn, body) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

/* ── list definitions ─────────────────────────────────────────────────── */
export const STORES = ['MOH', 'CHD', 'GGN', 'NCR', 'NOD', 'LDH', 'JAL', 'JPR', 'LKO', 'NWD', 'JKP'];
export const STORE_NAMES = {
  MOH: 'Mohali Showroom',
  CHD: 'Head Office',
  GGN: 'Gurgaon',
  NCR: 'Delhi NCR',
  NOD: 'Noida Showroom',
  LDH: 'Ludhiana',
  JAL: 'Jalandhar',
  JPR: 'Jaipur',
  LKO: 'Lucknow',
  NWD: 'North West Delhi',
  JKP: 'Janakpuri',
};
/* MOH ki apni list khaali ho to CHD wali chalti hai, NOD ki NCR wali —
   pehle bhi aisa hi tha ({ ...DP, MOH: DP.CHD, NOD: DP.NCR }). */
export const SHARES = { MOH: 'CHD', NOD: 'NCR' };
export const MBC = 'MBC';

export const LIST_DEFS = [
  {
    key: 'delivery_person',
    label: 'Delivery / Pickup persons',
    hint: 'Delivery aur Pickup dono ke "person" dropdown mein yahi naam aate hain. MBC hamesha list ke end mein rehta hai.',
    perStore: true,
    withPhone: true,
  },
  {
    key: 'store_manager',
    label: 'Store managers',
    hint: 'Har store ka ek manager — sidebar, customer tracking aur reports mein dikhta hai.',
    perStore: true,
    withPhone: true,
    single: true,
  },
  {
    key: 'vehicle',
    label: 'Vehicles',
    hint: 'Mode of transport dropdown (sab stores ke liye same).',
    perStore: false,
  },
  {
    key: 'pay_option',
    label: 'Payment modes',
    hint: 'Payment mode dropdown (sab stores ke liye same).',
    perStore: false,
  },
];

/* ── registry: har file apne constants yahan deti hai ─────────────────── */
const targets = [];
let lastRows = null;
export function registerListTargets(t) {
  targets.push(t);
  if (lastRows) applyTo(t, lastRows);
}

function group(rows) {
  const g = {};
  for (const r of rows || []) {
    const k = r.list_key;
    const s = r.store || '';
    if (!k || !r.value) continue;
    g[k] = g[k] || {};
    (g[k][s] = g[k][s] || []).push(r);
  }
  for (const k in g)
    for (const s in g[k]) g[k][s] = g[k][s].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((r) => r.value);
  return g;
}
function withMbc(list) {
  const l = list.filter((v) => v !== MBC);
  l.push(MBC);
  return l;
}
function replaceArr(arr, vals) {
  arr.splice(0, arr.length, ...vals);
}
function applyTo(t, rows) {
  const g = group(rows);
  const dp = g.delivery_person || {};
  if (t.DELIVERY_PERSONS) {
    for (const st of STORES) {
      const own = dp[st];
      const shared = SHARES[st] && dp[SHARES[st]];
      const vals = own && own.length ? own : shared && shared.length ? shared : null;
      if (vals) t.DELIVERY_PERSONS[st] = withMbc(vals);
    }
  }
  const sm = g.store_manager || {};
  if (t.STORE_MANAGERS) {
    for (const st of STORES) if (sm[st] && sm[st][0]) t.STORE_MANAGERS[st] = sm[st][0];
  }
  const veh = (g.vehicle || {})[''];
  if (t.VEHICLES && veh && veh.length) replaceArr(t.VEHICLES, veh);
  const pay = (g.pay_option || {})[''];
  if (t.PAY_OPTIONS && pay && pay.length) replaceArr(t.PAY_OPTIONS, pay);
}

let loading = null;
const listeners = new Set();
/* page load pe ek baar. force=true → Save ke baad dobara laao. */
export function loadSharedLists(force) {
  if (loading && !force) return loading;
  loading = rpc('get_app_lists', {})
    .then((rows) => {
      if (!Array.isArray(rows)) return null;
      lastRows = rows;
      for (const t of targets) applyTo(t, rows);
      listeners.forEach((fn) => fn());
      return rows;
    })
    .catch((e) => {
      // table/RPC abhi nahi bani ya network gaya → hardcoded lists hi chalengi
      console.warn('[lists] Supabase se lists nahi aayi, hardcoded use ho rahi:', e);
      loading = null;
      return null;
    });
  return loading;
}

/* App / Pickups ke top pe: lists aate hi ek re-render */
export function useSharedLists() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    loadSharedLists();
    return () => listeners.delete(fn);
  }, []);
}

/* "Name - 98xxxxxxxx" ↔ { name, phone } */
function splitVal(v) {
  const m = String(v || '').match(/^(.*?)\s*-\s*(\+?\d[\d\s]{6,})$/);
  return m ? { name: m[1].trim(), phone: m[2].replace(/\s+/g, '') } : { name: String(v || '').trim(), phone: '' };
}
function joinVal(name, phone) {
  const n = String(name || '').trim().replace(/\s+/g, ' ');
  const p = String(phone || '').replace(/[^\d+]/g, '');
  return p ? `${n} - ${p}` : n;
}

/* ══════════════════════════════════════════════════════ ADMIN TAB (ALL)
   fallback = App.tsx ke current (hardcoded/applied) lists — table khaali ho
   to wahi dikhte hain, pehli Save pe DB mein chale jaate hain. */
const C = {
  forest: '#14392B',
  green: '#2E7D32',
  mint: '#E7F0E8',
  cream: '#FBF9F4',
  card: '#FFFFFF',
  ink: '#1C2620',
  inkSoft: '#657069',
  line: '#E7E2D6',
  amber: '#C77D28',
  amberSoft: '#FBF0DE',
  red: '#B4472E',
  redSoft: '#F7E7E1',
};
const btn = (extra) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: `1px solid ${C.line}`,
  background: C.card,
  color: C.ink,
  borderRadius: 10,
  padding: '8px 12px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  ...extra,
});
const iconBtn = {
  border: `1px solid ${C.line}`,
  background: C.card,
  borderRadius: 8,
  width: 30,
  height: 30,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: C.inkSoft,
};
const inp = {
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: '9px 11px',
  fontSize: 14,
  outline: 'none',
  background: '#fff',
  minWidth: 0,
};

export function ListsAdmin({ session, fallback, ping }) {
  const [rows, setRows] = useState(lastRows);
  const [loadErr, setLoadErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState('delivery_person');
  const [store, setStore] = useState('CHD');
  const [draft, setDraft] = useState(null); // null = koi change nahi
  const [nName, setNName] = useState('');
  const [nPhone, setNPhone] = useState('');
  const [editIdx, setEditIdx] = useState(-1);
  const [eName, setEName] = useState('');
  const [ePhone, setEPhone] = useState('');
  const def = LIST_DEFS.find((d) => d.key === kind);
  const scope = def.perStore ? store : '';
  const say = (m) => (ping ? ping(m) : window.alert(m));

  const reload = async () => {
    setBusy(true);
    setLoadErr('');
    const r = await loadSharedLists(true);
    if (r) setRows(r);
    else setLoadErr('Supabase se lists nahi aayi — app_lists SQL chala hai? Abhi code wali (hardcoded) lists dikh rahi hain.');
    setBusy(false);
  };
  useEffect(() => {
    if (!rows) reload(); /* eslint-disable-next-line */
  }, []);

  const g = useMemo(() => group(rows || []), [rows]);
  /* DB mein is scope ki list kya hai (null = DB mein nahi) */
  const dbList = (k, s) => {
    const l = (g[k] || {})[s];
    return l && l.length ? l : null;
  };
  const fbList = (k, s) => {
    const f = fallback || {};
    if (k === 'delivery_person') return ((f.DELIVERY_PERSONS || {})[s] || []).slice();
    if (k === 'store_manager') return (f.STORE_MANAGERS || {})[s] ? [f.STORE_MANAGERS[s]] : [];
    if (k === 'vehicle') return (f.VEHICLES || []).slice();
    if (k === 'pay_option') return (f.PAY_OPTIONS || []).slice();
    return [];
  };
  const inDb = !!dbList(kind, scope);
  const sharedFrom = kind === 'delivery_person' && SHARES[scope] && !inDb ? SHARES[scope] : null;
  const saved = useMemo(() => {
    let l = dbList(kind, scope) || (sharedFrom ? null : fbList(kind, scope)) || [];
    if (kind === 'delivery_person') l = l.filter((v) => v !== MBC);
    return l; /* eslint-disable-next-line */
  }, [g, kind, scope, fallback]);
  /* store_manager ke liye: usi store ke delivery persons dropdown mein dikhao
     (DB → shared → fallback), MBC hata ke. Taaki manually naam+number na likhna pade. */
  const personChoices = useMemo(() => {
    let l = dbList('delivery_person', scope);
    if ((!l || !l.length) && SHARES[scope]) l = dbList('delivery_person', SHARES[scope]);
    if (!l || !l.length) l = fbList('delivery_person', scope);
    return (l || []).filter((v) => v !== MBC);
    /* eslint-disable-next-line */
  }, [g, scope, fallback]);

  const items = draft || saved;
  const dirty = !!draft;

  const switchTo = (k, s) => {
    if (dirty && !window.confirm('Is list ke changes save nahi hue. Chhod dein?')) return;
    setDraft(null);
    setEditIdx(-1);
    setNName('');
    setNPhone('');
    if (k) setKind(k);
    if (s) setStore(s);
  };
  const setItems = (l) => setDraft(l);

  const add = () => {
    const v = def.withPhone ? joinVal(nName, nPhone) : String(nName || '').trim();
    if (!v) return;
    if (v.toUpperCase() === MBC && kind === 'delivery_person') return say('MBC pehle se hai — hamesha end mein rehta hai.');
    if (def.withPhone && nPhone && String(nPhone).replace(/\D/g, '').length < 10) return say('Phone number 10 digit ka daalo (ya khaali chhodo).');
    if (items.some((x) => x.toLowerCase() === v.toLowerCase())) return say('Ye naam list mein pehle se hai.');
    setItems(def.single ? [v] : [...items, v]);
    setNName('');
    setNPhone('');
  };
  const remove = (i) => {
    if (!window.confirm(`"${items[i]}" ko list se hata dein?\n(Purani entries mein naam waisa hi rahega.)`)) return;
    setItems(items.filter((_, j) => j !== i));
    setEditIdx(-1);
  };
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const l = items.slice();
    [l[i], l[j]] = [l[j], l[i]];
    setItems(l);
  };
  const startEdit = (i) => {
    const p = def.withPhone ? splitVal(items[i]) : { name: items[i], phone: '' };
    setEditIdx(i);
    setEName(p.name);
    setEPhone(p.phone);
  };
  const commitEdit = () => {
    const v = def.withPhone ? joinVal(eName, ePhone) : String(eName || '').trim();
    if (!v) return;
    if (items.some((x, j) => j !== editIdx && x.toLowerCase() === v.toLowerCase())) return say('Ye naam list mein pehle se hai.');
    const l = items.slice();
    l[editIdx] = v;
    setItems(l);
    setEditIdx(-1);
  };

  const save = async () => {
    if (!session || !session.isHead) return say('Sirf All stores login list badal sakta hai.');
    if (def.single && items.length === 0) return say('Store manager khaali nahi chhod sakte.');
    if (!def.perStore && items.length === 0) return say('List khaali nahi chhod sakte.');
    setBusy(true);
    try {
      await rpc('admin_save_list', {
        p_store: session.authStore,
        p_password: session.pw,
        p_list_key: kind,
        p_scope: scope,
        p_items: items,
      });
      setDraft(null);
      const r = await loadSharedLists(true);
      if (r) setRows(r);
      say('List save ho gayi ✓ — sab stores pe agli baar page khulte hi dikhegi.');
    } catch (e) {
      say('Save nahi hua: ' + (e.message || 'error'));
    }
    setBusy(false);
  };

  const countFor = (k, s) => {
    let l = dbList(k, s);
    if (!l && k === 'delivery_person' && SHARES[s]) return '↪ ' + SHARES[s];
    l = l || fbList(k, s);
    if (k === 'delivery_person') l = l.filter((v) => v !== MBC);
    return l.length;
  };

  return (
    <div style={{ maxWidth: 980 }}>
      <div className="dash-head">
        <div>
          <div className="dash-sub">All stores · Settings</div>
          <h2 style={{ margin: '4px 0 0', fontSize: 22, color: C.forest, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ListChecks size={22} /> Manage Lists
          </h2>
        </div>
        <button style={btn()} onClick={reload} disabled={busy}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loadErr && (
        <div style={{ background: C.amberSoft, color: C.amber, borderRadius: 12, padding: '10px 14px', fontSize: 13, margin: '12px 0' }}>
          {loadErr}
        </div>
      )}

      {/* list type */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0 10px' }}>
        {LIST_DEFS.map((d) => (
          <button
            key={d.key}
            onClick={() => switchTo(d.key)}
            style={btn(
              kind === d.key
                ? { background: C.forest, color: '#fff', borderColor: C.forest }
                : {},
            )}
          >
            {d.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 14 }}>{def.hint}</div>

      {/* store chips */}
      {def.perStore && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {STORES.map((s) => (
            <button
              key={s}
              onClick={() => switchTo(null, s)}
              title={STORE_NAMES[s]}
              style={btn({
                padding: '6px 10px',
                fontSize: 12.5,
                ...(store === s ? { background: C.mint, borderColor: C.green, color: C.forest } : {}),
              })}
            >
              {s}
              <span style={{ fontSize: 11, color: C.inkSoft, fontWeight: 500 }}>
                {def.single ? '' : countFor(kind, s)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, color: C.ink }}>
            {def.perStore ? `${STORE_NAMES[scope]} (${scope})` : 'Sab stores'} · {def.label}
          </div>
          <div style={{ fontSize: 12, color: C.inkSoft }}>
            {inDb ? 'Supabase se' : sharedFrom ? `Apni list nahi — ${sharedFrom} wali chal rahi` : 'Abhi code wali list (pehli Save pe DB mein jayegi)'}
          </div>
        </div>

        {sharedFrom && !dirty && (
          <div style={{ background: C.cream, border: `1px dashed ${C.line}`, borderRadius: 12, padding: 12, fontSize: 13, color: C.inkSoft, marginBottom: 12 }}>
            {scope} ki apni list nahi hai, isliye yahan <b>{sharedFrom}</b> ke delivery persons dikhte hain.
            Agar {scope} ke liye alag list chahiye to neeche naam add karke Save karo.{' '}
            <button
              style={btn({ padding: '4px 10px', fontSize: 12, marginLeft: 4 })}
              onClick={() => setItems((dbList(kind, sharedFrom) || fbList(kind, sharedFrom)).filter((v) => v !== MBC))}
            >
              {sharedFrom} wali copy karke shuru karo
            </button>
          </div>
        )}

        {/* Store manager ke liye delivery-person dropdown — manual typing optional */}
        {kind === 'store_manager' && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: '10px 12px',
              background: C.mint,
              border: `1px solid ${C.green}`,
              borderRadius: 12,
              marginBottom: items.length ? 12 : 0,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: C.forest }}>Delivery person se chuno:</span>
            <select
              style={{ ...inp, flex: 1, minWidth: 200, cursor: 'pointer', appearance: 'auto' }}
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setItems([e.target.value]);
                  setEditIdx(-1);
                }
              }}
            >
              <option value="">
                {personChoices.length ? `— ${scope} ka person chuno —` : `${scope} ki delivery list khaali hai`}
              </option>
              {personChoices.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: C.inkSoft }}>ya neeche ✎ se khud type karo</span>
          </div>
        )}

        {items.length === 0 && !sharedFrom && (
          <div style={{ color: C.inkSoft, fontSize: 13, padding: '8px 0' }}>List khaali hai.</div>
        )}

        {items.map((v, i) => {
          const p = def.withPhone ? splitVal(v) : { name: v, phone: '' };
          return (
            <div
              key={v + i}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: i ? `1px solid ${C.line}` : 'none' }}
            >
              <span style={{ width: 22, color: C.inkSoft, fontSize: 12, textAlign: 'right' }}>{i + 1}.</span>
              {editIdx === i ? (
                <>
                  <input style={{ ...inp, flex: 2 }} value={eName} onChange={(e) => setEName(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && commitEdit()} />
                  {def.withPhone && (
                    <input style={{ ...inp, flex: 1 }} value={ePhone} inputMode="tel" placeholder="Phone" onChange={(e) => setEPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && commitEdit()} />
                  )}
                  <button style={{ ...iconBtn, color: C.green }} onClick={commitEdit} title="OK"><Check size={15} /></button>
                  <button style={iconBtn} onClick={() => setEditIdx(-1)} title="Cancel"><X size={15} /></button>
                </>
              ) : (
                <>
                  <span style={{ flex: 2, fontWeight: 600, color: C.ink, fontSize: 14 }}>{p.name}</span>
                  {def.withPhone && <span style={{ flex: 1, color: C.inkSoft, fontSize: 13 }}>{p.phone || '—'}</span>}
                  {!def.single && (
                    <>
                      <button style={iconBtn} onClick={() => move(i, -1)} disabled={i === 0} title="Upar"><ArrowUp size={14} /></button>
                      <button style={iconBtn} onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Neeche"><ArrowDown size={14} /></button>
                    </>
                  )}
                  <button style={iconBtn} onClick={() => startEdit(i)} title="Edit"><Pencil size={14} /></button>
                  {!def.single && (
                    <button style={{ ...iconBtn, color: C.red }} onClick={() => remove(i)} title="Hatao"><Trash2 size={14} /></button>
                  )}
                </>
              )}
            </div>
          );
        })}
        {kind === 'delivery_person' && (items.length > 0 || !sharedFrom) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: `1px solid ${C.line}`, color: C.inkSoft, fontSize: 13 }}>
            <span style={{ width: 22, textAlign: 'right' }}>•</span>
            <span style={{ flex: 1 }}>MBC (Managed By Client) — fixed, hamesha end mein</span>
          </div>
        )}

        {/* add */}
        {!(def.single && items.length > 0) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <input
              style={{ ...inp, flex: 2, minWidth: 160 }}
              placeholder={def.withPhone ? 'Naam (jaise Ramesh)' : 'Naya option'}
              value={nName}
              onChange={(e) => setNName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            {def.withPhone && (
              <input
                style={{ ...inp, flex: 1, minWidth: 130 }}
                placeholder="Phone (10 digit)"
                inputMode="tel"
                value={nPhone}
                onChange={(e) => setNPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
            )}
            <button style={btn({ borderColor: C.green, color: C.green })} onClick={add}>
              <Plus size={15} /> Add
            </button>
          </div>
        )}
        {def.single && items.length > 0 && (
          <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 10 }}>Manager badalna ho to Edit (✎) dabao.</div>
        )}
      </div>

      {/* save bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
        <button
          style={btn(dirty ? { background: C.green, color: '#fff', borderColor: C.green } : { opacity: 0.55, cursor: 'default' })}
          disabled={!dirty || busy}
          onClick={save}
        >
          <Save size={15} /> {busy ? 'Saving…' : 'Save list'}
        </button>
        {dirty && (
          <button style={btn()} onClick={() => { setDraft(null); setEditIdx(-1); }} disabled={busy}>
            <Undo2 size={15} /> Discard
          </button>
        )}
        {dirty && <span style={{ fontSize: 12.5, color: C.amber, fontWeight: 600 }}>Changes save nahi hue</span>}
      </div>
      <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 10, lineHeight: 1.5 }}>
        Kisi ko hatane se purani deliveries / pickups pe uska naam nahi badalta — wo bas naye dropdown mein nahi aayega.
      </div>
    </div>
  );
}
