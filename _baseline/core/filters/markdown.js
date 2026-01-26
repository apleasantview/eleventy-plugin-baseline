// See https://jeremias.codes/2025/02/markdown-filters-eleventy/
import markdownit from 'markdown-it';

const md = markdownit();

export const markdownFilter = (string) => {
	return md.renderInline(string);
};
