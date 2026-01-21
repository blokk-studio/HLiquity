import { FC, PropsWithChildren } from "react";
import { Box, Flex, Heading } from "theme-ui";

interface Props extends PropsWithChildren {
  text: string;
  isSmall?: boolean;
  noMargin?: boolean;
}

export const HeadingWithChildren: FC<Props> = ({ text, noMargin, children }) => {
  return (
    <Box sx={{ marginBottom: [2] }}>
      <Flex sx={{ justifyContent: "space-between", gap: 16 }}>
        <div>
          <Heading sx={{ fontSize: 3, fontWeight: 700, marginBottom: noMargin ? 0 : 24 }}>{text}</Heading>
        </div>

        <div>
          {children}
        </div>
      </Flex>
    </Box>
  );
};