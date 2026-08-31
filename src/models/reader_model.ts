import "jxp/globals";
/* global JXPSchema ObjectId Mixed */

const HomeLocationSchema = new JXPSchema({
    country: String,
    region: String,
    city: String,
    weight: Number,
});
HomeLocationSchema.index({ country: 1, region: 1, city: 1, weight: 1 }, { background: true });

const ReaderSchema = new JXPSchema({
    external_id: { type: Number, unique: true, sparse: true, alias: 'wordpress_id' },
    
    // Basics
    email: { type: String, index: true, unique: true, lowercase: true, trim: true, sparse: true },
    display_name: String,
    first_name: { type: String, trim: true },
    last_name: { type: String, trim: true },
    cellphone: { type: String, trim: true },

    // Links to related collections
    whitebeardcustomer_id: { type: ObjectId, link: "whitebeard_customer", index: true },
    newsletter_id: [{ type: ObjectId, link: "newsletter" }],

    // Segments, labels, and tags
    label_id: [{ type: ObjectId, link: "Label", map_to: "label" }],
    label_update: Date,
    tag_id: [{ type: ObjectId, link: "tag", map_to: "tag" }],
    tag_update: Date,
    segment_id: [{ type: ObjectId, link: "segment", map_to: "segment_v2", alias: 'segmentation_id' }],
    segment_update_v2: { type: Date, alias: 'segment_update' },

    // Dates
    last_login: { type: Date, index: true },
    last_update: { type: Date, index: true },
    first_login: { type: Date, index: true },
    user_registered: { type: Date, index: true, default: Date.now, alias: 'user_registered_on_wordpress' },

    // Commmercial relationship
    paying_customer: { type: Boolean, index: true, default: false },
    payment_method: { type: String, index: true },
    member: { type: Boolean, index: true, default: false },
    monthly_contribution: { type: Number, index: true, default: 0 },
    subscription_total: { type: Number, index: true, default: 0 },
    subscription_product: { type: String, index: true },
    subscription_period: { type: String, index: true },
    subscription_status: { type: String, index: true },
    subscription_next_payment: { type: Date, index: true },
    subscription_start: { type: Date, index: true },
    subscription_end: { type: Date, index: true },
    subscription_cancellation_request_date: { type: Date, index: true },
    subscription_cancellation_reason: { type: String, index: true },

    // Payments
    first_payment: { type: Date, index: true },
    last_payment: { type: Date, index: true },
    successful_payment_count: { type: Number, index: true, default: 0 },
    successful_payment_total: { type: Number, index: true, default: 0 },
    payment_failing: { type: Boolean, index: true, default: false },
    payment_failing_date: { type: Date, index: true },
    payment_failing_reason: { type: String, index: true },
    payment_failing_attempts: { type: Number, index: true, default: 0 },
    payment_failing_last_attempt: { type: Date, index: true },

    // Content preferences
    favourite_authors: [{ type: String, index: true }],
    favourite_sections: [{ type: String, index: true }],
    favourite_key_themes: [{ type: String, index: true }],
    favourite_user_needs: [{ type: String, index: true }],
    favourite_tags: [{ type: String, index: true }],
    favourite_preferences_updated_at: { type: Date, index: true },
    favourite_preferences_last_read_at: { type: Date, index: true },
    interests: [String],
    quality_reads: { type: Number, index: true, default: 0 },
    avg_read_time: { type: Number, index: true, default: 0 },
    avg_read_time_quantile_rank: { type: Number, index: true, default: 0 },
    avg_read_depth: { type: Number, index: true, default: 0 },
    avg_read_depth_quantile_rank: { type: Number, index: true, default: 0 },
    avg_words_read: { type: Number, index: true, default: 0 },
    avg_words_read_quantile_rank: { type: Number, index: true, default: 0 },

    // Reader engagement
    clickthrough_rate: { type: Number, index: true, default: 0 },
    clickthrough_rate_quantile_rank: { type: Number, index: true, default: 0 },
    bounce_rate: { type: Number, index: true, default: 0 },
    bounce_rate_quantile_rank: { type: Number, index: true, default: 0 },
    time_on_site: { type: Number, index: true, default: 0 },
    time_on_site_quantile_rank: { type: Number, index: true, default: 0 },
    pages_per_visit: { type: Number, index: true, default: 0 },
    pages_per_visit_quantile_rank: { type: Number, index: true, default: 0 },
    avg_session_duration: { type: Number, index: true, default: 0 },
    avg_session_duration_quantile_rank: { type: Number, index: true, default: 0 },

    // Reader habits
    top_times_of_day: [{ type: String, index: true, enum: ['Morning', 'Afternoon', 'Evening', 'Night'] }],
    top_days_of_week: [{ type: String, index: true, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] }],
    top_newsletters: [{ type: String, index: true }],

    // Newsletters and email
    email_state: { type: String, index: true },
    email_client: { type: String, index: true },
    newsletters: [String],

    // Events
    events: [{ type: String, index: true }],

    // Demographics
    gender: { type: String, index: true },
    dob: { type: Date, index: true },
    industry: { type: String, index: true },
    income: { type: Number, index: true },
    race: { type: String, index: true },

    // User Agent
    app_user: { type: Boolean, index: true, default: false },
    uas: { type: Mixed, set: toSet },
    browser: { type: String, index: true },
    browser_version: String,
    device: { type: String, index: true },
    operating_system: String,
    os_version: { type: String, index: true },
    platform: String,
    height: Number,
    width: Number,

    // UTM parameters
    medium: String,
    source: String,
    campaign: String,

    // Location data
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number,
    home_locations: [HomeLocationSchema],

    // Credit Cards
    cc_expiry_date: Date,
    cc_last4_digits: String,

    //RFV
    recency_score: { type: Number, index: true },
    recency: { type: Date, index: true },
    recency_quantile_rank: Number,
    frequency_score: { type: Number, index: true },
    frequency: { type: Number, index: true },
    frequency_quantile_rank: Number,
    monetary_value_score: { type: Number, index: true },
    monetary_value: { type: Number, index: true }, // per month
    volume_score: { type: Number, index: true },
    volume: { type: Number, index: true },
    volume_quantile_rank: Number,
    total_lifetime_value_score: { type: Number, index: true },
    total_lifetime_value: { type: Number, index: true },

    sent_insider_welcome_email: { type: Date, index: true },
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r",
        }
    });

