import React from "react";
import ContentRevealer from "../../components/content-revealer";
import config from "../config";

const email = typeof config.contact.decode === "function"
	? config.contact.decode(config.contact.email)
	: config.contact.email;

const RootComponent = () => (
	<React.Fragment>
		<img src="images/logo_text.svg" alt="Manzo's Marbles" id="headerImage" />
		<section className="column">
			<h2>Contact</h2>
			<p>
				You can contact us at the following email address:
				<ContentRevealer initialContent="Click here to reveal" newContent={email}/>
			</p>
		</section>
	</React.Fragment>
);

export default RootComponent;
