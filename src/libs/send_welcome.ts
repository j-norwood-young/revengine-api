import env from "../lib/env";
import apihelper from "../common/apihelper";
import Mail from "../common/mail";

const send_welcome = async function (email: string) {
	const result = await apihelper.getjwt(email);
	const mail = new Mail();
	const content = `An account has been created for you on ${env.frontend.sitename}. You can log in <a href="${env.frontend.url}login/token/${result.token}">HERE</a>.`;
	await mail.send({
		to: result.email,
		content,
		subject: `${env.frontend.sitename} account created`,
	});
};

export = send_welcome;
