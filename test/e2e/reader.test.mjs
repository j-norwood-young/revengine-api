import { describe, it, expect, beforeAll } from "vitest";
import { createApiClient } from "./helpers/client.mjs";
import { getApiConfig } from "./helpers/env.mjs";

describe("GET /api/reader", () => {
	const client = createApiClient();

	beforeAll(async () => {
		const { baseUrl, apiKey } = getApiConfig();
		try {
			const res = await fetch(`${baseUrl}/api/reader?limit=1`, {
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
	});

	it("returns readers when authenticated with a valid API key", async () => {
		const res = await client.get("/api/reader?limit=1");
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body).toMatchObject({
			data: expect.any(Array),
			count: expect.any(Number),
			limit: 1,
			page: expect.any(Number),
		});
		expect(body.data.length).toBeGreaterThan(0);
	});

	it("rejects unbounded list requests without limit", async () => {
		const res = await client.get("/api/reader");
		expect(res.status).toBe(400);

		const body = await res.json();
		expect(body.message).toMatch(/limit/i);
	});

	it("rejects requests without an API key", async () => {
		const res = await client.get("/api/reader?limit=1", { apiKey: false });
		expect(res.status).toBe(403);
	});

	it("rejects requests with an invalid API key", async () => {
		const res = await client.get("/api/reader?limit=1", {
			apiKey: "invalid-api-key-for-e2e",
		});
		expect(res.status).toBe(403);
	});
});
