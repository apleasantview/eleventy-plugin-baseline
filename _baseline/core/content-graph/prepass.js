import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import Eleventy from '@11ty/eleventy';

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
 * @param {object} log
 * @param {object} [options]
 * @param {Set<string>} [options.knownOrigins] - Origins to strip from internal hrefs during extraction.
 * @returns {Promise<object>}
 */
export async function runPrepass(input, output, log, options = {}) {
	log.info('Pre-pass run active');
	log.info('Somewhere, a bowl of petunias is thinking: oh no, not again.', { color: 'cyan' });
	log.info('Writing content graph to cache');
	process.env[PREPASS_SENTINEL] = '1';
	process.env[PREPASS_ACTIVE] = '1';

	// knownOrigins is consumed by the graph builder, not Eleventy.
	const { knownOrigins, ...elevOptions } = options;

	let graph;
	try {
		const elev = new Eleventy(input, output, {
			...elevOptions,
			dryRun: true,
			// Surface fields the graph and backlink enrichment read off `data`.
			config: function (eleventyConfig) {
				eleventyConfig.dataFilterSelectors.add('_pageContext'); // -> Future pass.
				eleventyConfig.dataFilterSelectors.add('eleventyExcludeFromCollections');
				eleventyConfig.dataFilterSelectors.add('baselineExcludeFromGraph');
			}
		});
		const pages = await elev.toJSON();
		graph = buildGraph(pages, { knownOrigins });

		await mkdir(dirname(GRAPH_CACHE_PATH), { recursive: true });
		await writeFile(GRAPH_CACHE_PATH, JSON.stringify(graph), 'utf8');
	} finally {
		process.env[PREPASS_ACTIVE] = '0';
		log.info('Pre-pass run finished');
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
