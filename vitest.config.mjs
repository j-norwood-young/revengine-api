import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

export default defineConfig({
	test: {
		include: ["test/e2e/**/*.test.mjs", "test/unit/**/*.test.mjs"],
		testTimeout: 30_000,
		hookTimeout: 30_000,
		// E2e hits one API process; avoid parallel /call jobs (apply_segments, apply_labels).
		fileParallelism: false,
	},
});
