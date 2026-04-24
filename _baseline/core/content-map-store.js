import { getScope, addScopeListener, setEntry, getEntry } from './registry.js';

const SCOPE_NAME = 'core/content-map-store';
const KEY = 'contentMap';

/**
 * Content Map Store
 *
 * Holds the Eleventy content map (emitted via `eleventy.contentMap`)
 * in a per-config scope so consumers can read it lazily.
 *
 * The store self-attaches its listener; callers only need to create
 * it once during plugin init.
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
