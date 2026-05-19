import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MagneticButton } from "@/components/magnetic-button";

type Mode = "turning" | "milling";

const RATES = { turning: 2275, milling: 2562 };
const DEFAULT_SETUP_MIN = 45;

const complexityMap = {
  turning: [
    { value: 1.0, text: "Простой вал / втулка (гладкая обточка)" },
    { value: 1.45, text: "Ступени, уступы, фаски, проточки" },
    { value: 2.0, text: "Стакан / глухое отверстие, канавки" },
    { value: 2.6, text: "Эксцентрик / сложная форма / резьба" },
  ],
  milling: [
    { value: 1.0, text: "Плоская плита / пластина (черновая)" },
    { value: 1.5, text: "Паз, уступ, простые карманы" },
    { value: 2.2, text: "Сложный корпус, 2.5D обработка" },
    { value: 3.0, text: "3D-контур / пресс-форма / сложная поверхность" },
  ],
};

function getBaseTimeTurning(diam: number, len: number) {
  const d = Math.max(10, diam);
  const l = Math.max(10, len);
  return (
    Math.round(((l * Math.pow(d, 0.42)) / 235 + 8 + (d > 130 ? 4 : 0)) * 10) /
    10
  );
}

function getBaseTimeMilling(lenMm: number, widthMm: number) {
  const L = Math.max(15, lenMm);
  const W = Math.max(15, widthMm);
  const t = ((L * W) / 4800) * 5.2 + ((2 * (L + W)) / 320) * 3.0;
  return Math.round(Math.min(280, Math.max(10, t + 12)) * 10) / 10;
}

function getMaterialFactor(mat: string) {
  const map: Record<string, number> = {
    custom: 1.0,
    "85": 0.85,
    "110": 0.85,
    "65": 1.0,
    "95": 1.45,
    "210": 1.9,
    "950": 2.7,
  };
  return map[mat] ?? 1.0;
}

