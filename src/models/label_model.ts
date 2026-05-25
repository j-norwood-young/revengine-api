import "jxp/globals";

const DEPRECATED_APPLY_MESSAGE =
    "DEPRECATED: Label application is no longer supported. Labels are now static.";

const LabelSchema = new JXPSchema({
    name: { type: String, unique: true },
    code: { type: String, required: true },
    last_count: Number,
    last_count_date: Date,
}, {
    perms: {
        admin: "crud",
        owner: "crud",
        user: "r",
    },
    callable_statics: ["apply_label", "apply_labels"],
});

LabelSchema.statics.apply_label = async function () {
    return DEPRECATED_APPLY_MESSAGE;
};

LabelSchema.statics.apply_labels = async function () {
    return DEPRECATED_APPLY_MESSAGE;
};

const Label = JXPSchema.model('Label', LabelSchema);
export = Label;
