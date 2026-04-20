import * as esbuild from 'esbuild';
import { createLogger } from '../../core/logging.js';

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
