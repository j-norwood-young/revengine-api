/**
 * One-off backfill: assign invoice_id + invoice_started_at on all orders.
 *
 * Usage (from revengine-api root):
 *   ./mongosh scripts/backfill-invoice-id.mongo.js
 *
 * Safe to re-run — recomputes chains per reader deterministically (uid suffix is stable per chain).
 */

const CHAIN_MAX_AGE_DAYS = 21;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 1000;

function pad2(value) {
	return String(value).padStart(2, "0");
}

function toDate(value) {
	if (!value) return null;
	return value instanceof Date ? value : new Date(value);
}

function daysBetween(a, b) {
	return Math.abs(a.getTime() - b.getTime()) / MS_PER_DAY;
}

function buildInvoiceId(readerId, chainStartDate, uid) {
	const month = pad2(chainStartDate.getUTCMonth() + 1);
	const year = String(chainStartDate.getUTCFullYear());
	return `${readerId}-${month}-${year}-${uid}`;
}

function randomUid() {
	return Math.random().toString(16).slice(2, 10).padEnd(8, "0").slice(0, 8);
}

function orderDate(order) {
	return toDate(order.date_created) ?? toDate(order.date_paid) ?? new Date(0);
}

function decideInvoiceForBackfill(orderDateValue, prev, readerId) {
	if (!prev || !prev.invoice_id || prev.status === "paid") {
		const invoiceStartedAt = orderDateValue;
		return {
			invoice_id: buildInvoiceId(readerId, invoiceStartedAt, randomUid()),
			invoice_started_at: invoiceStartedAt
		};
	}

	const chainStart =
		toDate(prev.invoice_started_at) ?? toDate(prev.date_created) ?? orderDateValue;

	if (daysBetween(orderDateValue, chainStart) > CHAIN_MAX_AGE_DAYS) {
		const invoiceStartedAt = orderDateValue;
		return {
			invoice_id: buildInvoiceId(readerId, invoiceStartedAt, randomUid()),
			invoice_started_at: invoiceStartedAt
		};
	}

	return {
		invoice_id: prev.invoice_id,
		invoice_started_at: chainStart
	};
}

function flushBulk(operations) {
	if (!operations.length) return 0;
	const result = db.orders.bulkWrite(operations, { ordered: false });
	return result.modifiedCount ?? 0;
}

const readerIds = db.orders.distinct("reader_id", { reader_id: { $ne: null } });
print(`Backfilling invoice_id for ${readerIds.length} readers...`);

let totalUpdated = 0;
let pending = [];

for (const readerId of readerIds) {
	const readerKey = String(readerId);
	const orders = db.orders
		.find({ reader_id: readerId })
		.sort({ date_created: 1, _id: 1 })
		.toArray();

	let prev = null;

	for (const order of orders) {
		const date = orderDate(order);
		const assignment = decideInvoiceForBackfill(date, prev, readerKey);

		if (
			order.invoice_id !== assignment.invoice_id ||
			!order.invoice_started_at ||
			order.invoice_started_at.getTime() !== assignment.invoice_started_at.getTime()
		) {
			pending.push({
				updateOne: {
					filter: { _id: order._id },
					update: {
						$set: {
							invoice_id: assignment.invoice_id,
							invoice_started_at: assignment.invoice_started_at
						}
					}
				}
			});
		}

		prev = {
			invoice_id: assignment.invoice_id,
			invoice_started_at: assignment.invoice_started_at,
			status: order.status,
			date_created: order.date_created
		};

		if (pending.length >= BATCH_SIZE) {
			totalUpdated += flushBulk(pending);
			pending = [];
		}
	}
}

totalUpdated += flushBulk(pending);
print(`Done. Updated ${totalUpdated} orders.`);
