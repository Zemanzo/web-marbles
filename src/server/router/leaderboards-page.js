import Page from "./page";
const db = require("../database/manager");

export default class LeaderboardsPage extends Page {
	constructor(app, details, rootComponent, props = {}) {
		super(app, details, rootComponent, props);
		this.fetchLeaderboards = true;
		db.events.on("leaderboardsChanged", () => {this.fetchLeaderboards = true;});
	}

	_getLatestProps() {
		if(this.fetchLeaderboards === false)
			return false;
		this.props = {
			leaderboards: {
				alltime: db.user.getTopAlltime(100)
			}
		};
		this.fetchLeaderboards = false;
		return true;
	}
}
