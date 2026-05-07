import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import Eleventy from '@11ty/eleventy';

import { buildGraph } from './graph.js';

export const GRAPH_CACHE_PATH = resolve(process.cwd(), '.baseline-cache/content-graph.json');

/**
 * Run a programmatic Eleventy in dryRun mode, extract the content graph,
 * write it to the cache file. Skips if the cache already exists.
 *
 * @param {string} input
 * @param {string} output
 * @param {object} options
 * @returns {Promise<object | null>}
 */
export async function bootstrapIfNeeded(input, output, options = {}) {
	if (existsSync(GRAPH_CACHE_PATH)) return null;

	const elev = new Eleventy(input, output, { ...options, dryRun: true });
	const pages = await elev.toJSON();
	const graph = buildGraph(pages);

	await mkdir(dirname(GRAPH_CACHE_PATH), { recursive: true });
	await writeFile(GRAPH_CACHE_PATH, JSON.stringify(graph), 'utf8');

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
