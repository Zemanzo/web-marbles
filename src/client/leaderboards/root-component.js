import React from "react";
import styled from "styled-components";
import Header from "../components/header";
import Leaderboard from "../components/leaderboard";

const LeaderboardRoot = styled.div`
	display: flex;
	justify-content: center;
`;

const RootComponent = (props) => {
	return (
		<React.Fragment>
			<Header {...props.header} />
			<LeaderboardRoot>
				{props.leaderboards.weekly && <Leaderboard rankings={props.leaderboards.weekly} header="Best this week"/>}
				{props.leaderboards.monthly && <Leaderboard rankings={props.leaderboards.monthly} header="Best this month"/>}
				{props.leaderboards.alltime && <Leaderboard rankings={props.leaderboards.alltime} header="All time best"/>}
			</LeaderboardRoot>
		</React.Fragment>
	);
};

export default RootComponent;
