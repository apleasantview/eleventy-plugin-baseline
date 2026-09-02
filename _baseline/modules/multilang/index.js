import { I18nPlugin } from '@11ty/eleventy';
import {
	normalizeLang,
	normalizeLocale,
	deriveLang,
	resolveDefault
} from '../../core/locale/index.js';
import { normalizeLanguageMap } from '../../core/utils/normalize-language-map.js';
import { registerTranslations } from './register-translations.js';
import { resolveLocaleForLang } from './utils/resolve-locale-for-lang.js';
import translationsFor from './filters/translations-for.js';
import translationIn from './filters/translation-in.js';
import defaultTranslation from './filters/default-translation.js';

/**
 * Multilang (module)
 *
 * Language infrastructure. Normalises language config, builds translation
 * relationships, attaches per-page lang / locale / translationKey /
 * isDefaultLang fields, and exposes cross-language lookup filters. Active
 * only when options.multilingual is true and both defaultLanguage and at
 * least one languages entry are set; otherwise the module exits early.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   Wraps Eleventy's I18nPlugin and feeds two transform-time stores: the
 *   graph-built index head reads for hreflang, and the collection-built map
 *   wikilinks reads for its lang hop. Sitemap reuses the same normalised
 *   language map.
 *
 * Lifecycle:
 *   build-time   → normalise languages, attach I18nPlugin, register filters
 *                  and computed page.lang / page.locale / page.translationKey
 *                  / page.isDefaultLang / page.translations
 *   cascade-time → the translationsMap collection walks every keyed page and
 *                  writes the store; page.translations groups the graph instead
 *
 * Why this exists:
 *   I18nPlugin handles locale-aware routing but not translation
 *   relationships. Consumers outside the cascade need those relationships
 *   at transform-time, and the stores carry them across that boundary.
 *
 * Scope:
 *   Owns language normalisation, per-page flat locale fields (lang, locale,
 *   translationKey, isDefaultLang, translations), the translationsMap
 *   collection, and the relational filters (translationsFor, translationIn,
 *   defaultTranslation). Does not own URL routing (I18nPlugin), hreflang
 *   rendering (head), or string translation (the `t` filter).
 *
 * Data flow:
 *   settings.languages + page.lang/locale/translationKey → normalisation
 *   + I18nPlugin → collection + flat computed page fields + two stores
 *   → head, wikilinks, sitemap
 *
 * @param {import("@11ty/eleventy/src/UserConfig.js").default} eleventyConfig
 * @param {Object} moduleContext
 */
