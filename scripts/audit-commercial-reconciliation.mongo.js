/**
 * Idempotent commercial-data audit / backfill for reconciliation.
 *
 * Usage (from revengine-api root):
 *   ./mongosh --quiet scripts/audit-commercial-reconciliation.mongo.js
 *   REPORT_ONLY=false ./mongosh --quiet scripts/audit-commercial-reconciliation.mongo.js
 *
 * REPORT_ONLY (default true): print counts only, do not write.
 * Refuses to invent subscription totals — only copies from whitebeardsubscriptions
 * purchased_item when present, or leaves amount missing for investigation.
 */

const reportOnly = String(process.env.REPORT_ONLY ?? "true").toLowerCase() !== "false";
const startedAt = Date.now();

function parseAmount(raw) {
	const cleaned = String(raw ?? "").replace(/[^\d.-]/g, "");
	const n = Number(cleaned);
	return Number.isNaN(n) ? 0 : n;
}

print(`=== Commercial reconciliation audit (reportOnly=${reportOnly}) ===`);

const subMissingTotal = db.subscriptions.countDocuments({
	$or: [{ total: { $in: [null, 0] } }, { total: { $exists: false } }]
});
const subMissingPeriod = db.subscriptions.countDocuments({
	$or: [{ billing_period: { $in: [null, ""] } }, { billing_period: { $exists: false } }]
});
const subMissingSnp = db.subscriptions.countDocuments({
	$or: [{ schedule_next_payment: null }, { schedule_next_payment: { $exists: false } }]
});
const paidMissingDatePaid = db.orders.countDocuments({
	status: "paid",
	$or: [{ date_paid: null }, { date_paid: { $exists: false } }]
});
const paidMissingInvoice = db.orders.countDocuments({
	status: "paid",
	$or: [{ invoice_id: null }, { invoice_id: "" }, { invoice_id: { $exists: false } }]
});
const memberNoSub = db.readers
	.aggregate([
		{ $match: { member: true } },
		{
			$lookup: {
				from: "subscriptions",
				localField: "_id",
				foreignField: "reader_id",
				as: "sub"
			}
		},
		{ $match: { sub: { $size: 0 } } },
		{ $count: "n" }
	])
	.toArray()[0]?.n ?? 0;

printjson({
	subscriptionsMissingTotal: subMissingTotal,
	subscriptionsMissingBillingPeriod: subMissingPeriod,
	subscriptionsMissingNextPayment: subMissingSnp,
	paidOrdersMissingDatePaid: paidMissingDatePaid,
	paidOrdersMissingInvoiceId: paidMissingInvoice,
	membersWithoutSubscription: memberNoSub
});

if (reportOnly) {
	print("Report-only mode — no writes. Re-run with REPORT_ONLY=false to apply safe backfills.");
	print(`Elapsed ${Date.now() - startedAt}ms`);
	quit(0);
}

// Safe backfill: date_paid from date_created when status=paid and date_paid missing
let datePaidFixed = 0;
db.orders.find({ status: "paid", $or: [{ date_paid: null }, { date_paid: { $exists: false } }] }).forEach((o) => {
	const fallback = o.date_created || o.date_modified;
	if (!fallback) return;
	db.orders.updateOne({ _id: o._id }, { $set: { date_paid: fallback } });
	datePaidFixed++;
});

// Safe backfill: subscription total/billing_period from whitebeardsubscriptions when linked by external_id
let subEnriched = 0;
db.subscriptions
	.find({
		provider: "whitebeard",
		$or: [
			{ total: { $in: [null, 0] } },
			{ billing_period: { $in: [null, ""] } },
			{ billing_period: { $exists: false } }
		]
	})
	.forEach((sub) => {
		if (sub.external_id == null) return;
		const wb = db.whitebeardsubscriptions.findOne({ id: String(sub.external_id) });
		if (!wb?.purchased_item) return;
		const set = {};
		const total = parseAmount(wb.purchased_item.price ?? wb.purchased_item.recurrentPrice);
		if ((!sub.total || sub.total === 0) && total > 0) set.total = total;
		if (!sub.billing_period && wb.purchased_item.recurrentSchedule) {
			set.billing_period = String(wb.purchased_item.recurrentSchedule);
			set.billing_interval = 1;
		}
		if (!sub.schedule_next_payment && wb.nextRenewal) set.schedule_next_payment = wb.nextRenewal;
		if (Object.keys(set).length === 0) return;
		db.subscriptions.updateOne({ _id: sub._id }, { $set: set });
		subEnriched++;
	});

printjson({
	datePaidFixed,
	subscriptionsEnrichedFromWb: subEnriched,
	note: "invoice_id backfill remains scripts/backfill-invoice-id.mongo.js — not invented here"
});

print(`Elapsed ${Date.now() - startedAt}ms`);
