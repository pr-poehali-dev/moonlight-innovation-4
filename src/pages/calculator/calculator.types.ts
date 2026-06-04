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
  knurlDiam: "Диаметр накатки (мм)",
  knurlLength: "Длина накатки (мм)",
  knurlPitch: "Шаг накатки (мм)",
  coneBigD: "Большой диаметр (мм)",
  coneSmallD: "Малый диаметр (мм)",
  coneLength: "Длина конуса (мм)",
  grooveDiam: "Диаметр канавки (мм)",
  grooveWidth: "Ширина канавки (мм)",
  grooveDepth: "Глубина канавки (мм)",
  cutDiam: "Диаметр проката (мм)",
  sheetThick: "Толщина листа (мм)",
  sheetWidth: "Ширина листа (мм)",
  sheetLength: "Длина листа (мм)",
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
  knurlDiam: 50,
  knurlLength: 50,
  knurlPitch: 1.0,
  coneBigD: 50,
  coneSmallD: 30,
  coneLength: 80,
  grooveDiam: 40,
  grooveWidth: 3,
  grooveDepth: 2,
  cutDiam: 50,
  sheetThick: 2,
  sheetWidth: 1000,
  sheetLength: 2000,
};

export interface CuttingParams {
  vc_min: number;
  vc_max: number;
  f_min: number;
  f_max: number;
  insert: string;
}

export interface Material {
  name: string;
  density: number;
  costPerKg: number;
  factor: number;
  cutting?: CuttingParams;
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
  type: "cost" | "costPerKg" | "time";
  defaultCost: number;
  fields?: string[];
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
    coneExtComplexity: number;
    coneIntComplexity: number;
    grooveComplexity: number;
    cuttingComplexity: number;
  };
  customExtraOps: CustomExtraOp[];
}

