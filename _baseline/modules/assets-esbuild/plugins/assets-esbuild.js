import path from "node:path";
import * as esbuild from "esbuild";
import { resolveAssetsDir } from "../../../helpers.js";
import inlineESbuild from "../filters/inline-esbuild.js";

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function assetsESBuild(eleventyConfig) {
	const { assetsDir } = resolveAssetsDir(
		eleventyConfig.dir?.input || "./",
		eleventyConfig.dir?.output || "./",
		eleventyConfig.dir?.assets || "assets"
	);
	const jsDir = `${assetsDir}js/`;
	
	eleventyConfig.addTemplateFormats("js");

	eleventyConfig.addExtension("js", {
		outputFileExtension: "js",
		useLayouts: false,
		compile: async function (_inputContent, inputPath) {
			if (inputPath.includes('11tydata.js') || !inputPath.startsWith(jsDir) || path.basename(inputPath) !== "index.js") {
				return;
			}

			return async () => {
				let result = await esbuild.build({
					entryPoints: [inputPath],
					bundle: true,
					minify: true,
					target: "es2020",
					write: false
				});

				return result.outputFiles[0].text;
			}
		}
	});

	// Filter to inline a bundled entry.
	eleventyConfig.addFilter("inlineESbuild", inlineESbuild);

	// Override the default collection behavior. Adding js as template format and extension collects 11tydata.js files.
	eleventyConfig.addCollection("all", function (collectionApi) {
		return collectionApi.getAll().filter(item => {
			// Skip 11tydata.js files
			if (item.inputPath.endsWith('11tydata.js')) {
				return false;
			}
			return true;
		});
	});
};
