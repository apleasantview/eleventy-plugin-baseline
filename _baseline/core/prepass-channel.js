import { getScope, setEntry, getEntry } from './registry.js';

const SCOPE_NAME = 'core:prepass';
const KEY = 'isPrepass';

/**
 * Pre-pass channel (registry)
 *
 * Marks the config object of the nested Eleventy instance the pre-pass
 * constructs, so its registration can tell itself apart from the outer one.
 *
 * Architecture layer:
 *   registry
 *
 * System role:
 *   The re-entry guard's channel. The pre-pass tags the instance it builds;
 *   the composition root asks whether the config it was handed carries the
 *   tag, and resolves `isPrepass` from the answer.
 *
 * Lifecycle:
 *   build-time → tagged in the nested constructor's `config` callback, which
 *                runs before Eleventy loads the project config.
 *
 * Why this exists:
 *   Both builds load the same config, so the plugin registers twice and the
 *   inner registration must not start a third build. An env var answers
 *   "is a pre-pass running in this process", which two builds sharing a
 *   process read from each other. A config object is one build's identity.
 *
 * Scope:
 *   Owns the tag and the lookup.
 *   Does not own what anyone does with the answer.
 *
 * Data flow:
 *   nested constructor callback → tag → plugin registration reads it
 */

/**
 * Mark a config object as belonging to the pre-pass's nested instance.
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 */
export function tagPrepassConfig(eleventyConfig) {
	setEntry(getScope(eleventyConfig, SCOPE_NAME), KEY, true);
}

/**
 * Whether a config object belongs to the pre-pass's nested instance.
 *
 * @param {import('@11ty/eleventy').UserConfig} [eleventyConfig]
 * @returns {boolean} False for anything untagged, including nothing at all.
 */
export function isPrepassConfig(eleventyConfig) {
	if (!eleventyConfig) return false;

	return getEntry(getScope(eleventyConfig, SCOPE_NAME), KEY) === true;
}
