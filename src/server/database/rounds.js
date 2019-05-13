module.exports = function(db) {
	return {
		_insertNewRound: db.prepare(
			`INSERT OR ABORT INTO rounds (
				timestamp_start,
				timestamp_end,
				time_best,
				level_id,
				stat_points_awarded,
				stat_marbles_entered,
				stat_marbles_finished,
				stat_marbles_not_finished,
				stat_players_entered,
				stat_players_finished,
				stat_players_not_finished
			) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
		),

		insertNewRound(round) {
			this._insertNewRound.run([
				round.start,
				round.end,
				round.timeBest,
				round.levelId,
				round.pointsAwarded,
				round.marblesEntered,
				round.marblesFinished,
				round.marblesNotFinished,
				round.playersEntered,
				round.playersFinished,
				round.playersNotFinished
			]);
		}
	};
};
