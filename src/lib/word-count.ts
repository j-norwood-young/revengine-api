export function formatSentence(sentence: string): string {
	let s = sentence.replace(/[^a-zA-Z0-9]/g, " ").toLowerCase().trim();
	while (s.includes("  ")) {
		s = s.replace("  ", " ");
	}
	return s;
}

export function wordCount(sentence: string): number {
	return formatSentence(sentence).split(" ").length;
}
