import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AdminVersionDTO } from "@riwi-ept/shared";
import ScoringPanel from "./ScoringPanel";

const updateVersion = vi.fn();
vi.mock("../../adminApi", () => ({
  updateVersion: (...args: unknown[]) => updateVersion(...args),
}));

const VERSION: AdminVersionDTO = { id: 7, code: "B", name: "Version B", isActive: false, scoring: null };

function renderPanel(version: AdminVersionDTO = VERSION) {
  const onSaved = vi.fn();
  render(<ScoringPanel version={version} onSaved={onSaved} />);
  return { onSaved };
}

describe("ScoringPanel", () => {
  beforeEach(() => {
    updateVersion.mockReset().mockResolvedValue({ ok: true });
  });

  it("shows the defaults for the skills the version has", () => {
    renderPanel();
    expect(screen.getByLabelText("Issues a CEFR level")).toBeChecked();
    expect(screen.getByLabelText("Max levels above weakest skill")).toHaveValue(1);
    expect(screen.getByLabelText("Reading weight")).toHaveValue(1);
    expect(screen.getByLabelText("Writing weight")).toHaveValue(1);
    expect(screen.queryByLabelText("Listening weight")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Reading rung 5 min %")).toHaveValue(35);
  });

  it("saves the edited config as ratios", async () => {
    const { onSaved } = renderPanel({ ...VERSION, listeningEnabled: true });
    fireEvent.click(screen.getByLabelText("Issues a CEFR level"));
    fireEvent.change(screen.getByLabelText("Writing weight"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Max levels above weakest skill"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save scoring" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [id, body] = updateVersion.mock.calls[0];
    expect(id).toBe(7);
    expect(body.scoring.issuesLevel).toBe(false);
    expect(body.scoring.maxAboveWeakest).toBeNull();
    expect(body.scoring.weights).toEqual({ reading: 1, listening: 1, writing: 2 });
    expect(body.scoring.cutoffs.reading[4]).toEqual({ min: 0.35, level: "A2" });
    expect(Object.keys(body.scoring.cutoffs)).toEqual(["reading", "listening", "writing"]);
  });

  it("resets to defaults by sending null", async () => {
    const { onSaved } = renderPanel({ ...VERSION, scoring: { issuesLevel: false } });
    expect(screen.getByLabelText("Issues a CEFR level")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));
    await waitFor(() => expect(updateVersion).toHaveBeenCalledWith(7, { scoring: null }));
    expect(onSaved).toHaveBeenCalled();
  });

  it("surfaces the API validation message", async () => {
    updateVersion.mockRejectedValue(new Error("Invalid scoring: cutoffs.reading lowest rung must have min 0."));
    renderPanel();
    fireEvent.change(screen.getByLabelText("Reading rung 6 min %"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save scoring" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("lowest rung must have min 0");
  });

  it("adds and removes ladder rungs", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Remove Writing rung 1" }));
    expect(screen.queryByLabelText("Writing rung 6 min %")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add Writing rung" }));
    expect(screen.getByLabelText("Writing rung 6 min %")).toBeInTheDocument();
  });
});
