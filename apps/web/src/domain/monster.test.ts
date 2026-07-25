import { describe, expect, it } from "vitest";
import {
  chooseSpecies,
  createInitialMonster,
  gainExp,
  hatch,
  type Monster,
} from "./monster";

function gainToLevel(monster: Monster, targetLevel: number): Monster {
  let current = monster;
  while (current.level < targetLevel) {
    current = gainExp(
      current,
      Math.max(0, current.expToNext - current.exp)
    );
  }
  return current;
}

describe("monster species and evolution", () => {
  it("lets an egg choose a species and keeps it after hatching", () => {
    const egg = createInitialMonster();
    const selected = chooseSpecies(egg, "cat");
    const born = hatch(selected, 1_000);

    expect(selected.species).toBe("cat");
    expect(born.species).toBe("cat");
    expect(born.stage).toBe("baby");
  });

  it("does not let a hatched monster change species", () => {
    const born = hatch(createInitialMonster());

    expect(chooseSpecies(born, "dragon")).toBe(born);
  });

  it.each([
    [1, "baby"],
    [3, "child"],
    [6, "teen"],
    [10, "adult"],
  ] as const)("evolves at level %i to %s", (level, expectedStage) => {
    const born = hatch(createInitialMonster());
    const evolved = gainToLevel(born, level);

    expect(evolved.level).toBe(level);
    expect(evolved.stage).toBe(expectedStage);
  });

  it("can cross more than one evolution threshold in one reward", () => {
    const born = hatch(createInitialMonster());
    const evolved = gainExp(born, 10_000);

    expect(evolved.level).toBeGreaterThanOrEqual(10);
    expect(evolved.stage).toBe("adult");
  });
});
