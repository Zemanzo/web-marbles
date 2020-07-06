import React from "react";
import Header from "../components/header";
import LayoutSidebar from "../components/layout-sidebar";
import GameState from "./game-state";

const RootComponent = (props) => {
	const sidebarComponents = [
		<GameState timerValue="10" gameState="Enter marbles now!" key="0"/>
	];

	return (
		<React.Fragment>
			<Header {...props.header} />
			<LayoutSidebar
				sidebarComponents={sidebarComponents}
				mainComponents={[<div key="2">bluhhhh!</div>]}
			/>
		</React.Fragment>
	);
};

export default RootComponent;
