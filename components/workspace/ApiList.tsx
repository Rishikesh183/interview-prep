"use client";

import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormRow } from "@/components/form/FormRow";
import { SimpleSelect } from "@/components/form/SimpleSelect";
import { HttpMethodSchema, PaginationSchema, type ApiEndpoint } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";

const METHOD_COLORS: Record<ApiEndpoint["method"], string> = {
  GET: "text-emerald-600",
  POST: "text-sky-600",
  PUT: "text-amber-600",
  PATCH: "text-amber-600",
  DELETE: "text-rose-600",
  WS: "text-violet-600",
  RPC: "text-violet-600",
};

/** Endpoints owned by one service / gateway node. */
export function ApiList({ ownerNodeId, compact }: { ownerNodeId: string; compact?: boolean }) {
  const apis = useWorkspaceStore(
    useShallow((s) => s.apis.filter((a) => a.ownerNodeId === ownerNodeId)),
  );
  const addApi = useWorkspaceStore((s) => s.addApi);

  return (
    <div className="space-y-2">
      {apis.map((api) => (
        <ApiRow key={api.id} api={api} compact={compact} />
      ))}
      {apis.length === 0 && <p className="text-muted-foreground text-xs">No endpoints yet.</p>}
      <Button variant="outline" size="sm" onClick={() => addApi(ownerNodeId)}>
        <Plus /> Add endpoint
      </Button>
    </div>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-xs font-normal">
        {label}
      </Label>
    </div>
  );
}

function ApiRow({ api, compact }: { api: ApiEndpoint; compact?: boolean }) {
  const updateApi = useWorkspaceStore((s) => s.updateApi);
  const removeApi = useWorkspaceStore((s) => s.removeApi);
  const set = (patch: Partial<ApiEndpoint>) => updateApi(api.id, patch);
  const id = (k: string) => `${api.id}-${k}`;

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-2 p-2">
        <div className={cn("w-24 shrink-0 font-mono text-xs", METHOD_COLORS[api.method])}>
          <SimpleSelect
            id={id("method")}
            value={api.method}
            options={HttpMethodSchema.options}
            onChange={(v) => v && set({ method: HttpMethodSchema.parse(v) })}
          />
        </div>
        <Input
          aria-label="Path"
          className="h-7 font-mono text-xs"
          placeholder="/v1/resource/{id}"
          value={api.path}
          onChange={(e) => set({ path: e.target.value })}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Remove endpoint"
          onClick={() => removeApi(api.id)}
        >
          <Trash2 />
        </Button>
      </div>

      <details className="group border-t">
        <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 px-2 py-1.5 text-xs">
          <ChevronRight className="size-3 transition-transform group-open:rotate-90" />
          Details
          <span className="ml-auto flex gap-1">
            {api.auth && <Tag>auth</Tag>}
            {api.idempotent && <Tag>idempotent</Tag>}
            {api.rateLimited && <Tag>rate-limited</Tag>}
            {api.pagination && api.pagination !== "none" && <Tag>{api.pagination}</Tag>}
          </span>
        </summary>
        <div className="space-y-3 p-3 pt-1">
          <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
            <FormRow id={id("req")} label="Request">
              <Textarea
                id={id("req")}
                rows={3}
                className="font-mono text-xs"
                placeholder="{ longUrl, alias? }"
                value={api.request ?? ""}
                onChange={(e) => set({ request: e.target.value })}
              />
            </FormRow>
            <FormRow id={id("res")} label="Response">
              <Textarea
                id={id("res")}
                rows={3}
                className="font-mono text-xs"
                placeholder="{ code, shortUrl }"
                value={api.response ?? ""}
                onChange={(e) => set({ response: e.target.value })}
              />
            </FormRow>
          </div>
          <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
            <FormRow id={id("codes")} label="Status codes">
              <Input
                id={id("codes")}
                className="h-8 font-mono text-xs"
                placeholder="201, 400, 409"
                value={api.statusCodes ?? ""}
                onChange={(e) => set({ statusCodes: e.target.value })}
              />
            </FormRow>
            <FormRow id={id("page")} label="Pagination">
              <SimpleSelect
                id={id("page")}
                value={api.pagination ?? "none"}
                options={PaginationSchema.options}
                onChange={(v) => set({ pagination: v ? PaginationSchema.parse(v) : undefined })}
              />
            </FormRow>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Toggle
              id={id("auth")}
              label="Auth required"
              checked={api.auth}
              onChange={(v) => set({ auth: v })}
            />
            <Toggle
              id={id("idem")}
              label="Idempotent"
              checked={api.idempotent ?? false}
              onChange={(v) => set({ idempotent: v })}
            />
            <Toggle
              id={id("rl")}
              label="Rate limited"
              checked={api.rateLimited ?? false}
              onChange={(v) => set({ rateLimited: v })}
            />
          </div>
          <FormRow id={id("note")} label="Notes">
            <Textarea
              id={id("note")}
              rows={2}
              className="text-xs"
              placeholder="Idempotency key header, 301 vs 302..."
              value={api.note ?? ""}
              onChange={(e) => set({ note: e.target.value })}
            />
          </FormRow>
        </div>
      </details>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="bg-muted rounded px-1 text-[10px]">{children}</span>;
}
