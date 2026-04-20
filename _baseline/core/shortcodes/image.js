import path from 'node:path';
import Image from '@11ty/eleventy-img';
import { createLogger } from '../logging.js';

// Module-level logger. Image shortcode only uses `.warn`, which emits regardless
// of verbose, so we don't thread verbose through the shortcode signature.
const log = createLogger('image');

const DEFAULT_WIDTHS = [320, 640, 960, 1280, 1920, 'auto'];
const DEFAULT_FORMATS = ['avif', 'webp'];
const DEFAULT_SIZES = '(max-width: 768px) 100vw, 768px';

/**
 * Pick the smallest and largest rendition from eleventy-img metadata.
 * Uses the first available format; entries are ordered smallest → largest.
 * @param {Object} metadata - eleventy-img metadata keyed by format.
 * @returns {{lowsrc: Object, highsrc: Object}} Smallest and largest rendition.
 */
function pickRenditions(metadata) {
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
 * @param {string} [options.outputDir]                  Output directory for generated assets.
 * @param {string} [options.urlPath="/media/"]          Public URL base for generated assets.
 * @param {Object} [options.attrs={}]                   Extra attributes applied to <img>; `class` merges with imageClass.
 * @param {string} [options.style]                      Inline style applied to <img>. Separate from attrs.style — if both are passed, attrs.style takes precedence via restAttrs spread.
 * @param {boolean} [options.figure=true]               Wrap in <figure> when caption is provided.
 * @param {boolean} [options.setDimensions=true]        When false, omit width/height on <img>.
 */
export async function imageShortcode(options = {}) {
	const outputBase = this?.eleventy?.directories?.output || 'dist';
	const {
		src,
		alt,
		caption = '',
		loading = 'lazy',
		containerClass = '',
		imageClass = '',
		style,
		widths = DEFAULT_WIDTHS,
		sizes = DEFAULT_SIZES,
		formats = DEFAULT_FORMATS,
		outputDir = path.join('.', outputBase, 'media'),
		urlPath = '/media/',
		attrs = {},
		figure = true,
		setDimensions = true
	} = options;
	// Read from global data set during plugin init. When true, `eleventy:ignore`
	// is added to the <img> (line 140) to prevent double-processing.
	const hasImageTransformPlugin = this.ctx._baseline.hasImageTransformPlugin;

	// --- Validation and normalization ---

	if (!src) throw new Error(`imageShortcode: src is required (received ${JSON.stringify(src)})`);
	if (alt == null) {
		log.warn('alt is required (use empty string for decorative images)');
	}

	const normalizedCaption = String(caption);
	const normalizedAlt = alt == null ? '' : String(alt);

	const inputDir = this?.eleventy?.directories?.input;
	const isRemote = /^https?:\/\//i.test(src);
	// Note: remote URLs rely on eleventy-img's built-in fetch — no timeout/retry control at shortcode level.
	const resolvedSrc = !isRemote && inputDir ? path.join(inputDir, src.replace(/^\//, '')) : src;

	const imageOptions = {
		widths: [...widths],
		formats: [...formats],
		outputDir,
		urlPath,
		filenameFormat(id, srcPath, width, format) {
			const extension = path.extname(srcPath);
			const name = path.basename(srcPath, extension);
			return `${name}-${id.slice(0, 6)}-${width}w.${format}`;
		}
	};

	// --- Image processing ---
	// In serve mode, `transformOnRequest` defers processing to first browser request
	// for faster dev startup. If it fails, retry without it — this is an edge case
	// but one that has bitten in practice. In build mode, errors surface immediately.

	let metadata;
	try {
		metadata = await Image(resolvedSrc, {
			transformOnRequest: process.env.ELEVENTY_RUN_MODE === 'serve',
			...imageOptions
		});
	} catch (error) {
		if (process.env.ELEVENTY_RUN_MODE === 'serve') {
			log.warn(`transformOnRequest failed for ${src}, retrying.\n > ${error?.message || error}`);
			metadata = await Image(resolvedSrc, imageOptions);
		} else {
			throw error;
		}
	}

	const { lowsrc, highsrc } = pickRenditions(metadata);
	if (!lowsrc || !highsrc) {
		throw new Error(`imageShortcode: no renditions produced for ${src}`);
	}

	// --- HTML assembly ---
	// One <source> per format, each carrying the full srcset for that format.
	const sourceTags = Object.values(metadata)
		.map((formatEntries) => {
			const type = formatEntries[0].sourceType;
			const srcset = formatEntries.map((entry) => entry.srcset).join(', ');
			return `<source type="${type}" srcset="${srcset}" sizes="${sizes}">`;
		})
		.join('\n');

	// Pull `class` out of attrs so it can merge with imageClass. Remaining attrs
	// and `eleventy:ignore` (if needed) are spread onto imageAttributes below.
	const { class: attrClass, ...restAttrs } = attrs;
	const combinedClass = [imageClass, attrClass].filter(Boolean).join(' ').trim() || undefined;

	const imageAttributes = {
		src: lowsrc.url,
		alt: normalizedAlt,
		loading,
		decoding: loading === 'eager' ? 'sync' : 'async',
		class: combinedClass,
		style,
		...(setDimensions ? { width: highsrc.width, height: highsrc.height } : {}),
		...restAttrs,
		...(hasImageTransformPlugin ? { 'eleventy:ignore': true } : {})
	};

	// Build the attribute string, dropping any empty/null values to keep output clean.
	const imgAttrString = Object.entries(imageAttributes)
		.filter(([, value]) => value !== undefined && value !== null && value !== '')
		.map(([key, value]) => (value === true ? key : `${key}="${value}"`))
		.join(' ');

	const pictureClass = containerClass && containerClass.trim() ? ` class="${containerClass.trim()}"` : '';

	const picture = `<picture${pictureClass}>
${sourceTags}
<img ${imgAttrString}>
</picture>`;

	if (!figure || !normalizedCaption) return picture;

	return `<figure>
${picture}
<figcaption>${normalizedCaption}</figcaption>
</figure>`;
}
