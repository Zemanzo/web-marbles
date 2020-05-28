import React from "react";
import HeaderLink from "./header-link";

const Header = (props) => {
	return (
		<header id="header">
			<a href="/" id="title">
				<img src="images/logo.svg" />
				<h1>Manzo&apos;s Marbles</h1>
			</a>
			<nav id="internalLinks">
				<HeaderLink
					link="/client"
					text="Client"
				/>
			</nav>
			<div id="releaseMeta">
				{props.headerInfo && (
					<React.Fragment>
						<div id="releaseState">ALPHA ({props.headerInfo.version})</div>
						{props.headerInfo.gitHash && (
							<div id="releaseHash">{props.headerInfo.gitHash}</div>
						)}
					</React.Fragment>
				)}
			</div>
			<nav id="externalLinks">
				{props.headerInfo.inviteLink && (
					<HeaderLink
						backgroundColor="#7289da"
						link={props.headerInfo.inviteLink}
						imageLink="images/wumpus_white.svg"
						imageAlt="Wumpus"
						text="Join the Discord!"
					/>
				)}
				<HeaderLink
					backgroundColor="#f86754"
					link="https://www.patreon.com/webmarbles"
					imageLink="images/patreon.svg"
					imageAlt="Patreon"
					text="Support the devs!"
				/>
				<HeaderLink
					backgroundColor="#24292e"
					link="https://github.com/Zemanzo/web-marbles"
					imageLink="images/github.svg"
					imageAlt="GitHub"
					text="View the source!"
				/>
			</nav>
		</header>
	);
};

export default Header;
