#!/usr/bin/env node
/**
 * Link or unlink the local jxp clone (../jxp) for side-by-side development.
 * Enable by creating an empty .use-local-jxp file in the project root.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const marker = path.join(root, ".use-local-jxp");
const localJxp = path.resolve(root, "../jxp");
const mode = process.argv[2] || "status";

/** Must match the app's mongoose — linked jxp otherwise loads its own copy and queries buffer forever. */
const SHARED_PEER_DEPS = ["mongoose", "mongoose-friendly"];

function run(cmd) {
	execSync(cmd, { cwd: root, stdio: "inherit" });
}

function jxpModulePath() {
	return path.join(root, "node_modules", "jxp");
}

function isLinked() {
	try {
		return fs.lstatSync(jxpModulePath()).isSymbolicLink();
	} catch {
		return false;
	}
}

function localJxpExists() {
	return fs.existsSync(path.join(localJxp, "package.json"));
}

function linkSharedPeers() {
	for (const dep of SHARED_PEER_DEPS) {
		const appDep = path.join(root, "node_modules", dep);
		const jxpDep = path.join(localJxp, "node_modules", dep);
		if (!fs.existsSync(appDep)) {
			console.warn(`Skipping peer link for ${dep}: not installed in app`);
			continue;
		}
		fs.mkdirSync(path.join(localJxp, "node_modules"), { recursive: true });
		if (fs.existsSync(jxpDep)) {
			fs.rmSync(jxpDep, { recursive: true, force: true });
		}
		const relTarget = path.relative(path.dirname(jxpDep), appDep);
		const symlinkType = process.platform === "win32" ? "junction" : "dir";
		fs.symlinkSync(relTarget, jxpDep, symlinkType);
	}
	console.log(`Linked shared peers into jxp: ${SHARED_PEER_DEPS.join(", ")}`);
}

function unlinkSharedPeers() {
	run(`npm install --prefix "${localJxp}" ${SHARED_PEER_DEPS.join(" ")} --legacy-peer-deps`);
}

function link() {
	if (!localJxpExists()) {
		console.error(
			`Local jxp not found at ${localJxp}\n` +
				"Clone it: git clone https://github.com/WorkSpaceMan/jxp.git ../jxp"
		);
		process.exit(1);
	}
	fs.writeFileSync(marker, "");
	run(`npm link "${localJxp}"`);
	linkSharedPeers();
	console.log(`Linked jxp → ${localJxp}`);
}

function unlink() {
	if (fs.existsSync(marker)) fs.unlinkSync(marker);
	if (isLinked()) run("npm unlink jxp");
	unlinkSharedPeers();
	run("npm install jxp");
	console.log("Using npm registry jxp");
}

function postinstall() {
	if (!fs.existsSync(marker) || !localJxpExists()) return;
	if (!isLinked()) {
		link();
	} else {
		linkSharedPeers();
	}
}

switch (mode) {
	case "link":
		link();
		break;
	case "unlink":
		unlink();
		break;
	case "postinstall":
		postinstall();
		break;
	default:
		console.log(
			`local jxp: ${localJxpExists() ? localJxp : "(not cloned)"}\n` +
				`marker: ${fs.existsSync(marker)}\n` +
				`linked: ${isLinked()}`
		);
}
