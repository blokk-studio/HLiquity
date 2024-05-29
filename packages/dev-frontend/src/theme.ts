import { Theme, ThemeUIStyleObject } from "theme-ui";

const baseColors = {
  blue: "#1542cd",
  purple: "#745ddf",
  cyan: "#2eb6ea",
  green: "#28c081",
  lightGreen: "#78dcb1",
  yellow: "#fd9d28",
  red: "#dc2c10",
  lightRed: "#ff755f",
  white: "#fff",
  black: "#000",
};

const colors = {
  primary: baseColors.black,
  secondary: baseColors.white,
  accent: baseColors.cyan,

  success: baseColors.green,
  successHover: baseColors.lightGreen,
  warning: baseColors.yellow,
  danger: baseColors.red,
  dangerHover: "gray",
  info: baseColors.blue,
  buttonShadow: "#0000003D",
  invalid: "pink",

  text: "#primary",
  background: "white",
  muted: "#eaebed",
  highlight: "#efeffe",

  modes: {
    dark: {
      text: baseColors.white,
      background: baseColors.black,
      primary: baseColors.white,
      secondary: baseColors.black,
      buttonShadow: "#ffffff3D",
      info: baseColors.cyan,
    }
  }
};

const buttonBase: ThemeUIStyleObject = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 4,
  fontWeight: 300,
  '@media screen and (max-width: 767px)': {
    fontSize: 3,
  },

  ":enabled": { cursor: "pointer" }
};

const button: ThemeUIStyleObject = {
  ...buttonBase,

  px: "12px",
  py: "5px",
  // transition: "box-shadow .5s, border .2s",
  color: "primary",
  borderRadius: 2,
  fontWeight: 300,
  fontFamily: "inherit",

  ":disabled": {
    opacity: 0.5
  }
};

const buttonOutline = (color: string, hoverColor: string): ThemeUIStyleObject => ({
  color,
  borderColor: color,
  background: "none",

  ":enabled:hover": {
    bg: hoverColor,
    borderColor: hoverColor
  }
});

const iconButton: ThemeUIStyleObject = {
  ...buttonBase,

  padding: 0,
  width: "40px",
  height: "40px",

  background: "none",

  ":disabled": {
    color: "text",
    opacity: 0.25
  }
};

const cardHeadingFontSize = 30;

const cardGapX = [3, 3, 4];
const cardGapY = [3, 3, 4];

const card: ThemeUIStyleObject = {
  position: "relative",
  mt: cardGapY,
  border: 1,
  boxShadow: [1, null, 2]
};

const infoCard: ThemeUIStyleObject = {
  ...card,

  padding: 3,

  // borderColor: "rgba(122,199,240,0.4)",
  // background: "linear-gradient(200deg, #d4d9fc, #cae9f9)",

  h2: {
    mb: 2,
    fontSize: cardHeadingFontSize
  },
};

const formBase: ThemeUIStyleObject = {
  display: "block",
  width: "auto",
  flexShrink: 0,
  padding: 2,
  fontSize: 3
};

const formCell: ThemeUIStyleObject = {
  ...formBase,

  bg: "background",
  border: 1,
  borderColor: "muted",
  borderRadius: 0,
  boxShadow: [1, 2]
};

const overlay: ThemeUIStyleObject = {
  position: "absolute",

  left: 0,
  top: 0,
  width: "100%",
  height: "100%"
};

const modalOverlay: ThemeUIStyleObject = {
  position: "fixed",

  left: 0,
  top: 0,
  width: "100vw",
  height: "100vh"
};

const headerGradient: ThemeUIStyleObject = {
  // background: `linear-gradient(90deg, ${colors.background}, ${colors.muted})`
};

