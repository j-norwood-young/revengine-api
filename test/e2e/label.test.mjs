import { describe, it, expect, beforeAll } from "vitest";
import { createApiClient } from "./helpers/client.mjs";
import { ensureApiReachable } from "./helpers/health.mjs";

describe("label API", () => {
	const client = createApiClient();

	beforeAll(() => ensureApiReachable());

	it("lists labels when authenticated", async () => {
		const res = await client.get("/api/label?limit=1&count=true");
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body).toMatchObject({
			data: expect.any(Array),
			count: expect.any(Number),
			limit: 1,
		});
	});

	describe("POST /call/label/apply_label", () => {
		it("returns an error when id is omitted", async () => {
			const res = await client.post("/call/label/apply_label", {});
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(typeof body).toBe("string");
			expect(body).toMatch(/id required/i);
		});
	});

	it("rejects apply_labels without an API key", async () => {
		const res = await client.post("/call/label/apply_labels", {}, { apiKey: false });
		expect(res.status).toBe(403);
	});
});
