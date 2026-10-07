/* global Mixed */

// Builds a MongoDB query for the Reader collection from SegmentCondition[].
// SegmentCondition shape (server-side):
// { field: string, operator: string, value: Mixed, logicalOperator?: 'AND'|'OR' }

const DEFAULT_LOGICAL = "AND";

/** Reader string-array fields used by segment contains queries. */
export const READER_STRING_ARRAY_FIELDS = new Set([
	"favourite_authors",
	"favourite_sections",
	"favourite_key_themes",
	"favourite_user_needs",
	"favourite_tags",
	"newsletters",
	"tag_id",
]);

/** Legacy segment builder field ids mapped to reader schema paths. */
export const SEGMENT_FIELD_ALIASES: Record<string, string> = {
	favourite_author: "favourite_authors",
	favourite_section: "favourite_sections",
	authors: "favourite_authors",
	sections: "favourite_sections",
};

export function resolveSegmentField(field: unknown): string {
	if (typeof field !== "string") return "";
	return SEGMENT_FIELD_ALIASES[field] ?? field;
}

/** Mongo filter for prediction-backed live segments. */
export function mlSegmentsFilter(engine?: unknown): Record<string, unknown> {
	const query: Record<string, unknown> = {
		"ml.source": "predictions",
		_deleted: { $ne: true },
	};
	if (engine === "churn" || engine === "subscribe") {
		query["ml.engine"] = engine;
	}
	return query;
}

function isReaderStringArrayField(field: string): boolean {
	return READER_STRING_ARRAY_FIELDS.has(field);
}

export function isSafeMongoFieldPath(field: unknown): boolean {
	if (typeof field !== "string") return false;
	if (!field.length) return false;
	if (field.includes("\0")) return false;
	// Disallow mongo operator injection
	if (field.startsWith("$")) return false;
	if (field.includes("$")) return false;
	// allow dot paths like "profile.country"
	return /^[a-zA-Z0-9_.]+$/.test(field);
}

