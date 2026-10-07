import "jxp/globals";
/* global JXPSchema ObjectId Mixed */

/**
 * Stored ML propensity scores (churn, and future engines).
 * Collection: mlpredictions
 *
 * Unique per reader + engine + calendar day (UTC date of `date`).
 */
const MLPredictionSchema = new JXPSchema(
	{
		/** Scoring run timestamp (also used for daily uniqueness). */
		date: { type: Date, index: true, required: true },
		/** Feature / label as-of instant used when scoring. */
		as_of: { type: Date, index: true },

		reader_id: { type: ObjectId, link: "reader", index: true, required: true },
		/** WordPress / ES user id when available. */
		external_id: { type: Number, index: true },

		/**
		 * Prediction engine id, e.g. `catboost_churn_baseline`.
		 * Distinguishes models that may coexist for the same reader/day.
		 */
		engine: { type: String, index: true, required: true },
		/** High-level objective: churn | subscribe | ltv | … */
		type: { type: String, index: true, required: true, default: "churn" },
		/** Model artifact version / schema version string. */
		model_version: { type: String, index: true },

		/** Probability in [0, 1] (or model-native score). */
		score: { type: Number, required: true, index: true },
		/** Binary decision at `threshold` (true = positive class). */
		prediction: { type: Boolean, index: true, required: true },
		/** Cutoff used for `prediction`. */
		threshold: { type: Number },
		/** Human band derived from score, e.g. low | medium | high. */
		risk: { type: String, index: true },

		/** How this row was produced: on_demand | batch | backfill */
		source: { type: String, index: true },

		/** Compact feature / factor summary for UI (not full training row). */
		feature_summary: { type: Mixed },
		/** Engine-specific extras (pageviews_used, onnx path, run_id, …). */
		metadata: { type: Mixed },

		/**
		 * Resolved label after the engine horizon elapses.
		 * null until evaluation; true/false once observed. Do not store derived
		 * "correctness" — compare against `prediction` in queries.
		 */
		outcome: { type: Boolean, index: true },
		/** When the actual event happened (cancel/conversion), if known. */
		outcome_event_at: { type: Date, index: true },
		/** When evaluation wrote the outcome. */
		outcome_observed_at: { type: Date, index: true },
		/** e.g. subscription_history | orders */
		outcome_source: { type: String },
		/** Label window in days (30 churn / 90 subscribe). */
		outcome_horizon_days: { type: Number },
	},
	{
		perms: {
			admin: "crud",
			owner: "crud",
			user: "r",
			all: "",
		},
		callable_statics: ["sync_reader_signals"],
	}
);

// One score per reader per engine per calendar day
MLPredictionSchema.index(
	{ reader_id: 1, engine: 1, date: 1 },
	{ unique: true, background: true }
);
MLPredictionSchema.index({ type: 1, date: -1, score: -1 }, { background: true });
MLPredictionSchema.index({ engine: 1, risk: 1, date: -1 }, { background: true });
MLPredictionSchema.index({ external_id: 1, engine: 1, date: -1 }, { background: true });
MLPredictionSchema.index({ engine: 1, outcome: 1, as_of: 1 }, { background: true });
MLPredictionSchema.index({ type: 1, outcome: 1, as_of: 1 }, { background: true });
MLPredictionSchema.index(
	{ engine: 1, as_of: 1 },
	{ background: true, partialFilterExpression: { outcome: { $exists: false } } }
);

const SIGNAL_TYPES = ["churn", "subscribe"] as const;

type SignalDoc = {
	reader_id?: unknown;
	score?: number;
	risk?: string;
	prediction?: boolean;
	as_of?: Date;
	date?: Date;
	model_version?: string;
};
const SIGNAL_BATCH = 1000;

/**
 * Denormalize the latest scoring batch of each engine onto readers.ml_predictions.*
 * so live segments match without waiting for the next scoring run. Idempotent.
 * Optional data.engine: "churn" | "subscribe" limits the sync to one engine.
 */
MLPredictionSchema.statics.sync_reader_signals = async function (data) {
	const Reader = require("./reader_model");
	const types = SIGNAL_TYPES.filter((t) => !data?.engine || data.engine === t);
	const summary: Record<string, unknown> = {};

	for (const type of types) {
		const [latest] = (await MLPrediction.find({ type, _deleted: { $ne: true } })
			.sort({ date: -1 })
			.limit(1)
			.lean()) as SignalDoc[];
		if (!latest) {
			summary[type] = { synced: 0, date: null };
			continue;
		}

		let ops: unknown[] = [];
		let synced = 0;
		const flush = async () => {
			if (!ops.length) return;
			await Reader.bulkWrite(ops, { ordered: false });
			synced += ops.length;
			ops = [];
		};

		const cursor = (MLPrediction.find({
			type,
			date: latest.date,
			_deleted: { $ne: true },
		})
			.select("reader_id score risk prediction as_of date model_version")
			.lean()
			.cursor() as unknown) as AsyncIterable<SignalDoc>;

		for await (const doc of cursor) {
			if (!doc.reader_id) continue;
			ops.push({
				updateOne: {
					filter: { _id: doc.reader_id },
					update: {
						$set: {
							[`ml_predictions.${type}.score`]: doc.score,
							[`ml_predictions.${type}.band`]: doc.risk ?? null,
							[`ml_predictions.${type}.prediction`]: doc.prediction,
							[`ml_predictions.${type}.as_of`]: doc.as_of,
							[`ml_predictions.${type}.scored_at`]: doc.date,
							[`ml_predictions.${type}.model_version`]: doc.model_version ?? null,
						},
					},
				},
			});
			if (ops.length >= SIGNAL_BATCH) await flush();
		}
		await flush();
		summary[type] = { synced, date: latest.date };
	}

	return summary;
};

const MLPrediction = JXPSchema.model("MLPrediction", MLPredictionSchema);
export = MLPrediction;
