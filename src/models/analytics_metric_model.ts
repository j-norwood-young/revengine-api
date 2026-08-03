import "jxp/globals";
/* global JXPSchema Mixed */

/**
 * Configurable analytics metrics (e.g. Quality Read).
 * Conditions map to Elasticsearch pageviews* field filters via a nested
 * AND/OR expression tree (`expression`). Legacy flat `default_conditions`
 * and `content_type_overrides` remain for one-cycle read compatibility.
 */
const LegacyConditionSchema = {
	field: { type: String, required: true },
	operator: {
		type: String,
		required: true,
		enum: ["gt", "gte", "lt", "lte", "eq", "ne"]
	},
	value: { type: Mixed, required: true },
	logicalOperator: {
		type: String,
		enum: ["AND", "OR"],
		required: false
	}
};

const AnalyticsMetricSchema = new JXPSchema(
	{
		slug: { type: String, unique: true, required: true, index: true },
		name: { type: String, required: true },
		description: String,
		enabled: { type: Boolean, default: true },
		// Nested MetricGroupNode tree: { type:'group', id, combinator, children[] }
		expression: { type: Mixed, required: false },
		// Legacy — read-converted into expression; cleared on save.
		default_conditions: [LegacyConditionSchema],
		content_type_overrides: [
			{
				content_type: { type: String, required: true },
				conditions: [LegacyConditionSchema]
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
