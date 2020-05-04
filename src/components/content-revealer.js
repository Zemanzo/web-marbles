import React from "react";

const ContentRevealer = (props) => {
	const [contentIsRevealed, setContentIsRevealed] = React.useState(false);
	const handleButtonClick = () => setContentIsRevealed(true);
	const className = `contentRevealer ${contentIsRevealed ? false : "reveal"}`;
	return (
		<div className={className} onClick={handleButtonClick}>
			{contentIsRevealed ? props.newContent : props.initialContent}
		</div>
	);
};

export default ContentRevealer;
