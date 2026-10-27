import type { ApiSite, Project, SymbolInfo } from "../core/types";
export default function ApiRelationships({
  project,
  onSelect,
  onSource,
}: {
  project: Project;
  onSelect: (symbol: SymbolInfo) => void;
  onSource: (file: string, line: number) => void;
}) {
  const flow = project.analysis.apiFlow;
  if (!flow || (!flow.requests.length && !flow.routes.length)) return null;
  function source(site: ApiSite) {
    const symbol = project.analysis.symbols
      .filter(
        (s) =>
          s.file === site.file && s.line <= site.line && s.endLine >= site.line,
      )
      .sort((a, b) => a.end - a.start - (b.end - b.start))[0];
    const label = `${site.file}:${site.line}`;
    return symbol ? (
      <button className="text-button" onClick={() => onSelect(symbol)}>
        {label}
      </button>
    ) : (
      <button
        className="text-button"
        onClick={(event) => {
          event.currentTarget.focus();
          onSource(site.file, site.line);
        }}
      >
        {label}
      </button>
    );
  }
  return (
    <section aria-label="API request and route candidates">
      <h3>API request paths</h3>
      <p className="muted">
        Literal fetch calls and routes on imported Express apps or routers.
        Matching method and path suggests a candidate connection; server
        origins, router mounts, middleware and actual delivery are not verified.
        Dynamic requests are outside this index.
      </p>
      <ul className="state-relations-list">
        {flow.requests.map((request, i) => (
          <li key={i}>
            <strong>
              {request.method} {request.path}
            </strong>{" "}
            · request source {source(request)}
            {flow.links
              .filter((link) => link.request === i)
              .map((link) => {
                const route = flow.routes[link.route];
                return (
                  <p key={link.route}>
                    Matching route candidate: {source(route)}
                  </p>
                );
              })}
            {!flow.links.some((link) => link.request === i) && (
              <p>No matching route found in this bounded source index.</p>
            )}
          </li>
        ))}
      </ul>
      <details>
        <summary>Declared route paths · {flow.routes.length}</summary>
        <ul>
          {flow.routes.map((route, i) => (
            <li key={i}>
              {route.method} {route.path} · {source(route)}
            </li>
          ))}
        </ul>
      </details>
      {!!flow.omitted && (
        <p>
          {flow.omitted} additional sites or candidate links omitted at the
          index limits.
        </p>
      )}
    </section>
  );
}
