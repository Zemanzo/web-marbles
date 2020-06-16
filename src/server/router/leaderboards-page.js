import Page from "./page";
const db = require("../database/manager");

export default class LeaderboardsPage extends Page {
	constructor(app, details, rootComponent, props = {}) {
		super(app, details, rootComponent, props);
	}

	_getLatestProps() {
		this.props = {
			leaderboards: {
				alltime: db.user.getTopAlltime(100)
			}
		};
		return true; // TODO: Check whether re-render is needed
	}
}
