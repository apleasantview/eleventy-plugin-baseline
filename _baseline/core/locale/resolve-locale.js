/**
 * Pick the page's BCP 47 locale out of the cascade.
 *
 * Trusts multilang's already-normalised `page.locale` first, then walks the
 * cascade fallbacks (bag-level locale, the language's configured locale),
 * landing on the bare `lang` tag last. Reads, never normalises — the value is
 * assumed resolved upstream.
 *
 * @param {{ locale?: string } | undefined} node  The navigator node, if any.
 * @param {Record<string, any>} data  The Eleventy cascade data bag.
 * @param {{ languages?: Record<string, { locale?: string }> } | undefined} settings
 * @param {string} lang  The resolved language subtag, used as the final fallback.
 * @returns {string}
 */
export function resolveLocale(node, data, settings, lang) {
	return node?.locale || data?.page?.locale || data?.locale || settings?.languages?.[lang]?.locale || lang;
}
