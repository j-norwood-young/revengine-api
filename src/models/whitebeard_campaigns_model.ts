import "jxp/globals";
/* global JXPSchema Mixed ObjectId */

/**
 * Whitebeard newsletter campaigns (Channel Post entity from Whitebeard API v3.1).
 * Stores the rendered HTML and per-link click data for a channel post send.
 *
 * Source: GET /cms/channel/post/{post_id}/preview
 * @see https://apidocsv3.whitebeard.net/?urls.primaryName=v3.1+(beta)#/Channel
 */
const WhitebeardCampaignLinkSchema = {
	url: { type: String, index: true },
	link_id: { type: String, index: true },
	article_id: { type: ObjectId, link: 'articles', index: true },
	is_sponsor: String,
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

const WhitebeardCampaignsSchema = new JXPSchema(
	{
		/** Whitebeard Channel Post id */
		id: { type: Number, index: true },

		/** Combined Whitebeard newsletter id and campaign id */
		uid: { type: String, index: true, unique: true },

		/** Link back to the parent Whitebeard newsletter channel record in JXP */
		whitebeard_newsletter_id: { type: ObjectId, link: 'whitebeard_newsletters', index: true },

		/** Raw Whitebeard channel id (data.channelId) */
		newsletterId: { type: Number, index: true },

		/** Subject / contents line from the channel post */
		contents: { type: String, index: true },
		image: String,
		objectSignature: String,
		status: { type: String, index: true },

		/** When the post was sent/published (data.date) */
		sentAt: { type: Date, index: true },
		/** Cached YYYY-MM-DD for efficient day-range queries */
		sendDate: { type: String, index: true },

		/** Full rendered HTML from the preview endpoint */
		html: String,

		/** Per-link click rows from analytics.clicks_details */
		links: [WhitebeardCampaignLinkSchema],

		/** Last time this record was synced from Whitebeard */
		lastSyncedAt: { type: Date, index: true },

		/** Raw payload extras (serviceResponse, full analytics, etc.) */
		metadata: Mixed
	},
	{
		perms: {
			admin: 'crud',
			owner: 'crud',
			user: 'r',
			all: ''
		}
	}
);

WhitebeardCampaignsSchema.index({ newsletterId: 1, sentAt: -1 });
WhitebeardCampaignsSchema.index({ sendDate: 1 });
WhitebeardCampaignsSchema.index({ lastSyncedAt: 1 });
WhitebeardCampaignsSchema.index({ 'links.link_id': 1 });
WhitebeardCampaignsSchema.index({ 'links.url': 1 });
WhitebeardCampaignsSchema.index({ uid: 1 });

const WhitebeardCampaigns = JXPSchema.model(
	'whitebeardcampaigns',
	WhitebeardCampaignsSchema
);

export = WhitebeardCampaigns;
