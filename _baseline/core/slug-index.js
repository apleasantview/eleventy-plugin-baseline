import { getScope, setEntry, getEntry } from './registry.js';

const SCOPE_NAME = 'core:slug-index';

/**
 * Slug index (runtime substrate)
 *
 * Maps wikilink-friendly slugs to canonical page URLs. Populated by the
 * page-context builder as each page resolves; read by the wikilinks
 * markdown-it plugin during body render.
 *
 * Architecture layer:
 *   runtime substrate
 *
 * System role:
 *   Forward-link index for the wikilinks plugin. In multilingual sites
 *   only defaultLanguage pages register; the wikilinks plugin uses the
 *   translation map to hop to other languages.
 *
 * Lifecycle:
 *   cascade-time   → page-context registers slugs as templates compute
 *   transform-time → wikilinks plugin resolves slugs during body render
 *
 * Why this exists:
 *   Eleventy's data cascade resolves all eleventyComputed values before any
 *   body renders, so the index is complete by the time wikilinks need it.
 *   A dedicated scope keeps slug→url out of the page-context values map
 *   (which holds url→pageContext).
 *
 * Scope:
 *   Owns slug registration with collision detection and slug-keyed lookup.
 *   Does not own slug derivation (page-context) or link rendering (wikilinks).
 *
 * Data flow:
 *   page-context.buildPageContext → set() → registry scope → wikilinks getBySlug()
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 * @returns {{set: (slug: string, url: string, inputPath?: string) => void, getBySlug: (slug: string) => string | null, snapshot: () => Record<string, {url: string, inputPath?: string}>}}
 */
export function createSlugIndex(eleventyConfig) {
	const scope = getScope(eleventyConfig, SCOPE_NAME);

	return {
		set(slug, url, inputPath) {
			if (!slug || !url) return;
			const existing = getEntry(scope, slug);
			if (existing && existing.url !== url) {
				throw new Error(
					`Wikilink slug collision: "${slug}" used by both ${existing.inputPath ?? existing.url} and ${inputPath ?? url}`
				);
			}
			setEntry(scope, slug, { url, inputPath });
		},
		getBySlug(slug) {
			return getEntry(scope, slug)?.url ?? null;
		},
		snapshot() {
			return Object.fromEntries(scope.values);
		}
	};
}
