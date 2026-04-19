import { describe, it, expect } from 'vitest';
import { configSchema, settingsSchema } from '../schema.js';
import { config } from '../../eleventy.config.js';
import settings from '../../../src/_data/settings.js';

describe('configSchema', () => {
	it('parses the real exported config cleanly', () => {
		const result = configSchema.safeParse(config);
		expect(result.success).toBe(true);
	});

	it('rejects a config missing dir.input', () => {
		const input = structuredClone(config);
		delete input.dir.input;
		const result = configSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['dir', 'input']);
	});

	it('rejects an empty string in dir.assets', () => {
		const input = structuredClone(config);
		input.dir.assets = '';
		const result = configSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['dir', 'assets']);
	});

	it('rejects a missing templateFormats', () => {
		const input = structuredClone(config);
		delete input.templateFormats;
		const result = configSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['templateFormats']);
	});

	it('rejects an empty templateFormats array', () => {
		const input = structuredClone(config);
		input.templateFormats = [];
		const result = configSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['templateFormats']);
	});

	it('rejects templateFormats without njk (the refine)', () => {
		const input = structuredClone(config);
		input.templateFormats = ['html', 'md'];
		const result = configSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].code).toBe('custom');
		expect(result.error.issues[0].path).toEqual(['templateFormats']);
	});
});

describe('settingsSchema', () => {
	const validSettings = {
		title: 'Example',
		tagline: 'A site',
		url: 'https://www.example.com/',
		noindex: false,
		defaultLanguage: 'en',
		languages: {
			en: { languageName: 'English' },
			nl: { languageName: 'Nederlands' }
		},
		head: {
			link: [{ rel: 'stylesheet', href: '/assets/css/index.css' }],
			script: [{ src: '/assets/js/index.js', defer: true }]
		}
	};

	it('parses a full valid settings object cleanly', () => {
		const result = settingsSchema.safeParse(validSettings);
		expect(result.success).toBe(true);
	});

	it('parses the real exported settings cleanly', () => {
		const result = settingsSchema.safeParse(settings);
		expect(result.success).toBe(true);
	});

	it('parses an empty settings object cleanly (all fields optional)', () => {
		const result = settingsSchema.safeParse({});
		expect(result.success).toBe(true);
	});

	it('rejects a non-string title', () => {
		const input = { ...validSettings, title: 42 };
		const result = settingsSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['title']);
	});

	it('rejects a non-boolean noindex', () => {
		const input = { ...validSettings, noindex: 'false' };
		const result = settingsSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['noindex']);
	});

	it('rejects languages entries that are not objects', () => {
		const input = { ...validSettings, languages: { en: 'English' } };
		const result = settingsSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['languages', 'en']);
	});

	it('rejects head.link that is not an array', () => {
		const input = { ...validSettings, head: { link: 'stylesheet' } };
		const result = settingsSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['head', 'link']);
	});

	it('allows unknown keys inside a language entry (permissive inner shape)', () => {
		const input = {
			...validSettings,
			languages: { en: { languageName: 'English', anything: { nested: true } } }
		};
		const result = settingsSchema.safeParse(input);
		expect(result.success).toBe(true);
	});
});
