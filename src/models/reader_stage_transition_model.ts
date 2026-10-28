import "jxp/globals";
/* global JXPSchema ObjectId */

/**
 * One row per funnel stage change for a reader.
 * Written by the membership-funnel job when funnel_stage changes.
 */
const ReaderStageTransitionSchema = new JXPSchema(
	{
		reader_id: { type: ObjectId, link: "reader", index: true, required: true },
		from: { type: String, index: true },
		to: { type: String, index: true, required: true },
		/** Calendar day of the transition (UTC midnight). */
		date: { type: Date, index: true, required: true },
		/** progress | regress | churn | win_back */
		kind: {
			type: String,
			index: true,
			enum: ["progress", "regress", "churn", "win_back"],
			required: true
		}
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

ReaderStageTransitionSchema.index({ date: 1, kind: 1 });
ReaderStageTransitionSchema.index({ date: 1, from: 1, to: 1 });
ReaderStageTransitionSchema.index({ reader_id: 1, date: -1 });
ReaderStageTransitionSchema.index({ to: 1, date: 1 });

const ReaderStageTransition = JXPSchema.model(
	"reader_stage_transition",
	ReaderStageTransitionSchema
);
export = ReaderStageTransition;
