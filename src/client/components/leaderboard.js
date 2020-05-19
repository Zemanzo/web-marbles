import React from "react";

const Leaderboard = (props) => {
	return (
		<div className="leaderboard">
			<h3>
				{props.header}
			</h3>
			<div className="leaderboardHeaders">
				<div className="rank">Rank</div>
				<div className="name">Name</div>
				<div className="score">Score</div>
			</div>
			<div className="entries">
				{props.rankings.map(entry => (
					<div className="entry" key={entry.rank}>
						<div className="rank">{entry.rank}</div>
						<div className="name">{entry.username}</div>
						<div className="score">{entry.stat_points_earned}</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default Leaderboard;
