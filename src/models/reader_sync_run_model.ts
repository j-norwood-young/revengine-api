import "jxp/globals";
/* global JXPSchema Mixed */

const ReaderSyncRunSchema = new JXPSchema({
    jobKey: { type: String, index: true },
    status: { type: String, index: true, enum: ["running", "success", "failed", "cancelled", "dry-run"] },
    dryRun: { type: Boolean, default: false },
    startedAt: { type: Date, index: true },
    completedAt: Date,
    durationMs: Number,

    jsonlSource: String,
    rowsStaged: { type: Number, default: 0 },
    readersCreated: { type: Number, default: 0 },
    readersSkipped24h: { type: Number, default: 0 },
    emailsUpdated: { type: Number, default: 0 },
    orphansSoftDeleted: { type: Number, default: 0 },
    membershipUpdated: { type: Number, default: 0 },
    membershipCleared: { type: Number, default: 0 },
    denormMismatches: { type: Number, default: 0 },
    profileFetches: { type: Number, default: 0 },
    unmappedChannelIds: [String],
    errors: [String],

    phaseDurations: Mixed,
    report: Mixed,
},
    {
        perms: {
            admin: "crud",
            owner: "r",
            user: "",
            all: ""
        }
    });

ReaderSyncRunSchema.index({ startedAt: -1 });

const ReaderSyncRun = JXPSchema.model('reader_sync_run', ReaderSyncRunSchema);
export = ReaderSyncRun;
