import path from 'node:path';
import Image from '@11ty/eleventy-img';
import { createLogger } from '../logging/index.js';
import { renderAttributes } from '../utils/render-attributes.js';

// The `<img>` inside `<picture>` is what a client gets when it can use no
// `<source>` at all, so it wants the most compatible format rather than the
// first one the author listed. Same order and intent as eleventy-img's own
// LOWSRC_FORMAT_PREFERENCE.
const FALLBACK_FORMAT_PREFERENCE = ['jpeg', 'jpg', 'png', 'gif', 'svg', 'webp', 'avif'];

/**
 * Build the `sizes` attribute.
 *
 * A fixed `sizes` string is an assertion about a layout the shortcode cannot
 * see, and Baseline's own inherited WordPress's content width. `auto` replaces
 * that guess with the width the image is actually laid out at. It is valid on
 * `<source>` when a lazy `<img>` follows it, and browsers without it read past
 * it to the rest of the list, so nothing regresses.
 *
 * A `sizes` anyone authored is left alone, whether it arrived from the call site
 * or the project's options: the guess is Baseline's to improve, an answer is
 * not.
 *
 * @param {string} sizes - Resolved sizes value.
 * @param {boolean} authored - Whether somebody supplied it.
 * @param {string} loading - The `<img>` loading attribute.
 * @returns {string} Value for the `sizes` attribute.
 */
function buildSizes(sizes, authored, loading) {
	if (authored || loading !== 'lazy') return sizes;
	return `auto, ${sizes}`;
}

/**
 * Pick the rendition the `<img>` fallback is built from.
 *
 * Format is chosen by compatibility, not by author order. Within that format
 * the largest rendition wins, and one entry supplies both the `src` and the
 * intrinsic dimensions. The `<img>` carries no `srcset`, so `src` is not the
 * first of several candidates: it is the whole answer for anything reading the
 * markup without rendering it, which is who still reads that attribute.
 *
 * @param {Object} metadata - eleventy-img metadata keyed by format.
 * @returns {Object|undefined} Rendition for the `<img>`, or undefined if none.
 */
function pickFallback(metadata) {
	const preferred = FALLBACK_FORMAT_PREFERENCE.find((format) => metadata[format]?.length);
	// Nothing recognised: a single unusual format is still a fallback, and the
	// caller reports the empty case.
	const entries = metadata[preferred] ?? Object.values(metadata)[0];
	return entries?.[entries.length - 1];
}

/**
 * Build the `image` shortcode.
 *
 * A factory rather than a bare function so the composition root can hand it
 * what the plugin already knows: a logger that obeys the same tiers as every
 * other line, and whether the image transform plugin is registered. Both were
 * previously reached for at render time, the second through the page's own
 * data, which made the shortcode depend on a global data key being present.
 *
 * @param {Object} [context]
 * @param {import('../logging/index.js').BaselineLogger} [context.log] - Scoped logger.
 * @param {boolean} [context.hasImageTransformPlugin=false] - Marks output `eleventy:ignore` when true.
 * @param {Object} [context.defaults] - Resolved `options.media.image`; the fallback for every call.
 * @param {string} [context.cacheDir] - Write renditions here instead of the output directory. Set in build mode only; the composition root copies them into the output afterwards.
 * @returns {Function} The shortcode, bound to Eleventy's call context at render time.
 */
