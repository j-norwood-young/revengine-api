/**
 * Validate July vs August gross cash / expected identity for finance-safe reconciliation.
 *
 * Usage (from revengine-api):
 *   ./mongosh --quiet scripts/validate-reconciliation-months.mongo.js
 *
 * Prints:
 *  - Gross paid orders (invoice-deduped) for July and August
 *  - Subscription coverage (missing total / payment_method / SNP)
 * Does not invent values — report only.
 */

function monthRange(year, month /* 1-12 */) {
	const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
	const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
	return { start, end };
}

function grossPaid(start, end) {
	return db.orders
		.aggregate([
			{
				$match: {
					status: "paid",
					date_paid: { $gte: start, $lte: end }
				}
			},
			{
				$group: {
					_id: {
						$ifNull: [
							"$invoice_id",
							{ $concat: ["noid:", { $toString: "$_id" }] }
						]
					},
					total: { $sum: "$total" },
					payment_method: { $first: "$payment_method" }
				}
			},
			{
				$group: {
					_id: null,
					total: { $sum: "$total" },
					count: { $sum: 1 },
					byMethod: { $push: { method: "$payment_method", total: "$total" } }
				}
			}
		])
		.toArray()[0] || { total: 0, count: 0, byMethod: [] };
}

function methodTotals(byMethod) {
	const map = {};
	for (const row of byMethod) {
		const key = row.method || "Unknown";
		map[key] = (map[key] || 0) + (row.total || 0);
	}
	return map;
}

print("=== July / August 2026 reconciliation validation (report only) ===");

const july = monthRange(2026, 7);
const august = monthRange(2026, 8);
const julyCash = grossPaid(july.start, july.end);
const augustCash = grossPaid(august.start, august.end);

printjson({
	july: {
		grossPaidTotal: julyCash.total,
		invoiceCount: julyCash.count,
		byMethod: methodTotals(julyCash.byMethod)
	},
	august: {
		grossPaidTotal: augustCash.total,
		invoiceCount: augustCash.count,
		byMethod: methodTotals(augustCash.byMethod)
	},
	deltaGross: (augustCash.total || 0) - (julyCash.total || 0),
	coverage: {
		subscriptionsMissingTotal: db.subscriptions.countDocuments({
			$or: [{ total: { $in: [null, 0] } }, { total: { $exists: false } }]
		}),
		subscriptionsMissingPaymentMethod: db.subscriptions.countDocuments({
			$or: [{ payment_method: { $in: [null, ""] } }, { payment_method: { $exists: false } }]
		}),
		paidOrdersMissingInvoiceId: db.orders.countDocuments({
			status: "paid",
			$or: [{ invoice_id: null }, { invoice_id: "" }, { invoice_id: { $exists: false } }]
		}),
		paidOrdersMissingDatePaid: db.orders.countDocuments({
			status: "paid",
			$or: [{ date_paid: null }, { date_paid: { $exists: false } }]
		}),
		revenuecatSubscriptions: db.subscriptions.countDocuments({
			payment_method: /revenuecat/i
		}),
		revenuecatMissingTotal: db.subscriptions.countDocuments({
			payment_method: /revenuecat/i,
			$or: [{ total: { $in: [null, 0] } }, { total: { $exists: false } }]
		})
	},
	notes: [
		"Compare july.grossPaidTotal / august.grossPaidTotal to manual bank deposits for those months.",
		"Expected renewal performance uses historical reconstruction in the app — re-check UI after deploy.",
		"Run scripts/audit-commercial-reconciliation.mongo.js and scripts/backfill-invoice-id.mongo.js before trusting totals."
	]
});
