import "jxp/globals";
/* global JXPSchema ObjectId Mixed */

const ReaderSyncChangeSchema = new JXPSchema({
    run_id: { type: ObjectId, link: "reader_sync_run", index: true },
    kind: { type: String, index: true, enum: ["create", "email", "orphan", "membership", "denorm"] },
    external_id: { type: Number, index: true },
    dryRun: { type: Boolean, default: false },
    before: Mixed,
    after: Mixed,
},
    {
        perms: {
            admin: "crud",
            owner: "r",
            user: "",
            all: ""
        }
    });

ReaderSyncChangeSchema.index({ run_id: 1, kind: 1 });
ReaderSyncChangeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const ReaderSyncChange = JXPSchema.model('reader_sync_change', ReaderSyncChangeSchema);
export = ReaderSyncChange;
