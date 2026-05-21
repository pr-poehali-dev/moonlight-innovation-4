export const FIELD_LABELS: Record<string, string> = {
  diameter: "Диаметр заготовки (мм)",
  length: "Длина обработки (мм)",
  holeDiameter: "Отверстие ⌀ (мм)",
  lengthX: "Длина X (мм)",
  widthY: "Ширина Y (мм)",
  thicknessZ: "Толщина Z (мм)",
  pocketVolume: "Выборки (см³)",
  boltDiam: "Диаметр резьбы (мм)",
  boltLength: "Длина стержня (мм)",
  boltPitch: "Шаг резьбы (мм)",
  boltHeadHeight: "Высота головки (мм)",
  boltHeadDiam: "Диаметр головки (мм)",
  studDiam: "Диаметр резьбы (мм)",
  studLength: "Длина шпильки (мм)",
  studPitch: "Шаг резьбы (мм)",
  nutDiam: "Диаметр резьбы (мм)",
  nutHeight: "Высота гайки (мм)",
  nutWidth: "Размер под ключ (мм)",
};

export const FIELD_DEFAULTS: Record<string, number> = {
  diameter: 50,
  length: 100,
  holeDiameter: 0,
  lengthX: 100,
  widthY: 80,
  thicknessZ: 20,
  pocketVolume: 0,
  boltDiam: 10,
  boltLength: 50,
  boltPitch: 1.5,
  boltHeadHeight: 7,
  boltHeadDiam: 16,
  studDiam: 10,
  studLength: 80,
  studPitch: 1.5,
  nutDiam: 10,
  nutHeight: 8,
  nutWidth: 17,
};

export interface Material {
  name: string;
  density: number;
  costPerKg: number;
  factor: number;
}

export interface Subtype {
  id: string;
  name: string;
  fields: string[];
}

export interface WorkTypeDef {
  id: string;
  name: string;
  fields: string[];
  subtypes: Subtype[];
}

export interface CustomExtraOp {
  id: string;
  name: string;
  type: "cost" | "costPerKg";
  defaultCost: number;
}

export interface AdminSettings {
  hourlyRate: number;
  setupMinutes: number;
  materials: Material[];
  workTypes: WorkTypeDef[];
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
  customExtraOps: CustomExtraOp[];
}

export const DEFAULT_SETTINGS: AdminSettings = {
  hourlyRate: 2275,
  setupMinutes: 45,
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
  workTypes: [
    {
      id: "turning",
      name: "Токарная обработка",
      fields: ["diameter", "length", "holeDiameter"],
      subtypes: [
        { id: "shaft", name: "Вал / втулка", fields: ["diameter", "length", "holeDiameter"] },
        { id: "bolt", name: "Болт", fields: ["boltDiam", "boltLength", "boltPitch", "boltHeadHeight", "boltHeadDiam"] },
        { id: "stud", name: "Шпилька", fields: ["studDiam", "studLength", "studPitch"] },
        { id: "nut", name: "Гайка", fields: ["nutDiam", "nutHeight", "nutWidth"] },
      ],
    },
    {
      id: "milling",
      name: "Фрезерная обработка",
      fields: ["lengthX", "widthY", "thicknessZ", "pocketVolume"],
      subtypes: [
        { id: "plate", name: "Плита / корпус", fields: ["lengthX", "widthY", "thicknessZ", "pocketVolume"] },
      ],
    },
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
  customExtraOps: [
    { id: "hardening", name: "Закалка", type: "costPerKg", defaultCost: 200 },
    { id: "oxidizing", name: "Оксидирование", type: "costPerKg", defaultCost: 150 },
    { id: "carburizing", name: "Цементация", type: "costPerKg", defaultCost: 200 },
  ],
};

export function migrateSettings(old: Record<string, unknown>): AdminSettings {
  const s: AdminSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!old) return s;
  if (old.hourlyRate !== undefined) s.hourlyRate = old.hourlyRate as number;
  if (old.setupMinutes !== undefined) s.setupMinutes = old.setupMinutes as number;
  if (old.materials) s.materials = old.materials as Material[];
  if (old.workTypes) s.workTypes = old.workTypes as WorkTypeDef[];
  if (old.customExtraOps) {
    const existing = new Set(s.customExtraOps.map((op) => op.id));
    const newOps = (old.customExtraOps as CustomExtraOp[]).filter((op) => !existing.has(op.id));
    s.customExtraOps = [...s.customExtraOps, ...newOps];
  }
  if (old.drillParams) s.drillParams = old.drillParams as AdminSettings["drillParams"];
  if (old.keywayParams) s.keywayParams = old.keywayParams as AdminSettings["keywayParams"];
  if (old.gearParams) s.gearParams = old.gearParams as AdminSettings["gearParams"];
  if (old.threadParams) s.threadParams = old.threadParams as AdminSettings["threadParams"];
  if (old.extraFactors) s.extraFactors = old.extraFactors as AdminSettings["extraFactors"];
  return s;
}

