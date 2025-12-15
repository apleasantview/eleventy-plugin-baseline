import path from "node:path";
import postcss from "postcss";
import postcssConfig from "../../../../postcss.config.js";
import inlinePostCSS from "../filters/inline-postcss.js";
import { resolveAssetsDir } from "../../../helpers.js";

/**
 * assets-postcss
 *
 * - Registers `css` as a template format and processes `index.css` entries under the resolved assets `css` dir with PostCSS.
 * - Registers `inlinePostCSS` filter to inline arbitrary CSS by processing it with PostCSS.
 * - No module-specific options (inherits global Baseline verbose only).
 */
/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function assetsPostCSS(eleventyConfig) {
	const { assetsDir } = resolveAssetsDir(
		eleventyConfig.dir?.input || "./",
		eleventyConfig.dir?.output || "./",
		eleventyConfig.dir?.assets || "assets"
	);
	const cssDir = `${assetsDir}css/`;

	eleventyConfig.addTemplateFormats("css");

	eleventyConfig.addExtension("css", {
		outputFileExtension: "css",
		useLayouts: false,
		compile: async function (_inputContent, inputPath) {
			if (!inputPath.startsWith(cssDir) || path.basename(inputPath) !== "index.css") {
				return;
			}

			return async () => {
				let result = await postcss(postcssConfig.plugins).process(_inputContent, {
					from: inputPath,
					map: postcssConfig.map // Enable or disable source maps based on the parameter
				});

				return result.css;
			};
		}
	});

	// Filter to inline a bundled entry.
	eleventyConfig.addFilter("inlinePostCSS", inlinePostCSS);
};
