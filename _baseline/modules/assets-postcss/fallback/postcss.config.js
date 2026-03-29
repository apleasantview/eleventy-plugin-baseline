import postcssImportExtGlob from 'postcss-import-ext-glob';
import postcssImport from 'postcss-import';
import postcssPresetEnv from 'postcss-preset-env';
import cssnano from 'cssnano'; // Import cssnano for minification

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

const config = {
	map: !isProd,
	plugins
};

export default config;
