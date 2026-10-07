import { describe, it, expect } from "vitest";
import {
	buildMongoQueryFromSegmentConditions,
	isSafeMongoFieldPath,
	mlSegmentsFilter,
	resolveSegmentField
} from "../../dist/lib/segment_query.js";

describe("resolveSegmentField", () => {
	it("maps legacy favourite field ids", () => {
		expect(resolveSegmentField("favourite_author")).toBe("favourite_authors");
		expect(resolveSegmentField("sections")).toBe("favourite_sections");
	});
});

describe("buildMongoQueryFromSegmentConditions", () => {
	it("uses exact array membership for favourite_authors contains", () => {
		const query = buildMongoQueryFromSegmentConditions([
			{
				field: "favourite_authors",
				operator: "contains",
				value: "Jane Doe"
			}
		]);
		expect(query).toEqual({ favourite_authors: "Jane Doe" });
	});

	it("resolves legacy favourite_author contains to favourite_authors", () => {
		const query = buildMongoQueryFromSegmentConditions([
			{
				field: "favourite_author",
				operator: "contains",
				value: "Jane Doe"
			}
		]);
		expect(query).toEqual({ favourite_authors: "Jane Doe" });
	});

	it("keeps regex contains for scalar text fields", () => {
		const query = buildMongoQueryFromSegmentConditions([
			{
				field: "email",
				operator: "contains",
				value: "dailymaverick"
			}
		]);
		expect(query).toEqual({
			email: { $regex: "dailymaverick", $options: "i" }
		});
	});

	it("reads mongoose-like conditions via toObject", () => {
		const query = buildMongoQueryFromSegmentConditions([
			{
				toObject() {
					return { field: "email", operator: "equals", value: "a@b.c" };
				}
			}
		]);
		expect(query).toEqual({ email: "a@b.c" });
	});

	it("filters denormalized churn band with dotted paths", () => {
		const query = buildMongoQueryFromSegmentConditions([
			{
				field: "ml_predictions.churn.band",
				operator: "equals",
				value: "high"
			}
		]);
		expect(query).toEqual({ "ml_predictions.churn.band": "high" });
	});

	it("rewrites live as_of now→future windows onto scored_at", () => {
		const before = Date.now();
		const query = buildMongoQueryFromSegmentConditions([
			{
				field: "ml_predictions.churn.band",
				operator: "equals",
				value: "high"
			},
			{
				field: "ml_predictions.churn.as_of",
				operator: "date_between",
				value: [
					"now",
					{ mode: "relative", direction: "future", amount: 14, unit: "day" }
				]
			}
		]);
		expect(query.$and).toHaveLength(2);
		expect(query.$and[0]).toEqual({ "ml_predictions.churn.band": "high" });
		expect(query["ml_predictions.churn.as_of"]).toBeUndefined();
		const range = query.$and[1]["ml_predictions.churn.scored_at"];
		const days = (before - range.$gte.getTime()) / 86_400_000;
		expect(days).toBeGreaterThan(13.99);
		expect(days).toBeLessThan(14.01);
		expect(range.$lte.getTime()).toBeGreaterThanOrEqual(before);
	});

	it("resolves a relative as_of window onto scored_at", () => {
		const before = Date.now();
		const query = buildMongoQueryFromSegmentConditions([
			{
				field: "ml_predictions.subscribe.as_of",
				operator: "date_between",
				value: [{ mode: "relative", direction: "past", amount: 14, unit: "day" }, "now"]
			}
		]);
		expect(query["ml_predictions.subscribe.as_of"]).toBeUndefined();
		const range = query["ml_predictions.subscribe.scored_at"];
		const days = (before - range.$gte.getTime()) / 86_400_000;
		expect(days).toBeGreaterThan(13.99);
		expect(days).toBeLessThan(14.01);
		expect(range.$lte.getTime()).toBeGreaterThanOrEqual(before);
	});

	it("compares subscribe score with greater_than", () => {
		const query = buildMongoQueryFromSegmentConditions([
			{
				field: "ml_predictions.subscribe.score",
				operator: "greater_than",
				value: 0.15
			}
		]);
		expect(query).toEqual({ "ml_predictions.subscribe.score": { $gt: 0.15 } });
	});
});

describe("mlSegmentsFilter", () => {
	it("scopes to prediction-backed segments", () => {
		expect(mlSegmentsFilter()).toEqual({
			"ml.source": "predictions",
			_deleted: { $ne: true }
		});
	});

	it("optionally filters by engine", () => {
		expect(mlSegmentsFilter("churn")).toEqual({
			"ml.source": "predictions",
			_deleted: { $ne: true },
			"ml.engine": "churn"
		});
	});

	it("ignores unknown engines", () => {
		expect(mlSegmentsFilter("ltv")).toEqual({
			"ml.source": "predictions",
			_deleted: { $ne: true }
		});
	});
});

describe("isSafeMongoFieldPath", () => {
	it("allows dotted ML prediction paths", () => {
		expect(isSafeMongoFieldPath("ml_predictions.churn.band")).toBe(true);
		expect(isSafeMongoFieldPath("ml_predictions.subscribe.score")).toBe(true);
	});

	it("rejects operator injection", () => {
		expect(isSafeMongoFieldPath("$ne")).toBe(false);
		expect(isSafeMongoFieldPath("ml_predictions.$where")).toBe(false);
	});
});
