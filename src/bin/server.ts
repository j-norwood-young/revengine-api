import "../lib/startup-deprecations";
import path from "path";
import mongoose from "mongoose";
import JXP from "jxp";
import type { JXPConfig } from "jxp/types/jxp-config";
import env from "../lib/env";
import { printBanner, printBooting, printReady } from "../lib/startup";
import pkg from "../../package.json";

const apiconfig: JXPConfig & { cluster_server?: string } = {
	port: parseInt(process.env.PORT || String(env.port), 10),
	model_dir: "./dist/models",
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
	},
};

apiconfig.quiet_startup = true;

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

const db = mongoose.connection;

let mongoConnectedAt: Date | null = null;
let httpUrl: string | null = null;
let readyPrinted = false;

db.on("error", (err) => {
	console.error("MongoDB connection error:", err);
});

db.once("open", () => {
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
		mongoConnectedAt,
	});
}

export = server;
