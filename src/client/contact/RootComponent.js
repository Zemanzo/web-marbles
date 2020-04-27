import React from "react";

const RootComponent = () => (
	<React.Fragment>
		<img src="images/logo_text.svg" alt="Manzo's Marbles" id="headerImage" />
		<section className="column">
			<h2>Contact</h2>
			<p>
				You can contact us at the following email address:
				<div id="reveal">Click here to reveal</div>
			</p>
		</section>
	</React.Fragment>
);

export default RootComponent;