export const DEFAULT_SETTINGS: AdminSettings = {
  hourlyRate: 2275,
  setupMinutes: 45,
  materials: [
    { name: "Сталь 3", density: 7.85, costPerKg: 70, factor: 1.0, cutting: { vc_min: 150, vc_max: 200, f_min: 0.2, f_max: 0.4, insert: "Т15К6" } },
    { name: "Сталь 45", density: 7.85, costPerKg: 80, factor: 1.0, cutting: { vc_min: 150, vc_max: 200, f_min: 0.2, f_max: 0.4, insert: "Т15К6" } },
    { name: "Сталь 40Х", density: 7.85, costPerKg: 95, factor: 1.0, cutting: { vc_min: 150, vc_max: 200, f_min: 0.2, f_max: 0.4, insert: "Т15К6" } },
    { name: "Нержавейка 12Х18Н10Т", density: 7.9, costPerKg: 350, factor: 1.3, cutting: { vc_min: 80, vc_max: 120, f_min: 0.1, f_max: 0.2, insert: "ВК8" } },
    { name: "Алюминий Д16Т", density: 2.8, costPerKg: 450, factor: 0.6, cutting: { vc_min: 300, vc_max: 500, f_min: 0.3, f_max: 0.6, insert: "PCD / ТС" } },
    { name: "Латунь ЛС59", density: 8.5, costPerKg: 600, factor: 0.8, cutting: { vc_min: 200, vc_max: 400, f_min: 0.2, f_max: 0.4, insert: "Р6М5 / ТС" } },
    { name: "Бронза БрАЖ9-4", density: 7.6, costPerKg: 700, factor: 0.8, cutting: { vc_min: 200, vc_max: 400, f_min: 0.2, f_max: 0.4, insert: "Р6М5 / ТС" } },
    { name: "Титан ВТ6", density: 4.43, costPerKg: 2500, factor: 2.0, cutting: { vc_min: 40, vc_max: 80, f_min: 0.1, f_max: 0.15, insert: "ВК8 / PCD" } },
    { name: "Капролон", density: 1.15, costPerKg: 500, factor: 0.4, cutting: { vc_min: 400, vc_max: 800, f_min: 0.3, f_max: 0.8, insert: "Р6М5" } },
    { name: "Фторопласт", density: 2.2, costPerKg: 800, factor: 0.4, cutting: { vc_min: 400, vc_max: 800, f_min: 0.3, f_max: 0.8, insert: "Р6М5" } },
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
        { id: "knurling", name: "Накатка", fields: ["knurlDiam", "knurlLength", "knurlPitch"] },
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
    {
      id: "cutting",
      name: "Резка металла",
      fields: [],
      subtypes: [
        { id: "cut_round", name: "Круглый прокат", fields: ["cutDiam"] },
        { id: "cut_sheet", name: "Листовой металл", fields: ["sheetThick", "sheetWidth", "sheetLength"] },
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
    coneExtComplexity: 0.0,
    coneIntComplexity: 0.0,
    grooveComplexity: 0.0,
    cuttingComplexity: 0.0,
  },
  customExtraOps: [
    { id: "hardening", name: "Закалка", type: "costPerKg", defaultCost: 200 },
    { id: "oxidizing", name: "Оксидирование", type: "costPerKg", defaultCost: 150 },
    { id: "carburizing", name: "Цементация", type: "costPerKg", defaultCost: 200 },
    { id: "tooling", name: "Изготовление оснастки", type: "cost", defaultCost: 0 },
    { id: "cone_ext", name: "Конус наружный", type: "time", defaultCost: 0 },
    { id: "cone_int", name: "Конус внутренний", type: "time", defaultCost: 0 },
    { id: "groove", name: "Канавка под стопорное кольцо", type: "time", defaultCost: 0 },
    { id: "cutting_op", name: "Резка металла (доп.)", type: "time", defaultCost: 0 },
  ],
};

export function migrateSettings(old: Record<string, unknown>): AdminSettings {
  const s: AdminSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  if (!old) return s;
  if (old.hourlyRate !== undefined) s.hourlyRate = old.hourlyRate as number;
  if (old.setupMinutes !== undefined) s.setupMinutes = old.setupMinutes as number;
  if (old.materials) {
    s.materials = (old.materials as Material[]).map((m) => ({
      ...m,
      cutting: m.cutting ?? { vc_min: 0, vc_max: 0, f_min: 0, f_max: 0, insert: "" },
    }));
  }
  if (old.workTypes) {
    s.workTypes = old.workTypes as WorkTypeDef[];
    DEFAULT_SETTINGS.workTypes.forEach((dwt) => {
      const existing = s.workTypes.find((wt) => wt.id === dwt.id);
      if (!existing) s.workTypes.push(dwt);
      else if (dwt.subtypes) {
        dwt.subtypes.forEach((dst) => {
          if (!existing.subtypes.find((st) => st.id === dst.id)) existing.subtypes.push(dst);
        });
      }
    });
  }
  if (old.customExtraOps) {
    const oldOps = old.customExtraOps as CustomExtraOp[];
    const oldIds = new Set(oldOps.map((op) => op.id));
    const newDefaults = DEFAULT_SETTINGS.customExtraOps.filter((op) => !oldIds.has(op.id));
    s.customExtraOps = [...oldOps, ...newDefaults];
  }
  if (old.drillParams) s.drillParams = old.drillParams as AdminSettings["drillParams"];
  if (old.keywayParams) s.keywayParams = old.keywayParams as AdminSettings["keywayParams"];
  if (old.gearParams) s.gearParams = old.gearParams as AdminSettings["gearParams"];
  if (old.threadParams) s.threadParams = old.threadParams as AdminSettings["threadParams"];
  if (old.extraFactors) {
    const ef = old.extraFactors as AdminSettings["extraFactors"];
    s.extraFactors = {
      ...ef,
      coneExtComplexity: ef.coneExtComplexity ?? 0,
      coneIntComplexity: ef.coneIntComplexity ?? 0,
      grooveComplexity: ef.grooveComplexity ?? 0,
      cuttingComplexity: ef.cuttingComplexity ?? 0,
    };
  }
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
    return migrateSettings(parsed);
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

export interface ShaftSegment {
  diameter: number;
  length: number;
}

export interface ConeItem {
  coneBigD: number;
  coneSmallD: number;
  coneLength: number;
  diameter?: number;
}

export interface GrooveItem {
  grooveDiam: number;
  grooveWidth: number;
  grooveDepth: number;
}

export interface CuttingOpItem {
  cutType: "round" | "sheet";
  cutDiam: number;
  sheetThick: number;
  sheetWidth: number;
  sheetLength: number;
}

// ─── Расчёт объёма и базового времени ────────────────────────────────────────

export function getVolumeAndBaseTime(
  subtypeId: string,
  wtId: string,
  dims: Record<string, number>,
  matFactor: number,
  shaftSegments: ShaftSegment[]
): { volume: number; baseMinutes: number } {
  let volume = 0;
  let baseMinutes = 0;

  if (wtId === "turning") {
    if (subtypeId === "shaft") {
      const hole = (dims.holeDiameter || 0) / 10;
      const holeR = hole / 2;
      shaftSegments.forEach((seg) => {
        const D = seg.diameter / 10;
        const L = seg.length / 10;
        let v = Math.PI * (D / 2) ** 2 * L;
        if (hole > 0 && hole < seg.diameter) v -= Math.PI * holeR ** 2 * L;
        volume += v;
      });
      baseMinutes = volume * 0.05 * matFactor;
    } else if (subtypeId === "knurling") {
      const D = (dims.knurlDiam || 0) / 10;
      const L = (dims.knurlLength || 0) / 10;
      volume = Math.PI * (D / 2) ** 2 * L;
      baseMinutes = volume * 0.05 * matFactor + L * 10 * 0.02;
    } else if (subtypeId === "bolt") {
      const d = (dims.boltDiam || 0) / 10;
      const L = (dims.boltLength || 0) / 10;
      const hH = (dims.boltHeadHeight || 0) / 10;
      const hD = (dims.boltHeadDiam || 0) / 10;
      volume = Math.PI * (d / 2) ** 2 * L + Math.PI * (hD / 2) ** 2 * hH;
      baseMinutes = volume * 0.06 * matFactor;
    } else if (subtypeId === "stud") {
      const d = (dims.studDiam || 0) / 10;
      const L = (dims.studLength || 0) / 10;
      volume = Math.PI * (d / 2) ** 2 * L;
      baseMinutes = volume * 0.06 * matFactor;
    } else if (subtypeId === "nut") {
      const d = (dims.nutDiam || 0) / 10;
      const h = (dims.nutHeight || 0) / 10;
      const S = (dims.nutWidth || 0) / 10;
      volume = ((3 * Math.sqrt(3)) / 2) * (S / 2) ** 2 * h - Math.PI * (d / 2) ** 2 * h;
      baseMinutes = volume * 0.08 * matFactor;
    }
  } else if (wtId === "milling") {
    const lx = (dims.lengthX || 0) / 10;
    const wy = (dims.widthY || 0) / 10;
    const tz = (dims.thicknessZ || 0) / 10;
    const pocket = dims.pocketVolume || 0;
    volume = lx * wy * tz - pocket;
    baseMinutes = volume * 0.08 * matFactor;
  } else if (wtId === "cutting") {
    if (subtypeId === "cut_round") {
      const D = (dims.cutDiam || 0) / 10;
      volume = Math.PI * (D / 2) ** 2 * 100;
      baseMinutes = D * 10 * 0.05 * matFactor;
    } else if (subtypeId === "cut_sheet") {
      const t = (dims.sheetThick || 0) / 10;
      const w = (dims.sheetWidth || 0) / 10;
      const l = (dims.sheetLength || 0) / 10;
      volume = t * w * l;
      baseMinutes = 2 * (w + l) * t * 0.01 * matFactor;
    }
  }

  if (volume < 0) volume = 0;
  return { volume, baseMinutes };
}
