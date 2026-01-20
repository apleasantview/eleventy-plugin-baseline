export default {
	lang: "en",
	layout: "layouts/page.njk",
	random: "Random string",
	permalink: function ({title, slug, page, topicSlug}) {
		// Skip if this is a data file.
		if (page.inputPath.includes('11tydata.js')) {
			return false;
		}

		// Ensure we have a title to work with.
		if (!title) {
			console.warn(`Warning: No title found for ${page.inputPath}`);
			return false;
		}

		try {
			// Create the slugified path with optional topic prefix.
			const slugifiedTitle = slug? this.slugify(slug) : this.slugify(title);
			const topic = topicSlug? this.slugify(topicSlug) : null;
			return topic
			? `/docs/${topic}/${slugifiedTitle}/`
			: `/docs/${slugifiedTitle}/`;
		} catch (error) {
			console.error(`Error generating permalink for ${page.inputPath}:`, error);
			return false;
		}
	},
}
