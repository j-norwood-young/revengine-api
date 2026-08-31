import "jxp/globals";
/* global JXPSchema Mixed ObjectId */

/**
 * Vendor-agnostic newsletter list / channel.
 * Whitebeard channels are ingested into `whitebeardnewsletters` and projected here.
 * `external_id` for provider `whitebeard` is the channel id string.
 */
const NewsletterAudienceSegmentSchema = {
	segment_id: { type: ObjectId, link: "segment", index: true },
	name: String,
	count: Number,
	share: Number
};

const NewsletterSchema = new JXPSchema(
	{
		provider: { type: String, index: true, enum: ["whitebeard"] },
		external_id: { type: String, index: true },
		source_id: {
			type: ObjectId,
			link: "whitebeard_newsletters",
			map_to: "source",
			index: true
		},

		name: { type: String, index: true },
		slug: String,
		description: String,
		image: String,

		channel_type: {
			type: String,
			index: true,
			enum: ["newsletter", "email", "push", "sms"]
		},
		status: { type: String, index: true },

		subscriber_count: Number,
		audience_synced_at: { type: Date, index: true },
		audience: {
			segments: [NewsletterAudienceSegmentSchema]
		},

		last_sent_at: Date,
		last_projected_at: { type: Date, index: true },
		metadata: Mixed
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

NewsletterSchema.index({ provider: 1, external_id: 1 }, { unique: true });
NewsletterSchema.index({ slug: 1 });
NewsletterSchema.index({ last_sent_at: -1 });

const Newsletter = JXPSchema.model("newsletter", NewsletterSchema);
export = Newsletter;
