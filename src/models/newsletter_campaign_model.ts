import "jxp/globals";
/* global JXPSchema Mixed ObjectId */

/**
 * Vendor-agnostic newsletter send (one campaign / channel post).
 * Merges Whitebeard campaign link rows with send-level stats. HTML stays on
 * `whitebeardcampaigns`. Article labels are copied onto `links` at projection time.
 */
const NewsletterCampaignLinkSchema = {
	external_id: { type: String, index: true },
	url: { type: String, index: true },
	position: { type: Number, index: true },
	kind: {
		type: String,
		enum: ["article", "sponsor", "other"]
	},
	is_sponsor: Boolean,
	article_id: { type: ObjectId, link: "Article" },
	article_post_id: { type: Number, index: true },
	article_title: String,
	article_author: { type: String, index: true },
	article_type: { type: String, index: true },
	article_sections: [String],
	user_needs: [String],
	key_themes: [String],
	article_themes: [String],
	clicks: Number,
	clicks_unique: Number,
	clicks_human: Number,
	clicks_human_unique: Number,
	clicks_mpp: Number,
	clicks_mpp_unique: Number,
	clicks_automated: Number,
	clicks_automated_unique: Number,
	clicks_unknown: Number,
	clicks_unknown_unique: Number
};

const ContentBalanceRowSchema = {
	label: { type: String, index: true },
	placements: Number,
	placement_share: Number,
	clicks_human_unique: Number,
	click_share: Number
};

function safeRate(numerator: number, denominator: number): number {
	if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
		return 0;
	}
	return numerator / denominator;
}

const NewsletterCampaignSchema = new JXPSchema(
	{
		provider: { type: String, index: true, enum: ["whitebeard"] },
		external_id: { type: String, index: true },
		uid: { type: String, index: true, unique: true },
		newsletter_id: { type: ObjectId, link: "newsletter", index: true },
		source_id: {
			type: ObjectId,
			link: "whitebeard_campaigns",
			map_to: "source",
			index: true
		},

		subject: { type: String, index: true },
		status: {
			type: String,
			index: true,
			enum: ["draft", "scheduled", "sent", "cancelled"]
		},
		external_status: { type: String, index: true },
		sent_at: { type: Date, index: true },
		send_date: String,
		image: String,

		utm_source: { type: String, index: true },
		utm_medium: { type: String, index: true },
		utm_campaign: String,

		engagement: {
			queued: Number,
			delivered: Number,
			failed: Number,
			unsub: Number,
			opens: Number,
			opens_unique: Number,
			opens_human_unique: Number,
			opens_mpp_unique: Number,
			opens_automated_unique: Number,
			opens_unknown_unique: Number,
			clicks: Number,
			clicks_unique: Number,
			clicks_human_unique: Number,
			clicks_mpp_unique: Number,
			clicks_automated_unique: Number,
			clicks_unknown_unique: Number,
			delivery_rate: Number,
			open_rate: Number,
			click_rate: Number,
			ctor: Number
		},

		links: [NewsletterCampaignLinkSchema],

		content_balance: {
			user_needs: [ContentBalanceRowSchema],
			key_themes: [ContentBalanceRowSchema],
			sections: [ContentBalanceRowSchema],
			article_types: [ContentBalanceRowSchema]
		},

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

NewsletterCampaignSchema.index({ provider: 1, external_id: 1 }, { unique: true });
NewsletterCampaignSchema.index({ newsletter_id: 1, sent_at: -1 });
NewsletterCampaignSchema.index({ send_date: 1 });
NewsletterCampaignSchema.index({ utm_campaign: 1 });
NewsletterCampaignSchema.index({ "links.article_id": 1 });
NewsletterCampaignSchema.index({ "links.kind": 1, newsletter_id: 1, sent_at: -1 });
NewsletterCampaignSchema.index({ "links.user_needs": 1 });
NewsletterCampaignSchema.index({ "links.key_themes": 1 });

NewsletterCampaignSchema.pre("save", function (next) {
	const engagement = this.engagement;
	if (!engagement) {
		next();
		return;
	}
	const queued = Number(engagement.queued) || 0;
	const delivered = Number(engagement.delivered) || 0;
	const opens = Number(engagement.opens_unique) || 0;
	const clicks = Number(engagement.clicks_unique) || 0;
	engagement.delivery_rate = safeRate(delivered, queued);
	engagement.open_rate = safeRate(opens, delivered);
	engagement.click_rate = safeRate(clicks, delivered);
	engagement.ctor = safeRate(clicks, opens);
	next();
});

const NewsletterCampaign = JXPSchema.model(
	"newsletter_campaign",
	NewsletterCampaignSchema
);
export = NewsletterCampaign;
