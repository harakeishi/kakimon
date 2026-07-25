export type MonsterStage = "egg" | "baby" | "child" | "teen" | "adult";

export type MonsterSpeciesId = "chick" | "dragon" | "cat";

export interface MonsterSpecies {
  id: MonsterSpeciesId;
  name: string;
  description: string;
  stageEmoji: Record<MonsterStage, string>;
}

export const MONSTER_SPECIES: readonly MonsterSpecies[] = [
  {
    id: "chick",
    name: "ことり",
    description: "げんきな とりに しんかするよ",
    stageEmoji: {
      egg: "🥚",
      baby: "🐣",
      child: "🐥",
      teen: "🐤",
      adult: "🐔",
    },
  },
  {
    id: "dragon",
    name: "ドラゴン",
    description: "つよい ドラゴンに しんかするよ",
    stageEmoji: {
      egg: "🥚",
      baby: "🦎",
      child: "🐊",
      teen: "🐲",
      adult: "🐉",
    },
  },
  {
    id: "cat",
    name: "ねこ",
    description: "りっぱな どうぶつに しんかするよ",
    stageEmoji: {
      egg: "🥚",
      baby: "🐱",
      child: "🐈",
      teen: "🐆",
      adult: "🦁",
    },
  },
];

export const DEFAULT_MONSTER_SPECIES_ID: MonsterSpeciesId = "chick";

export const EVOLUTION_LEVELS: Readonly<
  Record<Exclude<MonsterStage, "egg">, number>
> = {
  baby: 1,
  child: 3,
  teen: 6,
  adult: 10,
};

export function findMonsterSpecies(
  id: string
): MonsterSpecies | undefined {
  return MONSTER_SPECIES.find((species) => species.id === id);
}

export function isMonsterSpeciesId(value: unknown): value is MonsterSpeciesId {
  return (
    typeof value === "string" &&
    MONSTER_SPECIES.some((species) => species.id === value)
  );
}

export function monsterSpeciesOrDefault(id: unknown): MonsterSpecies {
  if (isMonsterSpeciesId(id)) {
    return findMonsterSpecies(id)!;
  }
  return findMonsterSpecies(DEFAULT_MONSTER_SPECIES_ID)!;
}

export function monsterEmoji(
  speciesId: unknown,
  stage: MonsterStage
): string {
  return monsterSpeciesOrDefault(speciesId).stageEmoji[stage];
}

export function evolvedStageForLevel(level: number): Exclude<
  MonsterStage,
  "egg"
> {
  if (level >= EVOLUTION_LEVELS.adult) return "adult";
  if (level >= EVOLUTION_LEVELS.teen) return "teen";
  if (level >= EVOLUTION_LEVELS.child) return "child";
  return "baby";
}

export function nextEvolution(
  stage: MonsterStage
): { stage: Exclude<MonsterStage, "egg">; level: number } | null {
  switch (stage) {
    case "egg":
      return { stage: "baby", level: EVOLUTION_LEVELS.baby };
    case "baby":
      return { stage: "child", level: EVOLUTION_LEVELS.child };
    case "child":
      return { stage: "teen", level: EVOLUTION_LEVELS.teen };
    case "teen":
      return { stage: "adult", level: EVOLUTION_LEVELS.adult };
    case "adult":
      return null;
  }
}

export const MONSTER_STAGE_LABELS: Record<MonsterStage, string> = {
  egg: "タマゴ",
  baby: "ベビー",
  child: "こども",
  teen: "わかもの",
  adult: "おとな",
};
