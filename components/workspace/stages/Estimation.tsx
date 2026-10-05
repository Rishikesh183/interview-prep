"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormRow } from "@/components/form/FormRow";
import { SimpleSelect } from "@/components/form/SimpleSelect";
import { estimate, FORMULAS } from "@/lib/estimation/calc";
import { formatBytes, formatCount } from "@/lib/estimation/format";
import {
  EstimationInputSchema,
  SizeUnitSchema,
  type EstimationInput,
  type EstimationOutput,
} from "@/lib/schema";
import { useAttemptStore } from "@/store/attempt";
import { StageIntro } from "./StageIntro";

type NumericKey = Exclude<keyof EstimationInput, "objectSizeUnit">;

const INPUTS: { key: NumericKey; label: string; help?: string; step?: number }[] = [
  { key: "dau", label: "Daily active users (DAU)" },
  { key: "writesPerUserPerDay", label: "Writes per user per day", step: 0.1 },
  { key: "readWriteRatio", label: "Read : write ratio", help: "Reads per write, e.g. 100" },
  { key: "retentionYears", label: "Retention (years)" },
  { key: "peakFactor", label: "Peak factor", help: "Peak ÷ average traffic", step: 0.5 },
];

const OUTPUTS: {
  key: keyof EstimationOutput;
  label: string;
  kind: "count" | "qps" | "bytes" | "bps";
}[] = [
  { key: "writesPerDay", label: "Writes / day", kind: "count" },
  { key: "readsPerDay", label: "Reads / day", kind: "count" },
  { key: "writeQpsAvg", label: "Write QPS (avg)", kind: "qps" },
  { key: "writeQpsPeak", label: "Write QPS (peak)", kind: "qps" },
  { key: "readQpsAvg", label: "Read QPS (avg)", kind: "qps" },
  { key: "readQpsPeak", label: "Read QPS (peak)", kind: "qps" },
  { key: "storagePerDayBytes", label: "Storage / day", kind: "bytes" },
  { key: "storageTotalBytes", label: "Storage (total)", kind: "bytes" },
  { key: "ingressBytesPerSec", label: "Ingress", kind: "bps" },
  { key: "egressBytesPerSec", label: "Egress", kind: "bps" },
  { key: "cacheMemoryBytes", label: "Cache memory", kind: "bytes" },
];

function format(kind: (typeof OUTPUTS)[number]["kind"], v: number): string {
  if (kind === "bytes") return formatBytes(v);
  if (kind === "bps") return `${formatBytes(v)}/s`;
  if (kind === "qps") return `${formatCount(v)}/s`;
  return formatCount(v);
}

export function Estimation() {
  const estimation = useAttemptStore((s) => s.meta?.estimation);
  const setEstimation = useAttemptStore((s) => s.setEstimation);
  if (!estimation) return null;
  const outputs = estimate(EstimationInputSchema.parse(estimation));

  return (
    <div className="space-y-6">
      <StageIntro
        title="Back-of-envelope estimation"
        text="Use the scale in the problem statement. Formulas are shown so you can do this on a whiteboard too."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INPUTS.map((input) => (
          <FormRow key={input.key} id={`est-${input.key}`} label={input.label} help={input.help}>
            <Input
              id={`est-${input.key}`}
              type="number"
              min={0}
              step={input.step ?? 1}
              value={estimation[input.key]}
              onChange={(e) => {
                const n = e.target.valueAsNumber;
                setEstimation({ [input.key]: Number.isNaN(n) ? 0 : n });
              }}
            />
          </FormRow>
        ))}
        <FormRow id="est-objectSize" label="Average object size">
          <div className="flex gap-2">
            <Input
              id="est-objectSize"
              type="number"
              min={0}
              value={estimation.objectSize}
              onChange={(e) => {
                const n = e.target.valueAsNumber;
                setEstimation({ objectSize: Number.isNaN(n) ? 0 : n });
              }}
            />
            <div className="w-20 shrink-0">
              <SimpleSelect
                value={estimation.objectSizeUnit}
                options={SizeUnitSchema.options}
                onChange={(v) => v && setEstimation({ objectSizeUnit: SizeUnitSchema.parse(v) })}
              />
            </div>
          </div>
        </FormRow>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
            <tr>
              <th className="px-3 py-2">Output</th>
              <th className="px-3 py-2 text-right">Value</th>
              <th className="hidden px-3 py-2 sm:table-cell">Formula</th>
            </tr>
          </thead>
          <tbody>
            {OUTPUTS.map((o) => (
              <tr key={o.key} className="border-t">
                <td className="px-3 py-2">{o.label}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {format(o.kind, outputs[o.key])}
                </td>
                <td className="text-muted-foreground hidden px-3 py-2 text-xs sm:table-cell">
                  {FORMULAS[o.key]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormRow
        id="est-notes"
        label="Notes"
        help="Assumptions, other numbers (connections, fan-out, bandwidth for media...)."
      >
        <Textarea
          id="est-notes"
          rows={4}
          value={estimation.notes}
          onChange={(e) => setEstimation({ notes: e.target.value })}
        />
      </FormRow>
    </div>
  );
}
