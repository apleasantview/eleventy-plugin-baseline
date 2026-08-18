const pluralRulesCache = new Map();

/**
 * Look up a translated string by dot-path key.
 *
 * Tries `lang`, then `fallback`, then returns the key itself so a miss is
 * visible in the page rather than blank.
 *
 * @param {string} key - Dot-path into the language's table (`nav.home`).
 * @param {Object} [context]
 * @param {Record<string, Object>} [context.strings] - Tables keyed by language code.
 * @param {string} [context.lang] - Language to read.
 * @param {string} [context.fallback] - Language to try when the key is missing.
 * @param {Object} [context.params] - Interpolation values; `count` also selects the plural form.
 * @param {(key: string) => void} [context.onMiss] - Called when neither language has the key.
 * @returns {string}
 */
export function translateKey(key, context = {}) {
	const { strings = {}, lang, fallback, params = {}, onMiss } = context;
	if (!key) return '';

	let value = selectForm(resolvePath(strings[lang], key), lang, params);

	if (value === undefined) {
		value = selectForm(resolvePath(strings[fallback], key), fallback, params);
		if (value === undefined) {
			onMiss?.(key);
			return key;
		}
	}

	return typeof value === 'string' ? interpolate(value, params) : value;
}

/**
 * Walk a dot-path. All-digit segments are read as array indices.
 * @param {unknown} table
 * @param {string} path
 * @returns {unknown}
 */
function resolvePath(table, path) {
	if (!table || !path) return undefined;

	return path.split('.').reduce((acc, part) => {
		if (acc === undefined || acc === null) return undefined;
		return acc[/^\d+$/.test(part) ? Number(part) : part];
	}, table);
}

/**
 * Pick a plural form when the entry is a form object and a count was given.
 * @param {unknown} value
 * @param {string} [lang]
 * @param {{count?: number}} params
 * @returns {unknown}
 */
function selectForm(value, lang, params) {
	if (!value || typeof value !== 'object' || params.count == null) return value;

	const rules = getPluralRules(lang);
	const form = rules ? rules.select(params.count) : 'other';
	return value[form] ?? value.other;
}

/**
 * `Intl.PluralRules` is CLDR, which is what every other ecosystem means by
 * plurals. Cached; one per language, not one per string.
 * @param {string} [lang]
 * @returns {Intl.PluralRules|null}
 */
function getPluralRules(lang) {
	if (!lang) return null;
	if (!pluralRulesCache.has(lang)) {
		pluralRulesCache.set(lang, new Intl.PluralRules(lang));
	}
	return pluralRulesCache.get(lang);
}

/**
 * Replace `{name}` with `params.name`, leaving unknown placeholders visible.
 * @param {string} str
 * @param {Object} params
 * @returns {string}
 */
function interpolate(str, params) {
	return str.replace(/{(\w+)}/g, (match, key) => (params[key] !== undefined ? params[key] : match));
}
