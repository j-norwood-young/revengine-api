import { describe, it, expect, beforeAll } from "vitest";
import { createApiClient } from "./helpers/client.mjs";
import { ensureApiReachable } from "./helpers/health.mjs";
import { wordCount } from "../../dist/lib/word-count.js";

describe("article wordcount", () => {
	const client = createApiClient();
	let articleId;
	let content;
	let expectedWordcount;

	beforeAll(async () => {
		await ensureApiReachable("/api/article?limit=1");

		const res = await client.get("/api/article?limit=1&fields=_id,content");
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.data.length).toBeGreaterThan(0);

		articleId = body.data[0]._id;
		content = body.data[0].content;
		expect(typeof content).toBe("string");
		expect(content.length).toBeGreaterThan(0);

		expectedWordcount = wordCount(content);
		expect(expectedWordcount).toBeGreaterThan(1);

		const putRes = await client.request(`/api/article/${articleId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ content }),
		});
		expect(putRes.status).toBe(200);
	});

	it("returns wordcount on list GET when requested in fields", async () => {
		const res = await client.get(
			`/api/article?limit=10&fields=_id,wordcount&filter[_id]=${articleId}`
		);
		const body = await res.json();
		const row = body.data.find((a) => a._id === articleId);
		expect(row).toBeDefined();
		expect(row.wordcount).toBe(expectedWordcount);
	});

	it("filters list by wordcount", async () => {
		const res = await client.get(
			`/api/article?limit=1&fields=_id,wordcount&filter[wordcount]=$gte:${expectedWordcount}&filter[_id]=${articleId}`
		);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.data.length).toBeGreaterThan(0);
		expect(body.data[0]).toMatchObject({
			_id: articleId,
			wordcount: expectedWordcount,
		});
	});

	it("returns persisted wordcount on single-article GET", async () => {
		const res = await client.get(`/api/article/${articleId}`);
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.data).toMatchObject({
			_id: articleId,
			content,
			wordcount: expectedWordcount,
		});
	});
});
