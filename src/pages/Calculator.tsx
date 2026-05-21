import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MagneticButton } from "@/components/magnetic-button";

// ─── Типы ───────────────────────────────────────────────────────────────────

type WorkType = "turning" | "milling";
type TurningSubtype = "shaft" | "bolt" | "stud" | "nut";
type ToothType = "straight" | "helical" | "hypoid";
type ThreadType = "external" | "internal";

interface Material {
  name: string;
  density: number;
  costPerKg: number;
  factor: number;
}

interface DrillItem {
  diam: number;
  depth: number;
  count: number;
}

interface AdminSettings {
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

// ─── Настройки по умолчанию ─────────────────────────────────────────────────

const DEFAULT_SETTINGS: AdminSettings = {
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

function loadSettings(): AdminSettings {
  const saved = localStorage.getItem("calcAdminSettings");
  if (saved) {
    return JSON.parse(saved) as AdminSettings;
  }
  return DEFAULT_SETTINGS;
}

// ─── Вспомогательные компоненты ─────────────────────────────────────────────

function Field({
  label,
  children,
  className = "",
  title,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={className}>
      <label
        title={title}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-black/50 cursor-help"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function CalcSelect({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full min-h-[44px] rounded-xl border border-foreground/15 bg-white/80 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 cursor-pointer"
    >
      {children}
    </select>
  );
}

function CalcInput({
  value,
  onChange,
  type = "number",
  step,
  min,
  disabled,
  placeholder,
}: {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  step?: number | string;
  min?: number;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      step={step}
      min={min}
      disabled={disabled}
      placeholder={placeholder}
      className="w-full min-h-[44px] rounded-xl border border-foreground/15 bg-white/80 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 disabled:opacity-40"
    />
  );
}

function Checkbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2 mt-3 cursor-pointer select-none"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded accent-orange-500 flex-shrink-0"
      />
      <span className="text-sm font-semibold text-black/80">{label}</span>
    </label>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-white/60 p-5 backdrop-blur-md">
      {title && (
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-black/40 flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ─── Вычисления объёма и базового времени ─────────────────────────────────

function getVolumeAndBaseTime(
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

// ─── Основной компонент ─────────────────────────────────────────────────────

export default function Calculator() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AdminSettings>(loadSettings);

  // Основные поля
  const [workType, setWorkType] = useState<WorkType>("turning");
  const [turningSubtype, setTurningSubtype] = useState<TurningSubtype>("shaft");
  const [materialIdx, setMaterialIdx] = useState(0);
  const [customerMaterial, setCustomerMaterial] = useState(false);
  const [quantity, setQuantity] = useState(5);

  // Размеры (единый словарь)
  const [dims, setDims] = useState<Record<string, number>>({
    // turning shaft
    diameter: 50, length: 100, holeDiameter: 0,
    // bolt
    boltDiam: 10, boltLength: 50, boltPitch: 1.5, boltHeadHeight: 7, boltHeadDiam: 16,
    // stud
    studDiam: 10, studLength: 80, studPitch: 1.5,
    // nut
    nutDiam: 10, nutHeight: 8, nutWidth: 17,
    // milling
    lengthX: 100, widthY: 80, thicknessZ: 20, pocketVolume: 0,
  });

  function setDim(key: string, val: number) {
    setDims((prev) => ({ ...prev, [key]: val }));
  }

  // Доп. операции
  const [extraDrilling, setExtraDrilling] = useState(false);
  const [drillItems, setDrillItems] = useState<DrillItem[]>([{ diam: 5, depth: 15, count: 2 }]);
  const [extraKeyway, setExtraKeyway] = useState(false);
  const [keywayLength, setKeywayLength] = useState(30);
  const [keywayWidth, setKeywayWidth] = useState(8);
  const [keywayDepth, setKeywayDepth] = useState(4);
  const [extraGear, setExtraGear] = useState(false);
  const [gearModule, setGearModule] = useState(2.5);
  const [gearTeeth, setGearTeeth] = useState(20);
  const [gearWidth, setGearWidth] = useState(25);
  const [gearToothType, setGearToothType] = useState<ToothType>("straight");
  const [extraThreading, setExtraThreading] = useState(false);
  const [threadType, setThreadType] = useState<ThreadType>("external");
  const [threadDiam, setThreadDiam] = useState(16);
  const [threadPitch, setThreadPitch] = useState(2);
  const [threadLength, setThreadLength] = useState(30);
  const [threadPasses, setThreadPasses] = useState(6);
  const [extraLunette, setExtraLunette] = useState(false);
  const [extraReverse, setExtraReverse] = useState(false);
  const [extraHardening, setExtraHardening] = useState(false);
  const [extraCarburizing, setExtraCarburizing] = useState(false);
  const [carburizingCost, setCarburizingCost] = useState(200);
  const [extraOxidizing, setExtraOxidizing] = useState(false);
  const [oxidizingCost, setOxidizingCost] = useState(150);

  // Результат
  const [result, setResult] = useState<{
    pricePerUnit: number;
    totalPrice: number;
    details: Array<[string, string]>;
  } | null>(null);

  // Админка
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminLogin, setAdminLogin] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminTab, setAdminTab] = useState<"main" | "materials" | "operations">("main");

  // Локальные копии настроек для редактирования в админке
  const [editSettings, setEditSettings] = useState<AdminSettings>(settings);

  function calculate() {
    const mat = settings.materials[materialIdx] ?? settings.materials[0];
    const { volume, baseMinutes } = getVolumeAndBaseTime(
      workType, turningSubtype, dims, mat.factor
    );
    const massKg = (volume * mat.density) / 1000;
    const metalCost = customerMaterial ? 0 : massKg * mat.costPerKg;

    let extraTimeMinutes = 0;
    let complexityFactor = 1.0;
    let extraCostPerUnit = 0;

    const dp = settings.drillParams;
    if (extraDrilling) {
      drillItems.forEach(({ diam, depth, count }) => {
        if (diam > 0 && depth > 0 && count > 0) {
          const rpm = (1000 * dp.Vc) / (Math.PI * diam);
          extraTimeMinutes += (depth / (dp.f * rpm)) * count;
        }
      });
    }

    const kp = settings.keywayParams;
    if (extraKeyway) {
      const passes = Math.ceil(keywayDepth / kp.ap);
      const rpm = (1000 * kp.Vc) / (Math.PI * keywayWidth);
      extraTimeMinutes += (keywayLength * passes) / (kp.fz * kp.z * rpm);
      complexityFactor += settings.extraFactors.keywayComplexity;
    }

    const gp = settings.gearParams;
    if (extraGear) {
      const n_w = (1000 * gp.Vc) / (Math.PI * gearModule * gearTeeth);
      const toothFactor = settings.extraFactors.toothFactors[gearToothType];
      const gearTime = (gearWidth / (gp.S * n_w)) * gearTeeth * gp.passes * toothFactor;
      extraTimeMinutes += gearTime;
      complexityFactor += settings.extraFactors.gearBaseComplexity * toothFactor;
    }

    const tp = settings.threadParams;
    if (extraThreading && threadDiam > 0 && threadPitch > 0 && threadLength > 0) {
      const rpm = (1000 * tp.Vc) / (Math.PI * threadDiam);
      extraTimeMinutes += (threadLength * threadPasses) / (threadPitch * rpm);
    }

    if (extraLunette) {
      extraTimeMinutes += settings.extraFactors.lunetteTime;
      complexityFactor += settings.extraFactors.lunetteComplexity;
    }
    if (extraReverse) {
      extraTimeMinutes += settings.extraFactors.reverseTime;
      complexityFactor += settings.extraFactors.reverseComplexity;
    }
    if (extraHardening) extraCostPerUnit += massKg * settings.hardeningCostPerKg;
    if (extraCarburizing) extraCostPerUnit += carburizingCost;
    if (extraOxidizing) extraCostPerUnit += oxidizingCost;

    const totalMinutes = baseMinutes * complexityFactor + extraTimeMinutes;
    const totalHours = totalMinutes / 60;
    const qty = Math.max(1, quantity);
    const setupHours = settings.setupMinutes / 60;
    const laborPerUnit =
      totalHours * settings.hourlyRate + (setupHours * settings.hourlyRate) / qty;
    const unitCost = metalCost + laborPerUnit + extraCostPerUnit;
    const totalCost = unitCost * qty;

    const details: Array<[string, string]> = [
      ["⏱️ Базовое время (1 шт)", `${baseMinutes.toFixed(1)} мин`],
      ["⚙️ Коэф. сложности", complexityFactor.toFixed(2)],
      ["➕ Доп. время", `${extraTimeMinutes.toFixed(1)} мин`],
      ["🕒 Итого время (1 шт)", `${totalMinutes.toFixed(1)} мин`],
      ["🏭 Ставка цеха", `${settings.hourlyRate.toLocaleString("ru-RU")} ₽/ч`],
      ["🔧 Наладка на партию", `${settings.setupMinutes} мин`],
      [
        "🧱 Материал (1 шт)",
        customerMaterial
          ? "заказчика (0 ₽)"
          : `${Math.round(metalCost).toLocaleString("ru-RU")} ₽`,
      ],
      ["🛠️ Обработка (1 шт)", `${Math.round(laborPerUnit).toLocaleString("ru-RU")} ₽`],
    ];
    if (extraCostPerUnit > 0) {
      details.push(["🔥 Доп. услуги (1 шт)", `${Math.round(extraCostPerUnit).toLocaleString("ru-RU")} ₽`]);
    }

    setResult({
      pricePerUnit: Math.round(unitCost),
      totalPrice: Math.round(totalCost),
      details,
    });
  }

  // ─── Рендер размерных полей ───────────────────────────────────────────────

  function renderDimensionFields() {
    if (workType === "milling") {
      return (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Field label="Длина X (мм)">
            <CalcInput value={dims.lengthX} onChange={(e) => setDim("lengthX", +e.target.value)} min={1} />
          </Field>
          <Field label="Ширина Y (мм)">
            <CalcInput value={dims.widthY} onChange={(e) => setDim("widthY", +e.target.value)} min={1} />
          </Field>
          <Field label="Толщина Z (мм)">
            <CalcInput value={dims.thicknessZ} onChange={(e) => setDim("thicknessZ", +e.target.value)} min={1} />
          </Field>
          <Field label="Выборки/карманы (см³)">
            <CalcInput value={dims.pocketVolume} onChange={(e) => setDim("pocketVolume", +e.target.value)} min={0} />
          </Field>
        </div>
      );
    }
    if (turningSubtype === "shaft") {
      return (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Field label="Диаметр заготовки (мм)">
            <CalcInput value={dims.diameter} onChange={(e) => setDim("diameter", +e.target.value)} min={1} />
          </Field>
          <Field label="Длина обработки (мм)">
            <CalcInput value={dims.length} onChange={(e) => setDim("length", +e.target.value)} min={1} />
          </Field>
          <Field label="Отверстие ⌀ (мм, 0 если нет)">
            <CalcInput value={dims.holeDiameter} onChange={(e) => setDim("holeDiameter", +e.target.value)} min={0} />
          </Field>
        </div>
      );
    }
    if (turningSubtype === "bolt") {
      return (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Field label="Диаметр резьбы (мм)">
            <CalcInput value={dims.boltDiam} onChange={(e) => setDim("boltDiam", +e.target.value)} min={1} />
          </Field>
          <Field label="Длина стержня (мм)">
            <CalcInput value={dims.boltLength} onChange={(e) => setDim("boltLength", +e.target.value)} min={1} />
          </Field>
          <Field label="Шаг резьбы (мм)">
            <CalcInput value={dims.boltPitch} onChange={(e) => setDim("boltPitch", +e.target.value)} step={0.1} min={0.1} />
          </Field>
          <Field label="Высота головки (мм)">
            <CalcInput value={dims.boltHeadHeight} onChange={(e) => setDim("boltHeadHeight", +e.target.value)} min={0} />
          </Field>
          <Field label="Диаметр головки (мм)">
            <CalcInput value={dims.boltHeadDiam} onChange={(e) => setDim("boltHeadDiam", +e.target.value)} min={0} />
          </Field>
        </div>
      );
    }
    if (turningSubtype === "stud") {
      return (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Field label="Диаметр резьбы (мм)">
            <CalcInput value={dims.studDiam} onChange={(e) => setDim("studDiam", +e.target.value)} min={1} />
          </Field>
          <Field label="Длина шпильки (мм)">
            <CalcInput value={dims.studLength} onChange={(e) => setDim("studLength", +e.target.value)} min={1} />
          </Field>
          <Field label="Шаг резьбы (мм)">
            <CalcInput value={dims.studPitch} onChange={(e) => setDim("studPitch", +e.target.value)} step={0.1} min={0.1} />
          </Field>
        </div>
      );
    }
    if (turningSubtype === "nut") {
      return (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Field label="Диаметр резьбы (мм)">
            <CalcInput value={dims.nutDiam} onChange={(e) => setDim("nutDiam", +e.target.value)} min={1} />
          </Field>
          <Field label="Высота гайки (мм)">
            <CalcInput value={dims.nutHeight} onChange={(e) => setDim("nutHeight", +e.target.value)} min={1} />
          </Field>
          <Field label="Размер под ключ (мм)">
            <CalcInput value={dims.nutWidth} onChange={(e) => setDim("nutWidth", +e.target.value)} min={1} />
          </Field>
        </div>
      );
    }
    return null;
  }

  // ─── Сверление ────────────────────────────────────────────────────────────

  function updateDrillItem(idx: number, field: keyof DrillItem, val: number) {
    setDrillItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  }

  // ─── Сохранение настроек ─────────────────────────────────────────────────

  function saveAdminSettings() {
    setSettings(editSettings);
    localStorage.setItem("calcAdminSettings", JSON.stringify(editSettings));
    alert("Настройки сохранены");
  }

  function setEditMat(idx: number, field: keyof Material, val: string | number) {
    setEditSettings((prev) => {
      const mats = [...prev.materials];
      mats[idx] = { ...mats[idx], [field]: val };
      return { ...prev, materials: mats };
    });
  }

  // ─── Рендер ───────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen w-full bg-background font-sans">
      {/* Фон */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/files/1df6a706-58a7-4e75-b7d6-f4921309aaf3.jpg')",
        }}
      >
        <div className="absolute inset-0 bg-white/90" />
      </div>

      {/* Навигация */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-0 transition-transform hover:scale-105"
        >
          <img
            src="https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/7b4ccbce-5c89-46bb-a8d2-35dd09ecdd32.png"
            alt="АЗОМ"
            className="h-24 w-auto"
          />
          <img
            src="https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/77df7b95-de84-41c1-91db-cba1516b2392.png"
            alt="МайнингСтройСервис"
            className="h-24 w-auto"
            style={{ marginLeft: "-1.5cm" }}
          />
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setAdminOpen(true);
              setEditSettings(settings);
            }}
            className="rounded-full border border-gray-300 bg-white/60 px-4 py-1.5 text-xs font-semibold text-gray-500 backdrop-blur-md transition hover:bg-white hover:text-gray-800"
          >
            🔑 Админка
          </button>
          <MagneticButton
            variant="secondary"
            onClick={() => navigate("/")}
            className="px-5 py-2 text-sm"
          >
            ← На сайт
          </MagneticButton>
        </div>
      </nav>

