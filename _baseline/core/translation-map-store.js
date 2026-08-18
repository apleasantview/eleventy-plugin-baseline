import { getScope, setEntry, getEntry } from './registry.js';

const SCOPE_NAME = 'core:translation-map-store';
const KEY = 'translationMap';
const INDEX_KEY = 'translationIndex';

/**
 * Translation map store (runtime substrate)
 *
 * Hand-off point for the translations map: written by multilang at
 * cascade-time, read by head at transform-time.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Bridge between the multilang module (writer) and the head module (reader).
 *   The set/get pair lives in a registry scope rather than the data cascade
 *   because head's PostHTML plugin runs outside the cascade.
 *
 * Lifecycle:
 *   cascade-time   → multilang's translationsMap collection writes via set()
 *   transform-time → head reads via get() to build hreflang alternates
 *
 * Why this exists:
 *   The translations map is built inside an Eleventy collection, but head
 *   needs it inside an htmlTransformer plugin where collections aren't
 *   available.
 *
 * Scope:
 *   Owns set/get on a per-config scope.
 *   Does not own the map's shape, how it's built, or how head uses it.
 *
 * Data flow:
 *   multilang translationsMap collection → set() → registry scope → head get()
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

/**
 * Second bridge, same scope: the graph-built translation index, written by
 * multilang when it first groups the content graph and read by head for
 * hreflang.
 *
 * Kept separate from the map above because the two have different producers
 * and different availability. The map is built by a collection, so it exists
 * in the pre-pass too, which is what wikilinks needs. The index is built from
 * the content graph, which the pre-pass is busy producing and cannot read.
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 * @returns {{set: (index: object) => void, get: () => object | null}}
 */
export function createTranslationIndexStore(eleventyConfig) {
	const scope = getScope(eleventyConfig, SCOPE_NAME);

	return {
		set: (index) => setEntry(scope, INDEX_KEY, index),
		get: () => getEntry(scope, INDEX_KEY) ?? null
	};
}
