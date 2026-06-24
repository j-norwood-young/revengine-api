import "../lib/startup-deprecations";
import path from "path";
import mongoose from "mongoose";
import JXP from "jxp";
import type { JXPConfig } from "jxp/types/jxp-config";
import env from "../lib/env";
import {
	fetchMongoServerVersion,
	printBanner,
	printBooting,
	printReady,
} from "../lib/startup";
import pkg from "../../package.json";

// Resolved from server location so cwd does not affect model loading.
const modelDir = path.join(__dirname, "../models");

const apiconfig: JXPConfig & { cluster_server?: string } = {
	port: parseInt(process.env.PORT || String(env.port), 10),
	model_dir: modelDir,
	server: process.env.API_SERVER || env.server,
	cluster_server: process.env.API_SERVER || env.clusterServer,
	mongo: env.mongo,
	token_expiry: env.tokenExpiry,
	refresh_token_expiry: env.refreshTokenExpiry,
	shared_secret: env.sharedSecret,
	apikey: process.env.APIKEY || env.apikey,
	query_limits: {
		enabled: true,
		large_collection_threshold: 10000,
		max: 1000,
		default: 100,
		max_response_size: "10mb",
	},
};

apiconfig.quiet_startup = true;

apiconfig.mcp = {
	guideFiles: [path.join(__dirname, "../../mcp/guide.md")],
	instructions:
		"RevEngine API: prefer reader, segment, and article models. Always jxp_count before querying large collections. See jxp-guide resource for domain details.",
};

apiconfig.callbacks = {
	post: async function () {},
	put: async function () {},
	delete: async function () {},
};

apiconfig.pre_hooks = {
	get: (_req, _res, next) => {
		next();
	},
	getOne: (_req, _res, next) => {
		next();
	},
	post: (_req, _res, next) => {
		next();
	},
	put: (_req, _res, next) => {
		next();
	},
	delete: (_req, _res, next) => {
		next();
	},
};

mongoose.set("strictQuery", true);
if (!apiconfig.mongo.options) apiconfig.mongo.options = {};
const mongo_options = Object.assign({}, apiconfig.mongo.options);
const connection_string = apiconfig.mongo.connection_string;

const startupCtx = {
	name: pkg.name,
	version: pkg.version,
	mongoUri: connection_string,
	accessLog: path.resolve(apiconfig.log || "access.log"),
	maxPoolSize: mongo_options.maxPoolSize as number | undefined,
	frontendUrl: env.frontend.url,
	apiServer: apiconfig.server,
};

printBanner(startupCtx);
printBooting(startupCtx);

mongoose.connect(connection_string, mongo_options);

// JXP loadAllModels uses apiconfig.model_dir; generateLinks prefers MODEL_DIR env when set.
// A stale MODEL_DIR (e.g. legacy ./models) loads the same Mongoose models twice → OverwriteModelError.
process.env.MODEL_DIR = modelDir;

const db = mongoose.connection;

let mongoConnectedAt: Date | null = null;
let mongoVersion: string | undefined;
let httpUrl: string | null = null;
let readyPrinted = false;

db.on("error", (err) => {
	console.error("MongoDB connection error:", err);
});

db.once("open", async () => {
	mongoVersion = await fetchMongoServerVersion(db);
	mongoConnectedAt = new Date();
	maybePrintReady();
});

const server = JXP(apiconfig);

server.listen(apiconfig.port || 4001, function () {
	httpUrl = server.url;
	maybePrintReady();
});

function maybePrintReady(): void {
	if (readyPrinted || !mongoConnectedAt || !httpUrl) return;
	readyPrinted = true;
	printReady({
		...startupCtx,
		url: httpUrl,
		mongooseVersion: mongoose.version,
		mongoVersion,
		mongoConnectedAt,
	});
}

export = server;