function escapeRegexLiteral(str: unknown): string {
	return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function coerceDate(v: unknown): Date | null {
	if (v == null) return null;
	if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
	if (typeof v === "number") {
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	if (typeof v === "string") {
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	return null;
}

function resolveRelativeDate(value: unknown, now: Date): Date | null {
	if (!value || typeof value !== "object") return null;
	const rel = value as Record<string, unknown>;
	if (rel.mode !== "relative") return null;

	const direction = rel.direction === "future" ? "future" : "past";
	const unit = rel.unit;
	const amount = Number.isInteger(rel.amount) && (rel.amount as number) > 0 ? (rel.amount as number) : null;
	const calendar = Boolean(rel.calendar);

	if (!amount) return null;

	const base = new Date(now.getTime());
	const sign = direction === "future" ? 1 : -1;

	if (!calendar) {
		switch (unit) {
			case "day":
				base.setDate(base.getDate() + sign * amount);
				break;
			case "week":
				base.setDate(base.getDate() + sign * amount * 7);
				break;
			case "month":
				base.setMonth(base.getMonth() + sign * amount);
				break;
			case "quarter":
				base.setMonth(base.getMonth() + sign * amount * 3);
				break;
			case "year":
				base.setFullYear(base.getFullYear() + sign * amount);
				break;
			default:
				return null;
		}

		return Number.isNaN(base.getTime()) ? null : base;
	}

	// Calendar-based semantics: snap to the start of the period first, then move by whole periods.
	const cal = new Date(now.getTime());
	cal.setHours(0, 0, 0, 0);

	switch (unit) {
		case "day": {
			cal.setDate(cal.getDate() + sign * amount);
			break;
		}
		case "week": {
			const day = cal.getDay() || 7;
			cal.setDate(cal.getDate() - (day - 1));
			cal.setDate(cal.getDate() + sign * amount * 7);
			break;
		}
		case "month": {
			cal.setDate(1);
			cal.setMonth(cal.getMonth() + sign * amount);
			break;
		}
		case "quarter": {
			const currentMonth = cal.getMonth();
			const quarterStartMonth = currentMonth - (currentMonth % 3);
			cal.setMonth(quarterStartMonth, 1);
			cal.setMonth(cal.getMonth() + sign * amount * 3);
			break;
		}
		case "year": {
			cal.setMonth(0, 1);
			cal.setFullYear(cal.getFullYear() + sign * amount);
			break;
		}
		default:
			return null;
	}

	return Number.isNaN(cal.getTime()) ? null : cal;
}

function normalizeArray(v: unknown): unknown[] {
	if (Array.isArray(v)) return v;
	if (v == null) return [];
	return [v];
}

function buildSingleConditionQuery(cond: Record<string, unknown>): Record<string, unknown> {
	if (!cond || typeof cond !== "object") throw new Error("Invalid condition");
	const { field: rawField, operator, value } = cond;
	const field = resolveSegmentField(rawField);

	if (!isSafeMongoFieldPath(field)) {
		throw new Error(`Unsafe field path: ${String(field)}`);
	}
	if (typeof operator !== "string" || !operator.length) {
		throw new Error("operator required");
	}

	const now = new Date();

	switch (operator) {
		case "equals":
			return { [field as string]: value };
		case "not_equals":
			return { [field as string]: { $ne: value } };
		case "contains": {
			if (isReaderStringArrayField(field)) {
				return { [field]: String(value) };
			}
			const re = escapeRegexLiteral(value);
			return { [field]: { $regex: re, $options: "i" } };
		}
		case "not_contains": {
			if (isReaderStringArrayField(field)) {
				return { [field]: { $ne: String(value) } };
			}
			const re = escapeRegexLiteral(value);
			return { [field]: { $not: { $regex: re, $options: "i" } } };
		}
		case "starts_with": {
			const re = `^${escapeRegexLiteral(value)}`;
			return { [field as string]: { $regex: re, $options: "i" } };
		}
		case "ends_with": {
			const re = `${escapeRegexLiteral(value)}$`;
			return { [field as string]: { $regex: re, $options: "i" } };
		}
		case "greater_than":
			return { [field as string]: { $gt: value } };
		case "less_than":
			return { [field as string]: { $lt: value } };
		case "greater_than_or_equal":
			return { [field as string]: { $gte: value } };
		case "less_than_or_equal":
			return { [field as string]: { $lte: value } };
		case "in":
			return { [field as string]: { $in: normalizeArray(value) } };
		case "not_in":
			return { [field as string]: { $nin: normalizeArray(value) } };
		case "is_null":
			return { $or: [{ [field as string]: null }, { [field as string]: { $exists: false } }] };
		case "is_not_null":
			return {
				$and: [{ [field as string]: { $ne: null } }, { [field as string]: { $exists: true } }],
			};
		case "date_before": {
			const rel = resolveRelativeDate(value, now);
			const d = rel || coerceDate(value);
			if (!d) throw new Error("date_before requires a valid date value");
			return { [field as string]: { $lt: d } };
		}
		case "date_after": {
			const rel = resolveRelativeDate(value, now);
			const d = rel || coerceDate(value);
			if (!d) throw new Error("date_after requires a valid date value");
			return { [field as string]: { $gt: d } };
		}
		case "date_between": {
			let from: Date | null = null;
			let to: Date | null = null;

			if (Array.isArray(value)) {
				const fromRaw = value[0];
				const toRaw = value[1];

				const fromResolved =
					fromRaw === "now"
						? now
						: resolveRelativeDate(fromRaw, now) || coerceDate(fromRaw);
				const toResolved =
					toRaw === "now" ? now : resolveRelativeDate(toRaw, now) || coerceDate(toRaw);

				from = fromResolved;
				to = toResolved;
			} else if (value && typeof value === "object") {
				const range = value as Record<string, unknown>;
				if (range.mode === "relative") {
					const resolved = resolveRelativeDate(value, now);
					from = now;
					to = resolved;
				} else {
					const fromRaw = range.from;
					const toRaw = range.to;

					const fromResolved =
						fromRaw === "now"
							? now
							: resolveRelativeDate(fromRaw, now) || coerceDate(fromRaw);
					const toResolved =
						toRaw === "now"
							? now
							: resolveRelativeDate(toRaw, now) || coerceDate(toRaw);

					from = fromResolved;
					to = toResolved;
				}
			} else if (typeof value === "string") {
				const d = coerceDate(value);
				from = d;
				to = d;
			}

			if (!from || !to) throw new Error("date_between requires {from,to} or [from,to]");

			const start = from <= to ? from : to;
			const end = from <= to ? to : from;

			return { [field as string]: { $gte: start, $lte: end } };
		}
		default:
			throw new Error(`Unsupported operator: ${operator}`);
	}
}

export function buildMongoQueryFromSegmentConditions(
	conditions: Record<string, unknown>[]
): Record<string, unknown> {
	if (!Array.isArray(conditions) || conditions.length === 0) return {};

	const clauses: Record<string, unknown>[] = [];
	let currentAndGroup: Record<string, unknown>[] = [];
	const orGroups: Record<string, unknown>[][] = [];

	for (let i = 0; i < conditions.length; i++) {
		const cond = repairPredictionFreshnessCondition(conditions[i]);
		const connector =
			i === 0
				? DEFAULT_LOGICAL
				: String(cond.logicalOperator || DEFAULT_LOGICAL).toUpperCase();
		const q = buildSingleConditionQuery(cond);

		if (connector === "OR") {
			if (currentAndGroup.length) orGroups.push(currentAndGroup);
			currentAndGroup = [q];
		} else {
			currentAndGroup.push(q);
		}
	}
	if (currentAndGroup.length) orGroups.push(currentAndGroup);

	if (orGroups.length === 1) {
		const group = orGroups[0];
		if (group.length === 1) return group[0];
		return { $and: group };
	}

	return { $or: orGroups.map((group) => (group.length === 1 ? group[0] : { $and: group })) };
}

const ML_AS_OF_FIELD = /^ml_predictions\.(churn|subscribe)\.as_of$/;
const ML_SCORED_AT_FIELD = /^ml_predictions\.(churn|subscribe)\.scored_at$/;

function isRelativeDateValue(value: unknown): boolean {
	return !!value && typeof value === "object" && (value as { mode?: unknown }).mode === "relative";
}

function isRollingDateEndpoint(value: unknown): boolean {
	return value === "now" || isRelativeDateValue(value);
}

function dateBetweenEndpoints(value: unknown): [unknown, unknown] | null {
	if (Array.isArray(value) && value.length === 2) return [value[0], value[1]];
	if (value && typeof value === "object") {
		const v = value as { from?: unknown; to?: unknown };
		if (v.from !== undefined || v.to !== undefined) return [v.from, v.to];
	}
	return null;
}

function conditionUsesRelativeDate(operator: unknown, value: unknown): boolean {
	if (operator === "date_before" || operator === "date_after") {
		return isRollingDateEndpoint(value);
	}
	if (operator === "date_between") {
		const endpoints = dateBetweenEndpoints(value);
		if (endpoints) return endpoints.some(isRollingDateEndpoint);
	}
	return false;
}

/** Live freshness filters on as_of (now→future) match 0 readers; rewrite onto scored_at. */
export function repairPredictionFreshnessCondition(
	cond: Record<string, unknown>
): Record<string, unknown> {
	const src =
		cond && typeof (cond as { toObject?: () => Record<string, unknown> }).toObject === "function"
			? (cond as { toObject: () => Record<string, unknown> }).toObject()
			: { ...cond };

	const field = typeof src.field === "string" ? src.field : "";
	const isAsOf = ML_AS_OF_FIELD.test(field);
	const isScoredAt = ML_SCORED_AT_FIELD.test(field);
	if (!isAsOf && !isScoredAt) return src;

	const value = src.value;
	const rolling = conditionUsesRelativeDate(src.operator, value);
	const endpoints = src.operator === "date_between" ? dateBetweenEndpoints(value) : null;

	let nextValue = value;
	if (
		endpoints &&
		endpoints[0] === "now" &&
		isRelativeDateValue(endpoints[1]) &&
		(endpoints[1] as { direction?: unknown }).direction === "future"
	) {
		nextValue = [{ ...(endpoints[1] as object), direction: "past" }, "now"];
	}

	return {
		...src,
		field: isAsOf && rolling ? field.replace(/\.as_of$/, ".scored_at") : field,
		value: nextValue,
	};
}
