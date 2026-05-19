process.env.SUPPRESS_NO_CONFIG_WARNING = "true";

const mongoose = require("mongoose");
const JXP = require("jxp");
const env = require("../lib/env");

const apiconfig = {
	port: parseInt(process.env.PORT || String(env.port), 10),
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
	},
};

apiconfig.callbacks = {
	post: async function () {},
	put: async function () {},
	delete: async function () {},
};

apiconfig.pre_hooks = {
	get: (req, res, next) => {
		next();
	},
	getOne: (req, res, next) => {
		next();
	},
	post: (req, res, next) => {
		next();
	},
	put: (req, res, next) => {
		next();
	},
	delete: (req, res, next) => {
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

const server = new JXP(apiconfig);

server.listen(apiconfig.port || 4001, function () {
	console.log("%s listening at %s", server.name, server.url);
	console.log(`Mongoose version ${mongoose.version}`);
});

module.exports = server;
