import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest runs without globals, so Testing Library cannot register its own auto-cleanup.
afterEach(cleanup);

// jsdom has no layout engine, so scrollIntoView is missing; browsers implement it.
if (typeof Element !== "undefined") Element.prototype.scrollIntoView ??= () => {};
