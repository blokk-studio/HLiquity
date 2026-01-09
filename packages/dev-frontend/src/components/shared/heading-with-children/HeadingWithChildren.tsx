import { FC, PropsWithChildren } from "react";
import { Box, Flex, Heading } from "theme-ui";

interface Props extends PropsWithChildren {
  text: string;
  isSmall?: boolean;
  noMargin?: boolean;
}

export const HeadingWithChildren: FC<Props> = ({ text, noMargin, children }) => {
  return (
    <Box sx={{ marginBottom: 32 }}>
      <Flex sx={{justifyContent: "space-between", gap: 16}}>
        <Heading sx={{ fontSize: 2, fontWeight: 300, marginBottom: noMargin ? 0 : 24 }}>{text}</Heading>

        <div>
          {children}
        </div>
      </Flex>
    </Box>
  );
};