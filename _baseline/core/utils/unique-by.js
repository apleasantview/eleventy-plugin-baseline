/**
 * Deduplicate an array by a key (string property name or selector function).
 * Items without a derivable key are kept via their JSON-stringified shape.
 *
 * @template T
 * @param {T[]} arr
 * @param {string | ((item: T) => string | undefined)} keyFn
 * @returns {T[]}
 */
export const uniqueBy = (arr, keyFn) =>
	Object.values(
		(arr ?? []).reduce((acc, item) => {
			if (!item) return acc;

			const id = typeof keyFn === 'function' ? keyFn(item) : item?.[keyFn];

			if (!id) {
				acc[JSON.stringify(item)] = item;
				return acc;
			}

			acc[id] = item;
			return acc;
		}, {})
	);
