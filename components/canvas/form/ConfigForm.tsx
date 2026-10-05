"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { FieldDef } from "@/lib/catalog/fields";
import { getComponent } from "@/lib/catalog/components";
import { useWorkspaceStore } from "@/store/workspace";
import { useNodeOptions } from "../useNodeOptions";
import { FormRow } from "@/components/form/FormRow";
import { SimpleSelect } from "@/components/form/SimpleSelect";

type Props = {
  nodeId: string;
  type: string;
  config: Record<string, unknown>;
};

/** Renders the inspector form straight from the catalog's field definitions. */
export function ConfigForm({ nodeId, type, config }: Props) {
  const updateNodeConfig = useWorkspaceStore((s) => s.updateNodeConfig);
  const def = getComponent(type);
  const entries = Object.entries(def?.fields ?? {});

  if (!entries.length) {
    return <p className="text-muted-foreground text-xs">No configuration for this component.</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map(([key, field]) => (
        <FieldInput
          key={key}
          id={`${nodeId}-${key}`}
          field={field}
          value={config[key]}
          onChange={(v) => updateNodeConfig(nodeId, key, v)}
        />
      ))}
    </div>
  );
}

type FieldProps = {
  id: string;
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
};

function FieldInput({ id, field, value, onChange }: FieldProps) {
  switch (field.kind) {
    case "bool":
      return (
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id} className="text-xs">
            {field.label}
          </Label>
          <Switch id={id} checked={value === true} onCheckedChange={(v) => onChange(v)} />
        </div>
      );
    case "text":
      return (
        <FormRow id={id} label={field.label} help={field.help}>
          <Input
            id={id}
            className="h-8"
            value={typeof value === "string" ? value : ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </FormRow>
      );
    case "number":
      return (
        <FormRow id={id} label={field.label} help={field.help}>
          <Input
            id={id}
            type="number"
            className="h-8"
            min={field.min}
            max={field.max}
            value={typeof value === "number" ? value : field.default}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              if (!Number.isNaN(n)) onChange(n);
            }}
          />
        </FormRow>
      );
    case "select":
      return (
        <FormRow id={id} label={field.label} help={field.help}>
          <SimpleSelect
            id={id}
            value={typeof value === "string" ? value : undefined}
            options={field.options}
            allowNone={field.default === undefined}
            onChange={onChange}
          />
        </FormRow>
      );
    case "multi": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <FormRow id={id} label={field.label} help={field.help}>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {field.options.map((opt) => (
              <label key={opt} className="flex items-center gap-1.5 text-xs">
                <Checkbox
                  checked={selected.includes(opt)}
                  onCheckedChange={(checked) =>
                    onChange(
                      checked
                        ? field.options.filter((o) => o === opt || selected.includes(o))
                        : selected.filter((o) => o !== opt),
                    )
                  }
                />
                {opt}
              </label>
            ))}
          </div>
        </FormRow>
      );
    }
    case "nodeRef":
      return <NodeRefInput id={id} field={field} value={value} onChange={onChange} />;
  }
}

function NodeRefInput({
  id,
  field,
  value,
  onChange,
}: FieldProps & { field: Extract<FieldDef, { kind: "nodeRef" }> }) {
  const options = useNodeOptions(field.nodeTypes);

  return (
    <FormRow
      id={id}
      label={field.label}
      help={options.length ? field.help : "Add a queue, stream or pub/sub node first."}
    >
      <SimpleSelect
        id={id}
        value={typeof value === "string" ? value : undefined}
        options={options}
        allowNone
        onChange={onChange}
      />
    </FormRow>
  );
}
