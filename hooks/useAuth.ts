// Simplified auth — assumes logged in by default since WebView persists cookies.
// The WebView natively saves the Instagram session between app launches.
// We only go to logged_out if the WebView actually lands on the login page.

import { useState } from "react";

export type AuthState = "logged_in" | "logged_out";

export function useAuth() {
  // Default to logged_in — WebView cookie store persists sessions automatically.
  // If the user is actually logged out, the WebView will land on /accounts/login
  // and the injected JS will fire auth:logged_out to correct this.
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
