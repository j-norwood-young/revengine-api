import "jxp/globals";
/* global JXPSchema */
import { formatSentence, wordCount } from "../lib/word-count";

const ArticleSchema = new JXPSchema({
    post_id: { type: Number, index: true, unique: true },
    urlid: { type: String, index: true },
    author: { type: String, index: true },
    date_published: { type: Date, index: true },
    date_modified: { type: Date, index: true },
    content: String,
    wordcount: { type: Number, index: true },
    title: String,
    excerpt: String,
    type: String,
    tags: [String],
    terms: [String],
    sections: [String],
    primary_section: { type: String, index: true },
    custom_section_label: String,
    img_thumbnail: String,
    img_medium: String,
    img_full: String,
    google_categories: [
        {
            name: String,
            confidence: Number
        }
    ],
    google_entities: [Mixed],
    google_sentiment: {
        sentences: [Mixed],
        documentSentiment: {
            magnitude: Number,
            score: Number
        },
        language: String
    },
    avg_secs_engaged: Number,
    engagement_rate: Number,
    returning_readers: Number,
    hits: [Mixed],
    unique_hits: [Mixed],
    newsletter_hits: [Mixed],
    logged_in_hits: [Mixed],
    subscriber_hits: [Mixed],
    readers_led_to_subscription: [Mixed],
    summary: String,
    status: String,
    comment_status: String,
    comment_count: Number,
    dm_key_theme: [String],
    dm_article_theme: [String],
    dm_user_need: [String],
    dm_disable_comments: Boolean,
    whitebeardcontent_id: { type: ObjectId, link: "whitebeard_content", index: true },
    /** AI-generated metadata (tags, sentiment, entities, user needs). Human/source fields stay separate. */
    ai: {
        tags: [
            {
                name: String,
                confidence: Number,
                reason: String
            }
        ],
        sentiment: {
            label: String,
            score: Number,
            magnitude: Number,
            rationale: String
        },
        // Mixed: Mongoose mis-parses subdoc arrays with nested mentions: [String] as [String].
        entities: [Mixed],
        user_needs: [
            {
                need: String,
                confidence: Number,
                rationale: String
            }
        ],
        generated_at: { type: Date, index: true },
        provider_id: String,
        model: String,
        template_slug: String,
        tasks: [String],
        raw: Mixed
    },
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "cr",
            all: ""
        }
    });

ArticleSchema.index({ terms: 1 });
ArticleSchema.index({ tags: 1 });

ArticleSchema.statics.formatSentence = formatSentence;
ArticleSchema.statics.wordCount = wordCount;

ArticleSchema.pre("save", function (next) {
	const content = this.content;
	this.wordcount = wordCount(typeof content === "string" ? content : "");
	next();
});

const Article = JXPSchema.model('Article', ArticleSchema);
export = Article;