function toSet(a) {
    return [...new Set(a)];
}

// Segment / subscription list queries (sort by updatedAt)
ReaderSchema.index({ subscription_status: 1, segment_id: 1, updatedAt: -1 }, { background: true });
ReaderSchema.index({ segment_id: 1, updatedAt: -1 }, { background: true });
ReaderSchema.index({ subscription_status: 1, updatedAt: -1 }, { background: true });
ReaderSchema.index({ segment_id: 1 }, { background: true });
ReaderSchema.index({ tag_id: 1 }, { background: true });
ReaderSchema.index({ newsletters: 1 }, { background: true });
ReaderSchema.index({ newsletter_id: 1 }, { background: true });
ReaderSchema.index({ updatedAt: 1 }, { background: true });
ReaderSchema.index({ favourite_preferences_last_read_at: 1 }, { background: true });

// Legacy reader fields still present in production data
ReaderSchema.index({ value: 1 }, { background: true });
ReaderSchema.index({ value_score: 1 }, { background: true });
ReaderSchema.index({ membership_product: 1 }, { background: true });
ReaderSchema.index({ lifetime_value_score: 1 }, { background: true });
ReaderSchema.index({ id: 1 }, { unique: true, sparse: true, background: true });


// const Reader 
const Reader = JXPSchema.model('reader', ReaderSchema);
export = Reader;
