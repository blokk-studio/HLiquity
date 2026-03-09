import React from "react";
import { Button, ButtonProps, Spinner } from "theme-ui";

export interface LoadingThemeUiButtonProps extends ButtonProps {
  loading?: boolean;
}

export const LoadingThemeUiButton: React.FC<LoadingThemeUiButtonProps> = ({
  children,
  loading,
  ...buttonProps
}) => {
  return (
    <Button variant="success" {...buttonProps} disabled={buttonProps.disabled || loading}>
      {children}
      {loading && (
        <Spinner
          size={16}
          color="currentColor"
          sx={{ marginLeft: "1rem", marginRight: "-0.75rem" }}
        />
      )}
    </Button>
  );
};

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  loading,
  ...buttonProps
}) => {
  return (
    <Button variant="primary" {...buttonProps} disabled={buttonProps.disabled || loading}>
      {children}
      {loading && (
        <Spinner
          height="1rem"
          width="1rem"
          color="currentColor"
          sx={{ marginLeft: "1rem", marginRight: "-0.75rem" }}
        />
      )}
    </Button>
  );
};
