import { z } from "zod";

/**
 * Field definitions drive both the zod config schema and the inspector form,
 * so a component's config is declared exactly once.
 */

/** `true` uses the default formatting; a function returns custom text (or nothing). */
type Badge = boolean | ((value: unknown, config: Record<string, unknown>) => string | undefined);

type Common = { label: string; help?: string; badge?: Badge };

export type FieldDef =
  | (Common & { kind: "text"; default: string; placeholder?: string })
  | (Common & { kind: "number"; default: number; min?: number; max?: number })
  | (Common & { kind: "bool"; default: boolean; short?: string })
  | (Common & { kind: "select"; options: readonly string[]; default?: string })
  | (Common & { kind: "multi"; options: readonly string[]; default: string[] })
  | (Common & { kind: "nodeRef"; nodeTypes: readonly string[] });

export type Fields = Record<string, FieldDef>;

type Opts<T extends FieldDef["kind"]> = Partial<Omit<Extract<FieldDef, { kind: T }>, "kind">>;

export const f = {
  text: (label: string, opts: Opts<"text"> = {}): FieldDef => ({
    kind: "text",
    label,
    default: "",
    ...opts,
  }),
  number: (label: string, def: number, opts: Opts<"number"> = {}): FieldDef => ({
    kind: "number",
    label,
    default: def,
    ...opts,
  }),
  bool: (label: string, def: boolean, opts: Opts<"bool"> = {}): FieldDef => ({
    kind: "bool",
    label,
    default: def,
    ...opts,
  }),
  /** Omit `default` to leave the choice unset (the linter can flag it). */
  select: (label: string, options: readonly string[], opts: Opts<"select"> = {}): FieldDef => ({
    kind: "select",
    label,
    options,
    ...opts,
  }),
  multi: (
    label: string,
    options: readonly string[],
    def: string[],
    opts: Opts<"multi"> = {},
  ): FieldDef => ({ kind: "multi", label, options, default: def, ...opts }),
  nodeRef: (label: string, nodeTypes: readonly string[], opts: Opts<"nodeRef"> = {}): FieldDef => ({
    kind: "nodeRef",
    label,
    nodeTypes,
    ...opts,
  }),
};

function asEnum(options: readonly string[]) {
  return z.enum(options as [string, ...string[]]);
}

/** Lenient: missing or invalid values fall back to the field default. */
export function fieldToZod(field: FieldDef): z.ZodType {
  switch (field.kind) {
    case "text":
      return z.string().catch(field.default).default(field.default);
    case "number": {
      let n = z.number();
      if (field.min !== undefined) n = n.min(field.min);
      if (field.max !== undefined) n = n.max(field.max);
      return n.catch(field.default).default(field.default);
    }
    case "bool":
      return z.boolean().catch(field.default).default(field.default);
    case "select":
      return field.default !== undefined
        ? asEnum(field.options).catch(field.default).default(field.default)
        : asEnum(field.options).optional().catch(undefined);
    case "multi":
      return z.array(asEnum(field.options)).catch(field.default).default(field.default);
    case "nodeRef":
      return z.string().optional().catch(undefined);
  }
}

export function fieldsToSchema(fields: Fields) {
  const shape: Record<string, z.ZodType> = {};
  for (const [key, field] of Object.entries(fields)) shape[key] = fieldToZod(field);
  return z.object(shape);
}

export function fieldBadge(
  field: FieldDef,
  value: unknown,
  config: Record<string, unknown>,
): string | undefined {
  if (!field.badge) return undefined;
  if (typeof field.badge === "function") return field.badge(value, config);
  if (value === undefined || value === null || value === "") return undefined;
  switch (field.kind) {
    case "bool":
      return value === true ? (field.short ?? field.label) : undefined;
    case "multi":
      return Array.isArray(value) && value.length ? value.join(" / ") : undefined;
    case "number":
      return `${field.label}: ${String(value)}`;
    default:
      return String(value);
  }
}
