/**
 * Filter the current page out of a collection.
 * Uses `this.ctx.page` from the Nunjucks runtime to identify the current page.
 * @param {Array<Object>} [collection=[]] - Collection to filter.
 * @returns {Array<Object>} Collection without the current page.
 */
export function relatedPostsFilter(collection = []) {
	const page = this?.ctx?.page;
	if (!page?.url) return collection;
	return collection.filter((post) => post.url !== page.url);
}
