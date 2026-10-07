import "jxp/globals";
/* global JXPSchema Mixed */

/**
 * Champion / versioned propensity model metadata for the Predictions UI.
 * Collection: mlmodels
 *
 * Unique per engine + model_version. The current champion has champion: true.
 */
const MLModelSchema = new JXPSchema(
	{
		/** Engine id, e.g. catboost_churn_baseline. */
		engine: { type: String, index: true, required: true },
		/** High-level objective: churn | subscribe */
		type: { type: String, index: true, required: true },
		model_version: { type: String, index: true, required: true },
		feature_schema_hash: { type: String, index: true },
		promoted_at: { type: Date, index: true },
		champion: { type: Boolean, index: true, default: false },
		onnx_key: { type: String },
		encoders_key: { type: String },
		/** Training metrics blob (train/val AUC, lift, n, …). */
		metrics: { type: Mixed },
		feature_columns: [{ type: String }],
		feature_importance: [
			{
				feature: { type: String },
				importance: { type: Number },
			},
		],
		previous: { type: String },
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

MLModelSchema.index({ engine: 1, model_version: 1 }, { unique: true, background: true });
MLModelSchema.index({ engine: 1, champion: 1, promoted_at: -1 }, { background: true });

const MLModel = JXPSchema.model("MLModel", MLModelSchema);
export = MLModel;
