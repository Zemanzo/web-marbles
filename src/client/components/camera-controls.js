import React from "react";
import styled from "styled-components";
//import { cameras } from "../render/cameras";
import CameraOption from "./camera-option";

const Container = styled.div`
	position: absolute;
	left: 4px;
	top: 4px;
	display: flex;
	flex-direction: column;
	font-family: "Share Tech Mono", monospace;
	font-size: .8rem;
	text-transform: uppercase;
	user-select: none;
`;

const Header = styled.div`
	font-weight: 600;
	text-shadow: #11111166 1px 1px 2px;
	margin-bottom: 2px;
	display: flex;

	i {
		margin-right: 4px;
	}
`;

const Options = styled.div`
	display: flex;
`;

const CameraControls = (props) => {
	return (
		<Container>
			<Header>
				<i className="icon-videocam"></i>Camera style:
			</Header>
			<Options>
				<CameraOption {...props} type={1} icon="icon-resize-full-alt" label="Free" />
				<CameraOption {...props} type={2} icon="icon-target" label="Track" />
			</Options>
		</Container>
	);
};

export default CameraControls;
