function resolvePath(obj, path) {
	if (!obj || !path) return undefined;
	const debugMissing = process?.env?.DEBUG_I18N;
	return path.split('.').reduce((acc, part) => {
		if (acc === undefined || acc === null) {
			if (debugMissing) {
				console.warn(`Missing translation key: ${path}`);
			}
			return undefined;
		}
		const key = /^\d+$/.test(part) ? Number(part) : part;
		return acc[key];
	}, obj);
}

// Simple interpolation: replaces {key} with params[key]
function interpolate(str, params = {}) {
	return str.replace(/{(\w+)}/g, (_, key) => {
		return params[key] !== undefined ? params[key] : `{${key}}`;
	});
}

const pluralRulesCache = new Map();

function getPluralRules(lang) {
	if (!lang) return null;
	if (!pluralRulesCache.has(lang)) {
		pluralRulesCache.set(lang, new Intl.PluralRules(lang));
	}
	return pluralRulesCache.get(lang);
}

function translateKey(key, { strings = {}, lang, fallback, params = {} } = {}) {
	if (!key) return '';

	let value = resolvePath(strings[lang], key);

	// Pluralization support
	if (value && typeof value === 'object' && params.count != null) {
		// Use Intl.PluralRules
		const pluralRules = getPluralRules(lang);
		const form = pluralRules ? pluralRules.select(params.count) : 'other';
		value = value[form] || value.other;
	}

	// Fallback
	if (value === undefined) {
		let fallbackValue = resolvePath(strings[fallback], key);
		// Pluralization for fallback
		if (fallbackValue && typeof fallbackValue === 'object' && params.count != null) {
			const pluralRules = getPluralRules(fallback);
			const form = pluralRules ? pluralRules.select(params.count) : 'other';
			fallbackValue = fallbackValue[form] || fallbackValue.other;
		}
		value = fallbackValue ?? key;
	}

	// Interpolation
	if (typeof value === 'string') {
		value = interpolate(value, params);
	}

	return value;
}

export { translateKey };
