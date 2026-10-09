import { translationGroupKey } from '../../../core/utils/translation-group-key.js';
import { SEGMENT_ALIAS } from '../../../core/segmentation/constants.js';

/**
 * Group collection pages into a translationKey-keyed map.
 *
 * The collection-built half of the pair: same shape and same key as
 * `buildTranslationIndex`, built from Eleventy's pages rather than from graph
 * nodes. It exists because the store it writes has to be readable in the
 * pre-pass, where the graph does not exist yet.
 *
 * Collections hold page one of a split page alone, whose group key is the bare
 * key, so grouping per part reads the same today and stays correct if later
 * parts ever become visible to collections.
 *
 * @param {Array<{ url?: string, inputPath?: string, data?: Object }>} pages
 * @param {Object} [context]
 * @param {Record<string, Object>} [context.languages] - Normalised language map, consulted for a display label.
 * @param {Set<string>} [context.allowedLanguages] - When non-empty, a lang outside it is warned about and skipped.
 * @param {string} [context.defaultLanguage]
 * @param {(data: Object) => string | undefined} [context.resolveLang] - Per-page language resolver.
 * @param {{ warn?: (message: string) => void }} [context.log]
 * @returns {Record<string, Record<string, { url: string, lang: string, label: string, title: string|undefined, description: string|undefined, isDefaultLang: boolean }>>}
 */
export function buildTranslations(pages, context = {}) {
	const { languages = {}, allowedLanguages = new Set(), defaultLanguage, resolveLang, log } = context;
	const map = {};

	for (const page of pages ?? []) {
		const group = translationGroupKey(page?.data?.translationKey, page?.data?.[SEGMENT_ALIAS]?.index);
		if (!group) continue;

		const lang = resolveLang?.(page.data);
		if (!lang) continue;

		// An unrecognised lang is an authoring typo, and a typo shouldn't join a
		// translation set. Said out loud here, unlike on the graph path.
		if (allowedLanguages.size && !allowedLanguages.has(lang)) {
			log?.warn?.(`Unknown lang "${lang}" in ${page.inputPath}`);
			continue;
		}

		// The full page `data` bag used to ride along here and survive into the
		// store, which is what made it expensive.
		if (!map[group]) map[group] = {};
		map[group][lang] = {
			url: page.url,
			lang,
			label: languages[lang]?.languageName ?? lang,
			title: page.data.title,
			description: page.data.description,
			isDefaultLang: lang === defaultLanguage
		};
	}

	// Key order is page order, which templates iterate directly (the sitemap
	// emits one `xhtml:link` per entry). Sorted so that output is stable.
	for (const key of Object.keys(map)) {
		map[key] = Object.fromEntries(Object.entries(map[key]).sort(([a], [b]) => a.localeCompare(b)));
	}

	return map;
}
