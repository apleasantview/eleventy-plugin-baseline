/**
 * Sentence-case a URL slug for display: "core-reference" → "Core reference".
 * The rough inverse of {@link slugify}. Sentence case, not title case, so a
 * derived breadcrumb label reads the way an authored one does.
 *
 * @param {string} slug
 * @returns {string}
 */
export function sentenceCaseSlug(slug) {
	const [first, ...rest] = String(slug).split(/[-_]/).filter(Boolean);

	if (!first) return '';

	return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ');
}
