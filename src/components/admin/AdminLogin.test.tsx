import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminLogin from "./AdminLogin";

describe("AdminLogin", () => {
  it("submits the entered email and password", () => {
    const onSubmit = vi.fn();
    render(<AdminLogin onClose={vi.fn()} onSubmit={onSubmit} error={null} />);

    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "teacher@riwi.co" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "hunter2pw" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/ }));

    expect(onSubmit).toHaveBeenCalledWith("teacher@riwi.co", "hunter2pw");
  });

  it("shows the error message when provided", () => {
    render(<AdminLogin onClose={vi.fn()} onSubmit={vi.fn()} error="Invalid credentials." />);
    expect(screen.getByText("Invalid credentials.")).toBeInTheDocument();
  });
});
