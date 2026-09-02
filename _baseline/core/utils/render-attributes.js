/**
 * Render an attribute map as HTML, dropping anything with nothing to say.
 *
 * `true` becomes a bare attribute (`defer`), `false`, `null` and `undefined`
 * are omitted, so a caller can toggle one with a value rather than by building
 * the map conditionally.
 *
 * `keepEmpty` exists for `alt`, where the empty string is the message: a
 * decorative image is `alt=""`, and no `alt` at all tells a screen reader to
 * fall back to announcing the filename. The two are not interchangeable.
 *
 * @param {Object} [attributes] - Attribute names to values.
 * @param {string[]} [keepEmpty=[]] - Attribute names to render even when empty.
 * @returns {string} Attribute string, leading space included when non-empty.
 */
export function renderAttributes(attributes, keepEmpty = []) {
	const rendered = Object.entries(attributes ?? {})
		.filter(([key, value]) => {
			if (value === undefined || value === null || value === false) return false;
			return value !== '' || keepEmpty.includes(key);
		})
		.map(([key, value]) => (value === true ? key : `${key}="${value}"`))
		.join(' ');

	return rendered ? ` ${rendered}` : '';
}
