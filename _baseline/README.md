# Eleventy Baseline

Baseline makes the structural decisions that Eleventy leaves open: directory layout, asset pipeline, image handling, SEO, sitemaps.

If you've started a new Eleventy project and found yourself wiring up the same things for the third time, this is for you. Directory structure, template engine, image formats, meta tags, asset bundling, sitemap — decisions that are individually small but collectively slow you down. Baseline makes them together, so they fit together. You get to skip the setup and start building.

You still own your site. Baseline handles the infrastructure — the parts that have well-tested answers. Your design, your content, the things that make your site yours — those stay yours.

This is a working plugin, not a finished product. Things might shift, break, or get renamed.

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

Add the plugin and re-export the config. The config export sets the directory structure (`src/`, `dist/`, `_includes/`, `_data/`) so Eleventy and Baseline agree on where things live.

```js
import baseline, { config as baselineConfig } from '@apleasantview/eleventy-plugin-baseline';

export default function (eleventyConfig) {
	eleventyConfig.addPlugin(baseline);
}

export const config = baselineConfig;
```

Options, if you need them:

```js
eleventyConfig.addPlugin(baseline, {
	verbose: false, // extra logging during builds
	enableNavigatorTemplate: false, // debug page for inspecting template data
	enableSitemapTemplate: true // XML sitemap generation
});
```

## What's included

The plugin registers everything on load. No setup beyond the config above.

**Core** — always active:

- An image shortcode (via eleventy-img) — AVIF and WebP, responsive widths, lazy loading. Alt text is required — the build warns if you skip it.
- Filters: `markdownify`, `relatedPosts`, `isString`
- A date-formatting global
- Debug filters (`_inspect`, `_json`, `_keys`) for template development, handy when you need them
- Drafts preprocessor — drafts stay out of production builds automatically
- Static passthrough (`src/static/` → site root)

**Modules** — opt-in, loaded individually:

| Module           | What it does                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets-core`    | The asset pipeline. One entry point per directory (`index.css`, `index.js`). Inline filters (`inlinePostCSS`, `inlineESbuild`) for critical path assets |
| `assets-esbuild` | JS bundling via esbuild. Minified, ES2020 target                                                                                                        |
| `assets-postcss` | CSS processing via PostCSS. Ships a fallback config if you don't have one                                                                               |
| `head-core`      | `<head>` tags (meta, canonical, Open Graph, title) handled for you by dropping `<baseline-head>` in your layout                                         |
| `multilang-core` | Directory-based multilingual support. Per-language collections, translation mapping, i18n filters. Wraps Eleventy's I18n plugin                         |
| `navigator-core` | Debug tooling. `_navigator` and `_context` globals for inspecting template data. Optional virtual debug page                                            |
| `sitemap-core`   | XML sitemap. Every page is included unless you exclude it. Multilingual sites get per-language sitemaps plus an index                                   |

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
