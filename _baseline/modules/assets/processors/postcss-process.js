import fs from 'fs/promises';
import postcss from 'postcss';
import loadPostCSSConfig from 'postcss-load-config';
import fallbackPostCSSConfig from '../configs/postcss.config.js';
import { createLogger } from '../../../core/logging.js';

const log = createLogger('assets-postcss');

// Resolve user PostCSS config from the project root (cwd), not the Eleventy input dir.
const configRoot = process.cwd();
let cachedConfig = null;

async function getPostCSSConfig() {
	if (cachedConfig) return cachedConfig;

	try {
		// Prefer the consuming project's PostCSS config (postcss.config.* or package.json#postcss).
		cachedConfig = await loadPostCSSConfig({}, configRoot);
	} catch {
		// If none is found, fall back to the bundled Baseline config to keep builds working.
		const { plugins, ...options } = fallbackPostCSSConfig;
		cachedConfig = { plugins, options };
	}
	return cachedConfig;
}

/**
 * Process a CSS file through PostCSS.
 * Reads from disk, uses project postcss.config.js or bundled fallback.
 * Config is cached for the lifetime of the process.
 *
 * @param {string} cssFilePath - Absolute path to the entry file.
 * @returns {Promise<string>} Processed CSS text, or an error comment on failure.
 */
export default async function assetsPostCSS(cssFilePath) {
	try {
		const cssContent = await fs.readFile(cssFilePath, 'utf8');
		const { plugins, options } = await getPostCSSConfig();

		const result = await postcss(plugins).process(cssContent, {
			...options,
			from: cssFilePath
		});

		// Return raw CSS; markup wrapping is handled in the plugin registration.
		return result.css;
	} catch (error) {
		log.error('PostCSS failed:', error);
		// Surface a safe CSS string so the caller can decide how to wrap it.
		return '/* Error processing CSS */';
	}
}
