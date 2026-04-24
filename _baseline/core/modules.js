// Eleventy plugins
import { EleventyHtmlBasePlugin } from '@11ty/eleventy';

// Custom plugins
import multilangCore from '../modules/multilang-core/index.js';
import navigatorCore from '../modules/navigator-core/index.js';
import assetsCore from '../modules/assets-core/index.js';
import headCore from '../modules/head-core/index.js';
import sitemapCore from '../modules/sitemap-core/index.js';

export default {
	EleventyHtmlBasePlugin,
	multilangCore,
	navigatorCore,
	assetsCore,
	headCore,
	sitemapCore
};
