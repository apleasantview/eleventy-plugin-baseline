/**
 * Title-case a URL slug for display: "core-reference" → "Core Reference".
 * The rough inverse of {@link slugify}: splits on hyphens/underscores and
 * capitalises each word.
 *
 * @param {string} slug
 * @returns {string}
 */
export function titleCaseSlug(slug) {
	return String(slug)
		.split(/[-_]/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}
