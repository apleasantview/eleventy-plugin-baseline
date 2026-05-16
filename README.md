# Eleventy Baseline

Baseline makes the structural decisions that Eleventy leaves open: directory layout, asset pipeline, image handling, SEO, sitemaps.

If you've started a new Eleventy project and found yourself wiring up the same things for the third time, this is for you. Directory structure, template engine, image formats, meta tags, asset bundling, sitemap — decisions that are individually small but collectively slow you down. Baseline makes them together, so they fit together. You get to skip the setup and start building.

You still own your site. Baseline handles the infrastructure — the parts that have well-tested answers. Your design, your content, the things that make your site yours — those stay yours.

This is a working plugin, not a finished product. Things might shift, break, or get renamed.

## Who might enjoy this

- Developers who want a ready-to-go Eleventy setup without adopting a full framework
- Anyone tired of copying the same asset pipeline, head template, and image shortcode between projects
- People who want to understand the reasoning rather than blindly accept a default

## A note on this repository

The repo serves dual purposes. `_baseline/` is the plugin itself — what gets published to npm. `src/` is the documentation site, which is built with the plugin it documents. Every feature lives alongside a working example of that feature in production. It eats its own cooking.

```tree
/
├── _baseline/            # The plugin (published to npm)
├── src/                  # The docs site sources (built with the plugin)
└── eleventy.config.js    # Docs site config — wires the plugin in
```

## Install

```bash
npm install @11ty/eleventy @apleasantview/eleventy-plugin-baseline @11ty/eleventy-img
```

Requires Eleventy 3.x and Node >=20.

## Usage

Add the plugin and re-export the config. The config export sets the directory structure (`src/`, `dist/`, `_includes/`, `_data/`) so Eleventy and Baseline agree on where things live.

```js
import baseline, { config as baselineConfig } from '@apleasantview/eleventy-plugin-baseline';
import settings from './src/_data/settings.js';

export default async function (eleventyConfig) {
	await eleventyConfig.addPlugin(baseline(settings, {}));
}

export const config = baselineConfig;
```

