const JXPHelper = require("jxp-helper");
const env = require("../lib/env");

const apihelper = new JXPHelper({
	server: process.env.API_SERVER || env.server,
	apikey: process.env.APIKEY || env.apikey,
});

module.exports = apihelper;
