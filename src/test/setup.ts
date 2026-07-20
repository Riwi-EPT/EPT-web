// Vitest global setup for component tests.
// - jest-dom/vitest registers matchers (toBeInTheDocument, …) and their types.
// - Unmount React trees between tests so DOM state never leaks across specs.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
