import "./lib/error-capture";
// Re-exports TanStack Start's SSR handler; Vinxi wraps this for the Vercel preset
export { default } from "@tanstack/react-start/server-entry";
