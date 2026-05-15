/**
 * Resolve a field with a page → site → fallback precedence chain.
 *
 * @param {{ pageValue?: any, siteValue?: any, fallbackValue?: any, isHome?: boolean }} args
 * @returns {any}
 */
export function resolveField({ pageValue, siteValue, fallbackValue }) {
	return pageValue ?? siteValue ?? fallbackValue;
}