const theme: Theme = {
  breakpoints: ["48em", "52em", "64em"],

  space: [0, 4, 8, 16, 32, 64, 128, 256, 512],

  fonts: {
    body: [
      "museo",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "sans-serif"
    ].join(", "),
    heading: "inherit",
    monospace: "Menlo, monospace"
  },

  fontSizes: [12, 14, 16, 20, 24, 32, 48, 64, 96],

  fontWeights: {
    body: 300,
    heading: 700,

    light: 100,
    medium: 300,
    bold: 700
  },

  lineHeights: {
    body: 1.5,
    heading: 1.25
  },

  colors,

  borders: [0, "1px solid", "2px solid"],

  shadows: ["0", "0px 4px 8px rgba(41, 49, 71, 0.1)", "0px 8px 16px rgba(41, 49, 71, 0.1)"],

  text: {
    address: {
      fontFamily: "monospace",
      fontSize: 1
    }
  },

  buttons: {
    primary: {
      ...button,

      bg: "secondary",
      borderColor: "secondary",
      boxShadow: `inset 0 0 0 1px var(--theme-ui-colors-primary)`,

      ":enabled:hover": {
        bg: "secondary",
        borderColor: "secondary",
        boxShadow: `4px 4px 20px var(--theme-ui-colors-buttonShadow), inset 0 0 0 2px var(--theme-ui-colors-primary)`,
      }
    },

    outline: {
      ...button,
      ...buttonOutline("primary", "secondary")
    },

    cancel: {
      ...button,
      ...buttonOutline("text", "secondary"),

      opacity: 0.8,

      ":enabled:hover": {
        bg: "secondary",
        borderColor: "secondary",
        boxShadow: `4px 4px 20px var(--theme-ui-colors-buttonShadow), inset 0 0 0 2px var(--theme-ui-colors-primary)`,
      }
    },

    danger: {
      ...button,

      bg: "danger",
      borderColor: "danger",

      ":enabled:hover": {
        bg: "dangerHover",
        borderColor: "dangerHover"
      }
    },

    success: {
      ...button,

      bg: "success",
      borderColor: "success",

      ":enabled:hover": {
        bg: "successHover",
        borderColor: "successHover"
      }
    },

    icon: {
      ...iconButton,
      color: "primary",
      ":enabled:hover": { color: "accent" }
    },

    dangerIcon: {
      ...iconButton,
      color: "danger",
      ":enabled:hover": { color: "dangerHover" }
    },

    titleIcon: {
      ...iconButton,
      color: "text",
      ":enabled:hover": { color: "success" }
    },

    close: {
      cursor: "pointer"
    }
  },

  cards: {
    primary: {
      ...card,

      padding: 0,

      borderColor: "muted",
      bg: "background",

      "> h2": {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",

        height: "56px",

        pl: 3,
        py: 2,
        pr: 2,

        // bg: "muted",

        fontSize: cardHeadingFontSize
      },

      "h3": {
        fontSize: "20px",
        fontWeight: 500,
      }
    },

    info: {
      ...infoCard,

      display: ["none", "block"]
    },

    infoPopup: {
      ...infoCard,

      position: "fixed",
      top: 0,
      right: 3,
      left: 3,
      mt: "72px",
      height: "80%",
      overflowY: "scroll"
    },

    tooltip: {
      fontWeight: "body",
      marginY: 1,

      a: {
        color: "accent",
        ":hover": {
          opacity: 0.8
        }
      }
    }
  },

  forms: {
    switch: {
      backgroundColor: 'primary',
      mr: 0,
      ml: 3,
      pr: 0,

      '&:checked': {
        backgroundColor: 'primary'
      },

      'input:checked ~ & > div': {
        backgroundColor: 'secondary',
      },
    },

    label: {
      ...formBase
    },

    radioLabel: {
      mr: 4,
      width: "unset",

      svg: {
        mr: 1
      }
    },

    unit: {
      ...formCell,

      textAlign: "center",
      bg: "muted"
    },

    input: {
      ...formCell,

      flex: 1
    },

    editor: {}
  },

  layout: {
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "stretch",
      bg: "secondary",

      position: ["fixed", "relative"],
      top: 0,
      zIndex: 1,

      px: [2, "12px", "12px", 5],
      py: [2, "12px", "12px"],

      ...headerGradient,
      boxShadow: [1, "none"]
    },

    footer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",

      mt: cardGapY,
      px: 3,
      minHeight: "72px",

      bg: "muted"
    },

    main: {
      width: "100%",
      maxWidth: "1280px",
      mx: "auto",
      mt: ["60px", 0],
      mb: ["40px", "40px"],
      px: cardGapX
    },

    columns: {
      display: "flex",
      flexWrap: "wrap",
      justifyItems: "center"
    },

    left: {
      pr: [0, 3, 4],
      width: ["100%", "58%"]
    },

    right: {
      width: ["100%", "42%"]
    },

    actions: {
      justifyContent: "flex-end",
      mt: 2,

      button: {
        ml: 2
      }
    },

    disabledOverlay: {
      ...overlay,

      bg: "rgba(255, 255, 255, 0.5)"
    },

    modalOverlay: {
      ...modalOverlay,

      bg: "rgba(0, 0, 0, 0.8)",

      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    },

    modal: {
      padding: 3,
      width: ["100%", "40em"]
    },

    infoOverlay: {
      ...modalOverlay,

      display: ["block", "none"],

      bg: "secondary"
    },

    infoMessage: {
      display: "flex",
      justifyContent: "center",
      m: 3,
      alignItems: "center",
      minWidth: "128px"
    },

    sidenav: {
      display: ["flex", "none"],
      flexDirection: "column",
      px: 0,
      py: '6px',
      m: 0,
      borderColor: "muted",
      mr: "25vw",
      height: "100%",
      ...headerGradient
    },

    badge: {
      border: 0,
      borderRadius: 3,
      p: 1,
      px: 2,
      backgroundColor: "muted",
      color: "slate",
      fontSize: 1,
      fontWeight: "body"
    }
  },

  styles: {
    root: {
      fontFamily: "body",
      lineHeight: "body",
      fontWeight: "body",

      height: "100%",

      "#root": {
        height: "100%"
      }
    },

    a: {
      color: "primary",
      ":hover": { fontWeight: "bold" },
      textDecoration: "none",
    },

    progress: {
      color: colors.success
    }
  },

  links: {
    nav: {
      px: 2,
      py: 1,
      fontWeight: "medium",
      fontSize: 2,
      textTransform: "uppercase",
      letterSpacing: "2px",
      width: ["100%", "auto"],
      mt: [3, "auto"]
    },
  }
};

export default theme;
