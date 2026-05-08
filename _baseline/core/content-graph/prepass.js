import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import Eleventy from '@11ty/eleventy';

import { buildGraph } from './graph.js';

export const PREPASS_SENTINEL = 'BASELINE_PREPASS_RUNNING';
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
 * @param {import('../logging.js').BaselineLogger} log
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function runPrepass(input, output, log, options = {}) {
	process.env[PREPASS_SENTINEL] = '1';

	const elev = new Eleventy(input, output, { ...options, dryRun: true });
	const pages = await elev.toJSON();

	log.info('Building content graph…');
	const graph = buildGraph(pages);

	await mkdir(dirname(GRAPH_CACHE_PATH), { recursive: true });
	await writeFile(GRAPH_CACHE_PATH, JSON.stringify(graph), 'utf8');

	log.info('Pre-pass finished');
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
