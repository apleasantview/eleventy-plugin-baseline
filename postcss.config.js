import postcssImportExtGlob from "postcss-import-ext-glob";
import postcssImport from "postcss-import";
import postcssPresetEnv from "postcss-preset-env";
import cssnano from "cssnano";

const isProd = process.env.ELEVENTY_ENV === "production";

const plugins = [
	postcssImportExtGlob(),
	postcssImport(),
	postcssPresetEnv({
		"browsers": [
			"> 0.2% and not dead"
		],
		preserve: true,
	}),
];

if (isProd) {
	plugins.push(cssnano({ preset: "default" }));
}

const config = {
	map: isProd ? false : { inline: true },
	plugins,
};

export default config;
