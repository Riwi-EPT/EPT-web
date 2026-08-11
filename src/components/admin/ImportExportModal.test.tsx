import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AdminVersionDTO } from "@riwi-ept/shared";
import type { ExamBundle } from "../../adminApi";
import ImportExportModal from "./ImportExportModal";

const exportVersions = vi.fn();
const importVersions = vi.fn();
vi.mock("../../adminApi", () => ({
  exportVersions: (...args: unknown[]) => exportVersions(...args),
  importVersions: (...args: unknown[]) => importVersions(...args),
}));

// The download side effect is mocked rather than exercised: jsdom implements neither
// URL.createObjectURL nor a real anchor click. Keeping it in its own module is what
// makes that possible.
const downloadJson = vi.fn();
vi.mock("../../lib/downloadJson", () => ({
  downloadJson: (...args: unknown[]) => downloadJson(...args),
  exportFilename: (codes: string[]) => `ept-exam-versions_${codes.join("-")}_WITH-ANSWER-KEYS.json`,
}));

const VERSIONS: AdminVersionDTO[] = [
  { id: 1, code: "A", name: "Version A", isActive: true, durationSeconds: 3600 },
  { id: 2, code: "B", name: "Version B", isActive: false, durationSeconds: 1800 },
];

const BUNDLE: ExamBundle = {
  formatVersion: 1,
  exportedAt: "2026-08-11T00:00:00.000Z",
  versions: [
    {
      code: "A",
      name: "Version A",
      durationSeconds: 3600,
      questions: [
        {
          skill: "reading",
          type: "mcq",
          number: 1,
          position: 0,
          prompt: "q?",
          passageText: null,
          rubric: null,
          wordMin: null,
          wordMax: null,
          maxPoints: 1,
          timeLimitSeconds: null,
          options: [
            { key: "a", text: "no", isCorrect: false },
            { key: "b", text: "yes", isCorrect: true },
          ],
        },
      ],
    },
  ],
};

function renderModal(overrides: Partial<Parameters<typeof ImportExportModal>[0]> = {}) {
  const props = {
    versions: VERSIONS,
    onClose: vi.fn(),
    onImported: vi.fn(),
    setError: vi.fn(),
    ...overrides,
  };
  render(<ImportExportModal {...props} />);
  return props;
}

/** A File whose text() reliably resolves — jsdom's own implementation varies. */
function jsonFile(contents: unknown, name = "bundle.json") {
  const json = typeof contents === "string" ? contents : JSON.stringify(contents);
  const file = new File([json], name, { type: "application/json" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve(json) });
  return file;
}

describe("ImportExportModal — export", () => {
  beforeEach(() => {
    exportVersions.mockReset().mockResolvedValue(BUNDLE);
    importVersions.mockReset().mockResolvedValue({ imported: [] });
    downloadJson.mockReset();
  });

  it("lists every version, all selected by default", () => {
    renderModal();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    for (const box of screen.getAllByRole("checkbox")) expect(box).toBeChecked();
    expect(screen.getByRole("button", { name: /Export 2 versions/ })).toBeEnabled();
  });

  it("clears and re-selects all", () => {
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /Clear all/ }));
    for (const box of screen.getAllByRole("checkbox")) expect(box).not.toBeChecked();
    // Nothing selected => nothing to export.
    expect(screen.getByRole("button", { name: /Export no versions/ })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Select all/ }));
    for (const box of screen.getAllByRole("checkbox")) expect(box).toBeChecked();
  });

  it("exports only the ticked versions and hands the bundle to the downloader", async () => {
    renderModal();
    // Untick A, leaving B.
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Export 1 version/ }));

    await waitFor(() => expect(exportVersions).toHaveBeenCalledWith(["B"]));
    await waitFor(() => expect(downloadJson).toHaveBeenCalledTimes(1));
    const [filename, data] = downloadJson.mock.calls[0];
    expect(filename).toContain("WITH-ANSWER-KEYS");
    expect(data).toEqual(BUNDLE);
  });

  it("surfaces an export failure instead of downloading", async () => {
    exportVersions.mockRejectedValue(new Error("Unknown version code: ZZ."));
    const { setError } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: /Export 2 versions/ }));

    await waitFor(() => expect(setError).toHaveBeenCalledWith("Unknown version code: ZZ."));
    expect(downloadJson).not.toHaveBeenCalled();
  });
});

describe("ImportExportModal — import", () => {
  beforeEach(() => {
    exportVersions.mockReset().mockResolvedValue(BUNDLE);
    importVersions.mockReset();
    downloadJson.mockReset();
  });

  it("parses the chosen file, posts it, and reports what was created", async () => {
    importVersions.mockResolvedValue({
      imported: [{ code: "A-2", questionCount: 1, renamedFrom: "A" }],
    });
    const { onImported } = renderModal();

    fireEvent.change(screen.getByLabelText(/Exam version JSON file/), {
      target: { files: [jsonFile(BUNDLE)] },
    });

    await waitFor(() => expect(importVersions).toHaveBeenCalledWith(BUNDLE));
    expect(await screen.findByText(/renamed from A/)).toBeInTheDocument();
    expect(onImported).toHaveBeenCalledWith([
      { code: "A-2", questionCount: 1, renamedFrom: "A" },
    ]);
  });

  it("reports a non-JSON file without calling the API", async () => {
    const { setError } = renderModal();

    fireEvent.change(screen.getByLabelText(/Exam version JSON file/), {
      target: { files: [jsonFile("this is not json{", "notes.txt")] },
    });

    await waitFor(() => expect(setError).toHaveBeenCalledWith("That file isn't valid JSON."));
    expect(importVersions).not.toHaveBeenCalled();
  });

  it("surfaces the server's validation message verbatim", async () => {
    importVersions.mockRejectedValue(
      new Error("Version BAD, question 7: MCQ must have exactly one correct option.")
    );
    const { setError, onImported } = renderModal();

    fireEvent.change(screen.getByLabelText(/Exam version JSON file/), {
      target: { files: [jsonFile(BUNDLE)] },
    });

    await waitFor(() =>
      expect(setError).toHaveBeenCalledWith(
        "Version BAD, question 7: MCQ must have exactly one correct option."
      )
    );
    // A rejected import must not look like a success.
    expect(onImported).not.toHaveBeenCalled();
  });
});
