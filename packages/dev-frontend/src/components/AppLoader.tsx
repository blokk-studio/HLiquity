import React, { ReactNode } from "react";
import { Flex, Spinner, Heading } from "theme-ui";

export const AppLoader: React.FC<{ content?: ReactNode }> = props => (
  <Flex sx={{ alignItems: "center", justifyContent: "center", height: "100vh" }}>
    <Spinner sx={{ m: 2, color: "text" }} size={32} />
    {props.content ? props.content : <Heading>Loading...</Heading>}
  </Flex>
);
