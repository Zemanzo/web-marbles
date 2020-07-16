import React from "react";
import Header from "../components/header";
import LayoutSidebar from "../components/layout-sidebar";
import GameState from "./game-state";
import Viewport from "./viewport";
//import { levelManager } from "../level-manager";
//import { networking } from "./networking";

const clientUpdate = (deltaTime) => {
	//levelManager.activeLevel.update(deltaTime);
	//networking.update(deltaTime);
};

const RootComponent = (props) => {
	const sidebarComponents = [
		<GameState timerValue="10" gameState="Enter marbles now!" key="0"/>
	];

	const mainComponents = [
		<Viewport defaultCameraType="1" updateCallback={clientUpdate} key="0"/>
	];

	return (
		<React.Fragment>
			<Header {...props.header} />
			<LayoutSidebar
				sidebarComponents={sidebarComponents}
				mainComponents={mainComponents}
			/>
		</React.Fragment>
	);
};

export default RootComponent;
