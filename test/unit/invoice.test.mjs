import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	CHAIN_MAX_AGE_DAYS,
	buildInvoiceId,
	decideInvoice
} from "../../dist/lib/invoice.js";

describe("buildInvoiceId", () => {
	it("formats reader-MM-YYYY-uid", () => {
		const id = buildInvoiceId("abc123", new Date("2025-06-15T12:00:00.000Z"));
		expect(id).toMatch(/^abc123-06-2025-[0-9a-f]{8}$/);
	});

	it("generates unique uids for the same reader and month", () => {
		const chainStart = new Date("2025-06-01T00:00:00.000Z");
		const ids = new Set(
			Array.from({ length: 20 }, () => buildInvoiceId("reader-1", chainStart))
		);
		expect(ids.size).toBe(20);
	});
});

describe("decideInvoice", () => {
	const readerId = "reader-1";

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2025-06-01T00:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("creates a new invoice for the first order", () => {
		const orderDate = new Date("2025-06-01T08:00:00.000Z");
		const result = decideInvoice({ orderDate, prev: null, readerId });

		expect(result.invoiceId).toMatch(/^reader-1-06-2025-[0-9a-f]{8}$/);
		expect(result.invoiceStartedAt).toEqual(orderDate);
	});

	it("reuses invoice for consecutive failures within 21 days", () => {
		const chainStart = new Date("2025-06-01T08:00:00.000Z");
		const prev = {
			invoice_id: "reader-1-06-2025-deadbeef",
			invoice_started_at: chainStart,
			status: "fail",
			date_created: chainStart
		};

		const orderDate = new Date("2025-06-10T08:00:00.000Z");
		const result = decideInvoice({ orderDate, prev, readerId });

		expect(result.invoiceId).toBe("reader-1-06-2025-deadbeef");
		expect(result.invoiceStartedAt).toEqual(chainStart);
	});

	it("starts a new invoice when the previous order was paid", () => {
		const chainStart = new Date("2025-06-01T08:00:00.000Z");
		const prev = {
			invoice_id: "reader-1-06-2025-deadbeef",
			invoice_started_at: chainStart,
			status: "fail",
			date_created: chainStart
		};

		const orderDate = new Date("2025-06-12T08:00:00.000Z");
		const paidResult = decideInvoice({
			orderDate,
			prev: { ...prev, status: "paid" },
			readerId
		});

		expect(paidResult.invoiceId).not.toBe("reader-1-06-2025-deadbeef");
		expect(paidResult.invoiceStartedAt).toEqual(orderDate);
	});

	it("starts a new invoice after a paid order closes the chain", () => {
		const chainStart = new Date("2025-06-01T08:00:00.000Z");
		const prev = {
			invoice_id: "reader-1-06-2025-deadbeef",
			invoice_started_at: chainStart,
			status: "paid",
			date_created: chainStart
		};

		const orderDate = new Date("2025-07-01T08:00:00.000Z");
		const result = decideInvoice({ orderDate, prev, readerId });

		expect(result.invoiceId).not.toBe("reader-1-06-2025-deadbeef");
		expect(result.invoiceStartedAt).toEqual(orderDate);
	});

	it(`starts a new invoice when the chain is older than ${CHAIN_MAX_AGE_DAYS} days`, () => {
		const chainStart = new Date("2025-05-01T08:00:00.000Z");
		const prev = {
			invoice_id: "reader-1-05-2025-deadbeef",
			invoice_started_at: chainStart,
			status: "fail",
			date_created: chainStart
		};

		const orderDate = new Date("2025-05-26T08:00:00.000Z");
		const result = decideInvoice({ orderDate, prev, readerId });

		expect(result.invoiceId).not.toBe("reader-1-05-2025-deadbeef");
		expect(result.invoiceStartedAt).toEqual(orderDate);
	});

	it("starts a new invoice when the gap from chain start exceeds 21 days", () => {
		const chainStart = new Date("2025-06-01T08:00:00.000Z");
		const prev = {
			invoice_id: "reader-1-06-2025-deadbeef",
			invoice_started_at: chainStart,
			status: "fail",
			date_created: chainStart
		};

		const orderDate = new Date("2025-06-26T08:00:00.000Z");
		const result = decideInvoice({ orderDate, prev, readerId });

		expect(result.invoiceId).not.toBe("reader-1-06-2025-deadbeef");
		expect(result.invoiceStartedAt).toEqual(orderDate);
	});
});
