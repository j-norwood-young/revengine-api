#!/usr/bin/env node
/**
 * One-time migration: models/*_model.js → src/models/*_model.ts
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcModels = path.join(root, "models");
const destModels = path.join(root, "src", "models");

fs.mkdirSync(destModels, { recursive: true });

const files = fs.readdirSync(srcModels).filter((f) => f.endsWith("_model.js"));

for (const file of files) {
	let content = fs.readFileSync(path.join(srcModels, file), "utf8");

	// Top-level require → import (preserve lazy requires inside functions)
	const requireImports = [];
	content = content.replace(
		/^const\s+(\{[^}]+\}|\w+)\s*=\s*require\(["']([^"']+)["']\)(?:\.(\w+))?;?\s*$/gm,
		(_match, binding, mod, prop) => {
			if (prop) {
				requireImports.push(`import { ${prop} } from "${mod}";`);
				return "";
			}
			if (binding.startsWith("{")) {
				requireImports.push(`import ${binding} from "${mod}";`);
			} else {
				requireImports.push(`import ${binding} from "${mod}";`);
			}
			return "";
		}
	);

	// Destructure from require on same line as const
	content = content.replace(
		/^const\s+\{\s*([^}]+)\s*\}\s*=\s*require\(["']([^"']+)["']\);?\s*$/gm,
		(_match, names, mod) => {
			requireImports.push(`import { ${names.trim()} } from "${mod}";`);
			return "";
		}
	);

	content = content.replace(/^module\.exports\s*=\s*/gm, "export = ");

	const header = `/// <reference types="jxp/globals" />\n`;
	const imports = requireImports.length ? requireImports.join("\n") + "\n\n" : "";

	if (!content.includes("/* global")) {
		content = header + imports + content;
	} else {
		content = header + imports + content;
	}

	const outFile = file.replace(/\.js$/, ".ts");
	fs.writeFileSync(path.join(destModels, outFile), content);
	console.log("Converted", outFile);
}

console.log(`Done: ${files.length} models`);
