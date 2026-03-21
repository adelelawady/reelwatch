import { useState } from "react";

export type AuthState = "logged_in" | "logged_out";

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>("logged_in");

  function onLoggedOut() {
    setAuthState("logged_out");
  }

  function onLoginComplete() {
    setAuthState("logged_in");
  }

  function logout() {
    setAuthState("logged_out");
  }

  return { authState, onLoggedOut, onLoginComplete, logout };
}
