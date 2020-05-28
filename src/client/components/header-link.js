import React from "react";
import styled from "styled-components";

const Link = styled.a`
	display: flex;
	justify-content: center;
	align-items: center;
	max-height: 100%;
	height: 100%;
	min-width: var(--header-height);
	border-radius: var(--border-radius);
	padding: 8px;
	text-decoration: none;
	margin-left: 2px;
	color: #fff;
	text-shadow: #0009 0px 1px 2px;
	background-color: ${props => props.backgroundColor || "var(--theme-color-dark)"};

	&:hover {
		color: #fff;
		text-decoration: underline;

		span {
			clip-path: polygon(0px 0px, 100% 0px, 100% 100%, 0px 100%);
			opacity: 1;
			margin-left: 0;
			transform: scaleX(1);
		}

		img {
			margin-right: 8px;
		}
	}

	img {
		height: 1.8em;
		width: 1.8em;
		margin-right: 0px;
		transition: margin-right 0.4s;
	}

	span {
		display: inline-block;
		text-align: center;
		max-height: 110%;
		width: 4.2em;
		margin-left: -4.2em;
		opacity: 0;
		overflow: hidden;
		clip-path: polygon(100% 0px, 100% 0px, 100% 100%, 100% 100%);
		transition: margin-left 0.4s, clip-path 0.4s, opacity 0.3s;
	}
`;

const Header = (props) => {
	return (
		<Link href={props.link} backgroundColor={props.backgroundColor}>
			<img src={props.imageLink} alt={props.imageAlt} />
			<span>{props.text}</span>
		</Link>
	);
};

export default Header;
