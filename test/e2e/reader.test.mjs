import { describe, it, expect, beforeAll } from "vitest";
import { createApiClient } from "./helpers/client.mjs";
import { ensureApiReachable } from "./helpers/health.mjs";

describe("GET /api/reader", () => {
	const client = createApiClient();

	beforeAll(() => ensureApiReachable());

	it("returns readers when authenticated with a valid API key", async () => {
		const res = await client.get("/api/reader?limit=1&count=true");
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

	it("requires explicit limit on large unfiltered reader list", async () => {
		const res = await client.get("/api/reader");
		const body = await res.json();

		if (res.status === 400) {
			expect(body.message).toMatch(/limit/i);
			return;
		}

		// Collection below large threshold in some environments
		expect(res.status).toBe(200);
		expect(body.limit).toBe(100);
		expect(body.data).toEqual(expect.any(Array));
	});

	it("applies default limit for filtered reader list without limit", async () => {
		const res = await client.get("/api/reader?filter[paying_customer]=true");
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.limit).toBe(100);
		expect(body.data).toEqual(expect.any(Array));
	});

	it("rejects requests without an API key", async () => {
		const res = await client.get("/api/reader?limit=1&count=true", { apiKey: false });
		expect(res.status).toBe(403);
	});

	it("rejects requests with an invalid API key", async () => {
		const res = await client.get("/api/reader?limit=1&count=true", {
			apiKey: "invalid-api-key-for-e2e",
		});
		expect(res.status).toBe(403);
	});
});
