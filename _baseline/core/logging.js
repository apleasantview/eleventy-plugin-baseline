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
			if (verbose) console.log(chalk.gray(label), ...args);
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
