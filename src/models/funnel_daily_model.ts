import "jxp/globals";
/* global JXPSchema, Mixed */

/**
 * Daily funnel stock snapshot: stage counts plus anonymous browsers and registrations.
 * Written once per day by the membership-funnel job.
 */
const FunnelDailySchema = new JXPSchema(
	{
		/** Calendar day (UTC midnight). */
		date: { type: Date, index: true, required: true, unique: true },
		/** Stage → headcount. Keys: cold, warming, engaged, mission_aligned, insider, lapsed */
		counts: { type: Mixed, default: {} },
		/** Unique anonymous browsers (ES browser_id without user_id) for the day. */
		anonymous_browsers: { type: Number, default: 0 },
		/** New reader registrations that day (user_registered). */
		registrations: { type: Number, default: 0 }
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

FunnelDailySchema.index({ date: -1 });

const FunnelDaily = JXPSchema.model("funnel_daily", FunnelDailySchema);
export = FunnelDaily;
