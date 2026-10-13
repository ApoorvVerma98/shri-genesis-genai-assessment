import { GenerationBriefSchema } from "@vector-forge/shared";
import { describe, expect, it } from "vitest";
import {
  classifyComparisonPoint,
  getResolvedComparisonColumns,
  normalizeComparisonBrief,
  pointContradictsTitleScope,
  pointMisassignedForColumn,
  validateComparisonSemantics,
} from "./comparison-content.js";

const base = {
  id: "t",
  category: "business" as const,
  topic: "Customer success playbooks",
  designType: "infographic" as const,
  tone: "professional",
  layoutFamily: "comparison" as const,
  canvas: { width: 1200, height: 630 },
  headline: "Compare approaches",
};

describe("normalizeComparisonBrief redistribution", () => {
  it("splits centralized/decentralized labeled bullets into correct columns", () => {
    const brief = GenerationBriefSchema.parse({
      ...base,
      comparison: {
        leftTitle: "Centralized Playbook Model",
        rightTitle: "Decentralized Playbook Model",
        items: [
          {
            name: "mixed",
            points: [
              "Centralized: strict control over content and updates",
              "Decentralized: flexible local control and rapid iteration",
            ],
          },
          {
            name: "mixed2",
            points: [
              "Centralized: slower organization-wide adoption",
              "Decentralized: faster local adoption and feedback loops",
            ],
          },
        ],
      },
    });
    const cols = getResolvedComparisonColumns(brief)!;
    expect(cols.left.points.every((p) => !/^decentral/i.test(p))).toBe(true);
    expect(cols.right.points.every((p) => !/^central/i.test(p))).toBe(true);
    expect(cols.left.points.length).toBe(2);
    expect(cols.right.points.length).toBe(2);
    expect(validateComparisonSemantics(normalizeComparisonBrief(brief))).toEqual([]);
  });

  it("swaps items when names align with opposite titles", () => {
    const brief = GenerationBriefSchema.parse({
      ...base,
      comparison: {
        leftTitle: "Traditional Playbooks",
        rightTitle: "Scalable Playbooks",
        items: [
          { name: "Scalable Playbooks", points: ["Automated workflows"] },
          { name: "Traditional Playbooks", points: ["Manual SOPs"] },
        ],
      },
    });
    const out = normalizeComparisonBrief(brief);
    expect(out.comparison?.items[0].points[0]).toMatch(/Manual/i);
    expect(out.comparison?.items[1].points[0]).toMatch(/Automated/i);
  });

  it("handles local vs global titles with scoped bullets", () => {
    const brief = GenerationBriefSchema.parse({
      ...base,
      comparison: {
        leftTitle: "Local Playbooks",
        rightTitle: "Global Playbooks",
        items: [
          {
            name: "a",
            points: ["Local: regional onboarding kits", "Global: enterprise-wide KPI rollups"],
          },
          { name: "b", points: ["Local: branch-specific escalation", "Global: shared analytics hub"] },
        ],
      },
    });
    const cols = getResolvedComparisonColumns(brief)!;
    expect(cols.left.points.join(" ")).toMatch(/regional|branch/i);
    expect(cols.right.points.join(" ")).toMatch(/enterprise|analytics/i);
  });

  it("handles advantages vs disadvantages labels", () => {
    expect(classifyComparisonPoint("Advantages: faster rollout", "Advantages", "Disadvantages")).toBe(
      "left",
    );
    expect(classifyComparisonPoint("Disadvantages: higher risk", "Advantages", "Disadvantages")).toBe(
      "right",
    );
  });
});

describe("validateComparisonSemantics", () => {
  it("rejects misassigned decentralized bullet under centralized-only column after failed normalize", () => {
    const brief = GenerationBriefSchema.parse({
      ...base,
      comparison: {
        leftTitle: "Centralized Playbooks",
        rightTitle: "Decentralized Playbooks",
        items: [
          { name: "L", points: ["Decentralized: only on left without label fix"] },
          { name: "R", points: ["Shared visibility"] },
        ],
      },
    });
    const normalized = normalizeComparisonBrief(brief);
    const leftText = normalized.comparison?.items[0].points.join(" ") ?? "";
    expect(leftText).not.toMatch(/decentral/i);
    expect(normalized.comparison?.items[1].points.join(" ")).toMatch(/decentral|only on left/i);
  });

  it("flags global title with local-scoped unlabeled bullet on right", () => {
    expect(
      pointContradictsTitleScope("Immediate insights from local teams", "Global Playbooks"),
    ).toBe(true);
    const brief = GenerationBriefSchema.parse({
      ...base,
      comparison: {
        leftTitle: "Local Playbooks",
        rightTitle: "Global Playbooks",
        items: [
          { name: "Local", points: ["Regional onboarding"] },
          { name: "Global", points: ["Immediate insights from local teams"] },
        ],
      },
    });
    expect(
      pointMisassignedForColumn(
        "Immediate insights from local teams",
        "right",
        brief.comparison!.leftTitle,
        brief.comparison!.rightTitle,
      ),
    ).toBe(true);
  });

  it("accepts balanced comparison sides", () => {
    const brief = GenerationBriefSchema.parse({
      ...base,
      comparison: {
        leftTitle: "Status quo",
        rightTitle: "Target state",
        items: [
          { name: "Status quo", points: ["Reactive planning"] },
          { name: "Target", points: ["Proactive cadence"] },
        ],
      },
    });
    expect(validateComparisonSemantics(brief)).toEqual([]);
  });

  it("flags missing points on a side", () => {
    const brief = GenerationBriefSchema.parse({
      ...base,
      comparison: {
        leftTitle: "Centralized",
        rightTitle: "Decentralized",
        items: [
          { name: "A", points: ["Decentralized: team-owned updates only"] },
          { name: "B", points: ["Decentralized: another right-side bullet"] },
        ],
      },
    });
    expect(validateComparisonSemantics(brief).some((m) => m.includes("at least one point"))).toBe(
      true,
    );
  });
});

describe("malformed AI comparison shapes", () => {
  it("redistributes when all bullets live in the first item", () => {
    const brief = GenerationBriefSchema.parse({
      ...base,
      comparison: {
        leftTitle: "Centralized",
        rightTitle: "Decentralized",
        items: [
          {
            name: "blob",
            points: [
              "Centralized: top-down approvals",
              "Decentralized: team-owned updates",
            ],
          },
          { name: "empty", points: ["unused"] },
        ],
      },
    });
    const cols = getResolvedComparisonColumns(brief)!;
    expect(cols.left.points[0]).toMatch(/top-down/i);
    expect(cols.right.points[0]).toMatch(/team-owned/i);
    expect(validateComparisonSemantics(brief)).toEqual([]);
  });
});

describe("long supporting text", () => {
  it("keeps long labeled points on the correct side", () => {
    const longCentral =
      "Centralized: strict governance with organization-wide template approval workflows and audit trails";
    const longDecentral =
      "Decentralized: regional teams iterate playbooks quickly with local customer context and feedback";
    const brief = GenerationBriefSchema.parse({
      ...base,
      comparison: {
        leftTitle: "Centralized Model",
        rightTitle: "Decentralized Model",
        items: [
          { name: "x", points: [longCentral, longDecentral] },
          { name: "y", points: ["Centralized: single source of truth", "Decentralized: faster experiments"] },
        ],
      },
    });
    const cols = getResolvedComparisonColumns(brief)!;
    expect(cols.left.points.some((p) => p.includes("governance"))).toBe(true);
    expect(cols.right.points.some((p) => p.includes("regional teams"))).toBe(true);
  });
});
