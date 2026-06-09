import "jxp/globals";
/* global JXPSchema ObjectId Mixed */

const TicketSchema = new JXPSchema({
    reader_id: { type: ObjectId, link: "reader", index: true },
    external_id: { type: String, index: true },
    event: { type: String, index: true },
    event_date: { type: Date, index: true },
    booking_date: { type: Date, index: true },
    seats: [String],
    value: { type: Number, index: true },
    vendor: { type: String, index: true },
    payload: Mixed,
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr"
    }
});

TicketSchema.index({ reader_id: 1, event_date: -1 });

const Ticket = JXPSchema.model('ticket', TicketSchema);
export = Ticket;
