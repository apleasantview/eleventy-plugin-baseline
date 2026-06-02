import { normalizeLocale } from './normalize-locale.js';

/**
 * Format a BCP 47 tag in Open Graph's `language_TERRITORY` form (`en-US` →
 * `en_US`). Normalises casing first; null for tags `Intl.Locale` rejects.
 * `replaceAll` so script+region tags convert fully (`zh-Hant-HK` → `zh_Hant_HK`).
 *
 * @param {unknown} raw  A BCP 47 locale tag.
 * @returns {string | null}
 */
export function toOpenGraphLocale(raw) {
	const normalized = normalizeLocale(raw);
	return normalized ? normalized.replaceAll('-', '_') : null;
}
