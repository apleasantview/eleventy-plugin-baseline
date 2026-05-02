import * as esbuild from 'esbuild';
import { createLogger } from '../../../core/logging.js';

/**
 * esbuild processor (processor)
 *
 * Bundles a single JS entrypoint with esbuild and returns the text. Used
 * both by the `js` template format compile guard and by the
 * `inlineESbuild` filter in the assets module.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   Stateless bundler called by `modules/assets/index.js`. The compile
 *   guard decides which files reach this processor; this file owns the
 *   esbuild call itself.
 *
 * Lifecycle:
 *   build-time → invoked per matching entrypoint during template compile,
 *                or per-call from the inline filter
 *
 * Why this exists:
 *   Eleventy treats every `.js` file as a template. A dedicated processor
 *   keeps esbuild configuration out of the template format wiring and lets
 *   the inline filter reuse the same defaults.
 *
 * Scope:
 *   Owns esbuild option defaults and the bundle call. Does not own the
 *   compile guard, the watch target, or markup wrapping; the assets
 *   module owns those.
 *
 * Data flow:
 *   entrypoint path + options → esbuild.build → bundled JS text
 */

const log = createLogger('assets-esbuild');
const defaultOptions = { minify: true, target: 'es2020' };

/**
 * Bundle a JS file with esbuild.
 *
 * @param {string} jsFilePath - Absolute path to the entry file.
 * @param {Object} [options] - esbuild options (merged with defaults).
 * @param {boolean} [options.minify=true] - Minify output.
 * @param {string} [options.target='es2020'] - esbuild target.
 * @returns {Promise<string>} Bundled JS text, or an error comment on failure.
 */
export default async function assetsESbuild(jsFilePath, options = {}) {
	const userOptions = { ...defaultOptions, ...options };

	try {
		let result = await esbuild.build({
			entryPoints: [jsFilePath],
			bundle: true,
			minify: userOptions.minify,
			target: userOptions.target,
			write: false
		});

		// Return raw JS; markup wrapping is handled by the plugin registration.
		return result.outputFiles[0].text;
	} catch (error) {
		log.error('esbuild failed:', error);
		// Surface a safe JS comment so the caller can decide how to wrap it.
		return '/* Error processing JS */';
	}
}
