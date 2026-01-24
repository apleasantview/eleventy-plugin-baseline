import * as esbuild from 'esbuild';

const defaultOptions = { minify: true, target: 'es2020' };

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

		// Return raw JS; markup wrapping is handled by the plugin registration.
		return result.outputFiles[0].text;
	} catch (error) {
		console.error(error);
		// Surface a safe JS comment so the caller can decide how to wrap it.
		return '/* Error processing JS */';
	}
}
