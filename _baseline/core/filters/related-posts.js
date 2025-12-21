export default function relatedPostsFilter(collection = []) {
	const page = this.ctx.page;
	return collection.filter(post => {
		return post.url !== page.url;
	})
} 
