import "jxp/globals";
/* global JXPSchema Mixed */

/**
 * Raw Whitebeard article comment (API ArticleComment).
 * @see https://apidocsv3.whitebeard.net/ — GET/POST /cms/content/{id}/comment
 */
const WhitebeardCommentSchema = new JXPSchema({
    id: { type: String, index: true, unique: true },
    signature: { type: String, index: true },
    status: { type: String, index: true },
    admin: Number,
    itemid: { type: String, index: true },
    itemurl: String,
    itemtitle: String,
    postername: { type: String, index: true },
    posteremail: { type: String, index: true, lowercase: true, trim: true },
    posterimage: String,
    poster_id: { type: String, index: true },
    timestamp: { type: Date, index: true },
    comment: String,
    likes: { type: Number, index: true, default: 0 },
    dislikes: { type: Number, index: true, default: 0 },
    /** Nested replies as returned by the WB API (not flattened). */
    replies: [Mixed],
    file: String,
    file_type: String,
    file_duration: String,
    lastEdited: { type: Date, index: true },
    metadata: Mixed,
    rating: Number,
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r",
            all: ""
        }
    });

WhitebeardCommentSchema.index({ itemid: 1, timestamp: -1 });
WhitebeardCommentSchema.index({ poster_id: 1, timestamp: -1 });
WhitebeardCommentSchema.index({ status: 1, timestamp: -1 });

const WhitebeardComment = JXPSchema.model('whitebeardcomment', WhitebeardCommentSchema);
export = WhitebeardComment;
