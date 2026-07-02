import { randomBytes } from "node:crypto";

export const CHAIN_MAX_AGE_DAYS = 21;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface PriorOrderInvoiceInfo {
	invoice_id?: string | null;
	invoice_started_at?: Date | string | null;
	status?: string | null;
	date_created?: Date | string | null;
}

export interface DecideInvoiceInput {
	orderDate: Date;
	prev: PriorOrderInvoiceInfo | null | undefined;
	readerId: string;
}

export interface DecideInvoiceResult {
	invoiceId: string;
	invoiceStartedAt: Date;
}

function toDate(value: Date | string): Date {
	return typeof value === "string" ? new Date(value) : value;
}

function daysBetween(a: Date, b: Date): number {
	return Math.abs(a.getTime() - b.getTime()) / MS_PER_DAY;
}

function chainStartFromPrev(prev: PriorOrderInvoiceInfo): Date {
	if (prev.invoice_started_at) return toDate(prev.invoice_started_at);
	if (prev.date_created) return toDate(prev.date_created);
	return new Date();
}

/**
 * Human-readable invoice key: `<reader_id>-<MM>-<YYYY>-<uid>`.
 * MM/YYYY come from the chain's first order; uid disambiguates multiple invoices per month.
 */
export function buildInvoiceId(readerId: string, chainStartDate: Date): string {
	const month = String(chainStartDate.getUTCMonth() + 1).padStart(2, "0");
	const year = String(chainStartDate.getUTCFullYear());
	const uid = randomBytes(4).toString("hex");
	return `${readerId}-${month}-${year}-${uid}`;
}

/**
 * Decide whether to start a new invoice chain or continue the previous one.
 * Pure function — no database access.
 */
export function decideInvoice({ orderDate, prev, readerId }: DecideInvoiceInput): DecideInvoiceResult {
	if (!prev?.invoice_id || prev.status === "paid") {
		const invoiceStartedAt = orderDate;
		return {
			invoiceId: buildInvoiceId(readerId, invoiceStartedAt),
			invoiceStartedAt
		};
	}

	const chainStart = chainStartFromPrev(prev);
	if (daysBetween(orderDate, chainStart) > CHAIN_MAX_AGE_DAYS) {
		const invoiceStartedAt = orderDate;
		return {
			invoiceId: buildInvoiceId(readerId, invoiceStartedAt),
			invoiceStartedAt
		};
	}

	return {
		invoiceId: prev.invoice_id,
		invoiceStartedAt: chainStart
	};
}
