module.exports = function(db) {
	return {
		_insertNewRound: db.prepare(
			`INSERT OR ABORT INTO rounds (
				time_start,
				time_end,
				time_duration,
				map,
				points_awarded,
				stat_marbles_entered,
				stat_marbles_finished,
				stat_marbles_not_finished,
				stat_players_entered,
				stat_players_finished,
				stat_players_not_finished
			) VALUES (?,?,?,?,?,?,?,?,?)`
		),

		insertNewRound(round) {
			this._insertNewRound.run([
				round.timeStart,
				round.timeEnd,
				round.timeDuration,
				round.map,
				round.pointsAwarded,
				round.statMarblesEntered,
				round.statMarblesFinished,
				round.statMarblesNotFinished,
				round.statPlayersEntered,
				round.statPlayersFinished,
				round.statPlayersNotFinished
			]);
		}
	};
};
