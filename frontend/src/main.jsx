import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import L from "leaflet";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import "./styles.css";
import "leaflet/dist/leaflet.css";

const markerIconUrl = "https://www.ippc.int/static/leaflet/images/marker-icon-2x.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconUrl,
  iconUrl: markerIconUrl,
  shadowUrl: ""
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
