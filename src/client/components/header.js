import React from "react";

const Header = (props) => {
	return (
		<header id="header">
			<a href="/" id="title"><img src="images/logo.svg"/><h1>Manzo&apos;s Marbles</h1></a>
			<div id="releaseMeta">
				{props.headerInfo && (
					<React.Fragment>
						<div id="releaseState">ALPHA ({props.headerInfo.version})</div>
						{props.headerInfo.gitHash && <div id="releaseHash">{props.headerInfo.gitHash}</div>}
					</React.Fragment>
				)}
			</div>
			<nav id="externalLinks">
				{props.headerInfo.inviteLink
					&& <a href={props.headerInfo.inviteLink} id="discord">
						<img src="images/wumpus_white.svg" alt="Wumpus" />
						<span>Join the Discord!</span>
					</a>
				}
				<a href="https://www.patreon.com/webmarbles" id="patreon">
					<img src="images/patreon.svg" alt="Patreon" />
					<span>Support the devs!</span>
				</a>
				<a href="https://github.com/Zemanzo/web-marbles" id="github">
					<img src="images/github.svg" alt="GitHub" />
					<span>View the source!</span>
				</a>
			</nav>
		</header>
	);
};

export default Header;
