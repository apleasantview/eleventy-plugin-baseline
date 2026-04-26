import chalk from 'kleur';

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
		}
	};
}
