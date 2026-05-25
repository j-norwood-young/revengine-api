/* global Mixed */

// Builds a MongoDB query for the Reader collection from SegmentCondition[].
// SegmentCondition shape (server-side):
// { field: string, operator: string, value: Mixed, logicalOperator?: 'AND'|'OR' }

const DEFAULT_LOGICAL = "AND";

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
	const { field, operator, value } = cond;

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
			const re = escapeRegexLiteral(value);
			return { [field as string]: { $regex: re, $options: "i" } };
		}
		case "not_contains": {
			const re = escapeRegexLiteral(value);
			return { [field as string]: { $not: { $regex: re, $options: "i" } } };
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
		const cond = conditions[i];
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
