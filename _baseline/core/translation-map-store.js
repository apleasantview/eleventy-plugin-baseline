import { getScope, setEntry, getEntry } from './registry.js';

const SCOPE_NAME = 'core/translation-map-store';
const KEY = 'translationMap';

/**
 * Translation Map Store
 *
 * Holds the translations map built by multilang-core in a per-config
 * scope so head-core can read it at transform time.
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 * @returns {{set: (map: object) => void, get: () => object | null}}
 */
export function createTranslationMapStore(eleventyConfig) {
	const scope = getScope(eleventyConfig, SCOPE_NAME);

	return {
		set: (map) => setEntry(scope, KEY, map),
		get: () => getEntry(scope, KEY) ?? null
	};
}
