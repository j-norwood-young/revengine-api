import { getApiConfig } from "./env.mjs";

/**
 * Minimal HTTP client for e2e tests against a running RevEngine API.
 * Uses the same X-API-Key header as external clients.
 */
export function createApiClient(overrides = {}) {
	const defaults = getApiConfig();
	const baseUrl = overrides.baseUrl ?? defaults.baseUrl;

	async function request(path, options = {}) {
		const { apiKey = defaults.apiKey, headers = {}, ...rest } = options;
		const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
		const mergedHeaders = new Headers(headers);

		if (apiKey !== false) {
			mergedHeaders.set("X-API-Key", apiKey);
		}

		return fetch(url, { ...rest, headers: mergedHeaders });
	}

	return {
		baseUrl,
		request,
		get(path, options) {
			return request(path, { ...options, method: "GET" });
		},
	};
}
