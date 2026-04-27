import { I18nPlugin } from '@11ty/eleventy';
import { DeepCopy } from '@11ty/eleventy-utils';
import { langNormalization } from '../../core/utils/helpers.js';
import i18nTranslationsFor from './filters/i18n-translations-for.js';
import i18nTranslationIn from './filters/i18n-translation-in.js';
import i18nDefaultTranslation from './filters/i18n-default-translation.js';

/**
 * Multilang (module)
 *
 * Language infrastructure. Normalises language config, builds translation
 * relationships, attaches per-page locale data, and exposes cross-language
 * lookup filters. Active only when options.multilingual is true and both
 * defaultLanguage and at least one languages entry are set; otherwise the
 * module exits early.
 *
 * Architecture layer:
 *   module
 *
 * System role:
 *   Wraps Eleventy's I18nPlugin and feeds the translation-map store that
 *   head reads at transform-time. Sitemap reuses the same normalised
 *   language map.
 *
 * Lifecycle:
 *   build-time   → normalise languages, attach I18nPlugin, register filters
 *                  and computed page.locale
 *   cascade-time → translationsMap and translations collections build the
 *                  per-translationKey map and write it to the store
 *
 * Why this exists:
 *   I18nPlugin handles locale-aware routing but not translation
 *   relationships. Head needs a transform-time-readable hreflang map; the
 *   collection populates it once and the store carries it across the
 *   lifecycle boundary.
 *
 * Scope:
 *   Owns language normalisation, page.locale computation, the translations
 *   and translationsMap collections, and the i18n filters
 *   (i18nTranslationsFor, i18nTranslationIn, i18nDefaultTranslation).
 *   Does not own URL routing (I18nPlugin) or hreflang rendering (head).
 *
 * Data flow:
 *   settings.languages + page.lang/translationKey → normalisation +
 *   I18nPlugin → collections + computed page.locale + translation-map
 *   store → head, sitemap
 *
 * @param {import("@11ty/eleventy/src/UserConfig.js").default} eleventyConfig
 * @param {Object} moduleContext
 */
export default function multilangCore(eleventyConfig, moduleContext) {
	const { state, runtime, log } = moduleContext;
	const settings = state.settings;
	const options = state.options;

	const moduleOptions = {
		verbose: options.verbose,
		multilingual: options.multilingual,
		defaultLanguage: settings.defaultLanguage,
		languages: settings.languages
	};

	// --- Language normalization ---
	// Accept languages as array or object; normalize to object map.
	// Drives collection building, locale data, and sitemap-core language config.
	moduleOptions.languages = langNormalization(moduleOptions, log);
	const hasLanguages = moduleOptions.languages && Object.keys(moduleOptions.languages).length > 0;
	const isMultilingual = moduleOptions.multilingual === true && moduleOptions.defaultLanguage && hasLanguages;

	if (!isMultilingual) {
		log.info('inactive: requires options.multilingual + settings.defaultLanguage + languages');
		return;
	}

	// Register Eleventy's built-in I18nPlugin for locale-aware URL resolution.
	eleventyConfig.addPlugin(I18nPlugin, {
		defaultLanguage: moduleOptions.defaultLanguage,
		errorMode: 'allow-fallback'
	});

	// Build a set of allowed language codes for validation during collection building.
	const normalizeLanguageCode = (lang) => (lang || '').toLowerCase().trim();
	const allowedLanguages = new Set(Object.keys(moduleOptions.languages).map(normalizeLanguageCode));

	// Computed locale data: every page gets a page.locale object with its
	// resolved lang, translationKey, and whether it's the default language.
	eleventyConfig.addGlobalData('eleventyComputed.page.locale', () => {
		return (data) => {
			const lang = normalizeLanguageCode(data.lang || data.language || moduleOptions.defaultLanguage);
			const translationKey = data.translationKey;
			const isDefaultLang = lang === normalizeLanguageCode(moduleOptions.defaultLanguage);

			return {
				translationKey,
				lang,
				isDefaultLang
			};
		};
	});

	// Build both the map (keyed by translationKey → lang) and the flat list.
	// Shared logic for both collections — called once per collection registration.
	const buildTranslations = (collection) => {
		const map = {};
		const list = [];

		for (const page of collection.getAll()) {
			const translationKey = page.data.translationKey;
			if (!translationKey) continue;

			const lang = page.data.lang || page.data.language || moduleOptions.defaultLanguage;
			if (!lang) continue;

			if (allowedLanguages.size && !allowedLanguages.has(lang)) {
				log.info(`Unknown lang "${lang}" in ${page.inputPath}`);
				continue;
			}

			const locale = { locale: { translationKey, lang, isDefaultLang: lang === moduleOptions.defaultLanguage } };
			const safeCopy = DeepCopy(page, locale);
			list.push(safeCopy);

			if (!map[translationKey]) map[translationKey] = {};
			map[translationKey][lang] = {
				title: page.data.title,
				url: page.url,
				lang,
				isDefaultLang: lang === moduleOptions.defaultLanguage,
				data: page.data
			};
		}

		return { map, list };
	};

	// --- Collections ---

	// Map form: translationsMap[translationKey][lang] → page metadata.
	eleventyConfig.addCollection('translationsMap', (collection) => {
		const map = buildTranslations(collection).map;
		runtime.translationMap.set(map);
		return map;
	});

	// Flat list: all translatable pages with locale data attached.
	eleventyConfig.addCollection('translations', (collection) => {
		return buildTranslations(collection).list;
	});

	// --- Filters ---
	// Relational helpers for cross-language lookups in templates.
	eleventyConfig.addFilter('i18nTranslationsFor', i18nTranslationsFor);
	eleventyConfig.addFilter('i18nTranslationIn', i18nTranslationIn);
	eleventyConfig.addFilter('i18nDefaultTranslation', i18nDefaultTranslation);
}
