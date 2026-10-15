import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  FileCode2,
  FolderOpen,
  Github,
  GitBranch,
  Layers,
  Map,
  Play,
  Plus,
  Settings,
  Shield,
  Terminal,
  Trophy,
  Upload,
  X,
  Zap,
  Download,
  Trash2,
  RotateCcw,
} from "lucide-react";
import type {
  Evaluation,
  Preferences,
  Project,
  SymbolInfo,
} from "./core/types";
import { explain, roadmap } from "./core/lessons";
import { folderImport, githubImport, zipImport } from "./core/import";
import {
  defaultPreferences,
  deleteProject,
  listProjects,
  loadPreferences,
  savePreferences,
  saveProject,
  saveAnalysisUpdate,
  saveRestorePlan,
  workerTask,
} from "./core/storage";
import { demoFiles } from "./core/demo";
import { cloud, cloudSave, cloudLoad, cloudDelete } from "./core/cloud";
import Companion from "./components/Companion";
import AccountPanel from "./components/AccountPanel";
import AdminPanel from "./components/AdminPanel";
import GithubRepositories from "./components/GithubRepositories";
import ConceptQuiz from "./components/ConceptQuiz";
import { exportProgress, mergeProgress } from "./core/progress";
import { planProjectRestore } from "./core/restorePlan";
import { useDialog } from "./core/useDialog";
import Avatar from "./components/Avatar";
import ProfileSettings from "./components/ProfileSettings";
import Appearance from "./components/Appearance";
import Community from "./components/Community";
import { applyPalette } from "./core/themes";
import { useWorkspaceTheme } from "./core/useWorkspaceTheme";
import ArchitectureFacts from "./components/ArchitectureFacts";
import InterviewPractice from "./components/InterviewPractice";
import {
  SourceWalkthrough,
  PredictionPractice,
  ProgressPanel,
} from "./components/LearningTools";
import { achievements, sourceHash } from "./core/curriculum";
import { reactionForResult, type PetEvent } from "./core/pet";
import { AnalysisSession } from "./core/analysisSession";
import { functionStub, parameterText } from "./core/functionStub";
import { ANALYSIS_VERSION } from "./core/analysisVersion";
const CodeEditor = lazy(() => import("./components/CodeEditor"));
const Graph = lazy(() => import("./components/Graph"));
const LivePreview = lazy(() => import("./components/LivePreview"));
type Page = "overview" | "workspace" | "campaign" | "settings" | "admin";
export default function App() {
  const reducedMotion = useReducedMotion();
  const [projects, setProjects] = useState<Project[]>([]),
    [active, setActive] = useState(""),
    [selected, setSelected] = useState(""),
    [page, setPage] = useState<Page>(
      window.location.pathname === "/admin" ? "admin" : "overview",
    ),
    [prefs, setPrefsState] = useState<Preferences>(defaultPreferences),
    [modal, setModal] = useState(false),
    [legal, setLegal] = useState(""),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [practice, setPractice] = useState(false),
    [exerciseMode, setExerciseMode] = useState<
      "rewrite" | "debug" | "refactor" | "completion" | "feature" | "build"
    >("rewrite"),
    [code, setCode] = useState(""),
    [result, setResult] = useState<Evaluation>(),
    [left, setLeft] = useState<"flow" | "source" | "preview">("flow"),
    [user, setUser] = useState(""),
    [filter, setFilter] = useState("");
  const [profileOpen, setProfileOpen] = useState(false),
    [split, setSplit] = useState(45);
  const activeTheme = useWorkspaceTheme(prefs.theme, prefs.followDeviceTheme);
  const [petEvent, setPetEvent] = useState<PetEvent>({ id: 0, state: "idle" });
  const importDialog = useDialog(modal, () => setModal(false), !!busy);
  const legalDialog = useDialog(!!legal, () => setLegal(""));
  const project = projects.find((p) => p.id === active),
    symbol =
      project?.analysis.symbols.find((s) => s.id === selected) ??
      project?.analysis.symbols[0];
  const file = project?.files.find((f) => f.path === symbol?.file);
  const evaluationKey = useRef("");
  const analysisSession = useRef<AnalysisSession | null>(null);
  useEffect(() => () => analysisSession.current?.dispose(), []);
  evaluationKey.current = `${active}:${selected}:${exerciseMode}:${code}`;
  const xp = projects.reduce((n, p) => n + p.completed.length * 100, 0),
    level = Math.floor(xp / 500) + 1;
  const folder = useRef<HTMLInputElement>(null),
    zip = useRef<HTMLInputElement>(null),
    backup = useRef<HTMLInputElement>(null),
    progressInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    Promise.all([listProjects(), loadPreferences()])
      .then(([ps, pr]) => {
        setProjects(ps);
        setPrefsState(pr);
        if (ps[0]) {
          setActive(ps[0].id);
          setSelected(ps[0].analysis.symbols[0]?.id ?? "");
        }
      })
      .catch((e) => setError(`Storage unavailable: ${String(e)}`));
    if (cloud) {
      cloud.auth.getUser().then(({ data }) => setUser(data.user?.email ?? ""));
      const { data } = cloud.auth.onAuthStateChange((_e, s) =>
        setUser(s?.user.email ?? ""),
      );
      return () => data.subscription.unsubscribe();
    }
  }, []);
  useEffect(() => {
    applyPalette(activeTheme);
    document.documentElement.dataset.motion = String(prefs.motion);
  }, [activeTheme, prefs.motion]);
  useEffect(() => {
    setPractice(false);
    setResult(undefined);
    setCode("");
  }, [selected, active]);
  function setPrefs(p: Preferences) {
    setPrefsState(p);
    void savePreferences(p).catch((e) => setError(String(e)));
  }
  useEffect(() => {
    if (
      !practice ||
      !project ||
      !symbol ||
      project.drafts[symbol.id] === code ||
      code.length > 16000 ||
      busy
    )
      return;
    const timer = setTimeout(() => {
      void persist({
        ...project,
        drafts: { ...project.drafts, [symbol.id]: code },
      }).catch((e) => setError(String(e)));
    }, 700);
    return () => clearTimeout(timer);
  }, [practice, project, symbol, code, busy]);
  async function persist(p: Project) {
    await saveProject(p);
    setProjects((ps) => [p, ...ps.filter((x) => x.id !== p.id)]);
  }
  async function guarded(fn: () => Promise<void>) {
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }
  async function importFiles(
    files: Project["files"],
    name: string,
    origin: string,
  ) {
    setBusy("Checking source snapshot…");
    const hash = await sourceHash(files);
    const existing = projects.find((p) => p.sourceHash === hash);
    if (existing) {
      if (existing.analysisVersion !== ANALYSIS_VERSION)
        await refreshAnalysis(existing);
      setActive(existing.id);
      setSelected(existing.analysis.symbols[0]?.id ?? "");
      setPage("campaign");
      setModal(false);
      setNotice(
        "This source snapshot is already imported. Resuming saved progress.",
      );
      return;
    }
    setBusy("Analyzing source in a separate worker…");
    const { analysis, reusedFiles, parsedFiles } = await indexFiles(files);
    const p: Project = {
      analysisVersion: ANALYSIS_VERSION,
      sourceHash: hash,
      id: crypto.randomUUID(),
      name,
      origin,
      importedAt: new Date().toISOString(),
      files,
      analysis,
      lessons: roadmap(analysis, prefs),
      completed: [],
      attempts: [],
      drafts: {},
    };
    await persist(p);
    setActive(p.id);
    setSelected(analysis.symbols[0]?.id ?? "");
    setModal(false);
    setPage("campaign");
    setNotice(
      `Indexed ${analysis.files} source files and ${analysis.symbols.length} declarations. Read ${parsedFiles} new or changed files; reused ${reusedFiles} unchanged files. Checked all source relationships.`,
    );
  }
  function indexFiles(files: Project["files"]) {
    analysisSession.current ??= new AnalysisSession(
      () =>
        new Worker(new URL("./workers/analyze.worker.ts", import.meta.url), {
          type: "module",
        }),
    );
    return analysisSession.current.request(files);
  }
  async function refreshAnalysis(snapshot: Project) {
    setBusy("Refreshing source analysis…");
    const { analysis } = await indexFiles(snapshot.files);
    const updated = await saveAnalysisUpdate(
      snapshot,
      analysis,
      roadmap(analysis, prefs),
    );
    setProjects((ps) => [updated, ...ps.filter((p) => p.id !== updated.id)]);
    setNotice(
      "Source analysis refreshed. Your drafts, notes and learning progress were kept.",
    );
  }
  function choose(s: SymbolInfo) {
    setSelected(s.id);
    setPage("workspace");
  }
  function startPractice() {
    setExerciseMode("rewrite");
    if (!symbol || !project) return;
    setPractice(true);
    setResult(undefined);
    setLeft("flow");
    setCode(
      project.drafts[symbol.id] ??
        functionStub(symbol, "Rebuild the behavior here."),
    );
  }
  async function run() {
    if (!symbol || !project) return;
    const key = evaluationKey.current;
    await guarded(async () => {
      setBusy(
        symbol.kind === "component"
          ? "Checking isolated initial renders…"
          : "Checking types and behavioral probes…",
      );
      const r = await workerTask<Evaluation>(
        symbol.kind === "component"
          ? new Worker(
              new URL("./workers/componentPractice.worker.ts", import.meta.url),
              { type: "module" },
            )
          : new Worker(
              new URL("./workers/evaluate.worker.ts", import.meta.url),
              {
                type: "module",
              },
            ),
        {
          symbol,
          files: symbol.kind === "component" ? project.files : undefined,
          code,
          feature:
            exerciseMode === "feature" || exerciseMode === "build"
              ? "double-output"
              : undefined,
        },
        25000,
      );
      if (key !== evaluationKey.current) {
        setNotice(
          "Code or lesson changed during checks. Run checks again on the current draft.",
        );
        return;
      }
      setResult(r);
      const mission = exerciseMode === "feature" || exerciseMode === "build";
      const newly =
        r.passed && !mission && !project.completed.includes(symbol.id);
      const previouslyEarned = new Set(
        achievements(projects)
          .filter((a) => a.earned)
          .map((a) => a.id),
      );
      const withCompletion = {
        ...project,
        completed: newly
          ? [...project.completed, symbol.id]
          : project.completed,
      };
      const unlocked = achievements(
        projects.map((p) => (p.id === project.id ? withCompletion : p)),
      ).some((a) => a.earned && !previouslyEarned.has(a.id));
      await persist({
        ...project,
        drafts: { ...project.drafts, [symbol.id]: code },
        missions:
          mission && r.passed
            ? { ...project.missions, [symbol.id + ":double-output"]: true }
            : project.missions,
        attempts: mission
          ? project.attempts
          : [
              ...project.attempts.slice(-199),
              {
                symbolId: symbol.id,
                passed: r.passed,
                at: new Date().toISOString(),
                tests: r.cases.length,
                feedback: r.diagnostics.join(" "),
              },
            ],
        completed: newly
          ? [...project.completed, symbol.id]
          : project.completed,
      });
      setPetEvent((e) => ({
        id: e.id + 1,
        state: reactionForResult(r, unlocked),
      }));
      if (newly)
        setNotice("Behavior verified on tested inputs. +100 XP earned.");
      else if (mission && r.passed)
        setNotice(
          "Feature mission passed the transformed reference probes. Saved separately from original-function mastery.",
        );
    });
  }
  async function remove(p: Project) {
    if (!window.confirm(`Delete ${p.name} and its progress from this device?`))
      return;
    await guarded(async () => {
      await deleteProject(p.id);
      analysisSession.current?.dispose();
      setProjects((ps) => ps.filter((x) => x.id !== p.id));
      if (active === p.id) setActive("");
    });
  }
  function downloadData(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  function download(p: Project) {
    downloadData(p, `reporecode-full-project-${p.id}.json`);
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("overview");
          }}
        >
          <span className="brand-mark">
            r<span>↗</span>
          </span>
          <span>
            repo<span className="brand-light">recode</span>
            <small>LEARN IT. RECODE IT. MASTER IT.</small>
          </span>
        </a>
        <div className="workspace-label">
          YOUR WORKSPACE <span>LOCAL</span>
        </div>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "overview", label: "Overview", icon: Layers },
              { id: "campaign", label: "Learning path", icon: Map },
              { id: "workspace", label: "Code workspace", icon: Code2 },
              { id: "settings", label: "Preferences", icon: Settings },
            ] as const
          ).map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "nav-item active" : "nav-item"}
              onClick={() => setPage(n.id)}
            >
              <n.icon size={17} />
              {n.label}
              {page === n.id && <span className="active-marker" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-projects">
          <div className="workspace-label">
            PROJECTS
            <button aria-label="Import project" onClick={() => setModal(true)}>
              <Plus size={15} />
            </button>
          </div>
          {projects.length ? (
            projects.map((p) => (
              <button
                key={p.id}
                className={`project-link ${active === p.id ? "selected" : ""}`}
                onClick={() => {
                  setActive(p.id);
                  setSelected(p.analysis.symbols[0]?.id ?? "");
                  setPage("campaign");
                }}
              >
                <span className="project-dot" />
                {p.name.split("/").pop()}
                <ChevronRight size={13} />
              </button>
            ))
          ) : (
            <p className="empty-small">
              Your next learning journey
              <br />
              starts with your own code.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="rank">
            <span className="rank-icon">
              <Shield size={21} />
            </span>
            <div>
              <b>Level {level} Explorer</b>
              <small>
                {xp} XP · {500 - (xp % 500)} to next level
              </small>
            </div>
          </div>
          <div className="progress-track">
            <span style={{ width: `${(xp % 500) / 5}%` }} />
          </div>
          <p>
            <span className="online-dot" /> Device-local workspace
          </p>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={12} />
            <span>
              {page === "overview"
                ? "Overview"
                : page === "campaign"
                  ? "Learning path"
                  : page === "settings"
                    ? "Preferences"
                    : (project?.name ?? "Code workspace")}
            </span>
          </div>
          <div className="top-actions">
            <span className="version">DEVELOPER PREVIEW 0.1</span>
            <button
              className="avatar"
              aria-label="Account and profile settings"
              aria-expanded={profileOpen}
              onClick={() => setProfileOpen(!profileOpen)}
              style={{ background: prefs.color }}
            >
              <Avatar prefs={prefs} />
            </button>
            {profileOpen && (
              <div
                className="profile-menu"
                aria-label="Profile navigation"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setProfileOpen(false);
                }}
              >
                <b>{prefs.name || "Explorer"}</b>
                {[
                  { label: "Profile and preferences", page: "settings" },
                  { label: "Account security", page: "settings" },
                  {
                    label: "Learning progress and achievements",
                    page: "campaign",
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setPage(item.page as Page);
                      setProfileOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
                {user && (
                  <button
                    onClick={() =>
                      void cloud!.auth
                        .signOut({ scope: "local" })
                        .then(() => setProfileOpen(false))
                    }
                  >
                    Sign out
                  </button>
                )}
                <button onClick={() => setProfileOpen(false)}>
                  Close menu
                </button>
              </div>
            )}
          </div>
        </header>
        <main id="main" key={page} className="page-enter">
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {busy && (
            <div className="alert loading" role="status">
              <span className="spinner" />
              {busy}
            </div>
          )}
          {page === "overview" && (
            <>
              <motion.section
                className="welcome"
                initial={false}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="eyebrow">
                  <span /> LEARN IT. RECODE IT. MASTER IT.
                </p>
                <h1>
                  From “it works”
                  <br />
                  to <em>“I understand it.”</em>
                </h1>
                <p className="intro">
                  Turn your codebase into a learning journey.
                  <br />
                  Explore the logic. Rebuild the important parts. Make it yours.
                </p>
                <div className="hero-actions">
                  <button className="primary" onClick={() => setModal(true)}>
                    <Plus size={17} />
                    Import a project
                    <ArrowUpRight size={16} />
                  </button>
                  <button
                    className="text-button"
                    disabled={!!busy}
                    onClick={() =>
                      void guarded(() =>
                        importFiles(
                          demoFiles,
                          "Trail journal",
                          "Bundled React learning fixture",
                        ),
                      )
                    }
                  >
                    Explore the sample
                    <ArrowRight size={16} />
                  </button>
                </div>
                <motion.div
                  className="hero-art"
                  aria-hidden="true"
                  initial={
                    prefs.motion && !reducedMotion
                      ? { opacity: 0, y: 14 }
                      : false
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: prefs.motion && !reducedMotion ? 0.5 : 0,
                    ease: "easeOut",
                  }}
                >
                  <div className="code-tile tile-back">
                    <GitBranch size={35} />
                  </div>
                  <div className="code-tile tile-front">
                    <span>01 — DISCOVER</span>
                    <Code2 size={57} />
                    <div className="mini-lines">
                      <i />
                      <i />
                      <i />
                    </div>
                    <b>Code → clarity</b>
                  </div>
                  <div className="art-badge">
                    <Check size={16} />
                    EVIDENCE OVER GUESSWORK
                  </div>
                </motion.div>
              </motion.section>
              <section className="stat-strip">
                <div>
                  <span className="stat-icon">
                    <FolderOpen size={19} />
                  </span>
                  <b>{projects.length}</b>
                  <span>Projects imported</span>
                </div>
                <div>
                  <span className="stat-icon">
                    <Code2 size={19} />
                  </span>
                  <b>
                    {projects.reduce(
                      (n, p) => n + p.analysis.symbols.length,
                      0,
                    )}
                  </b>
                  <span>Declarations discovered</span>
                </div>
                <div>
                  <span className="stat-icon">
                    <CheckCircle2 size={19} />
                  </span>
                  <b>{projects.reduce((n, p) => n + p.completed.length, 0)}</b>
                  <span>Exercises completed</span>
                </div>
                <div>
                  <span className="stat-icon">
                    <Zap size={19} />
                  </span>
                  <b>{xp}</b>
                  <span>XP earned</span>
                </div>
              </section>
              <section className="section-heading">
                <div>
                  <p className="eyebrow">THE WORKBENCH</p>
                  <h2>
                    {projects.length
                      ? "Pick up where you left off"
                      : "A codebase is your curriculum"}
                  </h2>
                </div>
                <button className="text-button" onClick={() => setModal(true)}>
                  New project <Plus size={15} />
                </button>
              </section>
              <div className="project-grid">
                {projects.map((p) => (
                  <article className="project-card" key={p.id}>
                    <div className="card-top">
                      <span className="folder-icon">
                        <FolderOpen size={24} />
                      </span>
                      <span className="pill">{p.analysis.framework}</span>
                    </div>
                    <h3>{p.name}</h3>
                    <p>
                      {p.analysis.files} source files <span>·</span>{" "}
                      {p.analysis.symbols.length} declarations
                    </p>
                    <div className="card-progress">
                      <span>Practice candidates checked</span>
                      <b>
                        {p.completed.length} /{" "}
                        {
                          p.analysis.symbols.filter(
                            (s) =>
                              s.standalone ||
                              (s.kind === "component" && s.exported),
                          ).length
                        }
                      </b>
                    </div>
                    <div className="progress-track">
                      <span
                        style={{
                          width: `${Math.min(100, (p.completed.length / Math.max(1, p.analysis.symbols.filter((s) => s.standalone || (s.kind === "component" && s.exported)).length)) * 100)}%`,
                        }}
                      />
                    </div>
                    <button
                      className="card-open"
                      onClick={() => {
                        setActive(p.id);
                        setSelected(p.analysis.symbols[0]?.id ?? "");
                        setPage("campaign");
                      }}
                    >
                      Continue learning
                      <ArrowRight size={17} />
                    </button>
                  </article>
                ))}
                <button className="import-card" onClick={() => setModal(true)}>
                  <span className="import-plus">
                    <Plus size={28} />
                  </span>
                  <b>Bring your own code</b>
                  <span>GitHub repository, folder, or ZIP</span>
                  <small>React · JavaScript · TypeScript</small>
                </button>
              </div>
              <section className="journey">
                <div>
                  <p className="eyebrow">HOW YOU MAKE IT YOURS</p>
                  <h2>
                    A little less mystery.
                    <br />A lot more mastery.
                  </h2>
                </div>
                <ol>
                  {[
                    [
                      "01",
                      "Map the territory",
                      "Discover functions, components and the links between them.",
                    ],
                    [
                      "02",
                      "Learn in context",
                      "Follow source-grounded lessons from your actual project.",
                    ],
                    [
                      "03",
                      "Rebuild with confidence",
                      "Hide a function, rewrite it, and check its behavior.",
                    ],
                  ].map(([n, t, d]) => (
                    <li key={n}>
                      <span>{n}</span>
                      <div>
                        <h3>{t}</h3>
                        <p>{d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          )}
          {page === "campaign" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR LEARNING CAMPAIGN</p>
                  <h1>{project?.name ?? "Choose your starting point"}</h1>
                  <p>
                    Source-grounded lessons, ordered from smaller functions
                    toward application context.
                  </p>
                </div>
                <button className="primary" onClick={() => setModal(true)}>
                  <Plus size={16} />
                  Import project
                </button>
              </div>
              {project ? (
                <>
                  <div className="campaign-summary">
                    <div>
                      <GitBranch size={22} />
                      <b>{project.analysis.framework}</b>
                      <span>{project.analysis.files} files indexed</span>
                    </div>
                    <div>
                      <Trophy size={22} />
                      <b>{project.completed.length * 100} XP</b>
                      <span>earned in this project</span>
                    </div>
                    <div>
                      <Shield size={22} />
                      <b>Static evidence</b>
                      <span>No runtime flow inferred</span>
                    </div>
                  </div>
                  <ProgressPanel projects={[project]} />
                  {project.analysisVersion !== ANALYSIS_VERSION && (
                    <section className="settings-card">
                      <h2>New practice support is available</h2>
                      <p>
                        Refresh this saved project's analysis to use the latest
                        supported exercises. Your source, drafts, notes and
                        progress stay on this device.
                      </p>
                      <button
                        className="secondary"
                        disabled={!!busy}
                        onClick={() =>
                          void guarded(() => refreshAnalysis(project))
                        }
                      >
                        {busy ? "Refreshing…" : "Refresh source analysis"}
                      </button>
                    </section>
                  )}
                  <ArchitectureFacts project={project} onSelect={choose} />
                  <div className="campaign-toolbar">
                    <h2>Your path to understanding</h2>
                    <input
                      placeholder="Find a lesson…"
                      aria-label="Find a lesson"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  </div>
                  <div className="lesson-list">
                    {project.lessons
                      .filter((l) =>
                        l.title.toLowerCase().includes(filter.toLowerCase()),
                      )
                      .map((l, i) => {
                        const s = project.analysis.symbols.find(
                          (s) => s.id === l.symbolId,
                        )!;
                        const done = project.completed.includes(s.id);
                        return (
                          <button
                            className={`lesson-row ${done ? "done" : ""}`}
                            style={{
                              animationDelay: `${Math.min(i, 8) * 25}ms`,
                            }}
                            key={l.id}
                            onClick={() => choose(s)}
                          >
                            <span className="lesson-number">
                              {done ? (
                                <Check size={18} />
                              ) : (
                                String(i + 1).padStart(2, "0")
                              )}
                            </span>
                            <div>
                              <span className="eyebrow">
                                {l.concept}{" "}
                                <span className="lesson-status">
                                  {done
                                    ? "PROBES PASSED"
                                    : s.standalone ||
                                        (s.kind === "component" && s.exported)
                                      ? "STUDY + PRACTICE"
                                      : "SOURCE STUDY"}
                                </span>
                              </span>
                              <h3>{l.title}</h3>
                              <p>
                                {s.file}:{s.line} · {s.parameters.length} inputs
                              </p>
                            </div>
                            <span className="lesson-reward">
                              {s.standalone ||
                              (s.kind === "component" && s.exported)
                                ? "100 XP"
                                : "Read"}
                              <ArrowUpRight size={18} />
                            </span>
                          </button>
                        );
                      })}
                  </div>
                  {!project.lessons.length && (
                    <p className="empty-panel">
                      No supported declarations found. Try importing a module
                      with named functions.
                    </p>
                  )}
                  {project.analysis.diagnostics.length > 0 && (
                    <details>
                      <summary>
                        Source diagnostics (
                        {project.analysis.diagnostics.length})
                      </summary>
                      <pre>{project.analysis.diagnostics.join("\n")}</pre>
                    </details>
                  )}
                </>
              ) : (
                <Empty onImport={() => setModal(true)} />
              )}
            </>
          )}
          {page === "workspace" && (
            <>
              {project && symbol ? (
                <>
                  <div className="workspace-heading">
                    <div>
                      <p className="eyebrow">
                        {practice
                          ? "REBUILD THE LOGIC"
                          : "UNDERSTAND THE SOURCE"}
                      </p>
                      <h1>
                        {symbol.name}
                        <span className="pill">{symbol.kind}</span>
                      </h1>
                    </div>
                    <select
                      aria-label="Select symbol"
                      value={symbol.id}
                      onChange={(e) => setSelected(e.target.value)}
                    >
                      {project.analysis.symbols.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.file}:{s.line}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="workspace-resize">
                    Panel width
                    <input
                      type="range"
                      min="32"
                      max="60"
                      value={split}
                      onChange={(e) => setSplit(Number(e.target.value))}
                    />
                  </label>
                  <div
                    className="learning-workspace"
                    style={
                      { "--context-width": `${split}%` } as React.CSSProperties
                    }
                  >
                    <section className="context-pane">
                      <div className="pane-tabs">
                        <button
                          className={left === "flow" ? "active" : ""}
                          onClick={() => setLeft("flow")}
                        >
                          <GitBranch size={14} />
                          Technical flow
                        </button>
                        <button
                          className={left === "source" ? "active" : ""}
                          onClick={() => setLeft("source")}
                        >
                          <FileCode2 size={14} />
                          Source context
                        </button>
                        <button
                          className={left === "preview" ? "active" : ""}
                          onClick={() => setLeft("preview")}
                        >
                          <Play size={14} />
                          Live preview
                        </button>
                      </div>
                      {left === "flow" ? (
                        <Suspense fallback={<p>Loading graph…</p>}>
                          <Graph project={project} onSelect={setSelected} />
                        </Suspense>
                      ) : left === "source" ? (
                        <div className="source-context">
                          <p className="eyebrow">{symbol.file}</p>
                          <pre>
                            {practice
                              ? `${file?.content.slice(0, symbol.start)}\n/* ${symbol.name} hidden for practice */\n${file?.content.slice(symbol.end)}`
                              : file?.content}
                          </pre>
                        </div>
                      ) : (
                        <Suspense fallback={<p>Loading isolated preview…</p>}>
                          <LivePreview
                            project={project}
                            selected={symbol}
                            draft={practice ? code : undefined}
                            onSelect={setSelected}
                          />
                        </Suspense>
                      )}
                      <div className="source-evidence">
                        <Shield size={15} />
                        <div>
                          <b>Grounded in your source</b>
                          <p>
                            {symbol.file}:{symbol.line}–{symbol.endLine}
                            <br />
                            Imported{" "}
                            {new Date(project.importedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </section>
                    <section className="lesson-pane">
                      <div className="pane-tabs">
                        <button
                          className={!practice ? "active" : ""}
                          onClick={() => {
                            setPractice(false);
                            setResult(undefined);
                          }}
                        >
                          01 / Learn
                        </button>
                        <button
                          className={practice ? "active" : ""}
                          disabled={
                            !symbol.standalone &&
                            !(symbol.kind === "component" && symbol.exported)
                          }
                          onClick={startPractice}
                        >
                          02 / Practice
                        </button>
                        <span className="static-label">
                          {practice ? "ISOLATED EXECUTION" : "STATIC FACTS"}
                        </span>
                      </div>
                      {!practice ? (
                        <>
                          <div className="lesson-intro">
                            <h2>Get to know {symbol.name}</h2>
                            {explain(symbol).map((t, i) => (
                              <p key={i}>{t}</p>
                            ))}
                            <SourceWalkthrough symbol={symbol} />
                            {!!project.lessons.find((l) => l.id === symbol.id)
                              ?.prerequisites?.length && (
                              <div>
                                <h3>Explore its dependencies first</h3>
                                {project.lessons
                                  .find((l) => l.id === symbol.id)!
                                  .prerequisites!.map((id) => {
                                    const dependency =
                                      project.analysis.symbols.find(
                                        (s) => s.id === id,
                                      );
                                    return (
                                      dependency && (
                                        <button
                                          className="text-button"
                                          key={id}
                                          onClick={() => choose(dependency)}
                                        >
                                          {dependency.name} · {dependency.file}:
                                          {dependency.line}
                                        </button>
                                      )
                                    );
                                  })}
                              </div>
                            )}
                            <div className="concept-chips">
                              {symbol.concepts.map((c) => (
                                <span key={c}>{c}</span>
                              ))}
                            </div>
                          </div>
                          {symbol.standalone && (
                            <PredictionPractice
                              project={project}
                              symbol={symbol}
                              onSave={persist}
                            />
                          )}
                          <div className="editor-label">
                            <FileCode2 size={14} />
                            {symbol.file}
                            <span>READ ONLY</span>
                          </div>
                          <Suspense fallback={<pre>{symbol.code}</pre>}>
                            <CodeEditor
                              value={symbol.code}
                              readOnly
                              theme={activeTheme}
                              jsx={symbol.kind === "component"}
                            />
                          </Suspense>
                          <ConceptQuiz symbol={symbol} />
                          <InterviewPractice
                            key={symbol.id}
                            project={project}
                            symbol={symbol}
                            onSave={persist}
                          />
                          <div className="lesson-actions">
                            {symbol.standalone ? (
                              <>
                                <div className="button-row">
                                  <button
                                    className="secondary"
                                    disabled={!!busy}
                                    onClick={() =>
                                      void guarded(async () => {
                                        setBusy(
                                          "Preparing a missing-code exercise…",
                                        );
                                        const partial = await workerTask<
                                          string | null
                                        >(
                                          new Worker(
                                            new URL(
                                              "./workers/challenge.worker.ts",
                                              import.meta.url,
                                            ),
                                            { type: "module" },
                                          ),
                                          { symbol, kind: "completion" },
                                          30000,
                                        );
                                        if (!partial)
                                          throw Error(
                                            "No discriminating missing-code challenge was found. Use rewrite practice.",
                                          );
                                        setExerciseMode("completion");
                                        setPractice(true);
                                        setResult(undefined);
                                        setCode(partial);
                                      })
                                    }
                                  >
                                    Complete missing code
                                  </button>
                                  <button
                                    className="secondary"
                                    disabled={!!busy}
                                    onClick={() =>
                                      void guarded(async () => {
                                        setBusy(
                                          "Validating a source mutation against reference probes…",
                                        );
                                        const mutation = await workerTask<
                                          string | null
                                        >(
                                          new Worker(
                                            new URL(
                                              "./workers/challenge.worker.ts",
                                              import.meta.url,
                                            ),
                                            { type: "module" },
                                          ),
                                          symbol,
                                          30000,
                                        );
                                        if (!mutation)
                                          throw Error(
                                            "No verified mutation could be generated for this function. Use rewrite practice.",
                                          );
                                        setExerciseMode("debug");
                                        setPractice(true);
                                        setResult(undefined);
                                        setCode(mutation);
                                        setLeft("flow");
                                      })
                                    }
                                  >
                                    Fix a bug
                                  </button>
                                  <button
                                    className="secondary"
                                    onClick={() => {
                                      setExerciseMode("refactor");
                                      setPractice(true);
                                      setResult(undefined);
                                      setCode(symbol.code);
                                      setLeft("flow");
                                    }}
                                  >
                                    Refactor
                                  </button>
                                </div>
                                <div className="button-row">
                                  <button
                                    className="secondary"
                                    onClick={() => {
                                      setExerciseMode("feature");
                                      setPractice(true);
                                      setResult(undefined);
                                      setCode(symbol.code);
                                    }}
                                  >
                                    Modify a feature
                                  </button>
                                  <button
                                    className="secondary"
                                    disabled={
                                      !project.completed.includes(symbol.id)
                                    }
                                    onClick={() => {
                                      setExerciseMode("build");
                                      setPractice(true);
                                      setResult(undefined);
                                      setCode(
                                        functionStub(
                                          symbol,
                                          "Build the new behavior from its contract.",
                                        ),
                                      );
                                    }}
                                  >
                                    Independent mission{" "}
                                    {project.completed.includes(symbol.id)
                                      ? ""
                                      : "· locked"}
                                  </button>
                                </div>
                                <button
                                  className="primary"
                                  onClick={startPractice}
                                >
                                  Hide & rewrite
                                  <ArrowRight size={16} />
                                </button>
                              </>
                            ) : symbol.kind === "component" &&
                              symbol.exported ? (
                              <div>
                                <p className="muted">
                                  Reconstruct the initial rendered output for
                                  supported primitive props. Event behavior and
                                  later state changes are not graded.
                                </p>
                                <button
                                  className="primary"
                                  onClick={startPractice}
                                >
                                  Reconstruct component <ArrowRight size={16} />
                                </button>
                              </div>
                            ) : (
                              <p className="muted">{symbol.reason}</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="practice-brief">
                            <h2>
                              {exerciseMode === "debug"
                                ? "Repair"
                                : exerciseMode === "refactor"
                                  ? "Refactor"
                                  : "Rebuild"}{" "}
                              {symbol.name}
                            </h2>
                            <p>
                              {exerciseMode === "feature" ||
                              exerciseMode === "build"
                                ? "New requirement: return exactly twice the original function’s numeric output for the same inputs. Keep its name and parameters. This mission supports finite numeric returns; checks use the original reference output multiplied by two."
                                : symbol.kind === "component"
                                  ? "Preserve the component name and initial rendered DOM. Supported checks use up to six primitive-prop samples; they do not grade event behavior or later state."
                                  : "Preserve the function’s behavior and name."}{" "}
                              Equivalent implementations can pass. The original
                              is hidden while you practice.
                            </p>
                            <p className="muted">
                              Inputs: {parameterText(symbol) || "none"}
                            </p>
                            {symbol.practiceTypes && (
                              <details className="practice-types">
                                <summary>Input type definitions</summary>
                                <p>
                                  These source types are available while you
                                  practice.
                                </p>
                                <pre>{symbol.practiceTypes}</pre>
                              </details>
                            )}
                          </div>
                          <Suspense
                            fallback={
                              <textarea
                                aria-label="Practice code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                              />
                            }
                          >
                            <CodeEditor
                              value={code}
                              onChange={(v) => {
                                setCode(v);
                                setResult(undefined);
                              }}
                              theme={activeTheme}
                              jsx={symbol.kind === "component"}
                              typeContext={symbol.practiceTypes}
                            />
                          </Suspense>
                          <div className="practice-actions">
                            <button
                              className="text-button"
                              onClick={() => {
                                setCode(
                                  functionStub(symbol, "Your implementation"),
                                );
                                setResult(undefined);
                              }}
                            >
                              <RotateCcw size={14} />
                              Reset
                            </button>
                            <button
                              className="secondary"
                              onClick={() =>
                                void guarded(async () => {
                                  await persist({
                                    ...project,
                                    drafts: {
                                      ...project.drafts,
                                      [symbol.id]: code,
                                    },
                                  });
                                  setNotice("Draft saved on this device.");
                                })
                              }
                            >
                              Save draft
                            </button>
                            <button
                              className="primary"
                              disabled={!!busy}
                              onClick={() => void run()}
                            >
                              <Play size={14} />
                              Run checks
                            </button>
                          </div>
                          {result && (
                            <section
                              className={`test-results ${result.passed ? "passed" : "failed"}`}
                              aria-live="polite"
                            >
                              <h3>
                                {result.passed ? (
                                  <CheckCircle2 size={18} />
                                ) : (
                                  <Terminal size={18} />
                                )}{" "}
                                {result.passed
                                  ? symbol.kind === "component"
                                    ? "Initial render verified"
                                    : "Behavior verified"
                                  : result.supported
                                    ? "Keep going — check the feedback"
                                    : "Evaluation unavailable"}
                              </h3>
                              {result.diagnostics.map((d, i) => (
                                <p key={i}>{d}</p>
                              ))}
                              {result.cases
                                .filter((c) => !c.passed)
                                .slice(0, 3)
                                .map((c, i) => (
                                  <div className="test-case" key={i}>
                                    <b>Input {c.input}</b>
                                    <code>Expected: {c.expected}</code>
                                    <code>Received: {c.actual}</code>
                                  </div>
                                ))}
                              <small>{result.note}</small>
                              {result.passed && (
                                <details>
                                  <summary>Compare with the original</summary>
                                  <pre>{symbol.code}</pre>
                                </details>
                              )}
                            </section>
                          )}
                        </>
                      )}
                    </section>
                  </div>
                </>
              ) : (
                <Empty onImport={() => setModal(true)} />
              )}
            </>
          )}
          {page === "settings" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">MAKE YOURSELF AT HOME</p>
                  <h1>Your workspace, your way.</h1>
                  <p>Preferences are saved on this device.</p>
                </div>
              </div>
              <div className="settings-grid">
                <AccountPanel />
                <ProfileSettings prefs={prefs} setPrefs={setPrefs} />
                <section className="settings-card">
                  <h2>Learning profile</h2>
                  <label>
                    Display name
                    <input
                      value={prefs.name}
                      maxLength={40}
                      onChange={(e) =>
                        setPrefs({ ...prefs, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Experience
                    <select
                      value={prefs.level}
                      onChange={(e) =>
                        setPrefs({
                          ...prefs,
                          level: e.target.value as Preferences["level"],
                        })
                      }
                    >
                      <option value="beginner">
                        Beginner — build the foundations
                      </option>
                      <option value="intermediate">
                        Intermediate — connect the pieces
                      </option>
                      <option value="advanced">
                        Advanced — examine the edge cases
                      </option>
                    </select>
                  </label>
                  <label>
                    Your goal
                    <select
                      value={prefs.goal}
                      onChange={(e) =>
                        setPrefs({
                          ...prefs,
                          goal: e.target.value as Preferences["goal"],
                        })
                      }
                    >
                      <option value="understand">Understand my project</option>
                      <option value="debug">Debug with confidence</option>
                      <option value="interview">
                        Prepare to explain my work
                      </option>
                    </select>
                  </label>
                  <button
                    className="secondary"
                    disabled={!project}
                    onClick={() =>
                      project &&
                      void guarded(async () => {
                        await persist({
                          ...project,
                          lessons: roadmap(project.analysis, prefs),
                        });
                        setNotice("Learning path updated.");
                      })
                    }
                  >
                    Update current learning path
                  </button>
                </section>
                <section className="settings-card">
                  <h2>Coding Pet</h2>
                  <label>
                    Companion
                    <select
                      value={prefs.tutor}
                      onChange={(e) =>
                        setPrefs({
                          ...prefs,
                          tutor: e.target.value as Preferences["tutor"],
                        })
                      }
                    >
                      <option value="robot">Echo / robot</option>
                      <option value="girl">Mira / girl</option>
                      <option value="boy">Kai / boy</option>
                    </select>
                  </label>
                  <label>
                    Avatar & companion color
                    <input
                      type="color"
                      value={prefs.color}
                      onChange={(e) =>
                        setPrefs({ ...prefs, color: e.target.value })
                      }
                    />
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={prefs.motion}
                      onChange={(e) =>
                        setPrefs({ ...prefs, motion: e.target.checked })
                      }
                    />
                    Enable gentle animations
                  </label>
                  <p className="muted">
                    Your system’s reduced-motion preference is also respected.
                  </p>
                </section>
                <section className="settings-card">
                  <h2>Account & cloud</h2>
                  <p>
                    {cloud
                      ? user ||
                        "Cloud identity configured. Sign in to sync explicitly."
                      : "This installation is in device-local mode. Google/GitHub login and cloud sync require Supabase configuration."}
                  </p>
                  {cloud && !user && (
                    <div className="button-row">
                      {(["google", "github"] as const).map((provider) => (
                        <button
                          className="secondary"
                          key={provider}
                          onClick={() =>
                            void guarded(async () => {
                              const { error } =
                                await cloud!.auth.signInWithOAuth({
                                  provider,
                                  options: {
                                    redirectTo: window.location.origin,
                                  },
                                });
                              if (error) throw error;
                            })
                          }
                        >
                          Continue with {provider}
                        </button>
                      ))}
                    </div>
                  )}
                  {cloud && user && (
                    <>
                      <div className="button-row">
                        <button
                          className="secondary"
                          disabled={!project}
                          onClick={() =>
                            project &&
                            void guarded(async () => {
                              await cloudSave(project);
                              setNotice(
                                "Project uploaded to your cloud account.",
                              );
                            })
                          }
                        >
                          Upload current project
                        </button>
                        <button
                          className="secondary"
                          onClick={() =>
                            void guarded(async () => {
                              const ps = await cloudLoad();
                              const restored: Project[] = [];
                              for (const raw of ps) {
                                const p = await workerTask<Project>(
                                  new Worker(
                                    new URL(
                                      "./workers/backup.worker.ts",
                                      import.meta.url,
                                    ),
                                    { type: "module" },
                                  ),
                                  { raw, prefs },
                                );
                                restored.push(p);
                              }
                              const plan = await planProjectRestore(
                                restored,
                                await listProjects(),
                              );
                              await saveRestorePlan(plan);
                              setProjects(await listProjects());
                              setNotice(
                                `Cloud restore complete: ${plan.added} added, ${plan.merged} merged, ${plan.conflictCopies} changed-source copies preserved separately. Existing local drafts and notes were kept.`,
                              );
                            })
                          }
                        >
                          Restore cloud projects
                        </button>
                      </div>
                      <div className="button-row">
                        <button
                          className="secondary"
                          onClick={() =>
                            void cloud!.auth.signOut({ scope: "local" })
                          }
                        >
                          Sign out
                        </button>
                        <button
                          className="secondary"
                          onClick={() =>
                            void cloud!.auth.signOut({ scope: "global" })
                          }
                        >
                          Sign out all devices
                        </button>
                      </div>
                      <p className="muted">
                        Cloud upload sends source files to your configured
                        database. Account security controls are in the Account
                        security panel. Cloud integrations require live provider
                        verification.
                      </p>
                      <button
                        className="secondary danger"
                        disabled={!project}
                        onClick={() => {
                          if (
                            project &&
                            window.confirm(
                              "Delete the cloud copy of this project? The local copy will remain.",
                            )
                          )
                            void guarded(async () => {
                              await cloudDelete(project.id);
                              setNotice("Cloud project deleted.");
                            });
                        }}
                      >
                        Delete current cloud project
                      </button>
                    </>
                  )}
                </section>
                <Appearance prefs={prefs} setPrefs={setPrefs} />
                <Community />
                <section className="settings-card">
                  <h2>Your data</h2>
                  <h3>Portable learning progress</h3>
                  <p>
                    Move between the public site and a local copy for free.
                    Import the same source revision on the destination, then
                    merge this learning-only file. Source code, drafts, notes
                    and account data are excluded.
                  </p>
                  <div className="button-row">
                    <button
                      className="secondary"
                      disabled={!project}
                      onClick={() =>
                        project &&
                        void guarded(async () => {
                          downloadData(
                            await exportProgress(project),
                            "reporecode-progress.json",
                          );
                          setNotice(
                            "Learning-only progress exported. Keep a separate copy of your source.",
                          );
                        })
                      }
                    >
                      Export progress
                    </button>
                    <button
                      className="secondary"
                      disabled={!project}
                      onClick={() => progressInput.current?.click()}
                    >
                      Import progress
                    </button>
                  </div>
                  <input
                    ref={progressInput}
                    aria-label="Learning progress file"
                    type="file"
                    accept=".json"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && project)
                        void guarded(async () => {
                          if (f.size > 1024 * 1024)
                            throw Error("Progress file exceeds 1 MiB.");
                          await persist(
                            await mergeProgress(
                              project,
                              JSON.parse(await f.text()),
                            ),
                          );
                          setNotice(
                            "Progress merged. Existing drafts and notes were preserved; duplicate attempts were ignored.",
                          );
                        });
                      e.target.value = "";
                    }}
                  />
                  <h3>Full project backups · include source code</h3>
                  <button
                    className="secondary"
                    onClick={() => backup.current?.click()}
                  >
                    Restore an exported project
                  </button>
                  <input
                    ref={backup}
                    type="file"
                    accept=".json"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        void guarded(async () => {
                          if (f.size > 8 * 1024 * 1024)
                            throw Error("Backup exceeds 8 MiB.");
                          setBusy("Validating and rebuilding source index…");
                          const p = await workerTask<Project>(
                            new Worker(
                              new URL(
                                "./workers/backup.worker.ts",
                                import.meta.url,
                              ),
                              { type: "module" },
                            ),
                            { raw: JSON.parse(await f.text()), prefs },
                          );
                          if (
                            projects.some((local) => local.id === p.id) &&
                            !window.confirm(
                              "Replace this project's local source, drafts and progress with the full backup? Export your current copy first if you need to keep it.",
                            )
                          )
                            return;
                          await persist(p);
                          setActive(p.id);
                          setSelected(p.analysis.symbols[0]?.id ?? "");
                          setNotice(
                            "Project restored and source references rebuilt.",
                          );
                        });
                      e.target.value = "";
                    }}
                  />
                  <p>
                    Source files, attempts and drafts stay in this browser
                    unless you explicitly upload them. Full project backups
                    contain source and drafts; learning-only exports do not.
                    Explanations run locally in the learning workspace.
                  </p>
                  {projects.map((p) => (
                    <div className="data-row" key={p.id}>
                      <span>{p.name}</span>
                      <button
                        aria-label={`Export ${p.name}`}
                        onClick={() => download(p)}
                      >
                        <Download size={16} />
                      </button>
                      <button
                        aria-label={`Delete ${p.name}`}
                        onClick={() => void remove(p)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <p className="muted">
                    Clearing browser storage removes local progress. Export
                    before switching devices. Deleting a local project does not
                    delete an uploaded cloud copy.
                  </p>
                </section>
              </div>
            </>
          )}
          {page === "admin" && <AdminPanel />}
          <footer>
            <span>
              reporecode{" "}
              <span className="muted">/ built for understanding</span>
            </span>
            <div>
              <a href="/downloads/reporecode-source.zip" download>
                Source ZIP
              </a>
              {["Privacy", "Terms", "Security", "Support", "License"].map(
                (x) => (
                  <button key={x} onClick={() => setLegal(x)}>
                    {x}
                  </button>
                ),
              )}
            </div>
          </footer>
        </main>
      </div>
      <Companion
        prefs={prefs}
        setPrefs={setPrefs}
        event={petEvent}
        practicing={practice && page === "workspace"}
      />
      {modal && (
        <div
          className="modal-backdrop"
          onClick={() => !busy && setModal(false)}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            ref={importDialog}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close import"
              disabled={!!busy}
              onClick={() => setModal(false)}
            >
              <X size={20} />
            </button>
            <p className="eyebrow">START A NEW JOURNEY</p>
            <h2 id="import-title">Your project. Your curriculum.</h2>
            <p>
              Import JavaScript, TypeScript, or React source and local CSS. We
              never run install scripts or modify your original files.
            </p>
            <label>
              Public GitHub repository
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void guarded(async () => {
                    setBusy("Connecting to GitHub…");
                    const r = await githubImport(url, setBusy);
                    await importFiles(r.files, r.name, r.origin);
                  });
                }}
              >
                <Github size={19} />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/you/project"
                  required
                />
                <button className="primary" disabled={!!busy}>
                  Import
                  <ArrowRight size={15} />
                </button>
              </form>
            </label>
            <GithubRepositories onImport={importFiles} />
            <div className="import-divider">OR IMPORT FROM YOUR DEVICE</div>
            <div className="import-options">
              <button
                className="secondary"
                disabled={!!busy}
                onClick={() => folder.current?.click()}
              >
                <FolderOpen size={21} />
                <b>Choose a folder</b>
                <small>Source files only</small>
              </button>
              <button
                className="secondary"
                disabled={!!busy}
                onClick={() => zip.current?.click()}
              >
                <Upload size={21} />
                <b>Upload a ZIP</b>
                <small>Up to 5 MiB compressed</small>
              </button>
            </div>
            <input
              ref={folder}
              type="file"
              multiple
              {...({ webkitdirectory: "" } as Record<string, string>)}
              hidden
              onChange={(e) => {
                const fs = e.target.files;
                if (fs)
                  void guarded(async () => {
                    setBusy("Reading source files…");
                    await importFiles(
                      await folderImport(fs),
                      fs[0]?.webkitRelativePath.split("/")[0] ||
                        "Local project",
                      "Local folder",
                    );
                  });
                e.target.value = "";
              }}
            />
            <input
              ref={zip}
              type="file"
              accept=".zip"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f)
                  void guarded(async () => {
                    setBusy("Reading archive…");
                    if (f.size > 5 * 1024 * 1024)
                      throw Error("ZIP exceeds 5 MiB.");
                    await importFiles(
                      await workerTask<Project["files"]>(
                        new Worker(
                          new URL(
                            "./workers/import.worker.ts",
                            import.meta.url,
                          ),
                          { type: "module" },
                        ),
                        new Uint8Array(await f.arrayBuffer()),
                      ),
                      f.name.replace(/\.zip$/, ""),
                      "ZIP upload",
                    );
                  });
                e.target.value = "";
              }}
            />
            <p className="import-limit">
              <Shield size={14} />
              200 files · 128 KiB per file · 2 MiB total source
            </p>
            {busy && <p role="status">{busy}</p>}
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <button
              className="text-button sample-link"
              disabled={!!busy}
              onClick={() =>
                void guarded(() =>
                  importFiles(
                    demoFiles,
                    "Trail journal",
                    "Bundled React learning fixture",
                  ),
                )
              }
            >
              Just looking around? Open the sample project
              <ArrowRight size={15} />
            </button>
          </section>
        </div>
      )}
      {legal && (
        <div className="modal-backdrop" onClick={() => setLegal("")}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={legal}
            ref={legalDialog}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close document"
              onClick={() => setLegal("")}
            >
              <X />
            </button>
            <p className="eyebrow">
              DRAFT · HUMAN REVIEW REQUIRED BEFORE PUBLIC LAUNCH
            </p>
            <h2>{legal}</h2>
            <p>
              {legal === "Privacy"
                ? "Projects, preferences, drafts and results stay in this browser until deleted. Public imports contact GitHub; explicit cloud upload transfers source to your configured account. Learning explanations run locally and the Coding Pet is silent. Feedback sends only the fields you submit. Anonymous activity is off by default; if you opt in on a configured installation, a random browser identifier and activity day are sent, with no source, paths, answers or account identity. You can revoke it in Preferences. Inactive activity records expire after 30 days; a temporary hashed revocation marker prevents late requests from recreating them. Device exports and deletion are available in Preferences."
                : legal === "Terms"
                  ? "This development release is provided for evaluation. Behavioral probes are limited and do not certify correctness, security, authorship or employment readiness. You must have permission to import and process source code. A public service agreement requires owner and legal review."
                  : legal === "Security"
                    ? "Source is parsed as untrusted data. Practice code runs in a disposable QuickJS WebAssembly runtime inside a worker, with time and memory limits and no host filesystem or network bridges. Full-project execution is disabled. This preview has not received an independent security assessment. Read SECURITY.md in the source distribution for limitations and reporting guidance."
                    : legal === "Support"
                      ? "Installation, troubleshooting and API documentation are included in the source distribution. A public support address and GitHub repository URL have not been configured. No message will be sent from this form."
                      : "RepoRecode is licensed under the MIT License, approved by the project owner. You may use, modify and redistribute it subject to preserving the copyright and license notice. Third-party packages retain their own licenses. See LICENSE and THIRD_PARTY_NOTICES.md in the source distribution."}
            </p>
            <button className="secondary" onClick={() => setLegal("")}>
              Back to workspace
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
function Empty({ onImport }: { onImport: () => void }) {
  return (
    <section className="empty-panel">
      <BookOpen size={40} />
      <h2>Every project has something to teach you.</h2>
      <p>Import a codebase to create your first learning path.</p>
      <button className="primary" onClick={onImport}>
        <Plus size={16} />
        Import a project
      </button>
    </section>
  );
}
