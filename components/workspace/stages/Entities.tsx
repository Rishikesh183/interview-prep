"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNodeOptions } from "@/components/canvas/useNodeOptions";
import { FormRow } from "@/components/form/FormRow";
import { SimpleSelect } from "@/components/form/SimpleSelect";
import type { Entity } from "@/lib/schema";
import { TYPE_ALIASES } from "@/lib/tests/aliases";
import { useAttemptStore } from "@/store/attempt";
import { StageIntro } from "./StageIntro";

const STORE_TYPES = [...TYPE_ALIASES.storage, "cache"];

export function Entities() {
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
