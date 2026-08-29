import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "@/components/error-boundary";
import "./index.css";

const nativeFetch = window.fetch.bind(window);
const artifactBasePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// The imported EMR client was authored at the domain root and calls /api/*.
// Keep those call sites intact while routing them to this artifact's isolated
// API under /ari-emr/api/* instead of the workspace-wide API service.
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === "string" && input.startsWith("/api")) {
    return nativeFetch(`${artifactBasePath}${input}`, init);
  }

  if (input instanceof Request && input.url.startsWith(`${window.location.origin}/api`)) {
    const rewritten = new Request(
      `${window.location.origin}${artifactBasePath}${new URL(input.url).pathname}${new URL(input.url).search}`,
      input,
    );
    return nativeFetch(rewritten, init);
  }

  return nativeFetch(input, init);
};

createRoot(document.getElementById("root")!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
