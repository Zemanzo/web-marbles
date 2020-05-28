import React from "react";
import styled from "styled-components";
import Header from "../components/header";
import Leaderboard from "../components/leaderboard";

const LeaderboardRoot = styled.div`
	display: flex;
	justify-content: center;
`;

const RootComponent = (props) => {
	const serverSideProps = props.serverSideProps || window.__INITIAL_STATE__;
	console.log(serverSideProps);
	return (
		<React.Fragment>
			<Header headerInfo={serverSideProps.header}/>
			<LeaderboardRoot>
				{serverSideProps.leaderboards.weekly && <Leaderboard rankings={serverSideProps.leaderboards.weekly} header="Best this week"/>}
				{serverSideProps.leaderboards.monthly && <Leaderboard rankings={serverSideProps.leaderboards.monthly} header="Best this month"/>}
				{serverSideProps.leaderboards.alltime && <Leaderboard rankings={serverSideProps.leaderboards.alltime} header="All time best"/>}
			</LeaderboardRoot>
		</React.Fragment>
	);
};

export default RootComponent;