export default function Calculator() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("turning");
  const [material, setMaterial] = useState("65");
  const [customPrice, setCustomPrice] = useState(65);
  const [partWeight, setPartWeight] = useState(1.2);
  const [complexity, setComplexity] = useState(1.0);
  const [precision, setPrecision] = useState(1.0);
  const [sizeA, setSizeA] = useState(80);
  const [sizeB, setSizeB] = useState(200);
  const [tooling, setTooling] = useState(0);
  const [quantity, setQuantity] = useState(5);

  useEffect(() => {
    setComplexity(complexityMap[mode][0].value);
    setTooling(0);
    if (mode === "turning") {
      setSizeA(80);
      setSizeB(200);
      setQuantity(5);
      setPartWeight(1.2);
    } else {
      setSizeA(140);
      setSizeB(110);
      setQuantity(4);
      setPartWeight(1.6);
    }
  }, [mode]);

  const materialPriceKg =
    material === "custom" ? customPrice : parseFloat(material);
  const materialCostPerPiece = materialPriceKg * partWeight;
  const baseMin =
    mode === "turning"
      ? getBaseTimeTurning(sizeA, sizeB)
      : getBaseTimeMilling(sizeA, sizeB);
  const techMult = Math.min(
    4.8,
    Math.max(
      0.7,
      getMaterialFactor(material) * 0.55 + complexity * 0.35 + precision * 0.4,
    ),
  );
  const adjustedMin = Math.round(baseMin * techMult * 10) / 10;
  const hourly = RATES[mode];
  const totalMachiningCost =
    ((adjustedMin * quantity + DEFAULT_SETUP_MIN) / 60) * hourly;
  const totalBatch = Math.round(
    totalMachiningCost + materialCostPerPiece * quantity + tooling,
  );
  const pricePerPiece = Math.round(totalBatch / quantity);
  const machiningPerPiece = Math.round(totalMachiningCost / quantity);
  const fmt = (n: number) => n.toLocaleString("ru-RU");

  return (
    <div className="relative min-h-screen w-full bg-background font-sans">
      {/* Фон как на главной */}
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
        <MagneticButton
          variant="secondary"
          onClick={() => navigate("/")}
          className="px-5 py-2 text-sm"
        >
          ← На сайт
        </MagneticButton>
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
          <h1 className="font-sans text-2xl font-light leading-tight tracking-tight text-black md:text-4xl">
            Калькулятор токарных
            <br />и фрезерных работ
          </h1>
          <p className="mt-2 text-sm text-black/50">
            Расчёт серийности · материал с реальной ценой · подготовка КП за 2
            минуты
          </p>
        </div>

        {/* Переключатель режима */}
        <div className="mb-6 flex gap-2 rounded-full border border-foreground/10 bg-foreground/5 p-1.5 backdrop-blur-md w-fit">
          {(["turning", "milling"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                mode === m
                  ? "bg-foreground text-background shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {m === "turning" ? "🔩 Токарная" : "🛠️ Фрезерная"}
            </button>
          ))}
        </div>

        {/* Сетка */}
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Левая — параметры */}
          <div className="flex flex-col gap-4 lg:flex-1">
            {/* Материал */}
            <div className="rounded-2xl border border-foreground/10 bg-white/60 p-5 backdrop-blur-md">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-black/40">
                Материал
              </p>
              <Field label="🧱 Материал заготовки">
                <CalcSelect
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                >
                  <option value="custom">🔘 Своя цена (ввести ниже)</option>
                  <option value="85">Алюминий / Д16Т — 85 ₽/кг</option>
                  <option value="110">Латунь / бронза — 110 ₽/кг</option>
                  <option value="65">
                    Конструкционная сталь (Ст3, 20) — 65 ₽/кг
                  </option>
                  <option value="95">Легированная сталь 40Х — 95 ₽/кг</option>
                  <option value="210">
                    Нержавеющая сталь (12Х18Н10Т) — 210 ₽/кг
                  </option>
                  <option value="950">Титановые сплавы — 950 ₽/кг</option>
                </CalcSelect>
              </Field>
              <div
                className={`mt-3 flex gap-3 transition-opacity ${material === "custom" ? "opacity-100" : "opacity-40"}`}
              >
                <Field label="Цена, руб/кг" className="flex-1">
                  <CalcInput
                    type="number"
                    value={
                      material === "custom" ? customPrice : parseFloat(material)
                    }
                    disabled={material !== "custom"}
                    onChange={(e) =>
                      setCustomPrice(parseFloat(e.target.value) || 0)
                    }
                    step={10}
                  />
                </Field>
                <Field label="Масса детали, кг" className="flex-1">
                  <CalcInput
                    type="number"
                    value={partWeight}
                    disabled={material !== "custom"}
                    onChange={(e) =>
                      setPartWeight(parseFloat(e.target.value) || 0)
                    }
                    step={0.1}
                  />
                </Field>
              </div>
            </div>

            {/* Параметры обработки */}
            <div className="rounded-2xl border border-foreground/10 bg-white/60 p-5 backdrop-blur-md">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-black/40">
                Параметры обработки
              </p>
              <div className="flex flex-col gap-4">
                <Field label="⚙️ Сложность детали">
                  <CalcSelect
                    value={complexity}
                    onChange={(e) => setComplexity(parseFloat(e.target.value))}
                  >
                    {complexityMap[mode].map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.text}
                      </option>
                    ))}
                  </CalcSelect>
                </Field>
                <Field label="🎯 Требуемая точность">
                  <CalcSelect
                    value={precision}
                    onChange={(e) => setPrecision(parseFloat(e.target.value))}
                  >
                    <option value={1.0}>IT14–IT12 (обычная) +0%</option>
                    <option value={1.45}>IT11–IT9 (средняя) +45%</option>
                    <option value={2.0}>IT8–IT7 (высокая H9/H7) +100%</option>
                  </CalcSelect>
                </Field>
                <div className="flex gap-3">
                  <Field
                    label={mode === "turning" ? "⌀ Диаметр, мм" : "Длина, мм"}
                    className="flex-1"
                  >
                    <CalcInput
                      type="number"
                      value={sizeA}
                      onChange={(e) =>
                        setSizeA(parseFloat(e.target.value) || 10)
                      }
                      step={5}
                    />
                  </Field>
                  <Field
                    label={mode === "turning" ? "Длина, мм" : "Ширина, мм"}
                    className="flex-1"
                  >
                    <CalcInput
                      type="number"
                      value={sizeB}
                      onChange={(e) =>
                        setSizeB(parseFloat(e.target.value) || 10)
                      }
                      step={10}
                    />
                  </Field>
                </div>
                <Field label="🛠️ Оснастка / доп. операции">
                  <CalcSelect
                    value={tooling}
                    onChange={(e) => setTooling(parseInt(e.target.value))}
                  >
                    <option value={0}>Базовая оснастка</option>
                    <option value={1800}>
                      ➕ Люнет / планшайба (+1 800 ₽)
                    </option>
                    <option value={3200}>
                      ➕ Специальные кулачки (+3 200 ₽)
                    </option>
                    <option value={500}>
                      ➕ Доп. сверление / резьба (+500 ₽)
                    </option>
                    <option value={2800}>
                      ➕ 4-осевая обработка (+2 800 ₽)
                    </option>
                  </CalcSelect>
                </Field>
                <Field label="📦 Количество деталей">
                  <CalcInput
                    type="number"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    min={1}
                    step={1}
                  />
                  <p className="mt-1.5 text-xs text-black/40">
                    Наладка распределяется на всю партию — цена за шт снижается
                  </p>
                </Field>
              </div>
            </div>
          </div>

          {/* Правая — результат */}
          <div className="flex flex-col gap-4 lg:w-80">
            {/* Цены */}
            <div className="rounded-2xl border border-foreground/10 bg-white/70 p-5 backdrop-blur-md">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-black/40">
                Итоговая стоимость
              </p>
              <div className="mb-3 rounded-xl bg-foreground/5 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-black/40">
                  За 1 шт
                </p>
                <p className="mt-1 text-4xl font-bold text-black">
                  {fmt(pricePerPiece)} ₽
                </p>
                <p className="text-xs text-black/40">материал + обработка</p>
              </div>
              <div className="rounded-xl border border-orange-400/30 bg-orange-50/50 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-orange-500/70">
                  Партия {quantity} шт
                </p>
                <p className="mt-1 text-3xl font-bold text-orange-600">
                  {fmt(totalBatch)} ₽
                </p>
              </div>
            </div>

            {/* Детализация */}
            <div className="rounded-2xl border border-foreground/10 bg-white/60 p-5 backdrop-blur-md">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-black/40">
                Детализация
              </p>
              {[
                ["⏱️ Базовое время (1 шт)", `${baseMin.toFixed(1)} мин`],
                ["⚡ Время с коэф. (1 шт)", `${adjustedMin.toFixed(1)} мин`],
                ["🏭 Ставка цеха", `${fmt(hourly)} ₽/ч`],
                ["🔄 Наладка на партию", `${DEFAULT_SETUP_MIN} мин`],
                [
                  "📦 Материал (1 шт)",
                  `${fmt(Math.round(materialCostPerPiece))} ₽`,
                ],
                ["🔧 Оснастка (партия)", `${fmt(tooling)} ₽`],
                ["🛠️ Обработка (1 шт)", `${fmt(machiningPerPiece)} ₽`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between border-t border-foreground/8 py-2.5 text-sm"
                >
                  <span className="text-black/60">{label}</span>
                  <span className="font-semibold text-black">{value}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-black/30">
              *Расчёт носит оценочный характер. Точное КП — после консультации с
              технологом.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-black/50">
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
      className="w-full rounded-xl border border-foreground/15 bg-white/80 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 cursor-pointer"
    >
      {children}
    </select>
  );
}

function CalcInput({
  type,
  value,
  onChange,
  disabled,
  step,
  min,
}: {
  type: string;
  value: number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  step?: number;
  min?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      step={step}
      min={min}
      className="w-full rounded-xl border border-foreground/15 bg-white/80 px-4 py-2.5 text-sm text-black outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 disabled:opacity-40"
    />
  );
}
