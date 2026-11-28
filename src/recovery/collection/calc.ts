import type { CollCustomer, Commit } from '../types';
import { daysFromToday, daysSince } from '../format';

export type CState = 'upcoming' | 'today' | 'overdue' | 'kept' | 'missed' | 'rescheduled' | 'cancelled';
export type CustStatus = 'none' | 'partial' | 'full' | 'today' | 'broken';

export function commitState(m: Commit): CState {
  if (m.status !== 'open') return m.status;
  const d = daysFromToday(m.due);
  return d < 0 ? 'overdue' : d === 0 ? 'today' : 'upcoming';
}
export const LIVE: CState[] = ['upcoming', 'today', 'overdue'];

export type Derived = {
  c: CollCustomer;
  up: number; today: number; overdue: number; received: number;
  promised: number; unpromised: number;
  next: (Commit & { st: CState }) | null;
  status: CustStatus; age: number;
  commits: (Commit & { st: CState })[];
};

export function derive(c: CollCustomer): Derived {
  let up = 0, today = 0, overdue = 0, received = 0;
  let lastClosed: CState | null = null;
  const commits = c.commits.map(m => ({ ...m, st: commitState(m) }));
  commits.forEach(m => {
    const rest = +m.amount - (+m.received || 0);
    received += +m.received || 0;
    if (m.st === 'upcoming') up += rest; else if (m.st === 'today') today += rest; else if (m.st === 'overdue') overdue += rest;
    if (m.st === 'kept' || m.st === 'missed') lastClosed = m.st;
  });
  const pending = +c.pending;
  const promised = up + today + overdue;
  const unpromised = Math.max(0, pending - promised);
  const next = commits.find(m => LIVE.includes(m.st)) || null;
  const status: CustStatus =
    overdue > 0 || (!promised && lastClosed === 'missed') ? 'broken'
      : today > 0 ? 'today'
        : up > 0 ? (unpromised > 0.5 ? 'partial' : 'full') : 'none';
  return { c, up, today, overdue, received, promised, unpromised, next, status, age: c.oldest_due ? daysSince(c.oldest_due) : 0, commits };
}

export const STATUS_LABEL: Record<CustStatus, [string, string]> = {
  none: ['No promise', 't-grey'], partial: ['Partly promised', 't-blue'], full: ['Fully promised', 't-green'],
  today: ['Due today', 't-amber'], broken: ['Promise broken', 't-red'],
};
export const COMMIT_LABEL: Record<CState, [string, string]> = {
  upcoming: ['Upcoming', 't-blue'], today: ['Due today', 't-amber'], overdue: ['Date passed', 't-red'],
  kept: ['Paid', 't-green'], missed: ['Missed', 't-red'], rescheduled: ['Rescheduled', 't-grey'], cancelled: ['Deleted', 't-grey'],
};
export const COLORS = { received: '#2E7D32', promised: '#3E6B9E', today: '#C77D28', overdue: '#B4472E' };
