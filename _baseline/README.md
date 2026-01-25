# Eleventy Plugin Baseline

An experimental Swiss army knife toolkit for Eleventy. Bundles handy helpers for assets, head/meta, navigation, sitemaps, debugging, and more — without turning into a full theme.

## Install

If you already have Eleventy and eleventy-img installed:

```bash
npm install @apleasantview/eleventy-plugin-baseline
```

For a fresh project (install Eleventy and eleventy-img too):

```bash
npm install @11ty/eleventy @11ty/eleventy-img @apleasantview/eleventy-plugin-baseline
```

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

Requires Eleventy 3.x.

## Docs

Documentation tracks latest builds:  
[https://eleventy-plugin-baseline.netlify.app/](https://eleventy-plugin-baseline.netlify.app/)

## License

MIT. See `LICENSE`.
