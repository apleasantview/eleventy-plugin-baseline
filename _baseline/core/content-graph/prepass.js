import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import Eleventy from '@11ty/eleventy';
import chalk from 'kleur';

import { pickRepetitionQuip } from '../logging/index.js';
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
 *   Build-time entry point for the content graph. Owns the re-entry
 *   sentinel, the log-suppression scope, and the cache file path.
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

// Re-entry guard: set once by the outer process, read at call-time on
// the inner re-entry to skip the pre-pass. Permanent for the life of
// the outer process — the pre-pass runs exactly once.
export const PREPASS_SENTINEL = 'BASELINE_PREPASS_RUNNING';

// Log-suppression scope: set only while runPrepass is executing. Read by
// the logger to silence baseline's own info-level chatter during the
// inner build. Different lifetime to PREPASS_SENTINEL on purpose.
export const PREPASS_ACTIVE = 'BASELINE_PREPASS_ACTIVE';

export const GRAPH_CACHE_PATH = resolve(process.cwd(), '.cache/_baseline/content-graph.json');

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
 * Sets the sentinel before constructing Eleventy so the inner re-entry into
 * baseline() skips its own pre-pass.
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
 * @param {object} [options] - Eleventy constructor options, plus `ignore`.
 * @param {string[]} [options.ignore] - Directories the inner build should skip.
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
	process.env[PREPASS_SENTINEL] = '1';
	process.env[PREPASS_ACTIVE] = '1';

	const { ignore = [], ...elevOptions } = options;
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
				for (const glob of ignoreGlobs) eleventyConfig.ignores.add(glob);
				eleventyConfig.dataFilterSelectors.add('_pageContext'); // -> Future pass.
				eleventyConfig.dataFilterSelectors.add('eleventyExcludeFromCollections');
				eleventyConfig.dataFilterSelectors.add('baselineExcludeFromGraph');
			}
		});
		const pages = await elev.toJSON();
		graph = buildGraph(pages, { log: graphLog });

		await mkdir(dirname(GRAPH_CACHE_PATH), { recursive: true });
		await writeFile(GRAPH_CACHE_PATH, JSON.stringify(graph), 'utf8');
	} finally {
		process.env[PREPASS_ACTIVE] = '0';
		log.status('Pre-pass done');
	}

	return graph;
}

export async function readGraphFromDisk() {
	try {
		const raw = await readFile(GRAPH_CACHE_PATH, 'utf8');
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
