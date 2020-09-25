import React from "react";
import styled from "styled-components";

const Wrapper = styled.div`
	display: flex;
	flex: 1;
`;

const StyledSection = styled.section`
	display: flex;
`;

const Sidebar = styled(StyledSection)`
	width: 360px;
	flex-direction: column;

	> * {
		margin-top: 2px;
	}
`;

const Main = styled(StyledSection)`
	flex: 1;
	position: relative;
`;


const LayoutSidebar = (props) => {
	return (
		<Wrapper>
			<Sidebar>
				{props.sidebarComponents}
			</Sidebar>
			<Main>
				{props.mainComponents}
			</Main>
		</Wrapper>
	);
};

export default LayoutSidebar;
