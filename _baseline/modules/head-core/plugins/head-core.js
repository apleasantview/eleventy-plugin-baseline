import headElements from "../lib/posthtml-head-elements.js";
import { getVerbose, logIfVerbose } from "../../../helpers.js";
import { defaultHead, buildHeadSpec } from "../utils/head-utils.js";

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function headCore(eleventyConfig, options = {}) {
	const userKey = options.dirKey || "head";
	const headElementsTag = options.headElementsTag || "posthtml-head-elements";
	const verbose = getVerbose(eleventyConfig) || options.verbose || false;
	const eol = options.EOL || "\n";

	let cachedContentMap = {};
	eleventyConfig.on("eleventy.contentMap", ({ inputPathToUrl, urlToInputPath }) => {
		cachedContentMap = { inputPathToUrl, urlToInputPath };
	});

	eleventyConfig.addGlobalData("eleventyComputed.page.head", () => {
		return (data) => defaultHead(data, userKey);
	});

	eleventyConfig.htmlTransformer.addPosthtmlPlugin("html", function (context) {
		const headElementsSpec = buildHeadSpec(context, cachedContentMap);

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

