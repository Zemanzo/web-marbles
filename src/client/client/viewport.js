import React, { createRef, useState, useEffect } from "react";
import styled from "styled-components";

function Viewport(props) {
	const ref = createRef();
	const [isUnsupported, setIsUnsupported] = useState(false);

	// Only do this once after rendering
	useEffect(() => {
		console.log(ref.current, props);
		import("./viewport-client-only")
			.then(ViewportClientOnly => {
				setIsUnsupported(
					ViewportClientOnly.default(ref.current, props)
				);
			});
	}, [ref.current]);

	return (
		isUnsupported
			? <div id = "warning" >
				Hmmm... Unfortunately, your {isUnsupported} does not seem to support
				<a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000" >WebGL</a>.
				Please come back when you found something more compatible!
			</div >
			: <div ref={ref}></div>
	);
}

export default Viewport;
