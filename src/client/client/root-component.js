import React from "react";
import Header from "../components/header";
import LayoutSidebar from "../components/layout-sidebar";
import GameState from "./game-state";
import Viewport from "./viewport";
import { RenderContext, useRenderManager } from "../render/render-manager";
import { GameStateContext, useGameStateManager } from "./game-state-manager";

const RootComponent = (props) => {
	const _initialRenderState = {
		cameraStyle: props.cameraStyle
	};
	const [renderState, renderDispatch] = useRenderManager(_initialRenderState);

	const _initialGameState = {

	};
	const [gameState, gameDispatch] = useGameStateManager(_initialGameState);
	if (props.clientScripts) {
		props.clientScripts.game.initialize(gameDispatch);
		props.clientScripts.networking.initialize(gameDispatch);
	}

	const sidebarComponents = [
		<GameState
			timerValue={gameState.timerValue}
			gameState={gameState.stateDescription}
			key="0"
		/>
	];

	const mainComponents = [
		<Viewport
			defaultCameraType={props.defaultCameraType}
			isWebGLSupported={props.isWebGLSupported}
			cameraStyle={renderState.cameraStyle}
			key="0"
		/>
	];

	return (
		<React.Fragment>
			<Header {...props.header} />
			<RenderContext.Provider value={renderDispatch}>
				<LayoutSidebar
					sidebarComponents={sidebarComponents}
					mainComponents={mainComponents}
				/>
			</RenderContext.Provider>
		</React.Fragment>
	);
};

export default RootComponent;
