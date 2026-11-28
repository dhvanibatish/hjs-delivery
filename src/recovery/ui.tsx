import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

/* ── Toast ─────────────────────────────────────────── */
type ToastFn = (msg: string, bad?: boolean) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; bad: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback<ToastFn>((msg, bad = false) => {
    setT({ msg, bad });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setT(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && <div className={'toast' + (t.bad ? ' bad' : '')} role="status">{t.msg}</div>}
    </ToastCtx.Provider>
  );
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

/* ── Drawer ────────────────────────────────────────── */
export function Drawer({ onClose, head, children }: { onClose: () => void; head: ReactNode; children: ReactNode }) {
  useEscape(onClose);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="d-head">
          <div>{head}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </aside>
    </>
  );
}

/* ── Modal ─────────────────────────────────────────── */
export function Modal({ title, onClose, children, foot, small }: { title: ReactNode; onClose: () => void; children: ReactNode; foot?: ReactNode; small?: boolean }) {
  useEscape(onClose);
  return (
    <div className="modal-wrap" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal' + (small ? ' small' : '')} role="dialog" aria-modal="true">
        <div className="m-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        <div className="m-body">{children}</div>
        {foot && <div className="m-foot">{foot}</div>}
      </div>
    </div>
  );
}

/* ── Dropdown field ────────────────────────────────── */
export function Select<T extends string>({ label, value, onChange, options, wide }: {
  label: string; value: T; onChange: (v: T) => void; options: [T, string][]; wide?: boolean;
}) {
  return (
    <label className={'fld' + (wide ? ' wide' : '')}>
      <span>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value as T)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

/** Names for a dropdown: defaults + whatever the data has (case-insensitive dedupe, A→Z, with counts). */
export function nameOptions(defaults: string[], values: (string | null | undefined)[], all: string, noneLabel: string): [string, string][] {
  const map = new Map<string, string>(); const cnt = new Map<string, number>(); let none = false;
  defaults.forEach(v => map.set(v.toLowerCase(), v));
  values.forEach(v => {
    if (!v) { none = true; return; }
    const k = v.toLowerCase(); if (!map.has(k)) map.set(k, v);
    const name = map.get(k)!; cnt.set(name, (cnt.get(name) || 0) + 1);
  });
  const names = [...map.values()].sort((a, b) => a.localeCompare(b));
  const out: [string, string][] = [['', all], ...names.map(n => [n, n + (cnt.get(n) ? ` (${cnt.get(n)})` : '')] as [string, string])];
  if (none) out.push(['—', noneLabel]);
  return out;
}
export const sameName = (a: string | null | undefined, b: string) => (a || '—').toLowerCase() === b.toLowerCase();

export const SALES_TEAM = ['Lavi', 'Kamalpreet', 'Diggaj', 'Gurnimit', 'Ekam Singh', 'Ishan Vohra', 'Arpan', 'Aditya', 'Ansh'];
export const STORES = ['Mohali', 'Chandigarh', 'Noida', 'Gurugram', 'TriNagar Delhi', 'Uttam Nagar Delhi', 'Jaipur', 'Lucknow'];

/** Split bar: segments as [value, colour]; total = 100% */
export function Bar({ parts, total, mini }: { parts: [number, string][]; total: number; mini?: boolean }) {
  const t = Math.max(1, total);
  return (
    <div className={'split' + (mini ? ' mini' : '')}>
      {parts.map(([v, c], i) => <i key={i} style={{ width: `${(Math.max(0, v) / t) * 100}%`, background: c }} />)}
    </div>
  );
}

export function persisted<T>(key: string, init: T): [T, (v: T) => void] {
  let start = init;
  try { const raw = localStorage.getItem(key); if (raw) start = { ...init, ...JSON.parse(raw) }; } catch { /* ignore */ }
  return [start, (v: T) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }];
}
