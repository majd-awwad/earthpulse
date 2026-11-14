export type CellStatus = "measured" | "missing" | "below_threshold";
export type Level = "quick" | "advanced";
export type Mode = "discovery" | "learning";
export type Condition = "sound" | "text" | "both";
export type Phase = "intro" | "legend" | "listen" | "decode" | "reveal";
export type CellPosition = [row: number, col: number];
export type Heard = "low" | "mid" | "high" | "silent";

export interface DecodeCell {
  row: number;
  col: number;
  lat: number;
  lon: number;
  value: number | null;
  status: CellStatus;
  eventCount?: number;
}

export interface DecodeGrid {
  rows: number;
  cols: number;
  cells: DecodeCell[];
  truth: { rule: string; threshold: number; present: CellPosition[] };
  aggregation: string;
}

export interface DecodeCase {
  schema: "earthpulse.decode/2";
  id: string;
  phenomenon: "dust" | "smoke" | "lightning" | "fires";
  behavior: "continuous" | "intermittent";
  fixture: boolean;
  source: { product: string; version: string; url: string; doi?: string;
    granules: string[]; time: { start: string; end: string } };
  visualLink: { svs: string; image: string;
    relation: "SAME_DATA" | "SAME_MODEL_DIFFERENT_RUN" | "RELATED_CONTEXT"; note: string };
  unit: string;
  bounds: { north: number; south: number; east: number; west: number };
  levels: { quick: DecodeGrid; advanced: DecodeGrid };
}

export interface SpatialEvent {
  id: string;
  onsetS: number;
  row: number;
  col: number;
  tone: null | { frequencyHz: number; durationS: number; attackS: number; releaseS: number;
    gain: number; waveform: string; pan: number; voice: "tone" | "crackle"; pulses?: number[] };
  evidence: DecodeCell & { unit: string; mappingVersion: string };
}

export interface SpatialPlan {
  caseId: string;
  level: Level;
  mappingVersion: string;
  mode: "legend" | "sweep" | "row" | "cell" | "contrast";
  durationS: number;
  events: SpatialEvent[];
}

export interface Score {
  hits: number;
  misses: number;
  falseAlarms: number;
  precision: number;
  recall: number;
  f1: number;
  nearHits: number;
}

export interface TransportSnapshot {
  status: "idle" | "starting" | "playing" | "paused" | "ended";
  positionS: number;
  activeEventId: string | null;
  planRevision: number;
  awaitingOnset: boolean;
  speed: number;
  volume: number;
  muted: boolean;
  playback: "audio" | "silent";
  audioUnavailable: boolean;
}

export interface DecodeTransport {
  snapshot(): TransportSnapshot;
  subscribe(listener: (snapshot: TransportSnapshot) => void): () => void;
  load(plan: SpatialPlan, start?: number): void;
  play(mode?: "audio" | "silent", previewDuration?: number): Promise<void>;
  pause(): void;
  seek(positionS: number): void;
  replay(mode?: "audio" | "silent"): Promise<void>;
  setSpeed(speed: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
}

type PublicCell = Pick<DecodeCell, "row" | "col" | "lat" | "lon"> & { value?: never; status?: never; eventCount?: never };
type EvidenceCell = Pick<DecodeCell, "row" | "col" | "lat" | "lon" | "value" | "status">;
type SessionGrid<T> = { rows: number; cols: number; cells: T[] };
type SessionBase = { caseId: string; behavior: DecodeCase["behavior"]; level: Level; condition: Condition;
  focus: CellPosition; guesses: CellPosition[]; expectedCount: number;
  lastProbe: null | { row: number; col: number; heard: Heard }; planRevision: number; transport: TransportSnapshot };

export type SessionSnapshot = SessionBase & (
  | { mode: "discovery"; phase: Exclude<Phase, "reveal">; grid: SessionGrid<PublicCell>; visualLink: null; score: null }
  | { mode: "discovery"; phase: "reveal"; grid: SessionGrid<EvidenceCell>; visualLink: DecodeCase["visualLink"]; score: Score }
  | { mode: "learning"; phase: Phase; grid: SessionGrid<EvidenceCell>; visualLink: DecodeCase["visualLink"] | null; score: null }
);

export type DecodeIntent =
  | { type: "select-case"; id: string }
  | { type: "set-level"; level: Level }
  | { type: "set-mode"; mode: Mode }
  | { type: "play"; mode: "legend" | "sweep" | "row" | "contrast" }
  | { type: "probe" | "focus" | "toggle"; row: number; col: number }
  | { type: "pause" | "replay" | "submit" | "next" | "reset" };

export interface DecodeSession {
  dispatch(intent: DecodeIntent): void | Promise<void>;
  subscribe(listener: (snapshot: SessionSnapshot) => void): () => void;
  getState(): SessionSnapshot;
}

// Named runtime exports supplied by the listed owners.
export type ValidateDecodeCase = (json: unknown) => DecodeCase; // Majd
export type LoadDecodeCase = (id: string, options?: { baseUrl?: URL | string }) => Promise<DecodeCase>; // Mohammad
export type MakeSpatialPlan = (data: DecodeCase, options: {
  level: Level; mode: SpatialPlan["mode"]; row?: number; cells?: CellPosition[]; waveform?: string;
}) => SpatialPlan; // Andreh
export type HeardClass = (data: DecodeCase, level: Level, row: number, col: number) => Heard; // Andreh
export type CreateDecodeSession = (options: {
  cases: string[]; loadCase: LoadDecodeCase; makePlan: MakeSpatialPlan; heardClass: HeardClass;
  transport: DecodeTransport;
  level?: Level; mode?: Mode; condition?: Condition;
}) => DecodeSession; // Yaman
export type ScoreGuesses = (truth: DecodeGrid["truth"], guesses: CellPosition[], options?: { tolerance?: number }) => Score; // Yaman
type Translate = (key: string, params?: Record<string, number | string>) => string;
type Mount = (root: HTMLElement, session: DecodeSession, options: { t: Translate }) => { dispose(): void };
export type MountDecodeGrid = Mount; // Israa
export type MountDecodeVisual = Mount; // Roaa
export type DecodeMessage = (lang: "ar" | "en", ...args: Parameters<Translate>) => string; // Israa
