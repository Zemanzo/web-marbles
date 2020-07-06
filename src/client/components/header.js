import React from "react";
import HeaderLink from "./header-link";
import styled, {css} from "styled-components";
import Logo from "../../../public/images/logo.svg";

const StyledHeader = styled.header`
	grid-area: header;
	width: 100%;
	max-height: var(--header-height);
	display: flex;
	justify-content: space-between;
`;

const ReleaseMeta = styled.div`
	background-color: #2b2929;
	border-radius: var(--border-radius);
	display: flex;
	flex-direction: column;
	justify-content: center;
	padding: 0 8px;
	font-family: "Share Tech Mono";
	color: #bbb;
	font-weight: 300;
	flex: 1;
`;

const ReleaseHash = styled.div`
	color: #666;
`;

const Nav = styled.nav`
	display: flex;
	${props => props.includeRightMargin && css`
		margin-right: 2px;
	`}
`;

const TitleLink = styled.a`
	width: 360px;
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--theme-color);
	text-align: center;
	font-size: 1.2em;
	text-decoration: none;
	padding: 0 1em;

	&:hover {
		text-decoration: underline;
	}

	& svg {
		height: calc(var(--header-height) - 16px);
		margin-right: .5em;
	}
`;

const Header = (props) => {
	return (
		<StyledHeader>
			<TitleLink href="/">
				<Logo/>
				<h1>Manzo&apos;s Marbles</h1>
			</TitleLink>
			<Nav includeRightMargin>
				<HeaderLink
					contentWidth="5ch"
					link="/client"
					icon="icon-flag-checkered"
					route={props.route}
				>
					Race
				</HeaderLink>
				<HeaderLink
					link="/skins"
					icon="icon-circle"
					route={props.route}
				>
					Skins
				</HeaderLink>
				<HeaderLink
					link="/leaderboards"
					icon="icon-award"
					route={props.route}
				>
					Leaderboards
				</HeaderLink>
			</Nav>
			<ReleaseMeta>
				{props.version && <div>ALPHA ({props.version})</div>}
				{props.gitHash && <ReleaseHash>{props.gitHash}</ReleaseHash>}
			</ReleaseMeta>
			<Nav>
				{props.inviteLink && <HeaderLink
					contentWidth="4.3em"
					backgroundColor="#7289da"
					link={props.inviteLink}
					imageLink="images/wumpus_white.svg"
					imageAlt="Wumpus"
				>Join the<br/>Discord!</HeaderLink>}
				<HeaderLink
					contentWidth="4.3em"
					backgroundColor="#f86754"
					link="https://www.patreon.com/webmarbles"
					imageLink="images/patreon.svg"
					imageAlt="Patreon"
				>Support<br /> the devs!</HeaderLink>
				<HeaderLink
					contentWidth="4.3em"
					backgroundColor="#24292e"
					link="https://github.com/Zemanzo/web-marbles"
					imageLink="images/github.svg"
					imageAlt="GitHub"
				>View the<br/> source!</HeaderLink>
			</Nav>
		</StyledHeader>
	);
};

export default Header;
