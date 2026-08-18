import postcssImportExtGlob from 'postcss-import-ext-glob';
import postcssImport from 'postcss-import';
import postcssPresetEnv from 'postcss-preset-env';
import cssnano from 'cssnano'; // Import cssnano for minification

/**
 * Build the bundled fallback PostCSS config.
 *
 * Built on call rather than on import: `ELEVENTY_ENV` comes from the consuming
 * project's environment, which is not loaded yet when this module is imported.
 *
 * @returns {{ map: boolean, plugins: import('postcss').AcceptedPlugin[] }}
 */
export default function buildFallbackPostCSSConfig() {
	const isProd = process.env.ELEVENTY_ENV === 'production';
	const plugins = [
		postcssImportExtGlob,
		postcssImport,
		postcssPresetEnv({
			browsers: ['baseline widely available with downstream'],
			preserve: true
		})
	];

	if (isProd) {
		plugins.push(cssnano);
	}

	return {
		map: !isProd,
		plugins
	};
}
