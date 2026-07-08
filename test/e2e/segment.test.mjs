import { describe, it, expect, beforeAll } from "vitest";
import { createApiClient } from "./helpers/client.mjs";
import { ensureApiReachable } from "./helpers/health.mjs";

describe("segment API", () => {
	const client = createApiClient();

	beforeAll(() => ensureApiReachable());

	it("lists segments when authenticated", async () => {
		const res = await client.get("/api/segment?limit=1&count=true");
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body).toMatchObject({
			data: expect.any(Array),
			count: expect.any(Number),
			limit: 1,
		});
	});

	describe("POST /call/segment/preview_segment", () => {
		it("returns match count and a reader sample", async () => {
			const res = await client.post("/call/segment/preview_segment", {
				conditions: [
					{
						field: "paying_customer",
						operator: "equals",
						value: true,
						logicalOperator: "AND",
					},
				],
				sampleSize: 2,
			});
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body).toMatchObject({
				count: expect.any(Number),
				readers: expect.any(Array),
			});
			expect(body.readers.length).toBeLessThanOrEqual(2);
			if (body.readers.length > 0) {
				expect(body.readers[0]).toHaveProperty("_id");
			}
		});

		it("returns zero count for conditions that match nothing", async () => {
			const res = await client.post("/call/segment/preview_segment", {
				conditions: [
					{
						field: "email",
						operator: "equals",
						value: `e2e-no-match-${Date.now()}@example.invalid`,
					},
				],
				sampleSize: 5,
			});
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body.count).toBe(0);
			expect(body.readers).toEqual([]);
		});

		it("rejects requests without an API key", async () => {
			const res = await client.post(
				"/call/segment/preview_segment",
				{ conditions: [], sampleSize: 1 },
				{ apiKey: false }
			);
			expect(res.status).toBe(403);
		});

		it("accepts favourite_authors contains condition", async () => {
			const res = await client.post("/call/segment/preview_segment", {
				conditions: [
					{
						field: "favourite_authors",
						operator: "contains",
						value: "Test Author",
					},
				],
				sampleSize: 1,
			});
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body).toMatchObject({
				count: expect.any(Number),
				readers: expect.any(Array),
			});
		});
	});

	describe("POST /call/segment/apply_segment", () => {
		it("returns an error when id is omitted", async () => {
			const res = await client.post("/call/segment/apply_segment", {});
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(typeof body).toBe("string");
			expect(body).toMatch(/id required/i);
		});

		it("returns an error for an unknown segment id", async () => {
			const res = await client.post("/call/segment/apply_segment", {
				id: "000000000000000000000000",
			});
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(typeof body).toBe("string");
			expect(body).toMatch(/not found|error/i);
		});
	});

	describe("POST /call/segment/apply_segments", () => {
		it("applies all segments and returns per-segment results", { timeout: 120_000 }, async () => {
			const res = await client.post("/call/segment/apply_segments", {});
			expect(res.status).toBe(200);

			const body = await res.json();
			expect(body).toEqual(expect.any(Object));
			expect(typeof body).not.toBe("string");

			for (const [name, result] of Object.entries(body)) {
				expect(typeof name).toBe("string");
				if (typeof result === "string") {
					expect(result).toMatch(/error/i);
					continue;
				}
				expect(result).toMatchObject({
					ids_added_count: expect.any(Number),
					ids_removed_count: expect.any(Number),
					ids_changed_count: expect.any(Number),
				});
			}
		});

		it("rejects requests without an API key", async () => {
			const res = await client.post("/call/segment/apply_segments", {}, { apiKey: false });
			expect(res.status).toBe(403);
		});
	});

	it("rejects non-callable segment methods", async () => {
		const res = await client.post("/call/segment/find", {});
		expect(res.status).toBe(403);

		const body = await res.json();
		expect(body.message).toMatch(/not callable/i);
	});
});
