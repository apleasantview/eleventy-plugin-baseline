import { describe, it, expect } from 'vitest';
import { resolveLocaleForLang } from '../utils/resolve-locale-for-lang.js';

describe('resolveLocaleForLang', () => {
	it('prefers the locale configured on the language entry', () => {
		const languages = { en: { locale: 'en-GB' }, nl: { locale: 'nl-BE' } };
		expect(resolveLocaleForLang('nl', languages, 'en-GB')).toBe('nl-BE');
	});

	it('falls back to the language tag, not the site default (finding a)', () => {
		// Array-form config normalises to entries with no locale.
		const languages = { en: {}, nl: {} };
		expect(resolveLocaleForLang('nl', languages, 'en')).toBe('nl');
	});

	it('reaches the site default only when the lang itself is unusable', () => {
		expect(resolveLocaleForLang('', {}, 'en-GB')).toBe('en-GB');
		expect(resolveLocaleForLang(undefined, {}, 'en-GB')).toBe('en-GB');
	});

	it('normalises casing on both the configured locale and the bare tag', () => {
		expect(resolveLocaleForLang('nl', { nl: { locale: 'nl-be' } }, 'en')).toBe('nl-BE');
		expect(resolveLocaleForLang('NL', {}, 'en')).toBe('nl');
	});
});
