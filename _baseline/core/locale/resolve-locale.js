import { resolveDefault } from './resolve-default.js';

/**
 * Pick the page's BCP 47 locale out of the cascade.
 *
 * Reads, never normalises — trusts multilang's already-resolved `page.locale`
 * first, then bag-level locale, the language's configured locale, the site
 * default, and the bare `lang` tag last.
 *
 * The site default goes through `resolveDefault` rather than reading a key,
 * because `defaultLocale` and `defaultLanguage` are aliases and only the
 * resolver honours both. Reading one of them meant a site that set
 * `defaultLocale` alone emitted no `og:locale` at all.
 *
 * @param {{ locale?: string } | undefined} node  The navigator node, if any.
 * @param {Record<string, any>} data  The Eleventy cascade data bag.
 * @param {{ languages?: Record<string, { locale?: string }>, defaultLanguage?: string, defaultLocale?: string } | undefined} settings
 * @param {string} lang  Resolved language subtag; the final fallback.
 * @returns {string}
 */
export function resolveLocale(node, data, settings, lang) {
	return (
		node?.locale ||
		data?.page?.locale ||
		data?.locale ||
		settings?.languages?.[lang]?.locale ||
		resolveDefault(settings).locale ||
		lang
	);
}
