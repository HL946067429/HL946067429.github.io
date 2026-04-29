import type { SpeciesSpec } from "./types";
import { SUNFLOWER } from "./sunflower";

export const SPECIES_REGISTRY: Record<string, SpeciesSpec> = {
  [SUNFLOWER.id]: SUNFLOWER,
};

export const SPECIES_LIST: SpeciesSpec[] = Object.values(SPECIES_REGISTRY);

export function getSpecies(id: string): SpeciesSpec {
  return SPECIES_REGISTRY[id] ?? SUNFLOWER;
}

export type { SpeciesSpec };
