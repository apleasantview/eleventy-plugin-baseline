import path from "node:path";
import Image from "@11ty/eleventy-img";

export async function imageShortcode(
	src,
	alt = "",
	caption = "",
	loading = "lazy",
	containerClass = "",
	imageClass = "",
	widths = [150, 300, 768, 1024, "auto"],
	sizes,
	formats = ["avif", "webp", "auto"]) {
	let metadata = await Image(src, {
		widths: [...widths],
		formats: [...formats],
		outputDir: "./dist/uploads/",
		urlPath: "/uploads/",
		filenameFormat: function (id, src, width, format, options) {
			const extension = path.extname(src);
			const name = path.basename(src, extension);
			return `${name}-${width}w.${format}`;
		}
	});

	// Get smallest and biggest image sizes based on extension.
	let extension = path.extname(src).slice(1);
	let lowsrc, highsrc;

	if (extension === "jpg") {
		lowsrc = metadata.jpeg[0];
		highsrc = metadata.jpeg[metadata.jpeg.length - 1];
	} else {
		lowsrc = metadata.png[0];
		highsrc = metadata.png[metadata.png.length - 1];
	}

	// Set sizes if not defined or empty.
	if (!sizes || sizes.trim() === "") {
		sizes = `(max-width: ${highsrc.width}px) 100vw, ${highsrc.width}px`;
}

let imageAttributes = {
	src: lowsrc.url,
	width: highsrc.width,
	height: highsrc.height,
	alt,
	loading,
	decoding: loading === "eager" ? "sync" : "async",
};

let imageSources = Object.values(metadata)
	.map((imageFormat) => {
		return `  <source type="${
			imageFormat[0].sourceType
		}" srcset="${imageFormat
			.map((entry) => entry.srcset)
			.join(", ")}" sizes="${sizes}">`;
	})
	.join("\n");

	let imageOutput = `<picture class="${containerClass}">
		${imageSources}
		<img
			src="${imageAttributes.src}"
			width="${imageAttributes.width}"
			height="${imageAttributes.height}"
			alt="${imageAttributes.alt}"
			loading="${imageAttributes.loading}"
			decoding="${imageAttributes.decoding}"
			class="${imageClass}">
	</picture>`;

	let figureOutput = `<figure>
		${imageOutput}
		<figcaption>${caption}</figcaption>
	</figure>`;

	return caption ? figureOutput : imageOutput;
};
