import type { ThemeId } from "./themes";
export type SourceFile = { path: string; content: string };
export type SymbolInfo = {
  id: string;
  name: string;
  file: string;
  kind: "function" | "component" | "class" | "interface" | "type" | "method";
  start: number;
  end: number;
  line: number;
  endLine: number;
  code: string;
  practiceTypes?: string;
  typeParameters?: string;
  parameters: { name: string; type: string; declaration?: string }[];
  calls: string[];
  concepts: string[];
  standalone: boolean;
  async?: boolean;
  reason?: string;
  exported: boolean;
  steps?: { line: number; text: string }[];
};
export type Edge = {
  source: string;
  target: string;
  kind: "imports" | "calls" | "renders";
  evidence: "static";
};
export type Analysis = {
  symbols: SymbolInfo[];
  edges: Edge[];
  dependencies: Record<string, string>;
  framework: string;
  diagnostics: string[];
  files: number;
  facts?: { file: string; line: number; kind: string; detail: string }[];
  stateFlow?: { relations: StateRelation[]; omitted: number };
  apiFlow?: ApiFlow;
};
export type ApiSite = {
  file: string;
  line: number;
  method: string;
  path: string;
};
export type ApiFlow = {
  requests: ApiSite[];
  routes: ApiSite[];
  links: { request: number; route: number; evidence: "candidate" }[];
  omitted: number;
};
export type StateRelation = {
  state: {
    file: string;
    line: number;
    name: string;
    hook: "useState" | "useReducer";
  };
  site: { file: string; line: number; label: string };
  kind: "update" | "read" | "derive" | "prop" | "handler";
  evidence: "static";
  via?: { file: string; line: number; name: string }[];
};
export type Lesson = {
  id: string;
  symbolId: string;
  title: string;
  concept: string;
  objectives: string[];
  prerequisite?: string;
  prerequisites?: string[];
};
export type Preferences = {
  level: "beginner" | "intermediate" | "advanced";
  goal: "understand" | "debug" | "interview";
  theme: ThemeId;
  followDeviceTheme?: boolean;
  tutor: "robot" | "girl" | "boy";
  color: string;
  muted: boolean;
  motion: boolean;
  name: string;
  visual: boolean;
  hair?: "short" | "long" | "none";
  outfit?: "jacket" | "hoodie" | "tee";
  accessory?: "none" | "glasses" | "cap";
  glasses?: boolean;
  cap?: boolean;
  skinColor?: string;
  hairColor?: string;
  background?: string;
  picture?: string;
  tutorHidden?: boolean;
  tutorSize?: "small" | "medium" | "large";
  tutorPosition?: "left" | "right";
  voiceStyle?:
    "mentor" | "friendly" | "energetic" | "robotic" | "commando" | "playful";
  voice?: string;
};
export type Attempt = {
  symbolId: string;
  passed: boolean;
  at: string;
  tests: number;
  feedback: string;
};
export type Project = {
  id: string;
  name: string;
  origin: string;
  importedAt: string;
  files: SourceFile[];
  analysis: Analysis;
  analysisVersion?: number;
  lessons: Lesson[];
  attempts: Attempt[];
  completed: string[];
  drafts: Record<string, string>;
  sourceHash?: string;
  predictions?: Record<string, boolean>;
  aiLessons?: Record<string, AiLesson>;
  missions?: Record<string, boolean>;
  notes?: Record<string, string>;
};
export type AiLesson = {
  summary: string;
  inputs: string;
  outputs: string;
  sideEffects: string;
  blocks: { file: string; line: number; explanation: string }[];
  commonMistakes: string[];
  questions: string[];
};
export type Evaluation = {
  passed: boolean;
  supported: boolean;
  diagnostics: string[];
  cases: {
    input: string;
    expected: string;
    expectedKey?: string;
    actual: string;
    passed: boolean;
  }[];
  note: string;
};
