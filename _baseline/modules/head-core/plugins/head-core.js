import headElements from "../lib/posthtml-head-elements.js";
import { getVerbose, logIfVerbose } from "../../../helpers.js";
import { buildHead } from "../utils/head-utils.js";

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function headCore(eleventyConfig, options = {}) {
	const userKey = options.dirKey || "head";
	const headElementsTag = options.headElementsTag || "baseline-head";
	const verbose = getVerbose(eleventyConfig) || options.verbose || false;
	const eol = options.EOL || "\n";
	const pathPrefix = options.pathPrefix ?? eleventyConfig?.pathPrefix ?? "";
	const siteUrl = options.siteUrl;

	let cachedContentMap = {};
	eleventyConfig.on("eleventy.contentMap", ({ inputPathToUrl, urlToInputPath }) => {
		cachedContentMap = { inputPathToUrl, urlToInputPath };
	});

	eleventyConfig.addGlobalData("eleventyComputed.page.head", () => {
		return (data) =>
			buildHead(data, {
				userKey,
				siteUrl,
				pathPrefix,
				contentMap: cachedContentMap,
				pageUrlOverride: data?.page?.url,
			});
	});

	eleventyConfig.htmlTransformer.addPosthtmlPlugin("html", function (context) {
		const headElementsSpec =
			context?.page?.head ||
			buildHead(context, {
				userKey,
				siteUrl,
				pathPrefix,
				contentMap: cachedContentMap,
				pageUrlOverride: context?.page?.url,
			});

		logIfVerbose(
			verbose,
			"head-core: injecting head elements for",
			context?.page?.inputPath || context?.outputPath
		);

		const plugin = headElements({
			headElements: headElementsSpec,
			headElementsTag,
			EOL: eol,
		});

		return async function asyncHead(tree) {
			return plugin(tree);
		};
	});
}
