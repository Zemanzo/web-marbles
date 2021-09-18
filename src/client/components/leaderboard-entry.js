import React from "react";
import styled, { css } from "styled-components";

const Entry = styled.div`
	display: flex;
	${props => props.header ? css`
		padding: 2px 4px;
		border-bottom: 1px solid rgba(255,255,255,.2);
		background-color: #222;
		margin-bottom: 2px;
	` : css`
		padding: 0px 4px;
	`};

	&:nth-child(even) {
		background-color: rgba(0,0,0,.1);
	}

	div {
		overflow: hidden;
		word-break: break-all;
		display: flex;
		align-items: flex-end;
	}

	div:not(:last-child) {
		margin-right: 3px;
		padding-right: 3px;
		border-right: 1px solid rgba(255,255,255,.2);
	}

	.rank {
		width: 5ch;
	}
	.name {
		flex: 1;
	}
	.score {
		width: 7ch;
	}
	.entries {
		width: 7ch;
	}

	${props => props.header ? css`
		position: sticky;
		top: 0px;
		width: 100%;
	` : css`
		.rank,
		.score,
		.entries {
			justify-content: flex-end;
		}
	`};
`;

const LeaderboardEntry = (props) => {
	return (
		<Entry header={props.header}>
			<div className="rank">{props.rank}</div>
			<div className="name">{props.username}</div>
			<div className="score">{props.stat_points_earned}</div>
			<div className="entries">{props.stat_rounds_entered}</div>
		</Entry>
	);
};

export default LeaderboardEntry;
