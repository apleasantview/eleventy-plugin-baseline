import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import Eleventy from '@11ty/eleventy';

import { buildGraph } from './graph.js';

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
 * @param {import('../logging.js').BaselineLogger} log
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function runPrepass(input, output, log, options = {}) {
	log.info('Somewhere, a bowl of petunias is thinking: oh no, not again.', { color: 'cyan' });
	log.info('Building content graph…');
	process.env[PREPASS_SENTINEL] = '1';
	process.env[PREPASS_ACTIVE] = '1';

	let graph;
	try {
		const elev = new Eleventy(input, output, { ...options, dryRun: true });
		const pages = await elev.toJSON();
		graph = buildGraph(pages);

		await mkdir(dirname(GRAPH_CACHE_PATH), { recursive: true });
		await writeFile(GRAPH_CACHE_PATH, JSON.stringify(graph), 'utf8');
	} finally {
		process.env[PREPASS_ACTIVE] = '0';
		log.info('Pre-pass finished');
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