`baseline()` returns an async closure (Eleventy's documented async-plugin pattern), so the call to `addPlugin` is awaited.

The plugin takes two arguments: `settings` (site identity — title, url, languages, head extras) and `options` (runtime behavior — verbose, sitemap, navigator).

```js
const settings = {
	title: 'My Site',
	tagline: 'Built with Baseline',
	url: 'https://www.example.com/',
	defaultLanguage: 'en',
	languages: {
		en: { title: 'My Site' },
		nl: { title: 'Mijn Site' }
	}
};

await eleventyConfig.addPlugin(
	baseline(settings, {
		verbose: true, // build-narrative logging (default: true)
		sitemap: true, // XML sitemap generation (default: true)
		navigator: false // debug page for inspecting template data (default: on in development)
	})
);
```

## What's included

The plugin registers everything on load. No setup beyond the config above.

**Core** — always active:

- An image shortcode (via eleventy-img) — AVIF and WebP, responsive widths, lazy loading. Alt text is required — the build warns if you skip it.
- Wikilinks in Markdown — `[[slug]]`, `[[slug:lang]]`, `[[slug#anchor]]`, `[[slug|alias]]`, combinable. Forward links only.
- Filters: `markdownify`, `relatedPosts`, `isString`
- A date-formatting global
- Drafts preprocessor — drafts stay out of production builds automatically
- Static passthrough (`src/static/` → site root)

**Modules** — `head` and `assets` are always on; `sitemap` is on by default; `navigator` is on in development; `multilang` is opt-in.

| Module      | What it does                                                                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assets`    | The asset pipeline. One entry point per directory (`index.css`, `index.js`). Bundles JS via esbuild and processes CSS via PostCSS. Inline filters (`inlinePostCSS`, `inlineESbuild`) for critical-path assets |
| `head`      | `<head>` tags (charset, viewport, title, description, robots, canonical, hreflang) handled for you by dropping `<baseline-head>` in your layout                                                               |
| `multilang` | Directory-based multilingual support. Per-language collections, translation mapping, i18n filters. Wraps Eleventy's I18n plugin                                                                               |
| `navigator` | Debug tooling. Globals for inspecting template data, plus debug filters (`_inspect`, `_json`, `_keys`). Optional virtual debug page                                                                           |
| `sitemap`   | XML sitemap. Every page is included unless you exclude it. Multilingual sites get per-language sitemaps plus an index                                                                                         |

## Docs

Full documentation — tutorials, how-to guides, and reference — lives at:
[https://www.eleventy-baseline.dev/](https://www.eleventy-baseline.dev/)

Documentation tracks latest builds and is itself built with this plugin.

## Architecture

The plugin source lives under `_baseline/` while a full Eleventy documentation site lives at the
project root and under `src/`. Both share the same `package.json` and `node_modules`.

```tree
/
├── _baseline/                    # The plugin package (what gets published to npm)
│   ├── index.js                  # Plugin entry point (composition root)
│   ├── modules.js                # Barrel re-export of the five module functions
│   ├── core/                     # Substrate: state, runtime, surface, helpers
│   │   ├── state.js              # Settings/options → frozen state derivation
│   │   ├── schema.js             # Zod schemas for settings/config
│   │   ├── types.js              # Shared JSDoc typedefs
│   │   ├── registry.js           # Per-config scoped state primitive
│   │   ├── virtual-dir.js        # Synthesised dir keys (assets, public)
│   │   ├── content-map-store.js  # Eleventy contentMap accessor
│   │   ├── translation-map-store.js
│   │   ├── slug-index.js         # Default-language slug → url map (read by wikilinks)
│   │   ├── back-compat/          # Legacy single-object plugin-arg shim
│   │   ├── logging/              # Namespaced logger, banner, pre-pass quips
│   │   ├── markdown/             # Markdown substrate: auto-heading-ids, wikilinks, attrs, markdownify, safeUse
│   │   ├── page-context/         # Per-page normalised context registry
│   │   ├── content-graph/        # Pre-pass substrate (extractors, graph, prepass, backlinks)
│   │   ├── surface/              # Public-registration surface: filters, image shortcode, date global
│   │   └── utils/                # Small focused helpers (one per file)
│   └── modules/                  # Feature modules
│       ├── assets/               # Asset pipeline (esbuild + PostCSS)
│       ├── head/                 # <head> injection via PostHTML
│       ├── multilang/            # Multilingual support, hreflang, i18n filters
│       ├── navigator/            # Runtime-introspection page and public read surface
│       └── sitemap/              # Sitemap generation
│
├── src/                          # Documentation website sources
│   ├── _data/                    # Global site data
│   ├── _includes/                # Nunjucks layouts and components
│   ├── assets/                   # CSS, JS, media for docs site
│   ├── content/                  # Markdown documentation pages
│   │   ├── en/                   # English content
│   │   ├── nl/                   # Dutch content
│   │   └── fr/                   # French content
│   └── static/                   # Static passthrough assets
│
├── packages/                     # Local npm tarballs for testing pre-release builds
├── dist/                         # Built site output (Eleventy output dir)
├── eleventy.config.js            # Docs site Eleventy config
├── postcss.config.js             # PostCSS config
├── netlify.toml                  # Netlify deployment config
└── package.json                  # Root workspace config (docs site)
```

## Contributing

This is currently a solo project in active exploration — opinions, issues, and pull requests are welcome.
If something doesn't work as documented, or you've found a pattern that fits the spirit of the
project, [open an issue](https://github.com/apleasantview/eleventy-plugin-baseline/issues) and let's talk.
You can also find me on [Mastodon](https://mastodon.social/@crisverstraeten).

## License

MIT.
