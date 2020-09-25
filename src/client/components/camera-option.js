import React, { useContext } from "react";
import styled from "styled-components";
import { RenderContext } from "../render/render-manager";

const Option = styled.div`
	background: #00000066;
	border-radius: var(--border-radius);
	margin-right: 4px;
	opacity: ${props => props.isSelected ? ".8s" : ".3s"};
	transition: opacity .4s;
	text-align: center;
	padding: 2px;
	cursor: pointer;

	:hover {
		opacity: 1;
	}

	i {
		font-size: 1.8rem;
	}
`;

const CameraOption = (props) => {
	const dispatch = useContext(RenderContext);

	const setCameraStyle = () => {
		dispatch({
			type: "SET_CAMERA_STATE",
			style: props.type
		});
	};

	return (
		<Option isSelected={props.selected === props.type} onClick={setCameraStyle}>
			<i className={props.icon}></i>
			<br />{props.label}
		</Option>
	);
};

export default CameraOption;
