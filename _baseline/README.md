# Eleventy Baseline

_An experimental Swiss army knife for Eleventy._

Eleventy Baseline is a lightweight toolkit built around a simple question:

> What if Eleventy had a minimal, optional layer of conventions — just enough to eliminate repetition, but not enough to feel restrictive?

It explores what a "core" for Eleventy could look like without becoming a framework or theme — small, practical tools rather than sweeping abstractions. If you've ever started a new Eleventy project and found yourself copy-pasting the same asset pipeline, the same head template, the same image shortcode for the third time, this is for you.

This is a practical, evolving baseline. Things might shift, break, or get renamed as the project evolves.

## Install

If you already have Eleventy and eleventy-img installed:

```bash
npm install @apleasantview/eleventy-plugin-baseline
```

For a fresh project (install Eleventy and eleventy-img too):

```bash
npm install @11ty/eleventy @11ty/eleventy-img @apleasantview/eleventy-plugin-baseline
```

Requires Eleventy 3.x and Node >=20.

## Usage

In your Eleventy config (ESM):

```js
import baseline, { config as baselineConfig } from '@apleasantview/eleventy-plugin-baseline';

export default function (eleventyConfig) {
	eleventyConfig.addPlugin(baseline, {
		// verbose: false,
		// enableNavigatorTemplate: false,
		// enableSitemapTemplate: true,
	});
}

export const config = baselineConfig;
```

## What's included

When the plugin loads, you get core filters, Nunjucks globals, debugging utilities, and an image shortcode (via eleventy-img) out of the box. On top of that, the plugin is organized into opt-in modules — take what you need:

| Module | What it does |
|---|---|
| `assets-core` | Shared foundation for the asset pipeline |
| `assets-esbuild` | JS bundling via esbuild, with an inline injection filter for critical scripts |
| `assets-postcss` | CSS processing via PostCSS + cssnano, with an inline injection filter for critical styles |
| `head-core` | Drop `<baseline-head>` into your template and get sensible meta, canonical, og:image, and basic SEO defaults — processed by PostHTML at build time |
| `multilang-core` | Directory-based multilingual support: per-language collections, hreflang, sitemaps, and language normalization |
| `navigator-core` | Navigation tree helpers and a `_navigator` Nunjucks global |
| `sitemap-core` | XML sitemap generation with draft-page support |

## Docs

Full documentation — tutorials, how-to guides, and reference — lives at:
[https://eleventy-plugin-baseline.netlify.app/](https://eleventy-plugin-baseline.netlify.app/)

## Contributing

Opinions, issues, and pull requests are welcome. If something doesn't work as documented, or
you've found a pattern that fits the spirit of the project,
[open an issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues) and let's talk.
You can also find me on [Mastodon](https://mastodon.social/@crisverstraeten).

## License

MIT. See `LICENSE`.
