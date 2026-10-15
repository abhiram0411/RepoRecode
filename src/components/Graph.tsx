import { ReactFlow, Background, Controls, MarkerType } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Project } from "../core/types";
import { useState } from "react";
export default function Graph({
  project,
  onSelect,
}: {
  project: Project;
  onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState<"imports" | "calls" | "renders" | "state">(
    "imports",
  );
  const relationships = project.analysis.stateFlow?.relations ?? [];
  const [relationshipIndex, setRelationshipIndex] = useState(0);
  const selectedIndex = Math.min(
    relationshipIndex,
    Math.max(0, Math.min(60, relationships.length) - 1),
  );
  const selectedRelationship = relationships[selectedIndex];
  function selectSource(file: string, line: number) {
    const symbol = project.analysis.symbols
      .filter((s) => s.file === file && s.line <= line && s.endLine >= line)
      .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
    if (symbol) onSelect(symbol.id);
  }
  const stateNodes = new Map<
    string,
    { id: string; label: string; file: string; line: number }
  >();
  const stateEdges = relationships.slice(0, 60).map((r, i) => {
    const stateId = JSON.stringify([
      "state",
      r.state.file,
      r.state.line,
      r.state.name,
    ]);
    const siteId = JSON.stringify([
      "site",
      r.site.file,
      r.site.line,
      r.site.label,
    ]);
    stateNodes.set(stateId, {
      id: stateId,
      label: `${r.state.name} · ${r.state.hook} · line ${r.state.line}`,
      file: r.state.file,
      line: r.state.line,
    });
    stateNodes.set(siteId, {
      id: siteId,
      label: `${r.site.label} · line ${r.site.line}`,
      file: r.site.file,
      line: r.site.line,
    });
    const intoState = r.kind === "update" || r.kind === "handler";
    return {
      id: `state-${i}`,
      source: intoState ? siteId : stateId,
      target: intoState ? stateId : siteId,
      label: `#${i + 1}`,
      ariaLabel: `Relationship ${i + 1}: ${r.state.name} to ${r.site.label}`,
      detail:
        {
          update: "calls updater",
          handler: "updater prop reference",
          prop: "prop reference",
          derive: "initializer reference",
          read: "read reference",
        }[r.kind] +
        (r.via?.length ? ` via ${r.via.map((v) => v.name).join(" → ")}` : "") +
        " · static",
    };
  });
  const records =
    mode === "state"
      ? [...stateNodes.values()]
      : mode === "imports"
        ? project.files
            .filter((f) => /\.[jt]sx?$/.test(f.path))
            .map((f) => ({ id: f.path, label: f.path, file: f.path, line: 1 }))
        : project.analysis.symbols.map((s) => ({
            id: s.id,
            label: `${s.name} · ${s.file}:${s.line}`,
            file: s.file,
            line: s.line,
          }));
  const nodes = records.map((f, i) => ({
    id: f.id,
    position: { x: (i % 2) * 300, y: Math.floor(i / 2) * 145 },
    data: { label: f.label, file: f.file, line: f.line },
    style: {
      background: "var(--graph-node)",
      color: "var(--text)",
      border: "1px solid var(--line)",
      borderRadius: 6,
      width: 235,
      fontSize: 12,
      padding: 18,
    },
  }));
  const edges = (
    mode === "state"
      ? stateEdges
      : project.analysis.edges
          .filter((e) => e.kind === mode)
          .map((e, i) => ({
            ...e,
            id: String(i),
            label: `${mode} · static`,
          }))
  ).map((e) => ({
    ...e,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: "var(--graph-edge)",
      strokeWidth:
        mode === "state" && e.id === `state-${selectedIndex}` ? 3 : 1,
    },
    labelStyle: { fill: "var(--text)", fontSize: 10 },
    labelBgStyle: { fill: "var(--panel)" },
  }));
  return (
    <div className={`graph${mode === "state" ? " graph-state" : ""}`}>
      <div className="graph-controls">
        <button
          aria-pressed={mode === "imports"}
          onClick={() => setMode("imports")}
        >
          File imports
        </button>
        <button
          aria-pressed={mode === "calls"}
          onClick={() => setMode("calls")}
        >
          Resolved calls
        </button>
        <button
          aria-pressed={mode === "renders"}
          onClick={() => setMode("renders")}
        >
          Component tree
        </button>
        <button
          aria-pressed={mode === "state"}
          onClick={() => setMode("state")}
        >
          State relationships
        </button>
      </div>
      {mode === "state" && (
        <p className="muted state-graph-note">
          References to resolved React state bindings, with supported const
          chains. Arrows describe source relationships, not execution order or
          observed changes. Showing up to 60 relationships.
          {!relationships.length &&
            " No supported state relationships were found. Refresh older source analysis if needed."}
        </p>
      )}
      {mode === "state" && selectedRelationship && (
        <div className="state-graph-detail">
          <label>
            Inspect state relationship
            <select
              value={selectedIndex}
              onChange={(event) =>
                setRelationshipIndex(Number(event.target.value))
              }
            >
              {relationships.slice(0, 60).map((r, i) => (
                <option key={i} value={i}>
                  #{i + 1} · {r.state.name} → {r.site.label}
                </option>
              ))}
            </select>
          </label>
          <p aria-live="polite">{stateEdges[selectedIndex]?.detail}</p>
          <div className="state-graph-sources">
            <button
              onClick={() =>
                selectSource(
                  selectedRelationship.state.file,
                  selectedRelationship.state.line,
                )
              }
            >
              State: {selectedRelationship.state.file}:
              {selectedRelationship.state.line}
            </button>
            {selectedRelationship.via?.map((v, i) => (
              <button key={i} onClick={() => selectSource(v.file, v.line)}>
                Via {v.name}: {v.file}:{v.line}
              </button>
            ))}
            <button
              onClick={() =>
                selectSource(
                  selectedRelationship.site.file,
                  selectedRelationship.site.line,
                )
              }
            >
              Reference: {selectedRelationship.site.file}:
              {selectedRelationship.site.line}
            </button>
          </div>
        </div>
      )}
      <div className="graph-canvas">
        <ReactFlow
          key={mode}
          nodes={nodes}
          edges={edges}
          fitView
          nodesDraggable={false}
          onEdgeClick={(_, edge) => {
            if (mode === "state") {
              const index = stateEdges.findIndex((item) => item.id === edge.id);
              if (index >= 0) setRelationshipIndex(index);
            }
          }}
          onNodeClick={(_, n) => {
            const s =
              mode === "state"
                ? project.analysis.symbols
                    .filter(
                      (s) =>
                        s.file === n.data.file &&
                        s.line <= n.data.line &&
                        s.endLine >= n.data.line,
                    )
                    .sort((a, b) => a.end - a.start - (b.end - b.start))[0]
                : project.analysis.symbols.find((s) =>
                    mode === "imports" ? s.file === n.id : s.id === n.id,
                  );
            if (s) onSelect(s.id);
          }}
        >
          <Background color="var(--line)" gap={24} />
          <Controls />
        </ReactFlow>
      </div>
      <span className="graph-caption">
        Static {mode} · select a node to study
      </span>
    </div>
  );
}
