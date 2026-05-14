// See https://jeremias.codes/2025/02/markdown-filters-eleventy/
import markdownit from 'markdown-it';

const md = markdownit();

/**
 * Render a string as inline Markdown (no wrapping <p> tag).
 * @param {string} string - Markdown source.
 * @returns {string} HTML output.
 */
export const markdownFilter = (string) => {
	if (!string) return '';
	return md.renderInline(string);
};
