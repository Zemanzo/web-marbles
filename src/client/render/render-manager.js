import React, { useReducer, useContext } from "react";
import IS_CLIENT from "../is-client";
//import { cameras } from "./cameras";

let renderCore = null;

function reducer(state, action) {
	switch (action.type) {
	case "SET_CAMERA_STATE":
		renderCore?.setCameraStyle(action.style);
		return {
			...state,
			cameraStyle: action.style
		};
	case "SET_RENDER_TARGET":
		renderCore?.startAnimationLoop(action.target, state.cameraStyle);
		return {
			...state,
			renderTarget: action.target
		};
	default:
		return state;
	}
}

export const RenderContext = React.createContext(() => {});

export function useRenderManager(initialState) {
	return useReducer(reducer, initialState);
}

export default function useRenderContext() {
	return useContext(RenderContext);
}
