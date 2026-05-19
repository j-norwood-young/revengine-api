const env = require("../lib/env");
const apihelper = require("../common/apihelper");
const Mail = require("../common/mail");

const send_welcome = async function (email) {
	const result = await apihelper.getjwt(email);
	const mail = new Mail();
	const content = `An account has been created for you on ${env.frontend.sitename}. You can log in <a href="${env.frontend.url}login/token/${result.token}">HERE</a>.`;
	await mail.send({
		to: result.email,
		content,
		subject: `${env.frontend.sitename} account created`,
	});
};

module.exports = send_welcome;
