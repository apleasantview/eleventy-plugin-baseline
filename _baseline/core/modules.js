// Eleventy plugins
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";

// Custom plugins
import navigatorCore from "../modules/navigator-core/plugins/navigator-core.js";
import assetsCore from "../modules/assets-core/plugins/assets-core.js";
import assetsPostCSS from "../modules/assets-postcss/plugins/assets-postcss.js";
import assetsESBuild from "../modules/assets-esbuild/plugins/assets-esbuild.js";
import headCore from "../modules/head-core/plugins/head-core.js";
import sitemapCore from "../modules/sitemap-core/plugins/sitemap-core.js";
import featureI18n from "../modules/feature-i18n/plugins/feature-i18n.js";

export default {
	EleventyHtmlBasePlugin,
	featureI18n,
	navigatorCore,
	assetsCore,
	assetsPostCSS,
	assetsESBuild,
	headCore,
	sitemapCore
};
