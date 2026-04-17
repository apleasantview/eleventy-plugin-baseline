function deepFreeze(obj) {
	for (const key of Object.keys(obj)) {
		const value = obj[key];
		if (value && typeof value === 'object') deepFreeze(value);
	}
	return Object.freeze(obj);
}

export function createSiteGraph({ config }) {
	return {
		config: deepFreeze(structuredClone(config))
		// deferred: site, i18n, head, pages
	};
}
