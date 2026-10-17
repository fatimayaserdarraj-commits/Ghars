import { Redirect } from 'expo-router';

/**
 * Where Google / Apple / Facebook sign-in returns to (ghars://auth/callback). The in-app browser
 * finishes the sign-in itself; if the system opens this link instead, just go back into the app.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
