export const buildCommit = () => {
	const commit = process.env.COMMIT_REF || "local build";
	if (process.env.COMMIT_REF) {
		const commitSlice = commit.slice(0, 7);
		const commitLink = `<a href="https://github.com/apleasantview/eleventy-plugin-baseline/commit/${commit}">${commitSlice}</a>`
		return commitLink;
	}
	return commit;
};
