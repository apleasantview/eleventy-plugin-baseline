/**
 * Back-compat: legacy options shape (composition root helper)
 *
 * The original plugin API accepted a single merged configuration object.
 * The current contract splits site identity (`settings`) from runtime
 * behaviour (`options`). This shim detects the old shape and converts it.
 *
 * Architecture layer:
 *   composition root (back-compat helper)
 *
 * System role:
 *   Pure shape detection and normalisation. Lets the entry point accept
 *   either the legacy single-object form or the current two-arg form
 *   without conditional logic at every read site.
 *
 * Why this exists:
 *   Past-me changed the plugin's input contract. This file keeps that
 *   change non-breaking for anyone (including past-me) still on the old
 *   shape. Removable once nobody's calling baseline() with a single object.
 *
 * Scope:
 *   Owns the legacy-key whitelist, shape detection, and the split into
 *   the canonical pair. Does not log; the caller decides whether and how
 *   to surface the deprecation.
 *
 * Data flow:
 *   legacy-shaped object → { settings, options }
 */

export const LEGACY_OPTION_KEYS = [
	'verbose',
	'enableNavigatorTemplate',
	'enableSitemapTemplate',
	'assetsESBuild',
	'multilingual'
];

/**
 * Detect the legacy single-object plugin invocation.
 *
 * NOTE: arguments.length is required because default parameters mask arity.
 *
 * @param {unknown} firstArg
 * @param {number} argsLength
 * @returns {boolean}
 */
export function isLegacyShape(firstArg, argsLength) {
	if (argsLength >= 2) return false;
	if (!firstArg || typeof firstArg !== 'object') return false;
	return LEGACY_OPTION_KEYS.some((key) => key in firstArg);
}

/**
 * Convert a legacy single-object input into the current (settings, options)
 * pair.
 *
 * - settings → site identity (content + SEO concerns)
 * - options  → runtime behaviour flags
 *
 * @param {object} legacy
 * @returns {{ settings: object, options: object }}
 */
export function normalizeLegacyShape(legacy) {
	const { defaultLanguage, languages, ...rest } = legacy;
	return {
		settings: { defaultLanguage, languages },
		options: rest
	};
}
