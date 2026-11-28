export type Settings = {
  gap2_days: number;   // Notice 1 → Notice 2 gap
  reply_days: number;  // days given in Notice 1 letter
  final_days: number;  // deadline days in Notice 2 letter
  stuck_from: string;
};

export type Session = { code: string; name: string; settings: Settings };

/* ── Stuck (rec_stuck_list) ─────────────────────────────────────────── */
export type StuckInvoice = { no: string; date: string; rent: number; balance: number; status: string };
export type StuckItem = { name: string; code: string | null; qty: number; value: number | null; src: string | null };
export type OpenInvoice = { no: string; date: string; due: string | null; total: number; balance: number; items: string };
export type CaseState = {
  sent?: { '1'?: string; '2'?: string; '3'?: string };
  note?: string;
  closed?: { type: string; date: string; by: string } | null;
  at?: string;
};
export type StuckCase = {
  id: string; name: string; phone: string; location: string; agent: string; address: string;
  stuck_since: string; billed_total: number; billed_pending: number; inv_count: number;
  first_bill: string | null; last_bill: string | null; last_payment: string | null; security: number;
  remark: string; coll_remark: string; sales_remark: string; flags: string[]; excluded: boolean; in_scope: boolean;
  stuck_invoices: StuckInvoice[]; items: StuckItem[]; open_invoices: OpenInvoice[]; item_value: number;
  state: CaseState;
};
export type StuckList = { as_of: string | null; from: string | null; customers: StuckCase[] };

export type CaseLog = { id: number; customer_id: string; action: string; detail: Record<string, unknown> | null; by_admin: string | null; at: string };

/* ── Collection (rec_coll_list) ─────────────────────────────────────── */
export type Commit = {
  id: number; amount: number; due: string; received: number;
  status: 'open' | 'kept' | 'missed' | 'rescheduled' | 'cancelled';
  mode: string; note: string; to: string; by: string; at: string;
};
export type CollCustomer = {
  id: string; name: string; phone: string; location: string; agent: string;
  pending: number; oldest_due: string | null; last_payment: string | null; coll_remark: string; stuck: boolean;
  invoices: OpenInvoice[]; commits: Commit[];
};
export type CollList = { as_of: string | null; customers: CollCustomer[] };
