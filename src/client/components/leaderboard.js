import React from "react";
import styled from "styled-components";
import LeaderboardEntry from "./leaderboard-entry";

const FlexColumn = styled.div`
	display: flex;
	flex-direction: column;
`;

const LeaderboardWrapper = styled(FlexColumn)`
	overflow: hidden;
	box-sizing: border-box;
	flex: 1;
	margin: 16px;
	max-width: 520px;
	max-height: 900px;
	background-color: #2b2929;
	border-radius: var(--border-radius);
	font-family: "Share Tech Mono";
`;

const LeaderboardHeader = styled.h3`
	font-weight: 300;
	text-align: center;
	text-transform: uppercase;
	font-size: 2em;
	padding-top: .5em;
	padding-bottom: .3em;
	background-color: var(--theme-color-dark);
`;

const EntriesWrapper = styled(FlexColumn)`
	position: relative;
	overflow-y: auto;
`;

const Leaderboard = (props) => {
	return (
		<LeaderboardWrapper>
			<LeaderboardHeader>
				{props.header}
			</LeaderboardHeader>
			<EntriesWrapper>
				<LeaderboardEntry header rank="RANK" username="NAME" stat_points_earned="SCORE" stat_rounds_entered="ENTRIES" />
				{props.rankings.map(entry => <LeaderboardEntry key={entry.rank} {...entry}/>)}
			</EntriesWrapper>
		</LeaderboardWrapper>
	);
};

export default Leaderboard;
