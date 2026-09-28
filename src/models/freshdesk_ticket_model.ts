import "jxp/globals";
/* global JXPSchema ObjectId Mixed */

const FreshdeskTicketSchema = new JXPSchema({
    reader_id: { type: ObjectId, link: "reader", index: true },
    // Freshdesk's `id`; renamed because `id` is reserved by Mongoose
    freshdesk_id: { type: Number, index: true, unique: true },
    requester_id: { type: Number, index: true },
    requester_email: { type: String, index: true },
    responder_id: Number,
    company_id: Number,
    group_id: { type: Number, index: true },
    product_id: Number,
    email_config_id: Number,
    subject: String,
    description: String,
    description_text: String,
    structured_description: Mixed,
    type: { type: String, index: true },
    // 2 Open, 3 Pending, 4 Resolved, 5 Closed
    status: { type: Number, index: true },
    // 1 Low, 2 Medium, 3 High, 4 Urgent
    priority: { type: Number, index: true },
    // 1 Email, 2 Portal, 3 Phone, 7 Chat, 9 Feedback Widget, 10 Outbound Email
    source: { type: Number, index: true },
    source_info: Mixed,
    source_additional_info: Mixed,
    association_type: Number,
    support_email: String,
    to_emails: [String],
    cc_emails: [String],
    fwd_emails: [String],
    reply_cc_emails: [String],
    ticket_cc_emails: [String],
    ticket_bcc_emails: [String],
    tags: { type: [String], index: true },
    custom_fields: Mixed,
    attachments: [Mixed],
    spam: { type: Boolean, index: true },
    is_escalated: Boolean,
    fr_escalated: Boolean,
    due_by: Date,
    fr_due_by: Date,
    created_at: { type: Date, index: true },
    updated_at: { type: Date, index: true },
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "r"
    }
});

FreshdeskTicketSchema.index({ reader_id: 1, created_at: -1 });

const FreshdeskTicket = JXPSchema.model('freshdesk_ticket', FreshdeskTicketSchema);
export = FreshdeskTicket;
