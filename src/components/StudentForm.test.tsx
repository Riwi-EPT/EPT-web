import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StudentForm from "./StudentForm";

// Anti-cheat block check is now server-side (see api.ts checkBlockStatus).
const checkBlockStatus = vi.fn();
vi.mock("../api", () => ({
  checkBlockStatus: (...args: unknown[]) => checkBlockStatus(...args),
}));

describe("StudentForm — server-side block check", () => {
  beforeEach(() => {
    localStorage.clear();
    checkBlockStatus.mockReset();
  });

  it("shows the permanent block notice when the server reports the email as blocked", async () => {
    checkBlockStatus.mockResolvedValue({ blocked: true });
    render(<StudentForm onStart={vi.fn()} currentVersion="A" />);

    fireEvent.change(screen.getByPlaceholderText("e.g., student@riwi.co"), {
      target: { value: "cheater@example.com" },
    });

    await waitFor(() => expect(checkBlockStatus).toHaveBeenCalledWith("cheater@example.com"));
    await waitFor(() =>
      expect(document.getElementById("cheater-permanently-blocked-warning")).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /Start Placement Test/i })).toBeDisabled();
  });

  it("does not show the block notice for a clean email", async () => {
    checkBlockStatus.mockResolvedValue({ blocked: false });
    render(<StudentForm onStart={vi.fn()} currentVersion="A" />);

    fireEvent.change(screen.getByPlaceholderText("e.g., student@riwi.co"), {
      target: { value: "clean@example.com" },
    });

    await waitFor(() => expect(checkBlockStatus).toHaveBeenCalledWith("clean@example.com"));
    expect(document.getElementById("cheater-permanently-blocked-warning")).not.toBeInTheDocument();
  });

  it("fails open (does not block the form) if the status check errors", async () => {
    checkBlockStatus.mockRejectedValue(new Error("network down"));
    render(<StudentForm onStart={vi.fn()} currentVersion="A" />);

    fireEvent.change(screen.getByPlaceholderText("e.g., student@riwi.co"), {
      target: { value: "clean@example.com" },
    });

    await waitFor(() => expect(checkBlockStatus).toHaveBeenCalled());
    expect(document.getElementById("cheater-permanently-blocked-warning")).not.toBeInTheDocument();
  });
});

describe("StudentForm — evaluation date", () => {
  beforeEach(() => {
    localStorage.clear();
    checkBlockStatus.mockReset().mockResolvedValue({ blocked: false });
  });

  it("has no date field and stamps today's local date on start", async () => {
    const onStart = vi.fn();
    render(<StudentForm onStart={onStart} currentVersion="A" />);
    expect(screen.queryByText(/Evaluation Date/i)).not.toBeInTheDocument();
    expect(document.querySelector("input[type=date]")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("e.g., Kate Acosta"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByPlaceholderText("e.g., student@riwi.co"), { target: { value: "ana@example.com" } });
    const start = screen.getByRole("button", { name: /Start Placement Test/i });
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ date: today }));
  });
});
