/** @jsxImportSource theme-ui */
import React, { ReactNode } from "react";
import { Icon } from "./Icon";
import { Card, Spinner, ThemeUIStyleObject } from "theme-ui";
import { Tooltip } from "./Tooltip";

export interface Step {
  title: string;
  status: "idle" | "pending" | "success" | "danger" | "warning";
  description?: ReactNode;
}

const getStepIconElement = (step: Step, stepNumber: number) => {
  if (step.status === "pending") {
    return <Spinner size="1.5rem" color="currentColor" />;
  }

  if (step.status === "success") {
    return <Icon name="check-circle" size="lg" />;
  }

  if (step.status === "danger") {
    return <Icon name="exclamation-circle" size="lg" />;
  }

  if (step.status === "warning") {
    return <Icon name="exclamation-circle" size="lg" />;
  }

  return (
    <span
      sx={{
        height: "1.5rem",
        width: "1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        outlineColor: "currentColor",
        outlineWidth: "0.2rem",
        outlineStyle: "solid",
        outlineOffset: "-0.2rem",
        color: "inherit",
        fontSize: "0.8125rem",
        borderRadius: "100vw",
        fontWeight: "700"
      }}
    >
      {stepNumber}
    </span>
  );
};

const idleStepColor = "primary";
const getStepColor = (step: Step) => {
  if (step.status === "warning" || step.status === "danger" || step.status === "success") {
    return step.status;
  }

  return idleStepColor;
};

export const Steps: React.FunctionComponent<{ steps: Step[]; sx?: ThemeUIStyleObject }> = ({
  steps,
  sx
}) => {
  return (
    <ul
      sx={{
        listStyle: "none",
        paddingLeft: "0",
        display: "flex",
        margin: 0,
        ...sx
      }}
    >
      {steps.map((step, index) => {
        const icon = getStepIconElement(step, index + 1);
        const color = getStepColor(step);

        return (
          <li key={step.title} sx={{ color }}>
            <Tooltip
              placement="top"
              message={
                <Card variant="tooltip">
                  <header sx={{ fontWeight: "700", display: "block" }}>{step.title}</header>
                  {step.description}
                </Card>
              }
            >
              <div
                role="presentation"
                sx={{
                  position: "relative",
                  display: "grid",
                  gridAutoFlow: "column",
                  alignItems: "center"
                }}
              >
                <span role="presentation" sx={{ zIndex: "1", height: "1.5rem" }}>
                  {icon}
                </span>
                {/* connecting line. one for every step except the last one. */}
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    sx={{
                      // danger steps imply that we can't continue. we don't color the the continuing line in this case.
                      backgroundColor: step.status === "danger" ? idleStepColor : color,
                      height: "0.2rem",
                      width: "0.7rem",
                      marginInline: "-0.1rem",
                      position: "relative",
                      zIndex: "0"
                    }}
                  ></span>
                )}
              </div>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
};
