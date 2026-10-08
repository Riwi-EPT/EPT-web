import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AudioAssetDTO } from "@riwi-ept/shared";

const registerAudioPlay = vi.fn();
const fetchAudioBlob = vi.fn();
vi.mock("../../api", async (importActual) => {
  const actual = await importActual<typeof import("../../api")>();
  return {
    ...actual,
    registerAudioPlay: (...args: unknown[]) => registerAudioPlay(...args),
    fetchAudioBlob: (...args: unknown[]) => fetchAudioBlob(...args),
  };
});

import AudioPlayer from "./AudioPlayer";
import { ApiError } from "../../api";

const TRACK: AudioAssetDTO = { id: 5, title: "Airport announcement", durationSeconds: 42, maxPlays: 2 };

beforeEach(() => {
  registerAudioPlay.mockReset();
  fetchAudioBlob.mockReset().mockResolvedValue(new Blob(["x"], { type: "audio/mpeg" }));
  // jsdom has neither object URLs nor media playback.
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

describe("AudioPlayer", () => {
  it("shows plays left and offers no seek control", () => {
    render(<AudioPlayer audio={TRACK} playsUsed={1} onPlayRegistered={vi.fn()} />);
    expect(screen.getByText("1 of 2 plays left")).toBeTruthy();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(document.querySelector("audio[controls]")).toBeNull();
  });

  it("is disabled once the plays are used up", () => {
    render(<AudioPlayer audio={TRACK} playsUsed={2} onPlayRegistered={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Play audio" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/No plays left/)).toBeTruthy();
  });

  it("registers the play with the server before playing", async () => {
    const onPlayRegistered = vi.fn();
    registerAudioPlay.mockResolvedValue({ playsUsed: 1, maxPlays: 2 });
    render(<AudioPlayer audio={TRACK} playsUsed={0} onPlayRegistered={onPlayRegistered} />);

    fireEvent.click(screen.getByRole("button", { name: "Play audio" }));
    await waitFor(() => expect(onPlayRegistered).toHaveBeenCalledWith(5, 1));
    expect(registerAudioPlay).toHaveBeenCalledWith(5);
    await waitFor(() => expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled());
  });

  it("syncs to the limit when the server says plays are exhausted", async () => {
    const onPlayRegistered = vi.fn();
    registerAudioPlay.mockRejectedValue(
      new ApiError(409, "used", { reason: "plays_exhausted", playsUsed: 2, maxPlays: 2 })
    );
    render(<AudioPlayer audio={TRACK} playsUsed={0} onPlayRegistered={onPlayRegistered} />);

    fireEvent.click(screen.getByRole("button", { name: "Play audio" }));
    await waitFor(() => expect(onPlayRegistered).toHaveBeenCalledWith(5, 2));
    expect(fetchAudioBlob).not.toHaveBeenCalled();
  });
});