export function multilangCore(eleventyConfig, moduleContext) {
	const { state, runtime, log } = moduleContext;
	const { settings, options } = state;

	// --- Default resolution ---
	// resolveDefault returns { lang, locale } from settings.defaultLocale (preferred)
	// or settings.defaultLanguage (cosmetic alias; locale derived via Intl.Locale,
	// returning the bare language subtag when no region is given).
	const { lang: defaultLanguage, locale: defaultLocale } = resolveDefault(settings);
	const languages = normalizeLanguageMap(settings, log);
	const hasLanguages = languages && Object.keys(languages).length > 0;

	const isMultilingual = options.multilang === true && defaultLanguage && hasLanguages;

	if (!isMultilingual) {
		log.warn('Multilang inactive, needs options.multilang, settings.defaultLanguage or defaultLocale, and languages');
		return;
	}

	log.info(`Multilang active: ${Object.keys(languages).join('/')} (default: ${defaultLanguage})`);

	// Register Eleventy's built-in I18nPlugin for locale-aware URL resolution.
	eleventyConfig.addPlugin(I18nPlugin, {
		defaultLanguage: defaultLanguage,
		errorMode: 'allow-fallback'
	});

	// --- Per-page resolvers ---
	// Shared between the four flat eleventyComputed registrations below and
	// the buildTranslations collection iterator. Closes over defaults and
	// the languages map.
	//
	// Accept `language` as a writer-side alias for `lang`. Cheap, forgiving,
	// and means existing front matter using either spelling keeps working.
	// Also derives lang from data.locale when neither is set.
	function resolvePageLang(data) {
		return (
			normalizeLang(data.lang || data.language || deriveLang(data.locale)) || defaultLanguage
		);
	}

	function resolvePageLocale(data) {
		if (data.locale) return normalizeLocale(data.locale);
		return resolveLocaleForLang(resolvePageLang(data), languages, defaultLocale);
	}

	// --- Computed per-page fields ---
	// Four independent registrations merge cleanly at the leaves (validated
	// 2026-05-25 via temp/workbench/multilang-glow-up/eleventy-probe/).
	// Replaces the historical single-bag page.locale object with flat
	// siblings on page.
	eleventyConfig.addGlobalData(
		'eleventyComputed.page.lang',
		() => (data) => resolvePageLang(data)
	);
	eleventyConfig.addGlobalData(
		'eleventyComputed.page.locale',
		() => (data) => resolvePageLocale(data)
	);
	eleventyConfig.addGlobalData(
		'eleventyComputed.page.translationKey',
		() => (data) => data.translationKey
	);
	eleventyConfig.addGlobalData(
		'eleventyComputed.page.isDefaultLang',
		() => (data) => resolvePageLang(data) === defaultLanguage
	);

	// Sibling translations, grouped off the content graph rather than a collection.
	registerTranslations(eleventyConfig, { runtime, languages, defaultLanguage });

	// Build a set of allowed language codes for validation during collection building.
	const allowedLanguages = new Set(Object.keys(languages).map(normalizeLang));

	// Walk every page with a translationKey into the map. Runs once per build
	// and is reset on `eleventy.before` so serve-mode rebuilds recompute rather
	// than serving the previous build's pages.
	let built = null;
	eleventyConfig.on('eleventy.before', () => {
		built = null;
	});

	const buildTranslations = (collection) => {
		if (built) return built;

		const map = {};

		for (const page of collection.getAll()) {
			const translationKey = page.data.translationKey;
			if (!translationKey) continue;

			const lang = resolvePageLang(page.data);
			if (!lang) continue;

			if (allowedLanguages.size && !allowedLanguages.has(lang)) {
				log.warn(`Unknown lang "${lang}" in ${page.inputPath}`);
				continue;
			}

			// Same shape as the graph-built index, deliberately: two producers,
			// one record. The full page `data` bag used to ride along here and
			// survive into the store, which is what made it expensive.
			if (!map[translationKey]) map[translationKey] = {};
			map[translationKey][lang] = {
				url: page.url,
				lang,
				label: languages[lang]?.languageName ?? lang,
				title: page.data.title,
				description: page.data.description,
				isDefaultLang: lang === defaultLanguage
			};
		}

		built = map;
		return built;
	};

	// --- Collection ---

	// Map form: translationsMap[translationKey][lang] → page metadata. Also the
	// only writer of the store, which wikilinks reads while markdown renders.
	eleventyConfig.addCollection('translationsMap', (collection) => {
		const map = buildTranslations(collection);
		runtime.translationMap.set(map);
		return map;
	});

	// --- Filters ---
	// Relational helpers for cross-language lookups in templates. They read the
	// store rather than a passed collection, so the call site stays short and
	// `translations` is free for the string layer's global data. The store is
	// collection-built, which means it exists in the pre-pass; the graph-built
	// index does not, and a filter rendering links needs the earlier one.
	const withMap = (fn) => (page, ...rest) => fn(page, runtime.translationMap.get(), ...rest);

	eleventyConfig.addFilter('translationsFor', withMap(translationsFor));
	eleventyConfig.addFilter('translationIn', withMap(translationIn));
	eleventyConfig.addFilter('defaultTranslation', withMap(defaultTranslation));
}
