import mongoose from "mongoose";
import JXP from "jxp";
import type { JXPConfig } from "jxp/types/jxp-config";
import env from "../lib/env";

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

mongoose.connect(apiconfig.mongo.connection_string, mongo_options);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));

db.once("open", () => {
	console.log(`Connected to Mongo at: ${new Date()}`);
});

const server = JXP(apiconfig);

server.listen(apiconfig.port || 4001, function () {
	console.log("%s listening at %s", server.name, server.url);
	console.log(`Mongoose version ${mongoose.version}`);
});

export = server;
