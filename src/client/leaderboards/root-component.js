import React from "react";
import Header from "../components/header";
import Leaderboard from "../components/leaderboard";

const RootComponent = (props) => {
	if (props && !props.serverSideProps) {
		props.serverSideProps = window.__INITIAL_STATE__;
	}
	console.log(props.serverSideProps.leaderboards);
	return (
		<React.Fragment>
			<Header headerInfo={props.serverSideProps.header}/>
			<div className="flex">
				{props.serverSideProps.leaderboards.weekly && <Leaderboard rankings={props.serverSideProps.leaderboards.weekly} header="Best this week"/>}
				{props.serverSideProps.leaderboards.monthly && <Leaderboard rankings={props.serverSideProps.leaderboards.monthly} header="Best this month"/>}
				{props.serverSideProps.leaderboards.alltime && <Leaderboard rankings={props.serverSideProps.leaderboards.alltime} header="Best all time"/>}
			</div>
		</React.Fragment>
	);
};

export default RootComponent;
