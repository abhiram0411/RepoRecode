import type { SourceFile } from "./types";
export const demoFiles: SourceFile[] = [
  {
    path: "package.json",
    content: JSON.stringify({
      name: "trail-journal",
      dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
    }),
  },
  {
    path: "src/lib/progress.ts",
    content: `/** Convert completed trail stages into a bounded percentage. */
export function completionRate(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

/** Choose the next milestone from the current score. */
export function nextMilestone(score: number): number {
  return (Math.floor(Math.max(0, score) / 100) + 1) * 100;
}
`,
  },
  {
    path: "src/components/TrailCard.tsx",
    content: `import { completionRate } from '../lib/progress';
type Props = { title: string; completed: number; total: number };
export function TrailCard({ title, completed, total }: Props) {
  const percent = completionRate(completed, total);
  return <article><h2>{title}</h2><progress value={percent} max={100} /><p>{percent}% complete</p></article>;
}
`,
  },
  {
    path: "src/App.tsx",
    content: `import { useState } from 'react';
import { TrailCard } from './components/TrailCard';
export default function App() {
  const [completed, setCompleted] = useState(0);
  return <main><h1>Trail journal</h1><TrailCard title="Ridge loop" completed={completed} total={5} /><button onClick={() => setCompleted(completed + 1)}>Complete a stage</button></main>;
}
`,
  },
];
