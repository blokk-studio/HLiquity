import React from "react";
import { Button, ButtonProps, Spinner } from "theme-ui";

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  loading,
  ...buttonProps
}) => {
  return (
    <Button {...buttonProps} disabled={buttonProps.disabled || loading}>
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
