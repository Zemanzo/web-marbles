import React from "react";
import HeaderLink from "./header-link";
import styled, {css} from "styled-components";

const Nav = styled.nav`
	display: flex;
	${props => props.includeRightMargin && css`
		margin-right: 2px;
	`}
`;

const TitleLink = styled.a`
	width: 360px;
`;


const Header = (props) => {
	return (
		<header id="header">
			<TitleLink href="/" id="title">
				<img src="images/logo.svg" />
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
			<div id="releaseMeta">
				{props.version && <div id="releaseState">ALPHA ({props.version})</div>}
				{props.gitHash && <div id="releaseHash">{props.gitHash}</div>}
			</div>
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
		</header>
	);
};

export default Header;
