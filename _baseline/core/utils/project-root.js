import { dirname, relative, resolve, sep } from 'node:path';

import { ensureDotSlashDir } from './ensure-dot-slash-dir.js';

/**
 * The directory a project's own build artefacts belong beside.
 *
 * The input's parent, because Eleventy offers no project root: `ELEVENTY_ROOT`
 * equals `process.cwd()` and `getProjectPath` is relative to the input.
 *
 * @param {string} [inputDir] - `eleventyConfig.directories.input`.
 * @returns {string} Absolute directory path.
 */
export function projectRoot(inputDir) {
	const cwd = process.cwd();
	const input = resolve(cwd, inputDir || '.');

	// The project is the input, so its parent is somebody else's directory.
	return input === cwd ? cwd : dirname(input);
}

/**
 * An absolute directory in the shape `_baseline.paths` uses: `./x/`, relative
 * to the build. Separators are swapped first because `TemplatePath` eats a
 * Windows one.
 *
 * @param {string} absoluteDir
 * @returns {string}
 */
export function toProjectDir(absoluteDir) {
	const rel = relative(process.cwd(), absoluteDir).split(sep).join('/');
	const dir = ensureDotSlashDir(rel);

	return dir.endsWith('/') ? dir : `${dir}/`;
}
