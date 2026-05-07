/**
 * State derivation (composition root helper)
 *
 * Pure normalisation of user-supplied `settings` and `options` into the
 * resolved `state` shape modules read from. No eleventyConfig, no
 * environment reads beyond the `mode` argument, no side effects.
 *
 * Architecture layer:
 *   composition root (pure helper)
 *
 * System role:
 *   The single place that applies defaults, fallbacks, and feature
 *   inference. Extracted from the entry point so it can be reasoned
 *   about — and tested — without booting Eleventy.
 *
 * Why this exists:
 *   Keeping defaults and feature derivation tangled with eleventyConfig
 *   wiring made the entry point hard to scan. Pulling the pure half out
 *   leaves the composition root as a list of registration steps.
 *
 * Scope:
 *   Owns settings/options normalisation and the derived `features` map.
 *   Does not own validation (see core/schema.js) or any runtime wiring.
 *
 * Data flow:
 *   settings + options + { mode } → { settings, options, features }
 *
 * @param {import('./types.js').BaselineSettings} settings
 * @param {import('./types.js').BaselineOptions} options
 * @param {{ mode?: string }} [env]
 * @returns {import('./types.js').BaselineState & { features: Readonly<Record<string, boolean>> }}
 */
export function deriveBaselineState(settings, options, { mode } = {}) {
	const isDev = mode === 'development';

	const resolvedSettings = {
		title: settings.title,
		tagline: settings.tagline,
		url: settings.url,
		noindex: settings.noindex ?? false,
		defaultLanguage: settings.defaultLanguage,
		languages: settings.languages,
		head: settings.head
	};

	const resolvedOptions = {
		verbose: options.verbose ?? false,
		multilang: options.multilingual ?? false,
		sitemap: options.sitemap ?? options.enableSitemapTemplate ?? true,
		navigator: options.navigator ?? options.enableNavigatorTemplate ?? isDev,
		head: {
			titleSeparator: options.head?.titleSeparator,
			showGenerator: options.head?.showGenerator
		},
		assets: {
			esbuild: options.assets?.esbuild ?? options.assetsESBuild ?? {}
		}
	};

	const features = Object.freeze({
		multilang: Boolean(resolvedOptions.multilang),
		sitemap: Boolean(resolvedOptions.sitemap),
		navigator: Boolean(resolvedOptions.navigator),
		head: true,
		assets: true
	});

	return Object.freeze({
		settings: Object.freeze(resolvedSettings),
		options: Object.freeze(resolvedOptions),
		features
	});
}
