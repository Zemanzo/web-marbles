import React from "react";
import HeaderLink from "./header-link";
import styled from "styled-components";

const Nav = styled.nav`
	display: flex;
`;

const Header = (props) => {
	return (
		<header id="header">
			<a href="/" id="title">
				<img src="images/logo.svg" />
				<h1>Manzo&apos;s Marbles</h1>
			</a>
			<Nav>
				<HeaderLink
					link="/client"
					icon="icon-flag-checkered"
				>
					Race
				</HeaderLink>
				<HeaderLink
					link="/leaderboards"
					icon="icon-award"
				>
					Leaderboards
				</HeaderLink>
			</Nav>
			<div id="releaseMeta">
				{props.version && <div id="releaseState">ALPHA ({props.headerInfo.version})</div>}
				{props.gitHash && <div id="releaseHash">{props.headerInfo.gitHash}</div>}
			</div>
			<Nav>
				{props.inviteLink && <HeaderLink
					backgroundColor="#7289da"
					link={props.headerInfo.inviteLink}
					imageLink="images/wumpus_white.svg"
					imageAlt="Wumpus"
				>Join the Discord!</HeaderLink>}
				<HeaderLink
					backgroundColor="#f86754"
					link="https://www.patreon.com/webmarbles"
					imageLink="images/patreon.svg"
					imageAlt="Patreon"
				>Support the devs!</HeaderLink>
				<HeaderLink
					backgroundColor="#24292e"
					link="https://github.com/Zemanzo/web-marbles"
					imageLink="images/github.svg"
					imageAlt="GitHub"
				>View the source!</HeaderLink>
			</Nav>
		</header>
	);
};

export default Header;
