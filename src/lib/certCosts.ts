// GIA fee schedule effective April 1, 2026
const DOSSIER: [number, number, number][] = [
  [0.15, 0.22, 24], [0.23, 0.29, 26], [0.30, 0.39, 32],
  [0.40, 0.49, 33], [0.50, 0.69, 41], [0.70, 0.99, 50],
  [1.00, 1.49, 83],
];

const GRADING_REPORT: [number, number, number][] = [
  [1.00, 1.19, 119], [1.20, 1.49, 124], [1.50, 1.99, 142],
  [2.00, 2.99, 205], [3.00, 3.99, 301], [4.00, 4.99, 403],
  [5.00, 5.99, 578], [6.00, 7.99, 682], [8.00, 9.99, 807],
];

export function giaCertCost(weight: number): number {
  const table = weight >= 1.00 ? GRADING_REPORT : DOSSIER;
  for (const [lo, hi, fee] of table) {
    if (weight >= lo && weight <= hi) return fee;
  }
  return 0;
}

export const WEIGHT_LOSS = 0.10;
export const CUT_COST_USA = 175;
export const CUT_COST_CHINA = 100;
