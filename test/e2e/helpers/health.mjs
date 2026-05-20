import { getApiConfig } from "./env.mjs";

/**
 * Fail fast when the API is not running (same check as reader e2e).
 */
export async function ensureApiReachable(path = "/api/reader?limit=1&count=true") {
	const { baseUrl, apiKey } = getApiConfig();
	try {
		const res = await fetch(`${baseUrl}${path}`, {
			headers: { "X-API-Key": apiKey },
		});
		if (!res.ok) {
			throw new Error(`API returned ${res.status}`);
		}
	} catch (err) {
		throw new Error(
			`Cannot reach RevEngine API at ${baseUrl}. Start it with \`npm run dev\` and ensure Mongo is connected. (${err.message})`
		);
	}
}
