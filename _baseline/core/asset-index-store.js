import { getScope, setEntry, getEntry } from './registry.js';

const SCOPE_NAME = 'core:asset-index-store';
const KEY = 'assetIndex';

/**
 * Asset index store (runtime substrate)
 *
 * Hand-off point for the asset index: written by the assets module at
 * build-time, read by head at transform-time to resolve a declared `href`.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Bridge between the assets module (writer) and the head module (reader).
 *   Same shape and the same reason as the translation map store: head's
 *   PostHTML plugin runs outside the data cascade.
 *
 * Lifecycle:
 *   build-time     → assets writes the index on `eleventy.before`
 *   transform-time → head reads it while composing the head
 *
 * Why this exists:
 *   `settings.head` is plain data, evaluated long before any asset is
 *   compiled, so a filter cannot run there. Head resolving the path later is
 *   the only place the lookup can happen without asking authors to
 *   restructure their settings.
 *
 * Scope:
 *   Owns set/get on a per-config scope.
 *   Does not own the index's shape, how it is built, or how head uses it.
 *
 * Data flow:
 *   assets `eleventy.before` → set() → registry scope → head get()
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 * @returns {{set: (index: object) => void, get: () => object | null}}
 */
export function createAssetIndexStore(eleventyConfig) {
	const scope = getScope(eleventyConfig, SCOPE_NAME);

	return {
		set: (index) => setEntry(scope, KEY, index),
		get: () => getEntry(scope, KEY) ?? null
	};
}
