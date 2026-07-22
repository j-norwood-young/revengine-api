import "jxp/globals";
/* global JXPSchema Mixed */

/**
 * Configurable analytics metrics (e.g. Quality Read) with optional
 * per-content-type condition overrides. Conditions map to Elasticsearch
 * pageviews* field filters.
 */
const MetricConditionSchema = {
	field: { type: String, required: true },
	operator: {
		type: String,
		required: true,
		enum: ["gt", "gte", "lt", "lte", "eq", "ne"]
	},
	value: { type: Mixed, required: true }
};

const AnalyticsMetricSchema = new JXPSchema(
	{
		slug: { type: String, unique: true, required: true, index: true },
		name: { type: String, required: true },
		description: String,
		enabled: { type: Boolean, default: true },
		default_conditions: [MetricConditionSchema],
		content_type_overrides: [
			{
				content_type: { type: String, required: true },
				conditions: [MetricConditionSchema]
			}
		]
	},
	{
		perms: {
			admin: "crud",
			owner: "crud",
			user: "r",
			all: ""
		}
	}
);

const AnalyticsMetric = JXPSchema.model("analytics_metric", AnalyticsMetricSchema);
export = AnalyticsMetric;
