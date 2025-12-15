import { markdownFilter } from "./filters/markdown.js";
import relatedPostsFilter from "./filters/related-posts.js";
import isStringFilter from "./filters/isString.js";
import inlinePostCSS from "./modules/assets-postcss/filters/inline-postcss.js";

export default {
	markdownFilter,
	relatedPostsFilter,
	inlinePostCSS,
	isStringFilter
}
