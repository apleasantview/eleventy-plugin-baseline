import slugifyLib from 'slugify';

/**
 * Slugify a string into a wikilink-friendly key.
 * Lowercases, strips diacritics, replaces non-alphanumerics with hyphens,
 * trims leading/trailing hyphens. Returns undefined for empty input.
 *
 * @param {string|null|undefined} input
 * @returns {string|undefined}
 */
export function slugify(input) {
	if (input == null) return;
	const slug = slugifyLib(String(input), { lower: true, strict: true, trim: true });
	return slug || undefined;
}
