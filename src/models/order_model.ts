import "jxp/globals";
/* global JXPSchema ObjectId Mixed */

import { decideInvoice } from "../lib/invoice";

const ProductSchema = new JXPSchema({
    external_id: { type: Number, index: true },
    product_name: { type: String, index: true },
    product_description: { type: String, index: true },
    product_quantity: { type: Number, index: true },
    product_price: { type: Number, index: true }
});

const OrderSchema = new JXPSchema({
    provider: { type: String, index: true, enum: ['woocommerce', 'whitebeard'] },
    external_id: { type: Number, index: true },
    invoice_id: { type: String, index: true },
    invoice_started_at: { type: Date, index: true },
    reader_id: { type: ObjectId, link: "reader", index: true },
    date_completed: { type: Date, index: true },
    status: { type: String, index: true },
    status_message: { type: String, index: true },
    date_created: { type: Date, index: true, default: Date.now },
    date_modified: { type: Date, index: true, default: Date.now },
    date_paid: { type: Date, index: true },
    payment_method: { type: String, index: true }, 
    products: [ ProductSchema ],
    total: { type: Number, index: true },
},
    {
        perms: {
            admin: "crud", // CRUD = Create, Retrieve, Update and Delete
            owner: "crud",
            user: "r",
            all: ""
        }
    });

OrderSchema.index({ reader_id: 1, date_created: -1 });

// Assign invoice_id for new orders (retry chains share one invoice until paid or 21-day lifetime).
// Fast path when invoice_id is already set (updates, including fail -> paid).
// Concurrent creates for the same reader may race; the backfill script is the source of truth for history.
OrderSchema.pre('save', async function(next) {
    try {
        if (this.invoice_id) return next();
        if (!this.reader_id) return next();

        const orderDate = this.date_created ?? this.date_paid ?? new Date();
        const prev = await (this.constructor as unknown as {
            findOne: (filter: Record<string, unknown>) => {
                sort: (sort: Record<string, number>) => {
                    select: (fields: string) => { lean: () => Promise<Record<string, unknown> | null> };
                };
            };
        }).findOne({
            reader_id: this.reader_id,
            _id: { $ne: this._id },
            date_created: { $lte: orderDate }
        })
            .sort({ date_created: -1 })
            .select('invoice_id invoice_started_at status date_created')
            .lean();

        const { invoiceId, invoiceStartedAt } = decideInvoice({
            orderDate,
            prev,
            readerId: this.reader_id.toString()
        });

        this.invoice_id = invoiceId;
        this.invoice_started_at = invoiceStartedAt;
        next();
    } catch (err) {
        next(err);
    }
});

// Calculate the total price of the order on write
OrderSchema.pre('save', function(next) {
    this.total = this.products.reduce((acc, product) => acc + product.product_price * product.product_quantity, 0);
    next();
});

// If state is "paid", set the date_paid to the current date
OrderSchema.pre('save', function(next) {
    if (this.status === 'paid') {
        this.date_paid = new Date();
    }
    next();
});

const Order = JXPSchema.model('Order', OrderSchema);
export = Order;
