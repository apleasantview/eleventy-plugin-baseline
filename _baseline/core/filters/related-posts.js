export default function relatedPostsFilter(collection = []) {
	const page = this?.ctx?.page;
	if (!page?.url) return collection;
	return collection.filter((post) => post.url !== page.url);
}
