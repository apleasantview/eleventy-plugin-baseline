import fs from 'node:fs';
import path from 'node:path';

/**
 * Root-relative paths a head declaration asks the browser to load.
 *
 * Collected at module-init time on purpose. By the time `eleventy.after` fires,
 * these hrefs have been rewritten to absolute URLs in place, so reading them
 * then finds nothing root-relative left to check.
 *
 * Absolute URLs are skipped: an origin somewhere else is not this build's to
 * account for.
 *
 * @param {{ link?: Array<{ href?: string }>, script?: Array<{ src?: string }> }} [head]
 * @returns {string[]}
 */
export function collectDeclaredPaths(head) {
	return [
		...(head?.link ?? []).map((entry) => entry?.href),
		...(head?.script ?? []).map((entry) => entry?.src)
	].filter((href) => typeof href === 'string' && href.startsWith('/'));
}

/**
 * Which of those paths the build did not put on disk.
 *
 * Baseline holds both halves of this: what `settings.head` asks for, and what
 * the output directory ended up containing. A `<link>` to a stylesheet no entry
 * point produces renders a 404 on every page of a green build.
 *
 * @param {string[]} declaredPaths
 * @param {string} outputDir
 * @returns {string[]}
 */
export function findMissingAssets(declaredPaths, outputDir) {
	if (!outputDir) return [];

	return declaredPaths.filter((href) => {
		// Query strings and fragments are addressing, not filenames.
		const onDisk = path.join(outputDir, href.split(/[?#]/)[0]);
		return !fs.existsSync(onDisk);
	});
}
