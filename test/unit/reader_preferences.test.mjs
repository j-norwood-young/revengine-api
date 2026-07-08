import { describe, it, expect } from "vitest";
import {
	DEFAULT_READER_PREFERENCES_CONFIG,
	incrementCount,
	incrementMany,
	parseReaderPreferencesConfigJson,
	rankFavourites
} from "../../dist/lib/reader_preferences.js";

describe("rankFavourites", () => {
	it("applies minHits and topN with stable tie-break", () => {
		const counts = new Map([
			["Beta", 5],
			["Alpha", 5],
			["Gamma", 2],
			["Delta", 1]
		]);
		expect(rankFavourites(counts, { topN: 2, minHits: 2 })).toEqual(["Alpha", "Beta"]);
	});

	it("returns empty when nothing meets minHits", () => {
		const counts = new Map([["Only", 1]]);
		expect(rankFavourites(counts, { topN: 3, minHits: 3 })).toEqual([]);
	});
});

describe("increment helpers", () => {
	it("ignores blank values", () => {
		const map = new Map();
		incrementCount(map, "  ", 2);
		incrementMany(map, ["", "Sport"], 3);
		expect(map.get("Sport")).toBe(3);
		expect(map.size).toBe(1);
	});
});

describe("parseReaderPreferencesConfigJson", () => {
	it("returns defaults when unset", () => {
		expect(parseReaderPreferencesConfigJson(undefined)).toEqual(
			DEFAULT_READER_PREFERENCES_CONFIG
		);
	});

	it("merges partial overrides", () => {
		const config = parseReaderPreferencesConfigJson(
			JSON.stringify({ authors: { topN: 5, minHits: 4 } })
		);
		expect(config.authors).toEqual({ topN: 5, minHits: 4 });
		expect(config.tags.topN).toBe(20);
	});

	it("rejects invalid JSON", () => {
		expect(() => parseReaderPreferencesConfigJson("{bad")).toThrow(/valid JSON/i);
	});
});
