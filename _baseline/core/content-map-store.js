import { getScope, addScopeListener, setEntry, getEntry } from './registry.js';

const SCOPE_NAME = 'core:content-map-store';
const KEY = 'contentMap';

/**
 * Content map store (runtime substrate)
 *
 * Captures Eleventy's content map (emitted once per build via
 * `eleventy.contentMap`) so late-lifecycle consumers can read it back. The
 * store self-attaches its listener; callers create it once during plugin init.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Capture point for the content map; read by page-context for canonical
 *   URL resolution.
 *
 * Lifecycle:
 *   cascade-time   → listener writes the map when Eleventy emits it
 *   transform-time → consumers read via get()
 *
 * Why this exists:
 *   The content map is event-only; without a store, late-lifecycle consumers
 *   have no way to read it back.
 *
 * Scope:
 *   Owns capture and read of the content map.
 *   Does not own the map's shape (Eleventy's) or how consumers use it.
 *
 * Data flow:
 *   eleventy.contentMap event → registry scope → get()
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 * @returns {{get: () => object | null, snapshot: () => object | null}}
 */
export function createContentMapStore(eleventyConfig) {
	const scope = getScope(eleventyConfig, SCOPE_NAME);

	addScopeListener(eleventyConfig, SCOPE_NAME, 'eleventy.contentMap', 'write', (scope, data) => {
		setEntry(scope, KEY, data);
	});

	const read = () => getEntry(scope, KEY) ?? null;

	return {
		get: read,
		snapshot: read
	};
}
