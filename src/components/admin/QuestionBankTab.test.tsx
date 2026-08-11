import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AdminVersionDTO } from "@riwi-ept/shared";
import QuestionBankTab from "./QuestionBankTab";

const listVersions = vi.fn();
const createVersion = vi.fn();
const updateVersion = vi.fn();
const deleteVersion = vi.fn();
const activateVersion = vi.fn();
const listQuestions = vi.fn();
const exportVersions = vi.fn();
const importVersions = vi.fn();
vi.mock("../../adminApi", () => ({
  listVersions: () => listVersions(),
  createVersion: (...args: unknown[]) => createVersion(...args),
  updateVersion: (...args: unknown[]) => updateVersion(...args),
  deleteVersion: (...args: unknown[]) => deleteVersion(...args),
  activateVersion: (...args: unknown[]) => activateVersion(...args),
  listQuestions: (...args: unknown[]) => listQuestions(...args),
  createQuestion: vi.fn(),
  updateQuestion: vi.fn(),
  deleteQuestion: vi.fn(),
  // Reached through the ImportExportModal child. The factory must name every export
  // the component tree imports, or they resolve to undefined at import time.
  exportVersions: (...args: unknown[]) => exportVersions(...args),
  importVersions: (...args: unknown[]) => importVersions(...args),
}));

// jsdom has no URL.createObjectURL, so the modal's download side effect is mocked.
vi.mock("../../lib/downloadJson", () => ({
  downloadJson: vi.fn(),
  exportFilename: (codes: string[]) => `${codes.join("-")}.json`,
}));

const VERSION_A: AdminVersionDTO = {
  id: 1,
  code: "A",
  name: "Version A",
  isActive: true,
  durationSeconds: 3600,
};

function renderTab(setError = vi.fn()) {
  render(<QuestionBankTab requestConfirm={vi.fn()} setError={setError} />);
  return { setError };
}

describe("QuestionBankTab — per-version duration", () => {
  beforeEach(() => {
    listVersions.mockReset().mockResolvedValue([VERSION_A]);
    createVersion.mockReset().mockResolvedValue(VERSION_A);
    updateVersion.mockReset().mockResolvedValue({ ok: true });
    deleteVersion.mockReset().mockResolvedValue({ ok: true });
    activateVersion.mockReset().mockResolvedValue({ ok: true });
    listQuestions.mockReset().mockResolvedValue([]);
    exportVersions.mockReset().mockResolvedValue({
      formatVersion: 1,
      exportedAt: "2026-08-11T00:00:00.000Z",
      versions: [],
    });
    importVersions.mockReset().mockResolvedValue({ imported: [] });
  });

  it("shows the version's duration in minutes", async () => {
    renderTab();
    await screen.findByText("A");
    expect(await screen.findByLabelText(/Time limit in minutes for version A/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Time limit in minutes for version A/)).toHaveValue(60);
  });

  it("saves an edited duration in seconds on blur", async () => {
    renderTab();
    await screen.findByText("A");

    const input = await screen.findByLabelText(/Time limit in minutes for version A/);
    fireEvent.change(input, { target: { value: "25" } });
    // Still nothing sent — the edit commits on blur, not per keystroke.
    expect(updateVersion).not.toHaveBeenCalled();

    fireEvent.blur(input);
    await waitFor(() => expect(updateVersion).toHaveBeenCalledWith(1, { durationSeconds: 1500 }));
  });

  it("does not call the API when the duration is unchanged", async () => {
    renderTab();
    await screen.findByText("A");

    const input = await screen.findByLabelText(/Time limit in minutes for version A/);
    fireEvent.change(input, { target: { value: "60" } });
    fireEvent.blur(input);

    await waitFor(() => expect(listQuestions).toHaveBeenCalled());
    expect(updateVersion).not.toHaveBeenCalled();
  });

  it("rejects an out-of-range duration client-side without calling the API", async () => {
    const { setError } = renderTab();
    await screen.findByText("A");

    const input = await screen.findByLabelText(/Time limit in minutes for version A/);
    fireEvent.change(input, { target: { value: "999" } }); // > 480 min
    fireEvent.blur(input);

    await waitFor(() =>
      expect(setError).toHaveBeenCalledWith(expect.stringContaining("between 1 and 480"))
    );
    expect(updateVersion).not.toHaveBeenCalled();
  });

  it("opens the import/export modal from the sidebar, and selects the imported version", async () => {
    importVersions.mockResolvedValue({ imported: [{ code: "A-2", questionCount: 1 }] });
    // After the import, listVersions returns the newly created version too.
    listVersions
      .mockResolvedValueOnce([VERSION_A])
      .mockResolvedValue([
        VERSION_A,
        { id: 9, code: "A-2", name: "Version A", isActive: false, durationSeconds: 3600 },
      ]);

    renderTab();
    await screen.findByText("A");

    fireEvent.click(screen.getByRole("button", { name: /Import \/ Export/i }));
    // The modal is open (its own heading, not the sidebar's).
    expect(await screen.findByText(/Import \/ Export versions/)).toBeInTheDocument();

    const json = JSON.stringify({ formatVersion: 1, exportedAt: "x", versions: [] });
    const file = new File([json], "b.json", { type: "application/json" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(json) });
    fireEvent.change(screen.getByLabelText(/Exam version JSON file/), {
      target: { files: [file] },
    });

    // Questions are re-fetched for the imported version, i.e. the selection moved to it
    // (loadVersions alone would have kept the previous selection).
    await waitFor(() => expect(listQuestions).toHaveBeenCalledWith(9));
  });

  it("creates a new version with the chosen duration", async () => {
    renderTab();
    await screen.findByText("A");

    fireEvent.change(screen.getByPlaceholderText(/New code/), { target: { value: "E" } });
    fireEvent.change(screen.getByLabelText(/Time limit in minutes for the new version/), {
      target: { value: "45" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add version/i }));

    await waitFor(() => expect(createVersion).toHaveBeenCalledWith("E", "Version E", 2700));
  });
});
