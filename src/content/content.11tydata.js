export default {
	permalink: function (data) {
		if (data.page.inputPath.includes('11tydata.js')) return false;
		const slug = data.slug ? this.slugify(data.slug) : data.page.fileSlug;
		const isDefaultLang = !data.lang || data.lang === data.settings?.defaultLanguage;
		const prefix = isDefaultLang ? '' : `/${data.lang}`;
		const sections = (data.section ?? []).map((s) => this.slugify(s));
		return `${prefix}/${[...sections, slug].join('/')}/`;
	}
};
