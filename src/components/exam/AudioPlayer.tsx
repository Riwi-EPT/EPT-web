import { useEffect, useRef, useState } from "react";
import { Headphones, Play, Loader2 } from "lucide-react";
import type { AudioAssetDTO } from "@riwi-ept/shared";
import { ApiError, fetchAudioBlob, registerAudioPlay } from "../../api";
import { formatTimer } from "../../lib/format";

/** How long to wait for playback to actually start before showing an error. */
export const PLAY_START_TIMEOUT_MS = 8000;

export interface AudioPlayerProps {
  audio: AudioAssetDTO;
  playsUsed: number;
  onPlayRegistered: (audioId: number, playsUsed: number) => void;
}

/**
 * Play-only player: no seek bar, no pause, a "plays left" counter. Each Play
 * registers with the server BEFORE audio starts, so the limit holds across
 * reloads and tabs. The progress bar is display only.
 */
export default function AudioPlayer({ audio, playsUsed, onPlayRegistered }: AudioPlayerProps) {
  const elRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const playsLeft = Math.max(0, audio.maxPlays - playsUsed);

  // The file lives only in memory for the current play: released when the play
  // ends or the player unmounts, never offered as a link or a download.
  const release = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };

  // Leaving the question/section stops playback (the play stays spent).
  useEffect(
    () => () => {
      elRef.current?.pause();
      elRef.current = null;
      release();
    },
    []
  );

  const handlePlay = async () => {
    if (state !== "idle" || playsLeft === 0) return;
    setError(null);
    setState("loading");
    try {
      const res = await registerAudioPlay(audio.id);
      onPlayRegistered(audio.id, res.playsUsed);

      // The server hands out the bytes once per registered play.
      release();
      const url = URL.createObjectURL(await fetchAudioBlob(audio.id));
      urlRef.current = url;
      const el = new Audio(url);
      elRef.current = el;
      el.ontimeupdate = () => {
        setElapsed(el.currentTime);
        if (el.duration) setProgress(el.currentTime / el.duration);
      };
      el.onended = () => {
        setState("idle");
        setProgress(1);
        release();
      };
      // play() can stay pending forever (e.g. a hidden tab or a blocked output
      // device). Give up after a while so the player never spins indefinitely;
      // the play is already spent server-side either way.
      await Promise.race([
        el.play(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("play_timeout")), PLAY_START_TIMEOUT_MS)
        ),
      ]);
      setState("playing");
    } catch (err) {
      elRef.current?.pause();
      elRef.current = null;
      release();
      setState("idle");
      if (err instanceof ApiError && (err.body as { reason?: string } | null)?.reason === "plays_exhausted") {
        onPlayRegistered(audio.id, audio.maxPlays);
        return;
      }
      setError("The audio could not be played. Check your connection and headphones.");
    }
  };

  return (
    <div className="mb-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-3" data-testid="audio-player">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Headphones size={16} className="text-indigo-600" />
          {audio.title}
        </span>
        <span className="text-[11px] font-mono text-slate-500">
          {playsLeft} of {audio.maxPlays} plays left
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlay}
          disabled={state !== "idle" || playsLeft === 0}
          aria-label="Play audio"
          className="w-9 h-9 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {state === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
        </button>
        {/* Display only: deliberately not an <input type="range">, so there is nothing to seek with. */}
        <div className="flex-1 h-1.5 bg-indigo-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full bg-indigo-500 transition-[width]" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-[11px] font-mono text-slate-500 w-20 text-right">
          {formatTimer(Math.floor(elapsed))}
          {audio.durationSeconds ? ` / ${formatTimer(audio.durationSeconds)}` : ""}
        </span>
      </div>
      {playsLeft === 0 && state === "idle" && (
        <p className="text-[11px] text-slate-500">No plays left. You can still answer the questions.</p>
      )}
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
