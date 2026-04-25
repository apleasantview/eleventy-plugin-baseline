import pick from '../../../core/utils/pick.js';
const COMPUTED_KEY = 'eleventyComputed._head';

/**
 * Cascade-time seed collector.
 *
 * Registers a computed global that populates `page._head` per page with a
 * raw, language-resolved bag of fields the composer needs at transform
 * time. No composition, no URL building — just data picking.
 *
 * @param {import('@11ty/eleventy').UserConfig} eleventyConfig
 * @param {Object} context
 * @param {Object} context.state - Baseline state (settings + options).
 * @param {Object} context.runtime - Runtime accessors (contentMap getter).
 */
export function collectHeadSeeds(eleventyConfig, { state, runtime }) {
	const { settings } = state;

	eleventyConfig.addGlobalData(COMPUTED_KEY, () => {
		return (data) => {
			const page = data?.page ?? {};
			const lang = page.lang;

			// Language-resolved site fields (fallback to top-level settings).
			const langEntry = lang ? settings.languages?.[lang] : undefined;
			const siteTitle = langEntry?.title ?? settings.title ?? '';
			const siteTagline = langEntry?.tagline ?? settings.tagline ?? '';

			// Canonical path — explicit > page.url > contentMap fallback.
			// Raw path only; composer resolves to absolute URL via new URL().
			const contentMap = runtime.contentMap;
			const canonicalPath = pick(
				data?.canonical,
				page.url,
				page.inputPath && contentMap?.inputPathToUrl?.[page.inputPath]?.[0]
			);

			return {
				generator: data?.eleventy?.generator,

				// Site (language-resolved).
				siteTitle,
				siteTagline,
				siteUrl: settings.url ?? '',
				siteNoindex: settings.noindex === true,

				// Page.
				pageTitle: data?.title,
				pageDescription: data?.description,
				pageNoindex: data?.noindex === true,
				pageUrl: page.url,
				pageInputPath: page.inputPath,
				canonicalPath,

				// User extras — raw object with meta/link/script/style arrays.
				extras: settings.head ?? {}
			};
		};
	});
}
