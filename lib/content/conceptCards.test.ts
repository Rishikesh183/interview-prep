import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/catalog/components";
import { readConceptFiles } from "@/lib/concepts/load";
import { conceptForComponent, validateConcepts } from "./conceptCards";

const files = readConceptFiles();

describe("concept cards (step 2.6)", () => {
  const { concepts, errors } = validateConcepts(files);

  it("all 25 cards are valid", () => {
    expect(errors).toEqual([]);
    expect(concepts).toHaveLength(25);
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
