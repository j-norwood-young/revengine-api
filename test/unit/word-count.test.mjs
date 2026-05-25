import { describe, it, expect } from "vitest";
import { stripHtml, wordCount } from "../../dist/lib/word-count.js";

describe("word-count", () => {
	it("stripHtml removes tags and keeps text", () => {
		expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe("Hello world");
		expect(stripHtml("a &amp; b &lt; c")).toBe("a & b < c");
	});

	it("wordCount ignores HTML markup", () => {
		expect(wordCount("<p>One two</p><p>three</p>")).toBe(3);
		expect(wordCount("<script>ignored();</script><span>four</span>")).toBe(1);
	});
});
