export type WorkType = "turning" | "milling";
export type TurningSubtype = "shaft" | "bolt" | "stud" | "nut";
export type ToothType = "straight" | "helical" | "hypoid";
export type ThreadType = "external" | "internal";

export interface Material {
  name: string;
  density: number;
  costPerKg: number;
  factor: number;
}

export interface DrillItem {
  diam: number;
  depth: number;
  count: number;
}

export interface AdminSettings {
  hourlyRate: number;
  setupMinutes: number;
  hardeningCostPerKg: number;
  materials: Material[];
  drillParams: { Vc: number; f: number };
  keywayParams: { Vc: number; fz: number; z: number; ap: number };
  gearParams: { Vc: number; S: number; passes: number; D_fr: number };
  threadParams: { Vc: number };
  extraFactors: {
    lunetteTime: number;
    lunetteComplexity: number;
    reverseTime: number;
    reverseComplexity: number;
    keywayComplexity: number;
    gearBaseComplexity: number;
    toothFactors: { straight: number; helical: number; hypoid: number };
  };
}

export const DEFAULT_SETTINGS: AdminSettings = {
  hourlyRate: 2275,
  setupMinutes: 45,
  hardeningCostPerKg: 200,
  materials: [
    { name: "Сталь 3", density: 7.85, costPerKg: 70, factor: 1.0 },
    { name: "Сталь 45", density: 7.85, costPerKg: 80, factor: 1.0 },
    { name: "Сталь 40Х", density: 7.85, costPerKg: 95, factor: 1.0 },
    { name: "Нержавейка 12Х18Н10Т", density: 7.9, costPerKg: 350, factor: 1.3 },
    { name: "Алюминий Д16Т", density: 2.8, costPerKg: 450, factor: 0.6 },
    { name: "Латунь ЛС59", density: 8.5, costPerKg: 600, factor: 0.8 },
    { name: "Бронза БрАЖ9-4", density: 7.6, costPerKg: 700, factor: 0.8 },
    { name: "Титан ВТ6", density: 4.43, costPerKg: 2500, factor: 2.0 },
    { name: "Капролон", density: 1.15, costPerKg: 500, factor: 0.4 },
    { name: "Фторопласт", density: 2.2, costPerKg: 800, factor: 0.4 },
  ],
  drillParams: { Vc: 25, f: 0.1 },
  keywayParams: { Vc: 20, fz: 0.05, z: 2, ap: 2 },
  gearParams: { Vc: 30, S: 0.1, passes: 2, D_fr: 70 },
  threadParams: { Vc: 8 },
  extraFactors: {
    lunetteTime: 5,
    lunetteComplexity: 0.15,
    reverseTime: 3,
    reverseComplexity: 0.08,
    keywayComplexity: 0.05,
    gearBaseComplexity: 0.12,
    toothFactors: { straight: 1.0, helical: 1.3, hypoid: 1.6 },
  },
};

export function loadSettings(): AdminSettings {
  const saved = localStorage.getItem("calcAdminSettings");
  if (saved) {
    return JSON.parse(saved) as AdminSettings;
  }
  return DEFAULT_SETTINGS;
}

export function getVolumeAndBaseTime(
  workType: WorkType,
  turningSubtype: TurningSubtype,
  dims: Record<string, number>,
  matFactor: number
): { volume: number; baseMinutes: number } {
  const π = Math.PI;

  if (workType === "milling") {
    const lx = (dims.lengthX || 0) / 10;
    const wy = (dims.widthY || 0) / 10;
    const tz = (dims.thicknessZ || 0) / 10;
    const pocket = dims.pocketVolume || 0;
    let volume = lx * wy * tz - pocket;
    if (volume < 0) volume = 0;
    return { volume, baseMinutes: volume * 0.08 * matFactor };
  }

  if (turningSubtype === "shaft") {
    const D = (dims.diameter || 0) / 10;
    const L = (dims.length || 0) / 10;
    const hole = (dims.holeDiameter || 0) / 10;
    let volume = π * (D / 2) ** 2 * L;
    if (hole > 0 && hole < D) volume -= π * (hole / 2) ** 2 * L;
    return { volume, baseMinutes: volume * 0.05 * matFactor };
  }

  if (turningSubtype === "bolt") {
    const d = (dims.boltDiam || 0) / 10;
    const L = (dims.boltLength || 0) / 10;
    const headH = (dims.boltHeadHeight || 0) / 10;
    const headD = (dims.boltHeadDiam || 0) / 10;
    const volume = π * (d / 2) ** 2 * L + π * (headD / 2) ** 2 * headH;
    return { volume, baseMinutes: volume * 0.06 * matFactor };
  }

  if (turningSubtype === "stud") {
    const d = (dims.studDiam || 0) / 10;
    const L = (dims.studLength || 0) / 10;
    const volume = π * (d / 2) ** 2 * L;
    return { volume, baseMinutes: volume * 0.06 * matFactor };
  }

  if (turningSubtype === "nut") {
    const d = (dims.nutDiam || 0) / 10;
    const h = (dims.nutHeight || 0) / 10;
    const S = (dims.nutWidth || 0) / 10;
    const volume =
      ((3 * Math.sqrt(3)) / 2) * (S / 2) ** 2 * h - π * (d / 2) ** 2 * h;
    return { volume: Math.max(0, volume), baseMinutes: Math.max(0, volume) * 0.08 * matFactor };
  }

  return { volume: 0, baseMinutes: 0 };
}
