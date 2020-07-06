import styled from "styled-components";

const ThemeNumber = (component) => styled(component)`
    font-family: "Share Tech Mono", monospace;
    font-weight: 600;
    color: var(--theme-color);
    text-shadow: 2px 2px var(--theme-color-dark);
`;

export default ThemeNumber;
