import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AdminUserDTO } from "../../adminApi";
import UsersTab from "./UsersTab";

const listUsers = vi.fn();
const createUser = vi.fn();
const updateUser = vi.fn();
vi.mock("../../adminApi", () => ({
  listUsers: () => listUsers(),
  createUser: (...a: unknown[]) => createUser(...a),
  updateUser: (...a: unknown[]) => updateUser(...a),
}));

const USERS: AdminUserDTO[] = [
  { id: 1, email: "admin@riwi.co", isAdmin: true, isActive: true },
  { id: 2, email: "teacher@riwi.co", isAdmin: false, isActive: true },
];

function renderTab() {
  render(<UsersTab currentEmail="admin@riwi.co" requestConfirm={vi.fn()} setError={vi.fn()} />);
}

describe("UsersTab", () => {
  beforeEach(() => {
    listUsers.mockReset().mockResolvedValue(USERS);
    createUser.mockReset().mockResolvedValue({ id: 3, email: "new@riwi.co", isAdmin: false, isActive: true });
    updateUser.mockReset().mockResolvedValue({ ok: true });
  });

  it("lists existing accounts", async () => {
    renderTab();
    expect(await screen.findByText("admin@riwi.co")).toBeInTheDocument();
    expect(screen.getByText("teacher@riwi.co")).toBeInTheDocument();
  });

  it("creates an account with the entered email/password", async () => {
    renderTab();
    await screen.findByText("teacher@riwi.co"); // initial load done

    fireEvent.change(screen.getByPlaceholderText("teacher@riwi.co"), { target: { value: "new@riwi.co" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "longenoughpw" } });
    fireEvent.click(screen.getByRole("button", { name: /Create account/ }));

    await waitFor(() => expect(createUser).toHaveBeenCalledWith("new@riwi.co", "longenoughpw", false));
  });

  it("disables create until email + an 8-char password are present", async () => {
    renderTab();
    await screen.findByText("teacher@riwi.co");
    const btn = screen.getByRole("button", { name: /Create account/ });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("teacher@riwi.co"), { target: { value: "x@riwi.co" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "short" } });
    expect(btn).toBeDisabled(); // password too short
  });
});
