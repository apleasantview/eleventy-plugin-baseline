import { describe, it, expect } from 'vitest';
import { configSchema, optionsSchema, settingsSchema } from '../schema.js';
import { config } from '../../index.js';
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
			script: [{ src: '/assets/js/index.js', defer: true }],
			meta: [{ name: 'color-scheme', content: 'light dark' }],
			style: []
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

	it('allows unknown keys inside a language entry (permissive inner shape)', () => {
		const input = {
			...validSettings,
			languages: { en: { languageName: 'English', anything: { nested: true } } }
		};
		const result = settingsSchema.safeParse(input);
		expect(result.success).toBe(true);
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

	it('rejects head.meta that is not an array', () => {
		const input = { ...validSettings, head: { meta: 'color-scheme' } };
		const result = settingsSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['head', 'meta']);
	});

	it('rejects head.style that is not an array', () => {
		const input = { ...validSettings, head: { style: 'body {}' } };
		const result = settingsSchema.safeParse(input);
		expect(result.success).toBe(false);
		expect(result.error.issues[0].path).toEqual(['head', 'style']);
	});
});

// Nothing validated `options` before 2026-09-02: modules checked their own
// slices and the keys the composition root reads went unchecked.
describe('optionsSchema', () => {
	const ok = (options) => optionsSchema.safeParse(options).success;

	it('accepts an empty object and the documented keys', () => {
		expect(ok({})).toBe(true);
		expect(ok({ verbose: true, multilingual: true, sitemap: false })).toBe(true);
		expect(ok({ navigator: { template: false, inspectorDepth: 3 } })).toBe(true);
	});

	it('rejects a wrong type on a key core acts on', () => {
		expect(ok({ verbose: 'yes' })).toBe(false);
		expect(ok({ sitemap: 'true' })).toBe(false);
	});

	// Loose at the top: the legacy aliases still arrive through the shim, and
	// head and assets are validated by the modules that own them.
	it('lets unknown top-level keys through', () => {
		expect(ok({ enableSitemapTemplate: true, assetsESBuild: {} })).toBe(true);
		expect(ok({ head: { titleSeparator: ' | ' }, assets: { esbuild: { minify: true } } })).toBe(true);
	});

	it('takes a media.image slice', () => {
		expect(ok({ media: { image: { widths: [320, 640], formats: ['webp'], sizes: '50vw' } } })).toBe(true);
		expect(ok({ media: { image: { widths: [320, 'auto'] } } })).toBe(true);
	});

	// Strict inside media, unlike head and assets: nothing here is forwarded to
	// a third party, so every key it takes is one Baseline reads. A misspelling
	// would otherwise do nothing, silently.
	it('catches a misspelled key inside media', () => {
		expect(ok({ media: { image: { width: [320] } } })).toBe(false);
		expect(ok({ media: { images: { widths: [320] } } })).toBe(false);
	});

	it('rejects the wrong shape for a width', () => {
		expect(ok({ media: { image: { widths: 320 } } })).toBe(false);
		expect(ok({ media: { image: { widths: ['big'] } } })).toBe(false);
		expect(ok({ media: { image: { sizes: 42 } } })).toBe(false);
	});
});

describe('settings.timeZone', () => {
	const parse = (timeZone) => settingsSchema.safeParse({ timeZone });

	it('takes an IANA name, an alias, and any casing', () => {
		expect(parse('Europe/Amsterdam').success).toBe(true);
		expect(parse('US/Eastern').success).toBe(true);
		expect(parse('europe/amsterdam').success).toBe(true);
	});

	// Not in `Intl.supportedValuesOf('timeZone')`, which is why validation
	// attempts the value rather than checking membership.
	it('takes UTC, which is the default', () => {
		expect(parse('UTC').success).toBe(true);
	});

	// `Intl` refuses `UTC+2` and, since ES2024, accepts `+02:00`. Both are
	// fixed offsets with no daylight saving, so the schema refuses them itself.
	it('refuses a fixed offset and a non-zone', () => {
		expect(parse('UTC+2').success).toBe(false);
		expect(parse('+02:00').success).toBe(false);
		expect(parse('+0200').success).toBe(false);
		expect(parse('Mars/Olympus').success).toBe(false);
	});

	it('is optional', () => {
		expect(settingsSchema.safeParse({}).success).toBe(true);
	});
});

describe('options.dates', () => {
	const parse = (dates) => optionsSchema.safeParse({ dates });

	it('takes front-matter keys and the derived sources', () => {
		expect(parse({ datePublished: ['pubDate', ':filename', ':default'] }).success).toBe(true);
		expect(parse({ dateModified: [':git-modified', ':datePublished'] }).success).toBe(true);
	});

	// Hugo's filesystem source is the first thing a migrating user reaches for,
	// so the message has to say why it does not exist here.
	it('refuses a filesystem source and says why', () => {
		const result = parse({ datePublished: [':fileModTime'] });

		expect(result.success).toBe(false);
		expect(result.error.issues[0].message).toContain('clone time');
	});

	it('refuses an unknown derived source', () => {
		expect(parse({ datePublished: [':nope'] }).success).toBe(false);
	});

	it('refuses a field it does not own', () => {
		expect(parse({ published: ['date'] }).success).toBe(false);
	});
});
