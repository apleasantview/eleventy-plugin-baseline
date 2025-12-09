# Eleventy Baseline

_An experimental Swiss army knife for Eleventy._

Eleventy Baseline is a lightweight toolkit that collects small but useful patterns for everyday Eleventy development. It explores what a minimal, optional “core” for Eleventy could look like without becoming a framework or theme.

This is a practical, evolving baseline.  
Things might shift, break, or get renamed as the project evolves.

## Current Features

- Debugging helpers (filter, Nunjucks globals)
- Markdown parsing filter
- Related-posts filter
- CSS processing with PostCSS + minification
- Filter to inline processed CSS directly into templates
- JS bundling with esbuild
- Filter to inline bundled JS where needed
- Image handling via eleventy-img with a custom shortcode
- Head/meta injection via PostHTML with `<baseline-head>` (defaults for meta/assets/basic SEO)

## Planned / Exploratory Features

- Directory-based multilingual support
- Expanded head/SEO helpers (canonical image defaults, JSON-LD presets)
- SEO helpers (JSON-LD, canonical URLs, sitemaps)

The long-term goal is to offer just enough structure and tooling to start a new Eleventy site quickly, while respecting Eleventy’s deliberately unopinionated nature.

## Usage

There’s no npm package yet. To try it locally:

```bash
git clone https://github.com/apleasantview/eleventy-baseline
cd eleventy-baseline
npm install
npm run dev
```

Expect sharp edges. This repo is still a sandbox.

## Who Might Enjoy This

- Developers curious about Eleventy internals
- Anyone wanting a ready-to-go baseline without adopting a framework
- People who believe Eleventy could benefit from a tiny, optional “starter core” of conventions

## Project Philosophy

This project asks a simple question:

> What if Eleventy had a minimal, optional layer of conventions — just enough to eliminate repetition, but not enough to feel restrictive?

Eleventy Baseline explores that idea through small, practical tools rather than sweeping abstractions.

## License

MIT.
