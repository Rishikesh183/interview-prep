import type { ApiEndpoint, Entity, Graph, Walkthrough } from "@/lib/schema";

const nodeName = (graph: Graph | undefined, id?: string) =>
  graph?.nodes.find((n) => n.id === id)?.data.label ?? id;

export function Entities({
  entities,
  graph,
  walkthrough,
}: {
  entities: Entity[];
  graph?: Graph;
  walkthrough?: Walkthrough;
}) {
  if (!entities.length)
    return (
      <p className="text-muted-foreground text-sm">
        {walkthrough?.sectionApplicability.entities ??
          "This legacy approach has not yet documented its state model."}
      </p>
    );
  return (
    <div className="space-y-3">
      {entities.map((entity) => {
        const detail = walkthrough?.entityDetails.find((d) => d.entityName === entity.name);
        const store = nodeName(graph, entity.storeNodeId);
        return (
          <article key={entity.name} className="space-y-3 rounded-xl border p-4">
            <div>
              <h4 className="font-semibold">{entity.name}</h4>
              <p className="text-muted-foreground mt-1 text-xs">
                Data Model → Add entity → Stored in:{" "}
                <strong>{store ?? "Storage assignment pending"}</strong>
              </p>
            </div>
            {detail && <p className="text-sm">{detail.purpose}</p>}
            <pre className="bg-muted/40 overflow-x-auto rounded-lg p-3 font-mono text-xs whitespace-pre-wrap">
              {entity.fields}
            </pre>
            {detail && (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Lines title="Access patterns" items={detail.accessPatterns} />
                <Lines title="Keys, indexes & constraints" items={detail.constraints} />
                {detail.relationships.length > 0 && (
                  <Lines title="Relationships" items={detail.relationships} />
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function Apis({
  apis,
  graph,
  walkthrough,
}: {
  apis: ApiEndpoint[];
  graph?: Graph;
  walkthrough?: Walkthrough;
}) {
  if (!apis.length)
    return (
      <p className="text-muted-foreground text-sm">
        {walkthrough?.sectionApplicability.apis ??
          "This legacy approach has not yet documented its contracts."}
      </p>
    );
  const owners = [...new Set(apis.map((a) => a.ownerNodeId))];
  return (
    <div className="space-y-5">
      {owners.map((owner) => (
        <section key={owner} className="space-y-2">
          <h4 className="text-sm font-semibold">{nodeName(graph, owner)}</h4>
          {apis
            .filter((a) => a.ownerNodeId === owner)
            .map((api) => {
              const detail = walkthrough?.apiDetails.find((d) => d.apiId === api.id);
              return (
                <article key={api.id} className="space-y-3 rounded-xl border p-4">
                  <code className="text-sm font-semibold break-all">
                    {api.method} {api.path}
                  </code>
                  <p className="text-muted-foreground text-xs">
                    APIs → {nodeName(graph, owner)} → Add endpoint
                  </p>
                  {detail && <p className="text-sm">{detail.purpose}</p>}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Payload
                      title="Request"
                      value={
                        api.request ??
                        (api.method === "GET"
                          ? "No request body"
                          : "Not documented in this legacy approach")
                      }
                    />
                    <Payload
                      title="Response"
                      value={api.response ?? "Not documented in this legacy approach"}
                    />
                  </div>
                  <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span>Status: {api.statusCodes ?? "Not documented"}</span>
                    <span>{api.auth ? "Auth required" : "No auth required"}</span>
                    {api.idempotent !== undefined && (
                      <span>{api.idempotent ? "Idempotent" : "Not inherently idempotent"}</span>
                    )}
                    {api.pagination && <span>Pagination: {api.pagination}</span>}
                    {api.rateLimited && <span>Rate limited</span>}
                  </div>
                  {detail && <p className="text-sm">{detail.rationale}</p>}
                  {api.note && api.note !== detail?.rationale && (
                    <p className="text-muted-foreground text-xs">{api.note}</p>
                  )}
                </article>
              );
            })}
        </section>
      ))}
    </div>
  );
}

function Payload({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <h5 className="text-muted-foreground mb-1 text-xs font-medium">{title}</h5>
      <pre className="bg-muted/40 rounded-lg p-3 font-mono text-xs break-words whitespace-pre-wrap">
        {value}
      </pre>
    </div>
  );
}
export function Lines({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-muted-foreground mb-1 text-xs font-semibold uppercase">{title}</h4>
      <ul className="list-disc space-y-1 pl-4 text-sm">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
