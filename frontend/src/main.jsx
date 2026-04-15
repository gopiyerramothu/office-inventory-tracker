import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_bULOAvHrw",
  client_id: "qqju6e883rfi23glmc8rl2t5h",
  redirect_uri: window.location.origin,
  response_type: "code",
  scope: "aws.cognito.signin.user.admin email openid profile",
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
