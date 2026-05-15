export default {
	lang: 'en',
	layout: 'layouts/docs.njk',
	random: 'Random string',
	permalink: function ({ title, slug, page, section }) {
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
			// Front-matter slug wins; otherwise slugify the title.
			const slugified = slug ? this.slugify(slug) : this.slugify(title);

			// Compose /<section[0]>/<section[1]>/.../<slug>/.
			const parts = (section ?? []).map((part) => this.slugify(part));
			parts.push(slugified);

			return '/' + parts.join('/') + '/';
		} catch (error) {
			console.error(`Error generating permalink for ${page.inputPath}:`, error);
			return false;
		}
	}
};
