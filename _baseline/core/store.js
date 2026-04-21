export function createContentMapStore() {
	let map = null;

	return {
		set(newMap) {
			map = newMap;
		},
		get() {
			return map;
		}
	};
}
