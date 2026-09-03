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
/**
 * Resolve `settings.url` to an absolute http(s) origin, or nothing.
 *
 * Consumers guard on presence rather than validity, so a relative value like
 * `/` passes every check and reaches the schema graph as a relative `@id`.
 * Dropping it here makes the malformed case behave like the absent one.
 *
 * @param {unknown} url - User-supplied `settings.url`.
 * @returns {string | undefined} Absolute href, or undefined if unusable.
 */
// Image defaults live here rather than in the shortcode, because this file is
// where every other default is applied. Cheap and safe: no `'auto'` width, which
// re-encodes the full-size original.
//
// `jpeg` is last in IMAGE_FORMATS and costs a third encode per width. It buys
// the one thing avif and webp cannot: a format every client can read. Without
// it the `<img>` fallback is a webp, so a client that took the fallback because
// it understood neither `<source>` was handed a third format it also may not
// understand. Order is `<source>` negotiation order, so nothing reaches jpeg
// that could use something better.
//
// IMAGE_SIZES is a fallback rather than a chosen value. The shortcode puts
// `auto` in front of it on lazy images, so it is only read where `auto` cannot
// resolve, and there a bounded guess beats `100vw`, which would send every such
// browser after the largest candidate under the viewport. The number itself is
// inherited and unexamined; nothing should present it as a considered default.
const IMAGE_WIDTHS = [320, 640, 960, 1280, 1920];
const IMAGE_FORMATS = ['avif', 'webp', 'jpeg'];
const IMAGE_SIZES = '(max-width: 768px) 100vw, 768px';

function resolveSiteUrl(url) {
	if (typeof url !== 'string') return undefined;

	try {
		const { protocol } = new URL(url);
		// Returned as authored, not as `parsed.href`: the docs ask for an origin
		// with no trailing slash, and normalising would quietly overrule that.
		return protocol === 'http:' || protocol === 'https:' ? url : undefined;
	} catch {
		return undefined;
	}
}

export function deriveBaselineState(settings, options, { mode } = {}) {
	const isDev = mode === 'development';

	const resolvedSettings = {
		title: settings.title,
		tagline: settings.tagline,
		description: settings.description,
		url: resolveSiteUrl(settings.url),
		noindex: settings.noindex ?? false,
		defaultLanguage: settings.defaultLanguage,
		defaultLocale: settings.defaultLocale,
		languages: settings.languages,
		head: settings.head,
		seo: settings.seo
	};

	const resolvedOptions = {
		// Quiet by default: the banner, the version line and one module summary,
		// and nothing else. `verbose: true` opts into the full narrative.
		verbose: options.verbose ?? false,
		// `verbose: false` is a stronger statement than saying nothing. Absent
		// means "the default is fine"; an explicit false means "be quiet", and
		// that includes the three lines the default still prints.
		silent: options.verbose === false,
		multilang: options.multilingual ?? false,
		sitemap: options.sitemap ?? options.enableSitemapTemplate ?? true,
		navigator: options.navigator ?? options.enableNavigatorTemplate ?? isDev,
		head: {
			titleSeparator: options.head?.titleSeparator,
			showGenerator: options.head?.showGenerator
		},
		assets: {
			esbuild: options.assets?.esbuild ?? options.assetsESBuild ?? {}
		},
		media: {
			image: {
				widths: options.media?.image?.widths ?? IMAGE_WIDTHS,
				formats: options.media?.image?.formats ?? IMAGE_FORMATS,
				sizes: options.media?.image?.sizes ?? IMAGE_SIZES,
				// `auto` is prepended to Baseline's own guess and never to an answer
				// somebody gave. Resolution happens here, so the fact that it was a
				// guess has to travel with the value rather than be deduced later.
				sizesAuthored: options.media?.image?.sizes !== undefined
			}
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
