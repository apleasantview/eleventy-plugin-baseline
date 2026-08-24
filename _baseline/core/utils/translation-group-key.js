/**
 * Compose the key a page's translations are grouped under.
 *
 * A split page is many pages sharing one `translationKey`, so grouping on that
 * alone buckets every part of every language together and the last one wins,
 * which is neither reciprocal nor self-referential as hreflang requires.
 *
 * Grouped per part instead, so part two pairs with part two. A part whose
 * counterpart does not exist gets a group of one rather than a false pair.
 *
 * @param {string} [translationKey]
 * @param {number} [part] - Zero-based part index; absent on unsegmented pages.
 * @returns {string | undefined} Grouping key, or undefined without a translationKey.
 */
export function translationGroupKey(translationKey, part) {
	if (!translationKey) return undefined;
	return part ? `${translationKey}#${part + 1}` : translationKey;
}
