import path from "node:path";
import Image from "@11ty/eleventy-img";

const DEFAULT_WIDTHS = [320, 640, 960, 1280];
const DEFAULT_FORMATS = ["avif", "webp", "jpeg"];
const DEFAULT_SIZES = "(max-width: 768px) 100vw, 768px";
const DEFAULT_OUTPUT = {
	outputDir: "./dist/media/",
	urlPath: "/media/",
};

function pickRenditions(metadata) {
	// Use the first available format; first entry is smallest, last is largest.
	const firstFormat = Object.values(metadata)[0];
	const lowsrc = firstFormat?.[0];
	const highsrc = firstFormat?.[firstFormat.length - 1];
	return { lowsrc, highsrc };
}

/**
 * Responsive image shortcode using @11ty/eleventy-img.
 *
 * @param {Object} options
 * @param {string} options.src                          Required image source (local or remote).
 * @param {string} options.alt                          Required alt text (empty string allowed for decorative).
 * @param {string} [options.caption=""]                 Optional caption; enables figure wrapper when non-empty.
 * @param {("lazy"|"eager")} [options.loading="lazy"]   Loading behavior.
 * @param {string} [options.containerClass=""]          Class applied to <picture>.
 * @param {string} [options.imageClass=""]              Class applied to <img>.
 * @param {Array<number|string>} [options.widths=DEFAULT_WIDTHS]   Widths passed to eleventy-img.
 * @param {string} [options.sizes=DEFAULT_SIZES]        Sizes attribute used on sources.
 * @param {string[]} [options.formats=DEFAULT_FORMATS]  Output formats (order matters).
 * @param {string} [options.outputDir=DEFAULT_OUTPUT.outputDir] Output directory for generated assets.
 * @param {string} [options.urlPath=DEFAULT_OUTPUT.urlPath]       Public URL base for generated assets.
 * @param {Object} [options.attrs={}]                   Extra attributes applied to <img>; `class` merges with imageClass.
 * @param {boolean} [options.figure=true]               Wrap in <figure> when caption is provided.
 * @param {boolean} [options.setDimensions=true]        When false, omit width/height on <img>.
 */
export async function imageShortcode(options = {}) {
	const {
		src,
		alt,
		caption = "",
		loading = "lazy",
		containerClass = "",
		imageClass = "",
		widths = DEFAULT_WIDTHS,
		sizes = DEFAULT_SIZES,
		formats = DEFAULT_FORMATS,
		outputDir = DEFAULT_OUTPUT.outputDir,
		urlPath = DEFAULT_OUTPUT.urlPath,
		attrs = {},
		figure = true,
		setDimensions = true,
	} = options;

	if (!src) throw new Error("imageShortcode: src is required");
	if (alt === undefined) {
		throw new Error(
			"imageShortcode: alt is required (use empty string for decorative images)",
		);
	}

	const metadata = await Image(src, {
		widths: [...widths],
		formats: [...formats],
		outputDir,
		urlPath,
		filenameFormat(id, srcPath, width, format) {
			const extension = path.extname(srcPath);
			const name = path.basename(srcPath, extension);
			return `${name}-${width}w.${format}`;
		},
	});

	const { lowsrc, highsrc } = pickRenditions(metadata);
	if (!lowsrc || !highsrc) {
		throw new Error(`imageShortcode: no renditions produced for ${src}`);
	}

	const sourceTags = Object.values(metadata)
		.map((formatEntries) => {
			const type = formatEntries[0].sourceType;
			const srcset = formatEntries.map((entry) => entry.srcset).join(", ");
			return `<source type="${type}" srcset="${srcset}" sizes="${sizes}">`;
		})
		.join("\n");

	const { class: attrClass, ...restAttrs } = attrs;
	const combinedClass = [imageClass, attrClass].filter(Boolean).join(" ").trim() || undefined;

	const imageAttributes = {
		src: lowsrc.url,
		alt,
		loading,
		decoding: loading === "eager" ? "sync" : "async",
		class: combinedClass,
		...(setDimensions ? { width: highsrc.width, height: highsrc.height } : {}),
		...restAttrs,
	};

	const imgAttrString = Object.entries(imageAttributes)
		.filter(([, value]) => value !== undefined && value !== null && value !== "")
		.map(([key, value]) => `${key}="${value}"`)
		.join(" ");

	const pictureClass = containerClass && containerClass.trim() ? ` class="${containerClass.trim()}"` : "";

	const picture = `<picture${pictureClass}>
	${sourceTags}
	<img ${imgAttrString}>
</picture>`;

	if (!figure || !caption) return picture;

	return `<figure>
	${picture}
	<figcaption>${caption}</figcaption>
</figure>`;
}
