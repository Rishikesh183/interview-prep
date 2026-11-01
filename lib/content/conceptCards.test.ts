import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/catalog/components";
import { readConceptFiles } from "@/lib/concepts/load";
import { conceptForComponent, validateConcepts } from "./conceptCards";

const files = readConceptFiles();

describe("concept cards (step 2.6)", () => {
  const { concepts, errors } = validateConcepts(files);

  it("all foundations and interview patterns are valid", () => {
    expect(errors).toEqual([]);
    expect(concepts).toHaveLength(34);
    expect(concepts.filter((c) => c.kind === "foundation")).toHaveLength(25);
    const patterns = concepts.filter((c) => c.kind === "pattern");
    expect(patterns).toHaveLength(9);
    for (const card of patterns) {
      expect(card.graph?.nodes.length, card.slug).toBeGreaterThan(0);
      expect(card.body, card.slug).toMatch(/### Worked example/);
      expect(card.body, card.slug).toMatch(/\*\*.+\?\*\*/);
    }
  });

  it("rejects dangling and duplicate identities in concept diagrams", () => {
    const graph = JSON.parse(files["fan-out-on-write.graph.json"]);
    graph.n.push(graph.n[0]);
    graph.e[0].d = "missing";
    const errors = validateConcepts({
      ...files,
      "fan-out-on-write.graph.json": JSON.stringify(graph),
    }).errors.join("\n");
    expect(errors).toMatch(/duplicate node IDs/);
    expect(errors).toMatch(/dangling edge/);
  });

  it("every palette item links to a card", () => {
    for (const type of Object.keys(CATALOG)) {
      expect(conceptForComponent(concepts, type), type).toBeDefined();
    }
  });

  it("summaries come from the first paragraph of 'What it is'", () => {
    const cdn = concepts.find((c) => c.slug === "cdn")!;
    expect(cdn.summary).toMatch(/^A content delivery network/);
    expect(cdn.summary).not.toContain("##");
  });

  it("rejects missing sections, unknown links and uncovered components", () => {
    const broken = { ...files };
    broken["cdn.md"] = files["cdn.md"]
      .replace("## Further reading", "## Reading")
      .replace('components: ["cdn"]', 'components: ["cdnn"]')
      .replace('"load-balancing"]', '"nope"]');
    const { errors } = validateConcepts(broken);
    expect(errors.join("\n")).toMatch(/sections must be exactly/);
    expect(errors.join("\n")).toMatch(/unknown type "cdnn"/);
    expect(errors.join("\n")).toMatch(/unknown concept "nope"/);
    expect(errors.join("\n")).toMatch(/no card lists component "cdn"/);
  });
});
