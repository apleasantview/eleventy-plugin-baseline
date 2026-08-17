/**
 * Sentence-case a URL slug for display: "core-reference" → "Core reference".
 * The rough inverse of {@link slugify}: splits on hyphens/underscores and
 * capitalises the first word only. Sentence case rather than title case so a
 * derived breadcrumb label reads the same way an authored one does.
 *
 * @param {string} slug
 * @returns {string}
 */
export function sentenceCaseSlug(slug) {
	const [first, ...rest] = String(slug).split(/[-_]/).filter(Boolean);

	if (!first) return '';

	return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ');
}
