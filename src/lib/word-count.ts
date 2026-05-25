/** Remove HTML tags and decode common entities before text analysis. */
export function stripHtml(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#0*39;/gi, "'")
		.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
		.replace(/\s+/g, " ")
		.trim();
}

export function formatSentence(sentence: string): string {
	let s = sentence.replace(/[^a-zA-Z0-9]/g, " ").toLowerCase().trim();
	while (s.includes("  ")) {
		s = s.replace("  ", " ");
	}
	return s;
}

export function wordCount(sentence: string): number {
	return formatSentence(stripHtml(sentence)).split(" ").length;
}
