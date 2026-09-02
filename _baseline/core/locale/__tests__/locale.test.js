import { describe, it, expect } from 'vitest';
import { normalizeLang } from '../normalize-lang.js';
import { normalizeLocale } from '../normalize-locale.js';
import { deriveLang } from '../derive-lang.js';
import { resolveDefault } from '../resolve-default.js';
import { resolveLocale } from '../resolve-locale.js';
import { toOpenGraphLocale } from '../open-graph-locale.js';

describe('normalizeLang', () => {
	it('lowercases and trims', () => {
		expect(normalizeLang('  EN  ')).toBe('en');
	});

	it('passes through already-lowercase input', () => {
		expect(normalizeLang('fr')).toBe('fr');
	});

	it('returns empty string for null/undefined', () => {
		expect(normalizeLang(null)).toBe('');
		expect(normalizeLang(undefined)).toBe('');
	});

	it('returns empty string for empty/whitespace input', () => {
		expect(normalizeLang('')).toBe('');
		expect(normalizeLang('   ')).toBe('');
	});

	it('coerces non-string input', () => {
		expect(normalizeLang(42)).toBe('42');
	});
});

describe('normalizeLocale', () => {
	it('canonicalises lang-region casing', () => {
		expect(normalizeLocale('en-us')).toBe('en-US');
		expect(normalizeLocale('fr-ca')).toBe('fr-CA');
		expect(normalizeLocale('nl-nl')).toBe('nl-NL');
	});

	it('canonicalises lang-script-region casing', () => {
		expect(normalizeLocale('zh-hant-hk')).toBe('zh-Hant-HK');
	});

	it('accepts a bare language subtag', () => {
		expect(normalizeLocale('en')).toBe('en');
	});

	it('trims whitespace', () => {
		expect(normalizeLocale('  en-US  ')).toBe('en-US');
	});

	it('returns null for empty/whitespace/nullish', () => {
		expect(normalizeLocale('')).toBeNull();
		expect(normalizeLocale('   ')).toBeNull();
		expect(normalizeLocale(null)).toBeNull();
		expect(normalizeLocale(undefined)).toBeNull();
	});

	it('returns null for clearly invalid tags', () => {
		expect(normalizeLocale('!!!')).toBeNull();
	});
});

describe('deriveLang', () => {
	it('extracts the language subtag', () => {
		expect(deriveLang('en-US')).toBe('en');
		expect(deriveLang('zh-Hant-HK')).toBe('zh');
		expect(deriveLang('fr')).toBe('fr');
	});

	it('handles lowercase input', () => {
		expect(deriveLang('en-us')).toBe('en');
	});

	it('returns null for invalid input', () => {
		expect(deriveLang(null)).toBeNull();
		expect(deriveLang('')).toBeNull();
		expect(deriveLang('!!!')).toBeNull();
	});
});

describe('resolveDefault', () => {
	it('uses defaultLocale alone, derives lang', () => {
		expect(resolveDefault({ defaultLocale: 'en-US' })).toEqual({
			lang: 'en',
			locale: 'en-US'
		});
	});

	it('uses defaultLanguage alone, derives locale via Intl.Locale', () => {
		expect(resolveDefault({ defaultLanguage: 'en' })).toEqual({
			lang: 'en',
			locale: 'en'
		});
	});

	it('prefers defaultLocale when both are present and agree', () => {
		expect(
			resolveDefault({
				defaultLocale: 'en-US',
				defaultLanguage: 'en'
			})
		).toEqual({ lang: 'en', locale: 'en-US' });
	});

	it('trusts defaultLocale silently when the two disagree', () => {
		expect(
			resolveDefault({ defaultLocale: 'fr-FR', defaultLanguage: 'en' })
		).toEqual({ lang: 'fr', locale: 'fr-FR' });
	});

	it('returns empty default for empty settings', () => {
		expect(resolveDefault({})).toEqual({ lang: '', locale: null });
	});
});

describe('toOpenGraphLocale', () => {
	it('converts lang-region to underscore form', () => {
		expect(toOpenGraphLocale('en-US')).toBe('en_US');
		expect(toOpenGraphLocale('nl-NL')).toBe('nl_NL');
	});

	it('canonicalises casing before converting', () => {
		expect(toOpenGraphLocale('en-us')).toBe('en_US');
	});

	it('converts every subtag, not just the first hyphen', () => {
		expect(toOpenGraphLocale('zh-Hant-HK')).toBe('zh_Hant_HK');
	});

	it('passes a bare language subtag through unchanged', () => {
		expect(toOpenGraphLocale('en')).toBe('en');
	});

	it('returns null for nullish or invalid input', () => {
		expect(toOpenGraphLocale(null)).toBeNull();
		expect(toOpenGraphLocale('')).toBeNull();
		expect(toOpenGraphLocale('!!!')).toBeNull();
	});
});

// The alias only worked if you happened to set defaultLanguage as well.
// A site setting defaultLocale alone got no locale out of this chain at all,
// which meant no og:locale and no inLanguage on every page it rendered.
describe('resolveLocale', () => {
	const settings = { defaultLocale: 'en-GB' };

	it('prefers the navigator node, then the page, then the bag', () => {
		expect(resolveLocale({ locale: 'nl-BE' }, { page: { locale: 'fr-FR' } }, settings, 'en')).toBe('nl-BE');
		expect(resolveLocale(undefined, { page: { locale: 'fr-FR' } }, settings, 'en')).toBe('fr-FR');
		expect(resolveLocale(undefined, { locale: 'de-DE' }, settings, 'en')).toBe('de-DE');
	});

	it('takes the language entry ahead of the site default', () => {
		const withLanguages = { ...settings, languages: { en: { locale: 'en-US' } } };
		expect(resolveLocale(undefined, {}, withLanguages, 'en')).toBe('en-US');
	});

	it('falls back to the site default when only defaultLocale is set', () => {
		expect(resolveLocale(undefined, {}, settings, 'en')).toBe('en-GB');
	});

	it('honours defaultLanguage as the alias it is documented to be', () => {
		expect(resolveLocale(undefined, {}, { defaultLanguage: 'fr' }, 'fr')).toBe('fr');
	});

	it('ends at the bare lang tag when settings say nothing', () => {
		expect(resolveLocale(undefined, {}, {}, 'pt')).toBe('pt');
		expect(resolveLocale(undefined, {}, undefined, 'pt')).toBe('pt');
	});
});
