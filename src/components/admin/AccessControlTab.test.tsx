import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { BlockedEmailDTO } from "../../adminApi";
import AccessControlTab from "./AccessControlTab";

const listBlockedEmails = vi.fn();
const unblockEmail = vi.fn();
vi.mock("../../adminApi", () => ({
  listBlockedEmails: () => listBlockedEmails(),
  unblockEmail: (...args: unknown[]) => unblockEmail(...args),
}));

const ROW: BlockedEmailDTO = {
  id: 7,
  email: "cheater@example.com",
  name: "Cheater",
  reason: "Switched tabs",
  blockedAt: "2026-07-21 10:00:00",
};

function renderTab() {
  render(
    <AccessControlTab
      onEmailUnblocked={vi.fn()}
      onResetCooldown={vi.fn()}
      setError={vi.fn()}
    />
  );
}

describe("AccessControlTab — real server-side unblock", () => {
  beforeEach(() => {
    listBlockedEmails.mockReset().mockResolvedValue([ROW]);
    unblockEmail.mockReset().mockResolvedValue({ ok: true });
  });

  it("lists the blocked emails from the server", async () => {
    renderTab();
    expect(await screen.findByText("cheater@example.com")).toBeInTheDocument();
  });

  it("unblocking calls the admin API, removes the row, and shows a confirmation", async () => {
    renderTab();
    await screen.findByText("cheater@example.com");

    fireEvent.click(screen.getByRole("button", { name: /Unblock/ }));

    await waitFor(() => expect(unblockEmail).toHaveBeenCalledWith(7));
    await waitFor(() => expect(screen.queryByText("cheater@example.com")).not.toBeInTheDocument());
    expect(await screen.findByText(/Unblocked cheater@example.com/)).toBeInTheDocument();
  });

  it("notifies the parent (to un-stick the current session) when an unblock succeeds", async () => {
    const onEmailUnblocked = vi.fn();
    render(
      <AccessControlTab onEmailUnblocked={onEmailUnblocked} onResetCooldown={vi.fn()} setError={vi.fn()} />
    );
    await screen.findByText("cheater@example.com");

    fireEvent.click(screen.getByRole("button", { name: /Unblock/ }));

    await waitFor(() => expect(onEmailUnblocked).toHaveBeenCalledWith("cheater@example.com"));
  });

  it("shows an empty state when nothing is blocked", async () => {
    listBlockedEmails.mockResolvedValue([]);
    renderTab();
    expect(await screen.findByText(/No blocked emails/)).toBeInTheDocument();
  });
});
