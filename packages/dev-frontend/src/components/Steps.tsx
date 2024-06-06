/** @jsxImportSource theme-ui */
import React, { ReactNode } from "react";
import { Icon } from "./Icon";
import { Card, Spinner, ThemeUIStyleObject } from "theme-ui";
import { Tooltip } from "./Tooltip";
import { LoadingState } from "../loading_state";

export interface Step {
  title: string;
  status: "idle" | "pending" | "success" | "danger" | "warning";
  description?: ReactNode;
}

export interface ExtendedStep extends Step {
  color: string;
  icon: ReactNode;
  /** whether or not the next step is available */
  canContinue: boolean;
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
  const extendedSteps: ExtendedStep[] = [];
  for (let index = 0; index < steps.length; index++) {
    const step = steps[index];
    const icon = getStepIconElement(step, index + 1);
    const color = getStepColor(step);
    const stepHasContinuableStatus = step.status === "success" || step.status === "warning";
    const previousStep: ExtendedStep | undefined = extendedSteps[extendedSteps.length - 1];
    const previousStepCanContinue = !previousStep || previousStep.canContinue;
    const canContinue = previousStepCanContinue && stepHasContinuableStatus;

    const extendedStep: ExtendedStep = {
      ...step,
      icon,
      color,
      canContinue
    };
    extendedSteps.push(extendedStep);
  }

  return (
    <ul
      sx={{
        listStyle: "none",
        paddingLeft: "0",
        display: "flex",
        margin: 0,
        fontSize: "18px",
        ...sx
      }}
    >
      {extendedSteps.map((step, index, steps) => {
        return (
          <li key={step.title} sx={{ color: step.color }}>
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
                  {step.icon}
                </span>
                {/* connecting line. one for every step except the last one. */}
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    sx={{
                      // unless previous steps are continuable, we don't color the line because it looks like we've started in the middle and can continue.
                      // danger steps imply that we can't continue. we don't color the the continuing line in this case.
                      backgroundColor: step.canContinue ? step.color : idleStepColor,
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

export const getCompletableStepStatus = (options: {
  isCompleted: boolean;
  completionLoadingState: LoadingState;
}) => {
  if (options.isCompleted) {
    return "success";
  }

  const hasAssociationError = options.completionLoadingState === "error";
  if (hasAssociationError) {
    return "danger";
  }

  const isWaitingForAssociation =
    options.completionLoadingState === "pending" ||
    (!options.isCompleted && options.completionLoadingState === "success");
  if (isWaitingForAssociation) {
    return "pending";
  }

  return "idle";
};
