import React from "react";
import { ButtonProps, Spinner } from "theme-ui";
import buttonStyles from "../styles/buttons.module.css";

export interface LoadingThemeUiButtonProps extends ButtonProps {
  loading?: boolean;
}

export const LoadingThemeUiButton: React.FC<LoadingThemeUiButtonProps> = ({
  children,
  loading,
  ...buttonProps
}) => {
  return (
    <button className={buttonStyles.green} {...buttonProps} disabled={buttonProps.disabled || loading}>
      {children}
      {loading && (
        <Spinner
          height="1rem"
          width="1rem"
          color="currentColor"
          sx={{ marginLeft: "1rem", marginRight: "-0.75rem" }}
        />
      )}
    </button>
  );
};

export interface LoadingButtonProps
  extends React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> {
  loading?: boolean;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  loading,
  ...buttonProps
}) => {
  return (
    <button className={buttonStyles.normal} {...buttonProps} disabled={buttonProps.disabled || loading}>
      {children}
      {loading && (
        <Spinner
          height="1rem"
          width="1rem"
          color="currentColor"
          sx={{ marginLeft: "1rem", marginRight: "-0.75rem" }}
        />
      )}
    </button>
  );
};
