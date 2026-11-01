"use client";

import { Database, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNodeOptions } from "@/components/canvas/useNodeOptions";
import { FormRow } from "@/components/form/FormRow";
import { SimpleSelect } from "@/components/form/SimpleSelect";
import type { Entity } from "@/lib/schema";
import { GROUPS } from "@/lib/catalog/groups";
import { CATALOG } from "@/lib/catalog/components";
import { addStageNode } from "../addStageNode";
import { highlightLater } from "@/components/canvas/useFocusOnCanvas";
import { useAttemptStore } from "@/store/attempt";
import { StageIntro } from "./StageIntro";

const STORE_TYPES = [
  ...GROUPS["@storage"],
  "cache",
  "coordination",
  "event_stream",
  "message_queue",
  "id_generator",
  "geo_index",
];

export function Entities() {
  const [storeType, setStoreType] = useState("sql_db");
  const [storeName, setStoreName] = useState("");
  const entities = useAttemptStore((s) => s.meta?.entities);
  const setEntities = useAttemptStore((s) => s.setEntities);
  const storeOptions = useNodeOptions(STORE_TYPES);
  if (!entities) return null;

  const update = (i: number, patch: Partial<Entity>) =>
    setEntities(entities.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  return (
    <div className="space-y-6">
      <StageIntro
        title="Data model"
        text="List the core entities, their key fields (mark PK / partition / sort keys) and which store holds them."
      />

      <div className="bg-muted/20 space-y-3 rounded-lg border p-4">
        <p className="text-sm">
          Create a store here, then select it under “Stored in”. It also appears on your Design
          canvas.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-48">
            <FormRow id="new-store-type" label="Store type">
              <SimpleSelect
                id="new-store-type"
                value={storeType}
                options={STORE_TYPES.map((t) => ({ value: t, label: CATALOG[t].label }))}
                onChange={(v) => v && setStoreType(v)}
              />
            </FormRow>
          </div>
          <div className="min-w-40 flex-1">
            <FormRow id="new-store-name" label="Store name">
              <Input
                id="new-store-name"
                placeholder="e.g. URL Store"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
              />
            </FormRow>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              addStageNode(storeType, storeName);
              setStoreName("");
            }}
          >
            <Database /> Add store
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {entities.map((entity, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <FormRow id={`ent-${i}-name`} label="Entity">
                  <Input
                    id={`ent-${i}-name`}
                    placeholder="UrlMapping"
                    value={entity.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                </FormRow>
              </div>
              <div className="w-56">
                <FormRow id={`ent-${i}-store`} label="Stored in">
                  <SimpleSelect
                    id={`ent-${i}-store`}
                    value={entity.storeNodeId}
                    options={storeOptions}
                    allowNone
                    placeholder={storeOptions.length ? "Select a store" : "No stores on canvas yet"}
                    onChange={(v) => update(i, { storeNodeId: v })}
                  />
                </FormRow>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${entity.name || "entity"}`}
                onClick={() => setEntities(entities.filter((_, j) => j !== i))}
              >
                <Trash2 />
              </Button>
            </div>
            <FormRow id={`ent-${i}-fields`} label="Fields">
              <Textarea
                id={`ent-${i}-fields`}
                rows={4}
                className="font-mono text-xs"
                placeholder={"code PK (base62, 7 chars)\nlong_url\ncreated_at\nexpires_at"}
                value={entity.fields}
                onChange={(e) => update(i, { fields: e.target.value })}
              />
            </FormRow>
            {entity.storeNodeId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  highlightLater({ nodeIds: [entity.storeNodeId!], edgeIds: [] });
                  useAttemptStore.getState().setStage("design");
                }}
              >
                Show store on canvas →
              </Button>
            )}
          </div>
        ))}
        {entities.length === 0 && (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            No entities yet.
          </p>
        )}
        <Button
          variant="outline"
          onClick={() => setEntities([...entities, { name: "", fields: "" }])}
        >
          <Plus /> Add entity
        </Button>
      </div>
    </div>
  );
}
