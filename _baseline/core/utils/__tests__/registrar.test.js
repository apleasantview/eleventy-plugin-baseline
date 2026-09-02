import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createRegistrar } from '../registrar.js';

// Real UserConfig, because the whole point is what Eleventy's registry holds.
const require = createRequire(import.meta.url);
const eleventySrc = path.dirname(require.resolve('@11ty/eleventy'));
const { default: UserConfig } = await import(pathToFileURL(path.join(eleventySrc, 'UserConfig.js')).href);

describe('createRegistrar', () => {
	it('registers a name nobody has taken', () => {
		const config = new UserConfig();
		createRegistrar(config).shortcode('image', () => 'baseline');

		expect(config.universal.shortcodes.image()).toBe('baseline');
	});

	// The eleventy-excellent case: the project has its own `image`, and until
	// now Baseline overwrote it with no visible warning.
	it('leaves the project its own shortcode, and reports the name', () => {
		const config = new UserConfig();
		config.addShortcode('image', () => 'theirs');

		const registrar = createRegistrar(config);
		registrar.shortcode('image', () => 'baseline');

		expect(config.universal.shortcodes.image()).toBe('theirs');
		expect(registrar.skipped).toEqual(['image']);
	});

	it('does the same for filters, and keeps the rest', () => {
		const config = new UserConfig();
		config.addFilter('markdownify', () => 'theirs');

		const registrar = createRegistrar(config);
		registrar.filter('markdownify', () => 'baseline');
		registrar.filter('isString', () => 'baseline');

		expect(config.universal.filters.markdownify()).toBe('theirs');
		expect(config.universal.filters.isString()).toBe('baseline');
		expect(registrar.skipped).toEqual(['markdownify']);
	});

	// If `universal` moves upstream, nothing reads as taken and every
	// registration goes through, which is the behaviour we had before.
	it('registers everything when the registry cannot be read', () => {
		const calls = [];
		const registrar = createRegistrar({ addFilter: (name) => calls.push(name) });
		registrar.filter('markdownify', () => {});

		expect(calls).toEqual(['markdownify']);
		expect(registrar.skipped).toEqual([]);
	});
});
