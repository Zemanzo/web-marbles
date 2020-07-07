import React from "react";
import styled from "styled-components";

const transitionTime = "0.3s";

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
	background-color: ${props => props.backgroundColor || (props.isCurrentRoute ? "var(--theme-color)" : "var(--theme-color-darker)")};
	transition: background-color ${transitionTime};

	i {
		font-size: 1.5em;
		transition: margin-left ${transitionTime};
	}

	img {
		height: 1.8em;
		width: 1.8em;
		margin-right: 0px;
		transition: margin-right ${transitionTime};
	}
	span {
		display: inline-block;
		text-align: center;
		max-height: 110%;
		width: ${props => props.contentWidth};
		margin-left: -${props => props.contentWidth};
		opacity: 0;
		overflow: hidden;
		clip-path: polygon(100% 0px, 100% 0px, 100% 100%, 100% 100%);
		transition: margin-left ${transitionTime}, clip-path ${transitionTime}, opacity 0.2s;
	}

	&:hover {
		color: #fff;
		text-decoration: underline;
		background-color: ${props => props.backgroundColor ? null : "var(--theme-color-dark)"};

		i {
			margin-left: -8px;
		}

		img {
			margin-right: 8px;
		}

		span {
			clip-path: polygon(0px 0px, 100% 0px, 100% 100%, 0px 100%);
			opacity: 1;
			margin-left: 0;
		}
	}
`;

const Header = (props) => {
	// Remove preceding slash
	const isCurrentRoute = props.link.substring(1) === props.route;
	const contentWidth = props.contentWidth || `${getLabelFromChildren(props.children).length}ch`;
	return (
		<Link
			href={props.link}
			backgroundColor={props.backgroundColor}
			contentWidth={contentWidth}
			isCurrentRoute={isCurrentRoute}
		>
			{props.imageLink && <img src={props.imageLink} alt={props.imageAlt} />}
			{props.icon && <i className={props.icon}></i>}
			<span>{props.children}</span>
		</Link>
	);
};

const getLabelFromChildren = (children) => {
	let label = "";

	React.Children.forEach(children, (child) => {
		if (typeof child === "string") {
			label += child;
		}
	});

	return label;
};

export default Header;
