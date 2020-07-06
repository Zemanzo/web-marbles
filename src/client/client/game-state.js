import React from "react";
import styled from "styled-components";
import ThemeNumber from "../components/styles/theme-number";

const GameStateWrapper = styled.div`
    display: flex;
`;

const SharedStyles = styled.div`
    background-color: #2b2929;
    border-radius: var(--border-radius);
`;

const State = styled(SharedStyles)`
    font-size: 1.7em;
    font-weight: 300;
    text-align: center;
    margin-right: 2px;
    flex: 1;
`;

const Timer = ThemeNumber(
	styled(SharedStyles)`
        width: 80px;
        text-align: center;
        font-size: 2em;
        letter-spacing: -3px;
        padding-right: 3px;
    `
);

const GameState = (props) => {
	return (
		<GameStateWrapper>
			<State>{props.gameState}</State>
			<Timer>{props.timerValue}</Timer>
		</GameStateWrapper>
	);
};

export default GameState;
