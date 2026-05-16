import chalk from 'kleur';

const BANNER_GLOBAL_KEY = Symbol.for('eleventy:baseline:banner');
const FALLBACK_NAME = 'Eleventy Baseline';
const MARGIN = 4;

/**
 * Resolve the label shown inside the banner. Reads `npm_package_name`
 * (set by npm when Baseline runs under `npm run …`) and falls back to
 * the plugin's own name when the env var is absent (raw `npx`, direct
 * node, programmatic use).
 *
 * @returns {string}
 */
function resolveBannerLabel() {
	return process.env.npm_package_name || FALLBACK_NAME;
}

/**
 * Render the boxed startup banner string. Pure, label-only.
 * Width scales with the label so any project name fits.
 *
 * @param {string} [label]
 * @returns {string}
 */
export function baselineBanner(label = resolveBannerLabel()) {
	const inner = label.length + MARGIN * 2;
	const top = '╔' + '═'.repeat(inner) + '╗';
	const middle = '║' + ' '.repeat(MARGIN) + chalk.bold().white(label) + ' '.repeat(MARGIN) + '║';
	const bottom = '╚' + '═'.repeat(inner) + '╝';

	return ['', top, middle, bottom, ''].join('\n');
}

/**
 * Print the banner and an intro line once per process. Guarded by a global
 * symbol so repeated plugin invocations (inner pre-pass Eleventy,
 * multi-instance setups) don't re-print.
 *
 * @param {import('./index.js').BaselineLogger} log
 * @param {{ version: string, eleventyVersion?: string }} versions
 */
export function printBannerOnce(log, { version, eleventyVersion } = {}) {
	if (globalThis[BANNER_GLOBAL_KEY]) return;
	globalThis[BANNER_GLOBAL_KEY] = true;
	log.print(baselineBanner());
	const tail = eleventyVersion ? `, running Eleventy v${eleventyVersion}` : '';
	log.info(`Baseline v${version}${tail}`);
}
