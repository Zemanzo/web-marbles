import React from "react";
import styled from "styled-components";
import Header from "../components/header";
import Leaderboard from "../components/leaderboard";

const LeaderboardRoot = styled.div`
	display: flex;
	justify-content: center;
`;

const RootComponent = (props) => {
	// Cannot modify original props object, so we have to copy it to a new variable
	// We store the server data in a specific prop, so we can check if it exists, or should use the initial state to hydrate.
	const serverSideProps = props.serverSideProps || window.__INITIAL_STATE__;
	return (
		<React.Fragment>
			<Header header={serverSideProps.header}/>
			<LeaderboardRoot>
				{serverSideProps.leaderboards.weekly && <Leaderboard rankings={serverSideProps.leaderboards.weekly} header="Best this week"/>}
				{serverSideProps.leaderboards.monthly && <Leaderboard rankings={serverSideProps.leaderboards.monthly} header="Best this month"/>}
				{serverSideProps.leaderboards.alltime && <Leaderboard rankings={serverSideProps.leaderboards.alltime} header="All time best"/>}
			</LeaderboardRoot>
		</React.Fragment>
	);
};

export default RootComponent;
