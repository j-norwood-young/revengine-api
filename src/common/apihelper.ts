import JXPHelper from "jxp-helper";
import env from "../lib/env";

const apihelper = new JXPHelper({
	server: process.env.API_SERVER || env.server,
	apikey: process.env.APIKEY || env.apikey,
});

export = apihelper;
