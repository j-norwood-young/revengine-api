import "jxp/globals";
/* global JXPSchema ObjectId Mixed */

/**
 * Normalised article comment (any provider). Prefer this collection for product
 * queries; store raw WB payloads in whitebeardcomment.
 */
const CommentSchema = new JXPSchema({
    provider: { type: String, index: true, enum: ['whitebeard'] },
    external_id: { type: String, index: true },
    whitebeardcomment_id: { type: ObjectId, link: "whitebeard_comment", index: true },

    reader_id: { type: ObjectId, link: "reader", index: true },
    article_id: { type: ObjectId, link: "Article", index: true },
    /** Reply threading — null/undefined for top-level comments. */
    parent_id: { type: ObjectId, link: "comment", map_to: "parent", index: true },

    comment: { type: String, required: true },
    status: { type: String, index: true }, // approved | pending | declined | spam | trash
    likes: { type: Number, index: true, default: 0 },
    dislikes: { type: Number, index: true, default: 0 },
    metadata: Mixed,

    /** Modelled toxicity score (typically 0–1). */
    toxicity_score: { type: Number, index: true },
    /** Sentiment score (typically −1 negative … +1 positive). */
    sentiment_score: { type: Number, index: true },

    timestamp: { type: Date, index: true },
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r",
            all: ""
        }
    });

CommentSchema.index({ article_id: 1, timestamp: -1 });
CommentSchema.index({ reader_id: 1, timestamp: -1 });
CommentSchema.index({ parent_id: 1, timestamp: -1 });
CommentSchema.index({ provider: 1, external_id: 1 }, { unique: true, sparse: true });
CommentSchema.index({ toxicity_score: 1 });
CommentSchema.index({ sentiment_score: 1 });

const Comment = JXPSchema.model('comment', CommentSchema);
export = Comment;
