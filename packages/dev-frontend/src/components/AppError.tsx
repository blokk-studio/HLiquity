/** @jsxImportSource theme-ui */
import React, { ReactNode } from "react";
import { Button, Flex, Heading, Paragraph } from "theme-ui";
import { Icon } from "./Icon";

export const AppError: React.FC<
  React.PropsWithChildren<void | { error: Error; heading?: string | ReactNode; infoText?: string | ReactNode }>
> = props => (
  <Flex
    sx={{
      minHeight: "100%",
      flexDirection: "column",
      justifyContent: "center",
      marginInline: "clamp(2rem, 100%, 50% - 12rem)"
    }}
  >
    {props.children ? (
      props.children
    ) : (
      <>
        <Heading sx={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <Icon name="exclamation-triangle" />
          {"heading" in props ? props.heading : "Something went wrong"}
        </Heading>
        <Paragraph sx={{ marginTop: "1rem" }}>
          {"infoText" in props ? props.infoText : "Please refresh the page and try again."}
        </Paragraph>

        <Button
          sx={{ marginTop: "2rem", width: "100%" }}
          onClick={() => {
            window.location.reload();
          }}
        >
          Refresh the page
        </Button>

        {"error" in props && (
          <details sx={{ marginTop: "3rem", width: "100%" }}>
            <summary>Error details</summary>

            <p>{props.error.message}</p>
          </details>
        )}
      </>
    )}
  </Flex>
);
