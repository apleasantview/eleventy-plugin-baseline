# Eleventy Plugin Baseline

An experimental Swiss army knife toolkit for Eleventy. Bundles handy helpers for assets, head/meta, navigation, sitemaps, debugging, and more — without turning into a full theme.

## Install

If you already have Eleventy installed:
```bash
npm install @apleasantview/eleventy-plugin-baseline
```

For a fresh project (install Eleventy too):
```bash
npm install @11ty/eleventy @apleasantview/eleventy-plugin-baseline
```

## Usage

In your Eleventy config (ESM):

```js
import baseline from "eleventy-plugin-baseline";

export default function (eleventyConfig) {
	eleventyConfig.addPlugin(baseline, {
		// verbose: false,
		// enableNavigatorTemplate: false,
		// enableSitemapTemplate: true,
	});
}
```

Requires Eleventy 3.x. Additional peers you may need: `@11ty/eleventy-img`.

## License

MIT. See `LICENSE`.
