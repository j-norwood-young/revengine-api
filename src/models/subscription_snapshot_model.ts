import "jxp/globals";
/* global JXPSchema ObjectId Mixed */

/**
 * Daily point-in-time snapshot of commercial subscription state.
 * Used by reconciliation for periods after snapshotting begins so historical
 * reports do not depend on today's schedule_next_payment.
 */
const SubscriptionSnapshotSchema = new JXPSchema(
	{
		/** Calendar day of the snapshot (UTC midnight). */
		as_of: { type: Date, index: true, required: true },
		subscription_id: { type: ObjectId, link: "Subscription", index: true, required: true },
		reader_id: { type: ObjectId, link: "reader", index: true },
		provider: { type: String, index: true },
		external_id: { type: Number, index: true },
		status: { type: String, index: true },
		payment_method: { type: String, index: true },
		billing_period: { type: String, index: true },
		billing_interval: { type: Number, index: true },
		total: { type: Number, index: true },
		schedule_next_payment: { type: Date, index: true },
		schedule_start: { type: Date, index: true },
		schedule_end: { type: Date, index: true },
		/** observed | reconstructed | unknown */
		amount_provenance: { type: String, index: true },
		source: { type: String, index: true, default: "whitebeard-sync" }
	},
	{
		perms: {
			admin: "crud",
			owner: "crud",
			user: "r",
			all: ""
		}
	}
);

SubscriptionSnapshotSchema.index({ as_of: 1, subscription_id: 1 }, { unique: true });
SubscriptionSnapshotSchema.index({ as_of: 1, reader_id: 1 });

const SubscriptionSnapshot = JXPSchema.model("subscription_snapshot", SubscriptionSnapshotSchema);
export = SubscriptionSnapshot;
