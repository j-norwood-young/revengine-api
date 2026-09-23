import "jxp/globals";
/* global JXPSchema ObjectId Mixed */

/**
 * Sync state for RevEngine segment → Whitebeard CMS tag mirroring.
 * Kept separate from the segment document so writes do not re-trigger applySegment.
 */
const SegmentTagSyncSchema = new JXPSchema(
	{
		segment_id: {
			type: ObjectId,
			link: "segment",
			required: true,
			unique: true,
			index: true,
		},
		tagName: { type: String, index: true },
		tagId: { type: Number, index: true },
		previousTagNames: { type: [String], default: [] },
		status: {
			type: String,
			enum: ["idle", "running", "success", "failed", "skipped", "dry-run"],
			default: "idle",
			index: true,
		},
		lastSyncedAt: { type: Date, index: true },
		lastResult: Mixed,
		errors: { type: [String], default: [] },
	},
	{
		perms: {
			admin: "crud",
			owner: "crud",
			user: "r",
			all: "",
		},
	}
);

SegmentTagSyncSchema.index({ status: 1, lastSyncedAt: -1 });

const SegmentTagSync = JXPSchema.model("segment_tag_sync", SegmentTagSyncSchema);
export = SegmentTagSync;
