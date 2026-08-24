import { translationGroupKey } from '../../../core/utils/translation-group-key.js';

/**
 * Group content-graph nodes into a translationKey-keyed index.
 *
 * The graph already carries every field a translation relationship needs
 * (`translationKey`, `lang`, `isDefaultLang`, `url`), it just isn't grouped.
 * This does the grouping, and is the one place the language map is consulted
 * for a display label. Output shape matches what head's `buildAlternates`
 * already reads, so the same index serves both.
 *
 * Lives here rather than in `core/content-graph/` because the label lookup
 * needs `settings.languages`, which core has no access to.
 *
 * @param {Record<string, Object>} nodes - Content-graph nodes, keyed by url.
 * @param {Object} [context]
 * @param {Record<string, Object>} [context.languages] - Normalised language map; when non-empty, langs outside it are skipped.
 * @param {string} [context.defaultLanguage] - Falls back to comparing against this when a node carries no isDefaultLang.
 * @returns {Record<string, Record<string, { url: string, lang: string, label: string, title: string|undefined, description: string|undefined, isDefaultLang: boolean }>>}
 */
export function buildTranslationIndex(nodes, context = {}) {
	const { languages = {}, defaultLanguage } = context;
	const known = new Set(Object.keys(languages));
	const index = {};

	for (const node of Object.values(nodes ?? {})) {
		const key = node?.translationKey;
		const lang = node?.lang;
		if (!key || !lang || !node.url) continue;

		// Mirrors the collection path's behaviour: an unrecognised lang is an
		// authoring typo, and a typo shouldn't join a translation set.
		if (known.size && !known.has(lang)) continue;

		// Per part, or the last part of a split page overwrites the rest.
		const group = translationGroupKey(key, node.part);
		if (!index[group]) index[group] = {};

		// Last node wins on a duplicate group + lang pair, same as before.
		// `label` names the language, `title` and `description` name the page:
		// a sibling's own copy is otherwise unreachable without a second lookup.
		index[group][lang] = {
			url: node.url,
			lang,
			label: languages[lang]?.languageName ?? lang,
			title: node.title,
			description: node.description,
			isDefaultLang: node.isDefaultLang ?? lang === defaultLanguage
		};
	}

	return index;
}
