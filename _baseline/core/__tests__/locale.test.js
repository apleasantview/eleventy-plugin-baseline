import { describe, it, expect } from 'vitest';
import { normalizeLang } from '../locale/normalize-lang.js';
import { normalizeLocale } from '../locale/normalize-locale.js';
import { deriveLang } from '../locale/derive-lang.js';
import { resolveDefault } from '../locale/resolve-default.js';

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
