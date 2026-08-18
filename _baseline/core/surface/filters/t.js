import { translateKey } from '../../locale/translate.js';

/**
 * Build the `t` filter: `{{ "nav.home" | t }}`.
 *
 * Strings come from `_data/translations/<lang>.js`, which Eleventy auto-loads,
 * read through `this.ctx` from the Nunjucks runtime like `relatedPosts` does.
 * Language defaults to the current page's, then to the site default. Another
 * engine gets no `ctx` and the filter returns the key, same as a miss.
 *
 * @param {Object} deps
 * @param {() => string|undefined} deps.getDefaultLanguage - Read late; settings resolve after this is built.
 * @param {{warn: (...args: unknown[]) => void}} deps.log
 * @returns {(key: string, params?: Object) => string}
 */
export function createTFilter({ getDefaultLanguage, log }) {
	return function tFilter(key, params = {}) {
		const strings = this?.ctx?.translations;
		if (!strings) return key;

		const fallback = getDefaultLanguage();
		const lang = params.lang ?? this?.ctx?.page?.lang ?? fallback;

		return translateKey(key, {
			strings,
			lang,
			fallback,
			params,
			onMiss: (missed) => log.warn(`No translation for "${missed}" in ${lang}`)
		});
	};
}
