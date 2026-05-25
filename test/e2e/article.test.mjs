import { describe, it, expect, beforeAll } from "vitest";
import { createApiClient } from "./helpers/client.mjs";
import { ensureApiReachable } from "./helpers/health.mjs";
import { wordCount } from "../../dist/lib/word-count.js";

describe("GET /api/article/:id wordcount", () => {
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
	});

	it("omits wordcount on list GET", async () => {
		const res = await client.get("/api/article?limit=1&fields=_id,content");
		const body = await res.json();
		const row = body.data.find((a) => a._id === articleId) ?? body.data[0];
		expect(row.wordcount).toBeUndefined();
	});

	it("adds wordcount on single-article GET from content", async () => {
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
