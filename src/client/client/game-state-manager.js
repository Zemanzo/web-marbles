import React, { useReducer, useContext } from "react";

function reducer(state, action) {
	switch (action.type) {
	case "RESET":

		return {
			...state
		};
	case "SERVER_NOTIFICATION":
		return {
			...state
		};
	default:
		return state;
	}
}

export const RenderContext = React.createContext(() => { });

export function useRenderManager(initialState) {
	return useReducer(reducer, initialState);
}

export default function useRenderContext() {
	return useContext(RenderContext);
}
