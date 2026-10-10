import fs from 'node:fs';
import path from 'node:path';
import { addTrailingSlash } from '../../../core/utils/add-trailing-slash.js';

/**
 * A dirent's parent as a trailing-slashed subpath of `directory`, or an empty
 * string when it is the directory itself.
 *
 * Via `path.relative` rather than string arithmetic: Node returns `parentPath`
 * normalised, so a `./src/assets/js/` input yields `src\assets\js\vendor`, and
 * slicing by the input's length ate the first character of `vendor`.
 */
function subPath(directory, parentPath) {
	const relative = path.relative(directory, String(parentPath ?? ''));
	if (!relative || relative.startsWith('..')) return '';
	return `${relative.split(path.sep).join('/')}/`;
}

/**
 * Entry files beneath a processed-asset directory.
 *
 * The compile guards recognise an entry when Eleventy hands one over; nothing
 * goes looking for them. The asset index has to, because it needs the whole set
 * before the first page renders.
 *
 * Paths come back carrying whatever prefix `directory` arrived with, because
 * the guards compare against the same config value. Sorted, because the index
 * they feed decides output filenames.
 *
 * @param {string} directory - An asset subdirectory, e.g. `./src/assets/css/`.
 * @param {string} basename - The entry filename, e.g. `index.css`.
 * @returns {string[]} Matching paths, empty when the directory does not exist.
 */
export function findEntries(directory, basename) {
	if (!directory || !basename) return [];

	const root = addTrailingSlash(directory);

	let dirents;
	try {
		dirents = fs.readdirSync(root, { recursive: true, withFileTypes: true });
	} catch {
		// A site with no css or js directory has no entries rather than a problem.
		return [];
	}

	return dirents
		.filter((dirent) => dirent.isFile() && dirent.name === basename)
		.map((dirent) => `${root}${subPath(root, dirent.parentPath)}${dirent.name}`)
		.sort();
}
