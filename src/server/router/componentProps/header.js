const inviteLink = require("../../config").discord.inviteLink;
const version = require("../../../../package.json").version;
const log = require("../../../log");

// Git commit hash, optional dependency
let git, gitHash, gitBranch;
try {
	git = require("git-rev-sync");
	gitHash = git.long();
	gitBranch = git.branch();
} catch (error) {
	log.warn("git-rev-sync is not installed, no git information will be displayed");
}

module.exports = {
	version,
	gitHash,
	gitBranch,
	inviteLink
};
