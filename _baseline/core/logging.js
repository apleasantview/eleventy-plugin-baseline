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
	return {
		info: (...args) => {
			if (!verbose) return;
			const last = args.at(-1);
			const opts = last && typeof last === 'object' && 'color' in last ? args.pop() : null;
			const paint = opts?.color && typeof chalk[opts.color] === 'function' ? chalk[opts.color] : null;
			console.log(chalk.gray(label), ...(paint ? args.map((a) => (typeof a === 'string' ? paint(a) : a)) : args));
		},
		warn: (...args) => {
			console.warn(chalk.yellow().bold(label), ...args);
		},
		error: (...args) => {
			console.error(chalk.red().bold(label), ...args);
		},
		print: (content) => console.log(chalk.gray(content))
	};
}

const BANNER_GLOBAL_KEY = Symbol.for('eleventy:baseline:banner');

/**
 * Render the boxed startup banner string. Pure — no I/O.
 *
 * @param {string} version
 * @returns {string}
 */
export function baselineBanner(version) {
	const label = `Eleventy Baseline`;
	const versionLabel = `v${version}`;
	const width = 42;

	const title = chalk.bold().white(label);
	const versionText = chalk.green(versionLabel);

	const content = `${title} ${chalk.gray('•')} ${versionText}`;

	const padded = content.padEnd(width - 6);

	return ['', '╔' + '═'.repeat(width - 2) + '╗', `║  ${padded}    ║`, '╚' + '═'.repeat(width - 2) + '╝', ''].join('\n');
}

/**
 * Print the banner once per process. Guarded by a global symbol so repeated
 * plugin invocations (inner pre-pass Eleventy, multi-instance setups) don't
 * re-print.
 *
 * @param {BaselineLogger} log
 * @param {string} version
 */
export function printBannerOnce(log, version) {
	if (globalThis[BANNER_GLOBAL_KEY]) return;
	globalThis[BANNER_GLOBAL_KEY] = true;
	log.print(baselineBanner(version));
}
