import { describe, it, expect, vi } from 'vitest';
import { translateKey } from '../translate.js';

const strings = {
	en: {
		nav: { home: 'Home' },
		greeting: 'Hello, {name}',
		items: { one: '{count} item', other: '{count} items' },
		crumbs: ['first', 'second']
	},
	nl: {
		nav: { home: 'Thuis' },
		greeting: 'Hallo, {name}'
	},
	pl: {
		items: { one: '{count} plik', few: '{count} pliki', many: '{count} plików' }
	}
};

const t = (key, context) => translateKey(key, { strings, fallback: 'en', ...context });

describe('translateKey', () => {
	it('reads a dot-path in the requested language', () => {
		expect(t('nav.home', { lang: 'nl' })).toBe('Thuis');
	});

	it('falls back to the fallback language when the key is missing', () => {
		expect(t('items.other', { lang: 'nl', params: { count: 3 } })).toBe('3 items');
	});

	it('returns the key itself when neither language has it, and reports the miss', () => {
		const onMiss = vi.fn();
		expect(t('nav.missing', { lang: 'nl', onMiss })).toBe('nav.missing');
		expect(onMiss).toHaveBeenCalledWith('nav.missing');
	});

	it('interpolates named params and leaves unknown placeholders visible', () => {
		expect(t('greeting', { lang: 'en', params: { name: 'Cris' } })).toBe('Hello, Cris');
		expect(t('greeting', { lang: 'en' })).toBe('Hello, {name}');
	});

	it('selects the English plural form by count', () => {
		expect(t('items', { lang: 'en', params: { count: 1 } })).toBe('1 item');
		expect(t('items', { lang: 'en', params: { count: 5 } })).toBe('5 items');
	});

	it('uses CLDR categories, so Polish gets three forms where English gets two', () => {
		// Intl.PluralRules('pl'): 1 is one, 2 is few, 5 is many.
		expect(t('items', { lang: 'pl', params: { count: 1 } })).toBe('1 plik');
		expect(t('items', { lang: 'pl', params: { count: 2 } })).toBe('2 pliki');
		expect(t('items', { lang: 'pl', params: { count: 5 } })).toBe('5 plików');
	});

	it('ignores plural forms when no count is given', () => {
		expect(t('items', { lang: 'en' })).toEqual(strings.en.items);
	});

	it('reads all-digit path segments as array indices', () => {
		expect(t('crumbs.1', { lang: 'en' })).toBe('second');
	});

	it('returns an empty string for an empty key', () => {
		expect(t('', { lang: 'en' })).toBe('');
	});

	it('returns the key when no tables exist at all', () => {
		expect(translateKey('nav.home', { lang: 'en' })).toBe('nav.home');
	});
});
