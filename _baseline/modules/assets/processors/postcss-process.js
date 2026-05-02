import fs from 'fs/promises';
import postcss from 'postcss';
import loadPostCSSConfig from 'postcss-load-config';
import fallbackPostCSSConfig from '../configs/postcss.config.js';
import { createLogger } from '../../../core/logging.js';

/**
 * PostCSS processor (processor)
 *
 * Processes a single CSS entrypoint through PostCSS and returns the text.
 * Used both by the `css` template format compile guard and by the
 * `inlinePostCSS` filter in the assets module.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   Stateless processor called by `modules/assets/index.js`. Resolves the
 *   user's PostCSS config from the project root, falling back to the
 *   bundled Baseline config when none is found. Cached for the lifetime
 *   of the process.
 *
 * Lifecycle:
 *   build-time → invoked per matching entrypoint during template compile,
 *                or per-call from the inline filter
 *
 * Why this exists:
 *   Eleventy has no PostCSS hook of its own. A dedicated processor lets
 *   user configs win when present and keeps the bundled fallback out of
 *   the consumer's `node_modules` resolution path.
 *
 * Scope:
 *   Owns config resolution, caching, and the PostCSS call. Does not own
 *   the compile guard, the watch target, or markup wrapping; the assets
 *   module owns those.
 *
 * Data flow:
 *   entrypoint path → PostCSS pipeline → processed CSS text
 */

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
