import React from "react";
import { Box, Image } from "theme-ui";
import { useColorMode } from 'theme-ui';

type LiquityLogoProps = React.ComponentProps<typeof Box> & {
  height?: number | string;
};


export const LiquityLogo: React.FC<LiquityLogoProps> = ({ height, ...boxProps }) => {
  const [colorMode] = useColorMode();

  return (
    <Box sx={{ lineHeight: 0 }} {...boxProps}>
      <Image src={`./hliquity${colorMode === 'dark' ? '-dark' : ''}.svg`} sx={{ height }} />
    </Box>
  )
};
