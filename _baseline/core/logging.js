import chalk from 'kleur';

/**
 * Logger (runtime substrate)
 *
 * Namespaced console logger used across the plugin. One factory, three
 * levels: `info` (verbose-gated), `warn`, `error`. The composition root
 * holds an unscoped logger; modules receive a scoped one through the
 * module context.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Single output surface for plugin diagnostics. Every module writes
 *   through it so prefixes, colours, and verbosity behave identically.
 *
 * Lifecycle:
 *   build-time → loggers created at plugin init and per-module activation
 *
 * Why this exists:
 *   Eleventy gives no opinionated logging primitive. A shared factory
 *   keeps every prefix consistent and lets one `verbose` switch silence
 *   info-level chatter without affecting warnings or errors.
 *
 * Scope:
 *   Owns the prefix format, colour treatment, and verbosity gate. Does
 *   not own message content or what each module chooses to log.
 *
 * Data flow:
 *   namespace + verbose → logger triple → console
 */

/**
 * @typedef {Object} BaselineLogger
 * @property {(...args: unknown[]) => void} info   Verbose-only.
 * @property {(...args: unknown[]) => void} warn   Always visible.
 * @property {(...args: unknown[]) => void} error  Always visible.
 */

/**
 * Create a namespaced logger. Prefix is `[baseline]` at plugin root and
 * `[baseline:<namespace>]` inside modules. `info` is gated behind `verbose`;
 * `warn` and `error` always emit.
 *
 * @param {string | null | undefined} namespace
 * @param {{ verbose?: boolean }} [options]
 * @returns {BaselineLogger}
 */
export function createLogger(namespace, { verbose = false } = {}) {
	const label = namespace ? `[baseline/${namespace}]` : '[baseline]';

	// Pre-pass gate: silence baseline's own info during the inner Eleventy
	// run so modules don't double-log every line they emit again during the
	// real build. Env-var contract scoped to runPrepass's execution (set in
	// try, cleared in finally). Eleventy's own `[11ty]` output is governed
	// by its `quietMode` and stays untouched here.
	const isPrepass = () => process.env.BASELINE_PREPASS_ACTIVE === '1';

	return {
		info: (...args) => {
			if (!verbose) return;
			if (isPrepass()) return;
			console.log(chalk.gray(label), ...args);
		},
		warn: (...args) => {
			console.warn(chalk.yellow().bold(label), ...args);
		},
		error: (...args) => {
			console.error(chalk.red().bold(label), ...args);
		},
		print: (content) => {
			console.log(chalk.gray(content));
		}
	};
}

const BANNER_GLOBAL_KEY = Symbol.for('eleventy:baseline:banner');

/**
 * Render the boxed startup banner string. Pure, label-only.
 *
 * @returns {string}
 */
export function baselineBanner() {
	const label = 'Eleventy Baseline';
	const width = 28;
	const inner = width - 2;
	const pad = inner - label.length;
	const left = Math.floor(pad / 2);
	const right = pad - left;

	const top = '╔' + '═'.repeat(inner) + '╗';
	const middle = '║' + ' '.repeat(left) + chalk.bold().white(label) + ' '.repeat(right) + '║';
	const bottom = '╚' + '═'.repeat(inner) + '╝';

	return ['', top, middle, bottom, ''].join('\n');
}

/**
 * Print the banner and an intro line once per process. Guarded by a global
 * symbol so repeated plugin invocations (inner pre-pass Eleventy,
 * multi-instance setups) don't re-print.
 *
 * @param {BaselineLogger} log
 * @param {{ version: string, eleventyVersion?: string }} versions
 */
export function printBannerOnce(log, { version, eleventyVersion } = {}) {
	if (globalThis[BANNER_GLOBAL_KEY]) return;
	globalThis[BANNER_GLOBAL_KEY] = true;
	log.print(baselineBanner());
	const tail = eleventyVersion ? `, running Eleventy v${eleventyVersion}` : '';
	log.info(`Baseline v${version}${tail}`);
}
