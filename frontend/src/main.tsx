import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

if (!GOOGLE_CLIENT_ID) {
  console.error(
    "[Auth] VITE_GOOGLE_CLIENT_ID is not set. Google Sign-In will not work. " +
    "Add it to your .env file or deployment environment variables."
  );
}

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);
