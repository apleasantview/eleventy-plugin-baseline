import chalk from 'kleur';

export * from './banner.js';
export * from './quips.js';

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
 * @property {(...args: unknown[]) => void} status Default tier: on unless silenced.
 * @property {(...args: unknown[]) => void} info   Verbose-only.
 * @property {(...args: unknown[]) => void} warn   Always visible.
 * @property {(...args: unknown[]) => void} error  Always visible.
 * @property {(content: string) => void}   print  Unprefixed pass-through (used by the banner).
 */

/**
 * Create a namespaced logger. Prefix is `[baseline]` at plugin root and
 * `[baseline/<namespace>]` inside modules. `info` is gated behind `verbose`
 * and behind Eleventy's own quiet mode; `warn` and `error` always emit.
 *
 * `quiet` takes a function rather than a boolean because `eleventyConfig.quietMode`
 * is mutable: the CLI sets it through `_setQuietModeOverride`, and a consumer can
 * call `setQuietMode` from their config. Reading it per call means the answer is
 * always current. A plain boolean still works for callers with nothing to watch.
 *
 * Quiet suppresses narrative only. A quiet build still surfaces problems, which is
 * the same contract `verbose: false` has.
 *
 * @param {string | null | undefined} namespace
 * @param {{ verbose?: boolean, quiet?: boolean | (() => boolean) }} [options]
 * @returns {BaselineLogger}
 */
export function createLogger(namespace, { verbose = false, quiet = false, silent = false } = {}) {
	const label = namespace ? `[baseline/${namespace}]` : '[baseline]';
	const isQuiet = typeof quiet === 'function' ? quiet : () => quiet === true;

	// Pre-pass gate: silence baseline's own info and warnings during the inner
	// Eleventy run so modules don't double-log every line they emit again during
	// the real build. Env-var contract scoped to runPrepass's execution (set in
	// try, cleared in finally). Eleventy's own `[11ty]` output is governed
	// by its `quietMode` and stays untouched here.
	// `error` stays ungated: a pre-pass that fails may be the only place it says so.
	const isPrepass = () => process.env.BASELINE_PREPASS_ACTIVE === '1';

	return {
		// The default tier. Not narrative and not a problem: the few lines worth
		// printing when the consumer has said nothing either way. Ignores
		// `verbose`, obeys an explicit silence and Eleventy's quiet mode.
		status: (...args) => {
			if (silent) return;
			if (isQuiet()) return;
			if (isPrepass()) return;
			console.log(chalk.gray(label), ...args);
		},
		info: (...args) => {
			if (!verbose) return;
			if (isQuiet()) return;
			if (isPrepass()) return;
			console.log(chalk.gray(label), ...args);
		},
		warn: (...args) => {
			if (isPrepass()) return;
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
