import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import Eleventy from '@11ty/eleventy';
import chalk from 'kleur';

import { pickRepetitionQuip } from '../logging/index.js';
import { tagPrepassConfig } from '../prepass-channel.js';
import { projectRoot } from '../utils/project-root.js';
import { buildGraph } from './graph.js';

/**
 * Pre-pass (runtime substrate)
 *
 * Runs a programmatic Eleventy in dryRun mode, hands its rendered output
 * to the graph builder, and writes the result to disk for serve-mode
 * rebuilds to read between cycles.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Build-time entry point for the content graph. Tags the nested instance
 *   as the re-entry guard, publishes the consumer signal, and owns the cache
 *   file path.
 *
 * Lifecycle:
 *   build-time → fires on each Eleventy `eleventy.before` event; spawns a
 *                synthetic Eleventy, captures rendered HTML via toJSON(),
 *                and persists the graph before the outer cycle renders.
 *
 * Why this exists:
 *   Eleventy's data cascade is blind to rendered output. A pre-pass is the
 *   way to read the rendered shape of every page before the real build
 *   composes its templates. Running it every cycle keeps the graph current
 *   in serve mode without a separate merge mechanic.
 *
 * Scope:
 *   Owns the synthetic Eleventy run, sentinel handling, and cache I/O.
 *   Does not own extraction or the graph shape (graph.js owns those).
 *
 * Data flow:
 *   inner Eleventy toJSON() → buildGraph → cache file + in-memory graph
 */

// Published for consumers only: Baseline's own guards read the config tag.
// A project's config has no access to the registry, so this stays the signal
// its own pre-pass guards can read. Set in try, deleted in finally.
export const PREPASS_ACTIVE = 'BASELINE_PREPASS_ACTIVE';

const CACHE_FILE = '_baseline/content-graph.json';

// Only for a caller with no cache directory in hand; the root always has one.
const DEFAULT_CACHE_DIR = '.cache';

/**
 * The graph cache file inside a resolved cache directory. A join, not a
 * policy: where the cache lives is the composition root's decision.
 *
 * @param {string} [cacheDir] - Absolute cache directory.
 * @returns {string} Absolute path to the cache file.
 */
export function graphCachePath(cacheDir) {
	return resolve(cacheDir || resolve(projectRoot(), DEFAULT_CACHE_DIR), CACHE_FILE);
}

/**
 * Turn a directory path into a glob Eleventy's `ignores` set accepts.
 * Directory values arrive in several shapes (`./src/assets/`, `src/assets`),
 * and the leading `./` is what `ignores` will not match on.
 *
 * @param {string} dir
 * @returns {string} Glob covering everything under the directory.
 */
function toDirGlob(dir) {
	return `${String(dir).replace(/^\.\//, '').replace(/\/+$/, '')}/**`;
}

/**
 * Run a programmatic Eleventy, extract the content graph, write it to disk,
 * return the in-memory graph.
 *
 * Tags the nested instance's config so the inner re-entry into baseline()
 * skips its own pre-pass.
 *
 * Always runs — there is no skip-if-cache-exists check. The pre-pass is fast
 * enough today that unconditional execution is the honest default, and the
 * cache file's primary job is the serve-mode handoff between rebuilds, not
 * build-skip caching. When the cost earns it, mtime-based skip belongs at the
 * call site (compare cache mtime to newest input mtime), not baked in here —
 * keeps mechanic and policy separated.
 *
 * @param {string} input
 * @param {string} output
 * @param {(namespace: string) => { status: Function, info: Function, warn: Function, error: Function }} scopedLog - Factory the composition root passes through so the pre-pass and the cache-write step can be scoped separately.
 * @param {object} [options] - Eleventy constructor options, plus `ignore` and `cacheDir`.
 * @param {string[]} [options.ignore] - Directories the inner build should skip.
 * @param {string} [options.cacheDir] - Absolute cache directory, resolved by the composition root.
 * @returns {Promise<object>}
 */
export async function runPrepass(input, output, scopedLog, options = {}) {
	const log = scopedLog('pre-pass');
	const graphLog = scopedLog('content-graph');

	// Default tier, not narrative: the pre-pass is the one part of a Baseline
	// build with a wait attached to it, so saying it started is a courtesy the
	// quiet default keeps.
	log.status('Pre-pass starting');
	log.status(chalk.cyan(pickRepetitionQuip()));
	graphLog.info('Caching content graph');
	process.env[PREPASS_ACTIVE] = '1';

	const { ignore = [], cacheDir, ...elevOptions } = options;
	const ignoreGlobs = ignore.filter(Boolean).map(toDirGlob);

	let graph;
	try {
		const elev = new Eleventy(input, output, {
			...elevOptions,

			// Inherit the outer run. A nested instance stamps these onto process.env
			// for the whole process, so letting them default rewrites the real run as
			// build/script and every serve-only behaviour downstream stops firing.
			runMode: process.env.ELEVENTY_RUN_MODE,
			source: process.env.ELEVENTY_SOURCE,

			dryRun: true,
			// Surface fields the graph and backlink enrichment read off `data`.
			config: function (eleventyConfig) {
				// This callback and every plugin registered against this instance are
				// handed the same object, and this runs first, so the tag is the
				// re-entry guard. Measured on 3.1.6.
				tagPrepassConfig(eleventyConfig);

				for (const glob of ignoreGlobs) eleventyConfig.ignores.add(glob);
				eleventyConfig.dataFilterSelectors.add('_pageContext'); // -> Future pass.
				eleventyConfig.dataFilterSelectors.add('eleventyExcludeFromCollections');
				eleventyConfig.dataFilterSelectors.add('baselineExcludeFromGraph');
			}
		});
		const pages = await elev.toJSON();
		graph = buildGraph(pages, { log: graphLog });

		const cachePath = graphCachePath(cacheDir);
		await mkdir(dirname(cachePath), { recursive: true });
		await writeFile(cachePath, JSON.stringify(graph), 'utf8');
	} finally {
		delete process.env[PREPASS_ACTIVE];
		log.status('Pre-pass done');
	}

	return graph;
}

/**
 * @param {string} [cacheDir] - The same cache directory the write was given.
 */
export async function readGraphFromDisk(cacheDir) {
	try {
		const raw = await readFile(graphCachePath(cacheDir), 'utf8');
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
