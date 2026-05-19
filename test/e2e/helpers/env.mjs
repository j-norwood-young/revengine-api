import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const projectRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../.."
);
dotenv.config({ path: path.join(projectRoot, ".env") });

export function getApiConfig() {
	const baseUrl = (
		process.env.API_SERVER ||
		`http://localhost:${process.env.PORT || "4001"}`
	).replace(/\/$/, "");
	const apiKey = process.env.APIKEY;

	if (!apiKey) {
		throw new Error(
			"APIKEY is not set. Add it to .env (see .env.example)."
		);
	}

	return { baseUrl, apiKey };
}

export { projectRoot };
