/**
 * One-off backfill: assign invoice_id + invoice_started_at on orders missing invoice_id,
 * and replace generated IDs when an authoritative provider renewal_id is available.
 *
 * Usage (from revengine-api root):
 *   ./mongosh scripts/backfill-invoice-id.mongo.js
 *
 * Safe to re-run. Each affected reader's full history is read so retry chains can be
 * reconstructed correctly. Run the Whitebeard reader sync first so renewal_id and
 * reference_order_id have been copied onto generic orders.
 */

const CHAIN_MAX_AGE_DAYS = 21;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 1000;
const LOG_EVERY_READERS = 100;
const startedAt = Date.now();

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

function buildSourceInvoiceId(provider, renewalId, _referenceOrderId) {
	const normalizedRenewalId = String(renewalId ?? "").trim();
	if (!normalizedRenewalId) return null;

	const normalizedProvider = String(provider ?? "source").trim().toLowerCase() || "source";
	return `${normalizedProvider}-renewal-${normalizedRenewalId}`;
}

function orderDate(order) {
	return toDate(order.date_created) ?? toDate(order.date_paid) ?? new Date(0);
}

function isMissingInvoiceId(value) {
	return value === undefined || value === null || value === "";
}

function decideInvoiceForBackfill(orderDateValue, prev, readerId, sourceInvoiceId) {
	if (sourceInvoiceId) {
		return {
			invoice_id: sourceInvoiceId,
			invoice_started_at:
				prev?.invoice_id === sourceInvoiceId
					? toDate(prev.invoice_started_at) ?? toDate(prev.date_created) ?? orderDateValue
					: orderDateValue
		};
	}

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

function elapsed() {
	return `${Math.round((Date.now() - startedAt) / 1000)}s`;
}

const readerIds = db.orders.distinct("reader_id", {
	reader_id: { $ne: null },
	$or: [
		{ invoice_id: { $exists: false } },
		{ invoice_id: null },
		{ invoice_id: "" },
		{ renewal_id: { $exists: true, $nin: [null, ""] } }
	]
});
print(`Backfilling invoice_id for ${readerIds.length} affected readers...`);

let totalUpdated = 0;
let totalScanned = 0;
let totalMissing = 0;
let processedReaders = 0;
let pending = [];

for (const readerId of readerIds) {
	const readerKey = String(readerId);
	const orders = db.orders
		.find({ reader_id: readerId })
		.sort({ date_created: 1, _id: 1 })
		.toArray();

	const previousByScope = new Map();

	for (const order of orders) {
		totalScanned++;
		const date = orderDate(order);
		const sourceInvoiceId = buildSourceInvoiceId(
			order.provider,
			order.renewal_id,
			order.reference_order_id
		);
		const referenceScope = String(order.reference_order_id ?? "").trim();
		const scopeKey = sourceInvoiceId
			? `invoice:${sourceInvoiceId}`
			: referenceScope
				? `${order.provider ?? "source"}:order:${referenceScope}`
				: "legacy";
		const prev = previousByScope.get(scopeKey) ?? null;
		const assignment = decideInvoiceForBackfill(date, prev, readerKey, sourceInvoiceId);
		const currentStartedAt = toDate(order.invoice_started_at);
		const needsAuthoritativeUpdate =
			Boolean(sourceInvoiceId) &&
			(order.invoice_id !== assignment.invoice_id ||
				currentStartedAt?.getTime() !== assignment.invoice_started_at.getTime());

		if (isMissingInvoiceId(order.invoice_id) || needsAuthoritativeUpdate) {
			totalMissing++;
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

		previousByScope.set(scopeKey, {
			invoice_id: assignment.invoice_id,
			invoice_started_at: assignment.invoice_started_at,
			status: order.status,
			date_created: order.date_created
		});

		if (pending.length >= BATCH_SIZE) {
			const updated = flushBulk(pending);
			totalUpdated += updated;
			print(
				`Progress: ${processedReaders}/${readerIds.length} readers, ` +
					`${totalScanned} orders scanned, ${totalMissing} missing, ` +
					`${totalUpdated} updated (${elapsed()})`
			);
			pending = [];
		}
	}

	processedReaders++;
	if (processedReaders % LOG_EVERY_READERS === 0) {
		print(
			`Progress: ${processedReaders}/${readerIds.length} readers, ` +
				`${totalScanned} orders scanned, ${totalMissing} missing, ` +
				`${totalUpdated} updated (${elapsed()})`
		);
	}
}

if (pending.length) {
	const updated = flushBulk(pending);
	totalUpdated += updated;
}
print(
	`Done. Updated ${totalUpdated} orders; scanned ${totalScanned} orders across ` +
		`${processedReaders} readers (${elapsed()}).`
);
