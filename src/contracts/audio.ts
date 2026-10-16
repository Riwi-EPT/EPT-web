// Listening audio: delivery and per-attempt play tracking.

/** An audio track as delivered to the candidate (no transcript). */
export interface AudioAssetDTO {
  id: number;
  title: string;
  durationSeconds: number | null;
  /** How many times one attempt may play this track. */
  maxPlays: number;
}

/** POST /api/exam/audio/:id/play — registers one play before it starts. */
export interface PlayAudioRequest {
  attemptToken: string;
}

export interface PlayAudioResponse {
  playsUsed: number;
  maxPlays: number;
}

/** GET /api/exam/audio/plays — the plays already used in this attempt. */
export interface AudioPlaysResponse {
  plays: { audioId: number; playsUsed: number }[];
}