export function createImageShortcode({
	log = createLogger('image'),
	hasImageTransformPlugin = false,
	defaults = {},
	cacheDir
} = {}) {
	/**
	 * Responsive image shortcode using @11ty/eleventy-img.
	 *
	 * @param {Object} options
	 * @param {string} options.src                          Required image source (local or remote).
	 * @param {string} options.alt                          Required alt text (empty string allowed for decorative).
	 * @param {string} [options.caption=""]                 Caption text. When set, the output is wrapped in <figure>.
	 * @param {("lazy"|"eager")} [options.loading="lazy"]   Loading behavior.
	 * @param {Object} [options.img={}]                     Attributes for the <img> element.
	 * @param {Object} [options.picture={}]                 Attributes for the <picture> element.
	 * @param {Array<number|string>} [options.widths]       Widths passed to eleventy-img. Defaults to `options.media.image.widths`.
	 * @param {string} [options.sizes]                      Sizes attribute used on sources. Used verbatim; only Baseline's own guess gains `auto` on lazy images.
	 * @param {string[]} [options.formats]                  Output formats (order matters). Defaults to `options.media.image.formats`.
	 * @param {string} [options.outputDir]                  Output directory for generated assets.
	 * @param {string} [options.urlPath="/media/"]          Public URL base for generated assets.
	 * @param {boolean} [options.setDimensions=true]        When false, omit width/height on <img>.
	 */
	return async function imageShortcode(options = {}) {
		const outputBase = this?.eleventy?.directories?.output || 'dist';
		// A build is the only mode that writes renditions worth keeping: serve
		// hands them to the dev middleware and the pre-pass runs `statsOnly`.
		const useCache = Boolean(cacheDir) && process.env.ELEVENTY_RUN_MODE === 'build';
		const {
			src,
			alt,
			caption = '',
			loading = 'lazy',
			widths = defaults.widths,
			sizes = defaults.sizes,
			formats = defaults.formats,
			// The cache is Baseline's to redirect, an authored `outputDir` is not:
			// somebody who named a directory wants the files in it.
			outputDir = useCache ? cacheDir : path.join('.', outputBase, 'media'),
			urlPath = '/media/',
			setDimensions = true,
			img = {},
			picture = {}
		} = options;

		// --- Validation and normalization ---

		if (!src) throw new Error(`[baseline/image-shortcode] src is required (received ${JSON.stringify(src)})`);
		// Throwing rather than warning, the way eleventy-img does: a warning is
		// something you have to notice, and a missing alt ships either way.
		if (alt == null) {
			throw new Error(
				`[baseline/image-shortcode] alt is required for ${src} (use an empty string for decorative images)`
			);
		}

		const normalizedCaption = String(caption);
		const normalizedAlt = String(alt);

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
		// Two ways to skip the encode, and they are not interchangeable.
		// `transformOnRequest` is serve mode's: it also swaps the URL for the dev
		// middleware's `/.11ty/image/?src=…` form, which is the point there.
		// `statsOnly` skips the same work and keeps the real hashed URL, which is
		// what the pre-pass wants: it renders every page into a dryRun that writes
		// nothing, so encoding there means encoding each rendition twice per build,
		// while the markup it hands the graph should match the built site.
		const onRequest = process.env.ELEVENTY_RUN_MODE === 'serve';
		const statsOnly = process.env.BASELINE_PREPASS_ACTIVE === '1';

		let metadata;
		try {
			metadata = await Image(resolvedSrc, {
				transformOnRequest: onRequest,
				statsOnly,
				...imageOptions
			});
		} catch (error) {
			// Retry only where work was skipped, and name the flag that was on: the
			// first attempt failing is a sequence, not a diagnosis.
			if (onRequest || statsOnly) {
				log.warn(
					`${onRequest ? 'transformOnRequest' : 'statsOnly'} failed for ${src}, retrying. ${error?.message || error}`
				);
				metadata = await Image(resolvedSrc, imageOptions);
			} else {
				throw error;
			}
		}

		const fallback = pickFallback(metadata);
		if (!fallback) {
			throw new Error(`imageShortcode: no renditions produced for ${src}`);
		}

		// --- HTML assembly ---
		// One <source> per format, each carrying the full srcset for that format.
		const resolvedSizes = buildSizes(sizes, options.sizes !== undefined || defaults.sizesAuthored === true, loading);
		const sourceTags = Object.values(metadata)
			.map((formatEntries) => {
				const type = formatEntries[0].sourceType;
				const srcset = formatEntries.map((entry) => entry.srcset).join(', ');
				return `<source type="${type}" srcset="${srcset}" sizes="${resolvedSizes}">`;
			})
			.join('\n');

		// The caller's bag goes last: what they wrote wins over what we assumed,
		// `loading` and the dimensions included. `eleventy:ignore` goes after even
		// that, since it is not a preference — both pipelines processing the same
		// image is never what anyone wants.
		const imgAttributes = {
			src: fallback.url,
			alt: normalizedAlt,
			loading,
			decoding: loading === 'eager' ? 'sync' : 'async',
			...(setDimensions ? { width: fallback.width, height: fallback.height } : {}),
			...img,
			...(hasImageTransformPlugin ? { 'eleventy:ignore': true } : {})
		};

		const pictureTag = `<picture${renderAttributes(picture)}>
${sourceTags}
<img${renderAttributes(imgAttributes, ['alt'])}>
</picture>`;

		// A caption is what decides the wrapper. There is no separate switch to
		// set one and then lose it.
		if (!normalizedCaption) return pictureTag;

		return `<figure>
${pictureTag}
<figcaption>${normalizedCaption}</figcaption>
</figure>`;
	};
}
