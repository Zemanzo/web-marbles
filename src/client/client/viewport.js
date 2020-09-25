import React, { createRef, useEffect, useContext } from "react";
import styled from "styled-components";
import CameraControls from "../components/camera-controls";
import { RenderContext } from "../render/render-manager";

const CanvasContainer = styled.div`
	flex: 1;
`;

const Overlay = styled.div`
	position: absolute;
`;

function Viewport(props) {
	const ref = createRef();
	const dispatch = useContext(RenderContext);

	// Only do this once after rendering
	useEffect(() => {
		console.log(ref.current, props);
		dispatch({
			type: "SET_RENDER_TARGET",
			target: ref.current
		});
	}, [ref.current]);

	return (
		props.isWebGLSupported
			? <div id = "warning" >
				Hmmm... Unfortunately, your {props.isWebGLSupported} does not seem to support
				<a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000" >WebGL</a>.
				Please come back when you found something more compatible!
			</div >
			: <React.Fragment>
				<Overlay>
					<CameraControls selected={props.cameraStyle} />
				</Overlay>
				<CanvasContainer ref={ref}></CanvasContainer>
			</React.Fragment>
	);
}

export default Viewport;
