import * as esbuild from "esbuild";

const defaultOptions = { minify: true, target: "es2020" };

export default async function inlineESbuild(jsFilePath, options = {}) {
	const userOptions = { ...defaultOptions, ...options };

	try {
		let result = await esbuild.build({
			entryPoints: [jsFilePath],
			bundle: true,
			minify: userOptions.minify,
			target: userOptions.target,
			write: false
		});

		return `<script>${result.outputFiles[0].text}</script>`;
	} catch (error) {
		console.error(error);
		return `<script>/* Error processing JS */</script>`;
	}
}
