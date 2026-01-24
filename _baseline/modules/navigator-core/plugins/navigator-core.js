import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function navigatorCore(eleventyConfig, options = {}) {
	const raw = options.enableNavigatorTemplate;
	const [enableNavigatorTemplate, inspectorDepth] = Array.isArray(raw) ? [raw[0], raw[1]] : [raw, undefined];

	const userOptions = {
		...options,
		enableNavigatorTemplate: enableNavigatorTemplate ?? false,
		inspectorDepth: inspectorDepth ?? 2
	};

	eleventyConfig.addNunjucksGlobal('_navigator', function () {
		return this;
	});
	eleventyConfig.addNunjucksGlobal('_context', function () {
		return this.ctx;
	});

	if (userOptions.enableNavigatorTemplate) {
		// Read virtual template synchronously; Nunjucks pipeline here is sync-only.
		const templatePath = path.join(__dirname, '../templates/navigator-core.html');
		const virtualTemplateContent = fs.readFileSync(templatePath, 'utf-8');
		eleventyConfig.addTemplate('navigator-core.html', virtualTemplateContent, {
			permalink: '/navigator-core.html',
			title: 'Navigator Core',
			description: '',
			layout: null,
			eleventyExcludeFromCollections: true,
			inspectorDepth: userOptions.inspectorDepth
		});
	}
}
