/** @jsxImportSource theme-ui */
import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { Flex, Button, Paragraph, Heading, Input, Label } from "theme-ui";

const AuthenticatedContext = createContext<boolean>(false);
const LogInContext = createContext<(password: string) => void>(() => undefined);

export const useAuthentication = () => {
  const authenticated = useContext(AuthenticatedContext);
  const logIn = useContext(LogInContext);

  return {
    authenticated,
    logIn
  };
};

const getPasswordCookieValue = (cookieString: typeof document.cookie) => {
  const cookieValue = cookieString
    .split("; ")
    .find(row => row.startsWith("hliquity_password="))
    ?.split("=")[1];

  return cookieValue;
};

export const AuthenticationProvider: React.FC<{
  loginForm: ReactNode;
}> = ({ children, loginForm: loginForm }) => {
  const [encodedPassword, setCookieValue] = useState<string | undefined>(
    getPasswordCookieValue(document.cookie)
  );

  const authenticated = encodedPassword === import.meta.env.VITE_HLIQUITY_PASSWORD;

  const logIn = (password: string) => {
    const encodedPassword = btoa(password);

    const authenticated = encodedPassword === import.meta.env.VITE_HLIQUITY_PASSWORD;
    if (!authenticated) {
      throw `wrong password`;
    }

    // secure, same-site cookie that expires in a year
    document.cookie = `hliquity_password=${encodedPassword}; max-age=31536000; SameSite=Strict; Secure`;
    setCookieValue(encodedPassword);
  };

  return (
    <AuthenticatedContext.Provider value={authenticated}>
      <LogInContext.Provider value={logIn}>
        {!authenticated ? loginForm : children}
      </LogInContext.Provider>
    </AuthenticatedContext.Provider>
  );
};

export const LoginForm = () => {
  const [passwordInput, setPasswordInput] = useState("");
  const { logIn } = useAuthentication();

  return (
    <Flex
      sx={{
        flexDirection: "column",
        minHeight: "100%",
        justifyContent: "center",
        marginInline: "clamp(2rem, 100%, 50% - 12rem)"
      }}
    >
      <Heading>Log in</Heading>

      <Paragraph sx={{ marginTop: "1rem" }}>
        This front end is not available to the public yet.
      </Paragraph>

      <form
        sx={{
          marginTop: "1.5rem",
          display: "flex",
          flexDirection: "column",
          minHeight: "100%",
          justifyContent: "center"
        }}
        onSubmit={event => {
          event.preventDefault();
          logIn(passwordInput);
        }}
      >
        <Label htmlFor="login-password-input">Password</Label>
        <Input
          id="login-password-input"
          placeholder="12345"
          onInput={event => setPasswordInput((event.target as HTMLInputElement).value)}
        />

        <Button type="submit" sx={{ marginTop: "2rem", alignSelf: "end" }}>
          Log in
        </Button>
      </form>
    </Flex>
  );
};
