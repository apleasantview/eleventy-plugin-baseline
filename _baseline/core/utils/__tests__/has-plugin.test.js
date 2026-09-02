import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { HtmlBasePlugin } from '@11ty/eleventy';
import { eleventyImageTransformPlugin } from '@11ty/eleventy-img';
import { describe, expect, it } from 'vitest';
import { hasAnyPlugin } from '../has-plugin.js';

// UserConfig is not in Eleventy's package exports, so reach it by path. Worth
// the reach: these run against the real matcher, not a restatement of the rule.
const require = createRequire(import.meta.url);
const eleventySrc = path.dirname(require.resolve('@11ty/eleventy'));
const { default: UserConfig } = await import(pathToFileURL(path.join(eleventySrc, 'UserConfig.js')).href);

describe('hasAnyPlugin', () => {
	// The reason the helper exists: the name everyone imports is not the name
	// Eleventy can see.
	it('finds the image transform plugin, which its documented name does not', () => {
		const config = new UserConfig();
		config.addPlugin(eleventyImageTransformPlugin);

		expect(config.hasPlugin('eleventyImageTransformPlugin')).toBe(false);
		expect(hasAnyPlugin(config, ['eleventyImageTransformPlugin', 'imageTransformPlugin'])).toBe(true);
	});

	it('stays false when the plugin is not registered', () => {
		const config = new UserConfig();

		expect(hasAnyPlugin(config, ['eleventyImageTransformPlugin', 'imageTransformPlugin'])).toBe(false);
	});

	// Config-file order does not matter: the queue is complete before any
	// plugin body runs, so reading the flag from inside one sees a later line.
	it('sees a plugin registered after the caller', () => {
		const config = new UserConfig();
		function baseline() {}
		config.addPlugin(baseline);
		config.addPlugin(eleventyImageTransformPlugin);

		expect(hasAnyPlugin(config, ['imageTransformPlugin'])).toBe(true);
	});

	it('takes an empty list, and a config that cannot answer', () => {
		expect(hasAnyPlugin(new UserConfig(), [])).toBe(false);
		expect(hasAnyPlugin(undefined, ['anything'])).toBe(false);
		expect(hasAnyPlugin({}, ['anything'])).toBe(false);
	});
});

// The premise of the HtmlBasePlugin warning. If either stops holding, the
// warning goes wrong or silent.
describe('HtmlBasePlugin, as the composition root meets it', () => {
	it('answers to its package identity, which is what the warning asks for', () => {
		const config = new UserConfig();
		config.addPlugin(HtmlBasePlugin, { baseHref: '/mine/' });

		expect(hasAnyPlugin(config, ['@11ty/eleventy/html-base-plugin', 'eleventyHtmlBasePlugin'])).toBe(true);
	});

	// `unique` upstream, so a config-level registration beats Baseline's, which
	// is made from inside a plugin body.
	it('drops a second registration made during plugin execution', () => {
		const config = new UserConfig();
		config.addPlugin(HtmlBasePlugin, { baseHref: '/mine/' });

		config._enablePluginExecution();
		const queued = config.plugins.length;
		config.addPlugin(HtmlBasePlugin, { baseHref: 'https://www.example.com' });

		expect(config.plugins.length).toBe(queued);
	});
});
