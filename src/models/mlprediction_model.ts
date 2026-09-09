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
	},
	{
		perms: {
			admin: "crud",
			owner: "crud",
			user: "r",
			all: "",
		},
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

const MLPrediction = JXPSchema.model("MLPrediction", MLPredictionSchema);
export = MLPrediction;
