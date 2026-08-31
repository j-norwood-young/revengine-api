import "jxp/globals";
/* global JXPSchema Mixed */

const WbCustomerExportSchema = new JXPSchema({
    external_id: { type: Number, unique: true, index: true },
    email: { type: String, index: true, lowercase: true, trim: true },
    name: String,
    userType: String,
    creationDate: String,
    subscription_status: String,
    nextRenewal: String,
    subscriptions: String,
    last_login: Date,
    payment_method: String,
    payment_expiry: String,
    channel_ids: [String],
},
    {
        perms: {
            admin: "crud",
            owner: "r",
            user: "",
            all: ""
        }
    });

WbCustomerExportSchema.index({ email: 1 });

const WbCustomerExport = JXPSchema.model('wbcustomerexport', WbCustomerExportSchema);
export = WbCustomerExport;
