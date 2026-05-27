/**
 * Backfill persisted wordcount on articles missing the field.
 * Run after build: node dist/scripts/backfill-article-wordcount.js [--dry-run] [--batch-size=500] [--limit=N] [--delay-ms=N]
 */
import mongoose from "mongoose";
import env from "../lib/env";
import { wordCount } from "../lib/word-count";
import Article from "../models/article_model";

const MISSING_WORDCOUNT = {
	$or: [{ wordcount: { $exists: false } }, { wordcount: null }],
};

interface ArticleWordcountRow {
	_id: unknown;
	content?: string;
}

function parseArgs(argv: string[]) {
	const opts = {
		dryRun: false,
		batchSize: 500,
		limit: Infinity,
		delayMs: 0,
	};

	for (const arg of argv) {
		if (arg === "--dry-run") {
			opts.dryRun = true;
		} else if (arg.startsWith("--batch-size=")) {
			opts.batchSize = Math.max(1, parseInt(arg.slice("--batch-size=".length), 10) || 500);
		} else if (arg.startsWith("--limit=")) {
			opts.limit = Math.max(1, parseInt(arg.slice("--limit=".length), 10) || 1);
		} else if (arg.startsWith("--delay-ms=")) {
			opts.delayMs = Math.max(0, parseInt(arg.slice("--delay-ms=".length), 10) || 0);
		}
	}

	return opts;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
	const opts = parseArgs(process.argv.slice(2));

	await mongoose.connect(env.mongo.connection_string, env.mongo.options);

	const remaining = await Article.countDocuments(MISSING_WORDCOUNT);
	console.log(`Articles missing wordcount: ${remaining}`);

	if (remaining === 0) {
		await mongoose.disconnect();
		return;
	}

	const cursor = Article.find(MISSING_WORDCOUNT)
		.select({ _id: 1, content: 1 })
		.lean()
		.cursor();

	let batch: { updateOne: { filter: { _id: unknown }; update: { $set: { wordcount: number } } } }[] = [];
	let updated = 0;
	let processed = 0;

	const flush = async () => {
		if (batch.length === 0) return;

		if (!opts.dryRun) {
			await Article.bulkWrite(batch, { ordered: false });
		}

		updated += batch.length;
		console.log(
			opts.dryRun
				? `[dry-run] would update ${updated} / ${Math.min(remaining, opts.limit)}`
				: `updated ${updated} / ${Math.min(remaining, opts.limit)}`
		);

		batch = [];

		if (opts.delayMs > 0) {
			await sleep(opts.delayMs);
		}
	};

	for await (const doc of cursor as AsyncIterable<ArticleWordcountRow>) {
		if (processed >= opts.limit) break;

		const content = doc.content;
		const count = wordCount(typeof content === "string" ? content : "");

		batch.push({
			updateOne: {
				filter: { _id: doc._id },
				update: { $set: { wordcount: count } },
			},
		});

		processed += 1;

		if (batch.length >= opts.batchSize) {
			await flush();
		}
	}

	await flush();

	const left = await Article.countDocuments(MISSING_WORDCOUNT);
	console.log(`Done. ${opts.dryRun ? "Would have updated" : "Updated"} ${updated}. Still missing: ${left}`);

	await mongoose.disconnect();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