export function loadSettings(): AdminSettings {
  try {
    const saved = localStorage.getItem("calcAdminSettings");
    if (!saved) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    if (!parsed.workTypes || !parsed.customExtraOps) {
      return migrateSettings(parsed);
    }
    return parsed as unknown as AdminSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AdminSettings) {
  localStorage.setItem("calcAdminSettings", JSON.stringify(s));
}

// ─── Типы состояния доп. операций ────────────────────────────────────────────

export interface DrillItem {
  diam: number;
  depth: number;
  count: number;
}

export interface KeywayItem {
  length: number;
  width: number;
  depth: number;
}

export interface GearItem {
  module: number;
  teeth: number;
  width: number;
  type: "straight" | "helical" | "hypoid";
}

export interface ThreadItem {
  type: "external" | "internal";
  diam: number;
  pitch: number;
  length: number;
  passes: number;
}

// ─── Расчёт объёма и базового времени ────────────────────────────────────────

export function getVolumeAndBaseTime(
  fields: string[],
  dims: Record<string, number>,
  matFactor: number
): { volume: number; baseMinutes: number } {
  let volume = 0;

  if (fields.includes("diameter") && fields.includes("length")) {
    const D = (dims.diameter || 0) / 10;
    const L = (dims.length || 0) / 10;
    const hole = fields.includes("holeDiameter") ? (dims.holeDiameter || 0) / 10 : 0;
    volume = Math.PI * (D / 2) ** 2 * L;
    if (hole > 0 && hole < D) volume -= Math.PI * (hole / 2) ** 2 * L;
  } else if (
    fields.includes("lengthX") &&
    fields.includes("widthY") &&
    fields.includes("thicknessZ")
  ) {
    const lx = (dims.lengthX || 0) / 10;
    const wy = (dims.widthY || 0) / 10;
    const tz = (dims.thicknessZ || 0) / 10;
    const pocket = fields.includes("pocketVolume") ? dims.pocketVolume || 0 : 0;
    volume = lx * wy * tz - pocket;
  } else if (
    fields.includes("nutDiam") &&
    fields.includes("nutHeight") &&
    fields.includes("nutWidth")
  ) {
    const d = (dims.nutDiam || 0) / 10;
    const h = (dims.nutHeight || 0) / 10;
    const S = (dims.nutWidth || 0) / 10;
    volume = ((3 * Math.sqrt(3)) / 2) * (S / 2) ** 2 * h - Math.PI * (d / 2) ** 2 * h;
  } else if (fields.includes("boltDiam") && fields.includes("boltLength")) {
    const d = (dims.boltDiam || 0) / 10;
    const L = (dims.boltLength || 0) / 10;
    const headH = fields.includes("boltHeadHeight") ? (dims.boltHeadHeight || 0) / 10 : 0;
    const headD = fields.includes("boltHeadDiam") ? (dims.boltHeadDiam || 0) / 10 : 0;
    volume = Math.PI * (d / 2) ** 2 * L + Math.PI * (headD / 2) ** 2 * headH;
  } else if (fields.includes("studDiam") && fields.includes("studLength")) {
    const d = (dims.studDiam || 0) / 10;
    const L = (dims.studLength || 0) / 10;
    volume = Math.PI * (d / 2) ** 2 * L;
  }

  if (volume < 0) volume = 0;
  const baseMinutes = volume * 0.05 * matFactor;
  return { volume, baseMinutes };
}