      {/* Контент */}
      <div className="relative z-10 px-6 pb-16 md:px-12">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="mb-4 inline-block rounded-full border border-foreground/20 bg-foreground/10 px-4 py-1.5 backdrop-blur-md">
            <p className="font-mono text-xs text-foreground/90">
              Абакан · Металлообработка и металлоконструкции
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-sans text-2xl font-light leading-tight tracking-tight text-black md:text-4xl">
              Калькулятор металлообработки и крепежа
            </h1>
            <span className="rounded-full bg-orange-500 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
              КП за 2 минуты
            </span>
          </div>
          <p className="mt-2 text-sm text-black/50">
            Токарная · Фрезерная · Расчёт с учётом материала, операций и серийности
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ─── Левая колонка — параметры ─────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:flex-1">

            {/* Блок: тип обработки и материал */}
            <Card title="Материал и тип изделия" icon="🪙">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Тип обработки">
                  <CalcSelect
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value as WorkType)}
                  >
                    <option value="turning">Токарная обработка</option>
                    <option value="milling">Фрезерная обработка</option>
                  </CalcSelect>
                </Field>
                <Field label="Материал">
                  <CalcSelect
                    value={materialIdx}
                    onChange={(e) => setMaterialIdx(+e.target.value)}
                  >
                    {settings.materials.map((m, i) => (
                      <option key={i} value={i}>
                        {m.name} ({m.costPerKg} ₽/кг)
                      </option>
                    ))}
                  </CalcSelect>
                </Field>
              </div>

              {workType === "turning" && (
                <div className="mt-3">
                  <Field label="Изделие">
                    <CalcSelect
                      value={turningSubtype}
                      onChange={(e) =>
                        setTurningSubtype(e.target.value as TurningSubtype)
                      }
                    >
                      <option value="shaft">Вал / втулка</option>
                      <option value="bolt">Болт</option>
                      <option value="stud">Шпилька</option>
                      <option value="nut">Гайка</option>
                    </CalcSelect>
                  </Field>
                </div>
              )}

              <Checkbox
                id="customerMaterial"
                checked={customerMaterial}
                onChange={setCustomerMaterial}
                label="Материал заказчика (давальческий)"
              />

              {renderDimensionFields()}

              <div className="mt-4">
                <Field label="Количество в партии (шт.)">
                  <CalcInput
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, +e.target.value || 1))}
                    min={1}
                  />
                </Field>
              </div>

              <button
                onClick={calculate}
                className="mt-4 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-md shadow-orange-400/30 transition hover:bg-orange-600 active:scale-[0.98]"
              >
                Рассчитать стоимость
              </button>
            </Card>

            {/* Блок: доп. операции */}
            <Card title="Дополнительные операции" icon="➕">
              {/* Сверление */}
              <Checkbox
                id="extraDrilling"
                checked={extraDrilling}
                onChange={setExtraDrilling}
                label="Сверление отверстий"
              />
              {extraDrilling && (
                <div className="mt-3 space-y-3">
                  {drillItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-end">
                      <Field label="Диаметр (мм)">
                        <CalcInput
                          value={item.diam}
                          onChange={(e) => updateDrillItem(idx, "diam", +e.target.value)}
                          step={0.1}
                          min={0.1}
                        />
                      </Field>
                      <Field label="Глубина (мм)">
                        <CalcInput
                          value={item.depth}
                          onChange={(e) => updateDrillItem(idx, "depth", +e.target.value)}
                          step={0.1}
                          min={0.1}
                        />
                      </Field>
                      <Field label="Количество">
                        <CalcInput
                          value={item.count}
                          onChange={(e) => updateDrillItem(idx, "count", +e.target.value)}
                          min={1}
                        />
                      </Field>
                      {drillItems.length > 1 && (
                        <button
                          onClick={() =>
                            setDrillItems((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="h-[44px] w-full rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setDrillItems((prev) => [...prev, { diam: 5, depth: 15, count: 1 }])
                    }
                    className="rounded-full border border-foreground/15 bg-white/80 px-4 py-1.5 text-xs font-semibold text-black/60 hover:bg-white transition"
                  >
                    ➕ Добавить отверстие
                  </button>
                </div>
              )}

              {/* Шпоночный паз */}
              <Checkbox
                id="extraKeyway"
                checked={extraKeyway}
                onChange={setExtraKeyway}
                label="Фрезерование шпоночного паза"
              />
              {extraKeyway && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Длина паза (мм)">
                    <CalcInput value={keywayLength} onChange={(e) => setKeywayLength(+e.target.value)} min={1} />
                  </Field>
                  <Field label="Ширина паза (мм)">
                    <CalcInput value={keywayWidth} onChange={(e) => setKeywayWidth(+e.target.value)} min={1} />
                  </Field>
                  <Field label="Глубина паза (мм)">
                    <CalcInput value={keywayDepth} onChange={(e) => setKeywayDepth(+e.target.value)} step={0.1} min={0.1} />
                  </Field>
                </div>
              )}

              {/* Нарезание зубьев */}
              <Checkbox
                id="extraGear"
                checked={extraGear}
                onChange={setExtraGear}
                label="Нарезание зубьев"
              />
              {extraGear && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Модуль (мм)">
                    <CalcInput value={gearModule} onChange={(e) => setGearModule(+e.target.value)} step={0.1} min={0.1} />
                  </Field>
                  <Field label="Число зубьев">
                    <CalcInput value={gearTeeth} onChange={(e) => setGearTeeth(+e.target.value)} min={1} />
                  </Field>
                  <Field label="Ширина венца (мм)">
                    <CalcInput value={gearWidth} onChange={(e) => setGearWidth(+e.target.value)} min={1} />
                  </Field>
                  <Field label="Тип зуба">
                    <CalcSelect
                      value={gearToothType}
                      onChange={(e) => setGearToothType(e.target.value as ToothType)}
                    >
                      <option value="straight">Прямой</option>
                      <option value="helical">Косой</option>
                      <option value="hypoid">Гипоидный</option>
                    </CalcSelect>
                  </Field>
                </div>
              )}

              {/* Нарезание резьбы */}
              <Checkbox
                id="extraThreading"
                checked={extraThreading}
                onChange={setExtraThreading}
                label="Нарезание резьбы"
              />
              {extraThreading && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Тип резьбы">
                    <CalcSelect value={threadType} onChange={(e) => setThreadType(e.target.value as ThreadType)}>
                      <option value="external">Наружная</option>
                      <option value="internal">Внутренняя</option>
                    </CalcSelect>
                  </Field>
                  <Field label="Диаметр резьбы (мм)">
                    <CalcInput value={threadDiam} onChange={(e) => setThreadDiam(+e.target.value)} min={1} />
                  </Field>
                  <Field label="Шаг резьбы (мм)">
                    <CalcInput value={threadPitch} onChange={(e) => setThreadPitch(+e.target.value)} step={0.1} min={0.1} />
                  </Field>
                  <Field label="Длина резьбы (мм)">
                    <CalcInput value={threadLength} onChange={(e) => setThreadLength(+e.target.value)} min={1} />
                  </Field>
                  <Field label="Количество проходов">
                    <CalcInput value={threadPasses} onChange={(e) => setThreadPasses(+e.target.value)} min={1} />
                  </Field>
                </div>
              )}

              {/* Прочие опции */}
              <Checkbox id="extraLunette" checked={extraLunette} onChange={setExtraLunette} label="Использование люнета" />
              <Checkbox id="extraReverse" checked={extraReverse} onChange={setExtraReverse} label="Обратные кулачки" />
              <Checkbox id="extraHardening" checked={extraHardening} onChange={setExtraHardening} label="Закалка" />
              <Checkbox id="extraCarburizing" checked={extraCarburizing} onChange={setExtraCarburizing} label="Цементация" />
              {extraCarburizing && (
                <div className="mt-2">
                  <Field label="Стоимость цементации за 1 шт (₽)">
                    <CalcInput value={carburizingCost} onChange={(e) => setCarburizingCost(+e.target.value)} step={10} min={0} />
                  </Field>
                </div>
              )}
              <Checkbox id="extraOxidizing" checked={extraOxidizing} onChange={setExtraOxidizing} label="Оксидирование" />
              {extraOxidizing && (
                <div className="mt-2">
                  <Field label="Стоимость оксидирования за 1 шт (₽)">
                    <CalcInput value={oxidizingCost} onChange={(e) => setOxidizingCost(+e.target.value)} step={10} min={0} />
                  </Field>
                </div>
              )}
            </Card>
          </div>

          {/* ─── Правая колонка — результат ────────────────────────────── */}
          <div className="flex flex-col gap-4 lg:w-80">
            {result ? (
              <>
                <div className="rounded-2xl border border-foreground/10 bg-black p-5 text-white">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-white/50">За 1 шт</p>
                      <p className="mt-1 text-4xl font-bold text-orange-400">
                        {result.pricePerUnit.toLocaleString("ru-RU")} ₽
                      </p>
                      <p className="text-xs text-white/40">материал + обработка</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-white/50">
                        Партия {quantity} шт
                      </p>
                      <p className="mt-1 text-3xl font-bold text-orange-400">
                        {result.totalPrice.toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                  </div>

                  <hr className="my-4 border-white/10" />

                  <div className="space-y-1.5">
                    {result.details.map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-white/50">{label}</span>
                        <span className="font-semibold text-white">{value}</span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-xs text-white/30">
                    *Расчёт носит оценочный характер. Цены указаны с НДС.
                    Точное КП — после консультации с технологом.
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-foreground/10 bg-white/60 p-8 backdrop-blur-md text-center text-black/30 text-sm">
                Заполните параметры и нажмите<br />«Рассчитать стоимость»
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Модальное окно админки ──────────────────────────────────────── */}
      {adminOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAdminOpen(false);
          }}
        >
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Админ-панель</h3>
              <button
                onClick={() => setAdminOpen(false)}
                className="text-2xl leading-none text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {!adminLoggedIn ? (
              <div className="space-y-3">
                <Field label="Логин">
                  <CalcInput
                    type="text"
                    value={adminLogin}
                    onChange={(e) => setAdminLogin(e.target.value)}
                    placeholder="Логин"
                  />
                </Field>
                <Field label="Пароль">
                  <CalcInput
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="Пароль"
                  />
                </Field>
                {adminError && (
                  <p className="text-red-500 text-sm">{adminError}</p>
                )}
                <button
                  onClick={() => {
                    if (
                      adminLogin === "das-service@inbox.ru" &&
                      adminPass === "autoremex2012"
                    ) {
                      setAdminLoggedIn(true);
                      setAdminError("");
                    } else {
                      setAdminError("Неверный логин или пароль");
                    }
                  }}
                  className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition"
                >
                  Войти
                </button>
              </div>
            ) : (
              <div>
                {/* Табы */}
                <div className="flex gap-2 mb-5 flex-wrap">
                  {(["main", "materials", "operations"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAdminTab(tab)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                        adminTab === tab
                          ? "bg-orange-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tab === "main" ? "Основные" : tab === "materials" ? "Материалы" : "Операции"}
                    </button>
                  ))}
                </div>

                {/* Таб: Основные */}
                {adminTab === "main" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ставка цеха (₽/ч)">
                      <CalcInput
                        value={editSettings.hourlyRate}
                        onChange={(e) =>
                          setEditSettings((p) => ({ ...p, hourlyRate: +e.target.value }))
                        }
                        step={50}
                      />
                    </Field>
                    <Field label="Наладка на партию (мин)">
                      <CalcInput
                        value={editSettings.setupMinutes}
                        onChange={(e) =>
                          setEditSettings((p) => ({ ...p, setupMinutes: +e.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Закалка (₽/кг)">
                      <CalcInput
                        value={editSettings.hardeningCostPerKg}
                        onChange={(e) =>
                          setEditSettings((p) => ({ ...p, hardeningCostPerKg: +e.target.value }))
                        }
                        step={10}
                      />
                    </Field>
                  </div>
                )}

                {/* Таб: Материалы */}
                {adminTab === "materials" && (
                  <div>
                    {editSettings.materials.map((mat, idx) => (
                      <div key={idx} className="flex gap-2 items-center mb-2 flex-wrap">
                        <input
                          value={mat.name}
                          onChange={(e) => setEditMat(idx, "name", e.target.value)}
                          className="min-h-[40px] flex-1 min-w-[100px] rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
                          placeholder="Название"
                        />
                        <input
                          type="number"
                          value={mat.density}
                          onChange={(e) => setEditMat(idx, "density", +e.target.value)}
                          className="min-h-[40px] w-20 rounded-xl border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-orange-400"
                          placeholder="Плотность"
                        />
                        <input
                          type="number"
                          value={mat.costPerKg}
                          onChange={(e) => setEditMat(idx, "costPerKg", +e.target.value)}
                          className="min-h-[40px] w-20 rounded-xl border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-orange-400"
                          placeholder="₽/кг"
                        />
                        <input
                          type="number"
                          value={mat.factor}
                          step={0.01}
                          onChange={(e) => setEditMat(idx, "factor", +e.target.value)}
                          className="min-h-[40px] w-16 rounded-xl border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-orange-400"
                          placeholder="Коэф."
                        />
                        <button
                          onClick={() =>
                            setEditSettings((p) => ({
                              ...p,
                              materials: p.materials.filter((_, i) => i !== idx),
                            }))
                          }
                          className="h-10 w-10 rounded-full bg-red-500 text-white font-bold text-lg flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setEditSettings((p) => ({
                          ...p,
                          materials: [
                            ...p.materials,
                            { name: "Новый", density: 1.0, costPerKg: 0, factor: 1.0 },
                          ],
                        }))
                      }
                      className="mt-2 rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                    >
                      ➕ Добавить материал
                    </button>
                  </div>
                )}

                {/* Таб: Операции */}
                {adminTab === "operations" && (
                  <div className="space-y-5">
                    <div>
                      <p className="mb-2 text-sm font-bold">Сверление</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Vc (м/мин)" title="Скорость резания">
                          <CalcInput value={editSettings.drillParams.Vc} onChange={(e) => setEditSettings((p) => ({ ...p, drillParams: { ...p.drillParams, Vc: +e.target.value } }))} />
                        </Field>
                        <Field label="f (мм/об)" title="Подача на оборот">
                          <CalcInput value={editSettings.drillParams.f} onChange={(e) => setEditSettings((p) => ({ ...p, drillParams: { ...p.drillParams, f: +e.target.value } }))} step={0.01} />
                        </Field>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-bold">Шпоночный паз</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Vc (м/мин)">
                          <CalcInput value={editSettings.keywayParams.Vc} onChange={(e) => setEditSettings((p) => ({ ...p, keywayParams: { ...p.keywayParams, Vc: +e.target.value } }))} />
                        </Field>
                        <Field label="fz (мм/зуб)">
                          <CalcInput value={editSettings.keywayParams.fz} onChange={(e) => setEditSettings((p) => ({ ...p, keywayParams: { ...p.keywayParams, fz: +e.target.value } }))} step={0.01} />
                        </Field>
                        <Field label="Число зубьев">
                          <CalcInput value={editSettings.keywayParams.z} onChange={(e) => setEditSettings((p) => ({ ...p, keywayParams: { ...p.keywayParams, z: +e.target.value } }))} />
                        </Field>
                        <Field label="Глубина за проход (мм)">
                          <CalcInput value={editSettings.keywayParams.ap} onChange={(e) => setEditSettings((p) => ({ ...p, keywayParams: { ...p.keywayParams, ap: +e.target.value } }))} step={0.1} />
                        </Field>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-bold">Зубофрезерование</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Vc (м/мин)">
                          <CalcInput value={editSettings.gearParams.Vc} onChange={(e) => setEditSettings((p) => ({ ...p, gearParams: { ...p.gearParams, Vc: +e.target.value } }))} />
                        </Field>
                        <Field label="S (мм/об)">
                          <CalcInput value={editSettings.gearParams.S} onChange={(e) => setEditSettings((p) => ({ ...p, gearParams: { ...p.gearParams, S: +e.target.value } }))} step={0.01} />
                        </Field>
                        <Field label="Проходов">
                          <CalcInput value={editSettings.gearParams.passes} onChange={(e) => setEditSettings((p) => ({ ...p, gearParams: { ...p.gearParams, passes: +e.target.value } }))} />
                        </Field>
                        <Field label="Диаметр фрезы (мм)">
                          <CalcInput value={editSettings.gearParams.D_fr} onChange={(e) => setEditSettings((p) => ({ ...p, gearParams: { ...p.gearParams, D_fr: +e.target.value } }))} />
                        </Field>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-bold">Нарезание резьбы</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Vc (м/мин)">
                          <CalcInput value={editSettings.threadParams.Vc} onChange={(e) => setEditSettings((p) => ({ ...p, threadParams: { Vc: +e.target.value } }))} />
                        </Field>
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-bold">Коэффициенты сложности</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Люнет: доп. время (мин)">
                          <CalcInput value={editSettings.extraFactors.lunetteTime} onChange={(e) => setEditSettings((p) => ({ ...p, extraFactors: { ...p.extraFactors, lunetteTime: +e.target.value } }))} step={0.1} />
                        </Field>
                        <Field label="Люнет: коэф. сложности">
                          <CalcInput value={editSettings.extraFactors.lunetteComplexity} onChange={(e) => setEditSettings((p) => ({ ...p, extraFactors: { ...p.extraFactors, lunetteComplexity: +e.target.value } }))} step={0.01} />
                        </Field>
                        <Field label="Кулачки: доп. время (мин)">
                          <CalcInput value={editSettings.extraFactors.reverseTime} onChange={(e) => setEditSettings((p) => ({ ...p, extraFactors: { ...p.extraFactors, reverseTime: +e.target.value } }))} step={0.1} />
                        </Field>
                        <Field label="Кулачки: коэф. сложности">
                          <CalcInput value={editSettings.extraFactors.reverseComplexity} onChange={(e) => setEditSettings((p) => ({ ...p, extraFactors: { ...p.extraFactors, reverseComplexity: +e.target.value } }))} step={0.01} />
                        </Field>
                        <Field label="Шпоночный паз: коэф.">
                          <CalcInput value={editSettings.extraFactors.keywayComplexity} onChange={(e) => setEditSettings((p) => ({ ...p, extraFactors: { ...p.extraFactors, keywayComplexity: +e.target.value } }))} step={0.01} />
                        </Field>
                        <Field label="Зубья: базовый коэф.">
                          <CalcInput value={editSettings.extraFactors.gearBaseComplexity} onChange={(e) => setEditSettings((p) => ({ ...p, extraFactors: { ...p.extraFactors, gearBaseComplexity: +e.target.value } }))} step={0.01} />
                        </Field>
                        <Field label="Прямой зуб: коэф.">
                          <CalcInput value={editSettings.extraFactors.toothFactors.straight} onChange={(e) => setEditSettings((p) => ({ ...p, extraFactors: { ...p.extraFactors, toothFactors: { ...p.extraFactors.toothFactors, straight: +e.target.value } } }))} step={0.1} />
                        </Field>
                        <Field label="Косой зуб: коэф.">
                          <CalcInput value={editSettings.extraFactors.toothFactors.helical} onChange={(e) => setEditSettings((p) => ({ ...p, extraFactors: { ...p.extraFactors, toothFactors: { ...p.extraFactors.toothFactors, helical: +e.target.value } } }))} step={0.1} />
                        </Field>
                        <Field label="Гипоидный зуб: коэф.">
                          <CalcInput value={editSettings.extraFactors.toothFactors.hypoid} onChange={(e) => setEditSettings((p) => ({ ...p, extraFactors: { ...p.extraFactors, toothFactors: { ...p.extraFactors.toothFactors, hypoid: +e.target.value } } }))} step={0.1} />
                        </Field>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={saveAdminSettings}
                    className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition"
                  >
                    Сохранить настройки
                  </button>
                  <button
                    onClick={() => {
                      setAdminLoggedIn(false);
                      setAdminOpen(false);
                    }}
                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 transition"
                  >
                    Выйти
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}