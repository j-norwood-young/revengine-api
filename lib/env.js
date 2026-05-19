require("dotenv").config();

function required(name) {
	const val = process.env[name];
	if (!val) throw new Error(`Missing required env var: ${name}`);
	return val;
}

module.exports = {
	port: parseInt(process.env.PORT || "4001", 10),
	server: process.env.API_SERVER,
	clusterServer: process.env.API_SERVER,
	mongo: {
		connection_string: required("MONGO_CONNECTION_STRING"),
		options: process.env.MONGO_OPTIONS ? JSON.parse(process.env.MONGO_OPTIONS) : {},
	},
	tokenExpiry: parseInt(process.env.TOKEN_EXPIRY || "86400", 10),
	refreshTokenExpiry: parseInt(process.env.REFRESH_TOKEN_EXPIRY || "2678400", 10),
	sharedSecret: required("SHARED_SECRET"),
	apikey: process.env.APIKEY,
	frontend: {
		sitename: required("FRONTEND_SITENAME"),
		url: required("FRONTEND_URL"),
	},
	mailer: {
		from: required("MAILER_FROM"),
		smtp: {
			host: process.env.SMTP_HOST,
			port: parseInt(process.env.SMTP_PORT || "465", 10),
			sendmail: process.env.SMTP_SENDMAIL === "true",
			path: process.env.SMTP_PATH || null,
		},
	},
};
