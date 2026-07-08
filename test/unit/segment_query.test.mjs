import { describe, it, expect } from "vitest";
import {
	buildMongoQueryFromSegmentConditions,
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
});
