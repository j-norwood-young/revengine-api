/** Shared ranking logic for reader content-preference arrays. */

export type PreferenceDimensionConfig = {
	topN: number;
	minHits: number;
};

export type ReaderPreferencesConfig = {
	windowDays: number;
	authors: PreferenceDimensionConfig;
	sections: PreferenceDimensionConfig;
	keyThemes: PreferenceDimensionConfig;
	userNeeds: PreferenceDimensionConfig;
	tags: PreferenceDimensionConfig;
};

export const DEFAULT_READER_PREFERENCES_CONFIG: ReaderPreferencesConfig = {
	windowDays: 120,
	authors: { topN: 10, minHits: 2 },
	sections: { topN: 3, minHits: 3 },
	keyThemes: { topN: 3, minHits: 3 },
	userNeeds: { topN: 3, minHits: 3 },
	tags: { topN: 20, minHits: 1 }
};

export function normalizePreferenceValue(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function incrementCount(map: Map<string, number>, value: unknown, amount: number): void {
	const key = normalizePreferenceValue(value);
	if (!key || amount <= 0) return;
	map.set(key, (map.get(key) ?? 0) + amount);
}

export function incrementMany(
	map: Map<string, number>,
	values: unknown,
	amount: number
): void {
	if (!Array.isArray(values)) return;
	for (const value of values) {
		incrementCount(map, value, amount);
	}
}

/** Rank by hit count desc, then label asc. */
export function rankFavourites(
	counts: Map<string, number>,
	{ topN, minHits }: PreferenceDimensionConfig
): string[] {
	return [...counts.entries()]
		.filter(([, count]) => count >= minHits)
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, topN)
		.map(([label]) => label);
}

export function parseReaderPreferencesConfigJson(
	raw: string | undefined
): ReaderPreferencesConfig {
	if (!raw?.trim()) return DEFAULT_READER_PREFERENCES_CONFIG;

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error("READER_PREFERENCES_CONFIG_JSON is not valid JSON");
	}

	if (!parsed || typeof parsed !== "object") {
		throw new Error("READER_PREFERENCES_CONFIG_JSON must be an object");
	}

	const input = parsed as Record<string, unknown>;
	const merged: ReaderPreferencesConfig = {
		...DEFAULT_READER_PREFERENCES_CONFIG,
		...(typeof input.windowDays === "number" ? { windowDays: input.windowDays } : {}),
		authors: mergeDimension(input.authors, DEFAULT_READER_PREFERENCES_CONFIG.authors),
		sections: mergeDimension(input.sections, DEFAULT_READER_PREFERENCES_CONFIG.sections),
		keyThemes: mergeDimension(input.keyThemes, DEFAULT_READER_PREFERENCES_CONFIG.keyThemes),
		userNeeds: mergeDimension(input.userNeeds, DEFAULT_READER_PREFERENCES_CONFIG.userNeeds),
		tags: mergeDimension(input.tags, DEFAULT_READER_PREFERENCES_CONFIG.tags)
	};

	validateConfig(merged);
	return merged;
}

function mergeDimension(
	value: unknown,
	fallback: PreferenceDimensionConfig
): PreferenceDimensionConfig {
	if (!value || typeof value !== "object") return fallback;
	const obj = value as Record<string, unknown>;
	return {
		topN: typeof obj.topN === "number" ? obj.topN : fallback.topN,
		minHits: typeof obj.minHits === "number" ? obj.minHits : fallback.minHits
	};
}

function validateConfig(config: ReaderPreferencesConfig): void {
	if (!Number.isInteger(config.windowDays) || config.windowDays < 1 || config.windowDays > 365) {
		throw new Error("windowDays must be an integer between 1 and 365");
	}

	for (const [name, dim] of Object.entries({
		authors: config.authors,
		sections: config.sections,
		keyThemes: config.keyThemes,
		userNeeds: config.userNeeds,
		tags: config.tags
	})) {
		if (!Number.isInteger(dim.topN) || dim.topN < 1 || dim.topN > 100) {
			throw new Error(`${name}.topN must be an integer between 1 and 100`);
		}
		if (!Number.isInteger(dim.minHits) || dim.minHits < 1 || dim.minHits > 100) {
			throw new Error(`${name}.minHits must be an integer between 1 and 100`);
		}
	}
}
