import type { Settings, StuckCase } from '../types';
import { addDays, daysBetween, daysFromToday, daysSince, fmtD, iso, parseD, today0 } from '../format';

/* Same rules as the original Recovery build.
   Unbilled: each stuck invoice accrues rent per day after a 30-day cycle:
     start = invoice_date + 30 days; days = max(0, today - start); line = round(rent × days / 30)
   Cap (toggle): unbilled is limited to item value when item value > 0.
   Claim: A billed pending + B unbilled + C item value. Security is shown, never added. */

export type UnbilledLine = { no: string; date: string; rent: number; from: string; days: number; amount: number };

export type Calc = {
  lines: UnbilledLine[];
  ubRaw: number; ub: number; capped: boolean;
  iv: number; due: number; total: number;
};

export function calc(c: StuckCase, cap: boolean): Calc {
  const t = today0();
  const lines: UnbilledLine[] = c.stuck_invoices.map(si => {
    const start = addDays(si.date, 30);
    const days = Math.max(0, daysBetween(start, t));
    const amount = c.excluded ? 0 : Math.round((+si.rent * days) / 30);
    return { no: si.no, date: si.date, rent: +si.rent, from: iso(start), days, amount };
  });
  const ubRaw = lines.reduce((s, l) => s + l.amount, 0);
  const iv = c.excluded ? 0 : +c.item_value || 0;
  const ub = cap && iv > 0 ? Math.min(ubRaw, iv) : ubRaw;
  const due = +c.billed_pending + ub;
  return { lines, ubRaw, ub, capped: cap && iv > 0 && ubRaw > iv, iv, due, total: due + iv };
}

export type Next =
  | { kind: 'closed'; label: string }
  | { kind: 'due'; notice: 1 | 2; label: string; late: number }
  | { kind: 'wait'; notice: 2; label: string; left: number; on: string }
  | { kind: 'done'; label: string };

export function nextStep(c: StuckCase, s: Settings): Next {
  if (c.excluded) return { kind: 'closed', label: 'Machine returned' };
  if (c.state?.closed) return { kind: 'closed', label: c.state.closed.type };
  const sent = c.state?.sent || {};
  if (!sent['1']) return { kind: 'due', notice: 1, label: 'Send reminder (Notice 1)', late: daysSince(c.stuck_since) };
  if (!sent['2']) {
    const due2 = addDays(sent['1'], s.gap2_days);
    const left = daysFromToday(iso(due2));
    if (left <= 0) return { kind: 'due', notice: 2, label: 'Final notice due', late: -left };
    return { kind: 'wait', notice: 2, label: `Final notice on ${fmtD(iso(due2))}`, left, on: iso(due2) };
  }
  return { kind: 'done', label: 'Final notice sent · legal next' };
}

/** action-first ordering: Notice 2 due > Notice 1 due (more late first) > wait (fewest days left) > done > closed */
export function workRank(n: Next): number {
  if (n.kind === 'due') return (n.notice === 2 ? 0 : 1e6) - n.late;
  if (n.kind === 'wait') return 2e6 + n.left;
  if (n.kind === 'done') return 3e6;
  return 4e6;
}

export const CLOSE_TYPES = ['Payment received', 'Item recovered', 'Payment + item recovered', 'Settled / written off'];

export function stuckDays(c: StuckCase): number { const d = parseD(c.stuck_since); return d ? daysBetween(d, today0()) : 0; }
