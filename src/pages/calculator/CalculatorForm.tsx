import {
  AdminSettings,
  WorkTypeDef,
  Subtype,
  DrillItem,
  KeywayItem,
  GearItem,
  ThreadItem,
  ShaftSegment,
  ConeItem,
  GrooveItem,
  CuttingOpItem,
  CustomExtraOp,
  FIELD_LABELS,
  FIELD_DEFAULTS,
} from "./calculator.types";
import { Field, CalcSelect, CalcInput, Checkbox, Card } from "./calculator-ui";

interface CalculatorFormProps {
  settings: AdminSettings;
  workTypeIdx: number;
  setWorkTypeIdx: (v: number) => void;
  subtypeIdx: number;
  setSubtypeIdx: (v: number) => void;
  materialIdx: number;
  setMaterialIdx: (v: number) => void;
  customerMaterial: boolean;
  setCustomerMaterial: (v: boolean) => void;
  dims: Record<string, number>;
  setDim: (key: string, val: number) => void;
  quantity: number;
  setQuantity: (v: number) => void;
  extraDrilling: boolean;
  setExtraDrilling: (v: boolean) => void;
  drillItems: DrillItem[];
  setDrillItems: React.Dispatch<React.SetStateAction<DrillItem[]>>;
  extraKeyway: boolean;
  setExtraKeyway: (v: boolean) => void;
  keywayItems: KeywayItem[];
  setKeywayItems: React.Dispatch<React.SetStateAction<KeywayItem[]>>;
  extraGear: boolean;
  setExtraGear: (v: boolean) => void;
  gearItems: GearItem[];
  setGearItems: React.Dispatch<React.SetStateAction<GearItem[]>>;
  extraThreading: boolean;
  setExtraThreading: (v: boolean) => void;
  threadItems: ThreadItem[];
  setThreadItems: React.Dispatch<React.SetStateAction<ThreadItem[]>>;
  extraLunette: boolean;
  setExtraLunette: (v: boolean) => void;
  extraReverse: boolean;
  setExtraReverse: (v: boolean) => void;
  checkedExtraOps: Record<string, boolean>;
  setCheckedExtraOps: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  shaftSegments: ShaftSegment[];
  setShaftSegments: React.Dispatch<React.SetStateAction<ShaftSegment[]>>;
  extraConeExt: boolean;
  setExtraConeExt: (v: boolean) => void;
  coneExtItems: ConeItem[];
  setConeExtItems: React.Dispatch<React.SetStateAction<ConeItem[]>>;
  extraConeInt: boolean;
  setExtraConeInt: (v: boolean) => void;
  coneIntItems: ConeItem[];
  setConeIntItems: React.Dispatch<React.SetStateAction<ConeItem[]>>;
  extraGroove: boolean;
  setExtraGroove: (v: boolean) => void;
  grooveItems: GrooveItem[];
  setGrooveItems: React.Dispatch<React.SetStateAction<GrooveItem[]>>;
  extraCuttingOp: boolean;
  setExtraCuttingOp: (v: boolean) => void;
  cuttingOpItems: CuttingOpItem[];
  setCuttingOpItems: React.Dispatch<React.SetStateAction<CuttingOpItem[]>>;
  onCalculate: () => void;
}

// IDs that are rendered as dedicated sections above, not via customExtraOps loop
const DEDICATED_EXTRA_OP_IDS = new Set(["cone_ext", "cone_int", "groove", "cutting_op"]);

export default function CalculatorForm({
  settings,
  workTypeIdx,
  setWorkTypeIdx,
  subtypeIdx,
  setSubtypeIdx,
  materialIdx,
  setMaterialIdx,
  customerMaterial,
  setCustomerMaterial,
  dims,
  setDim,
  quantity,
  setQuantity,
  extraDrilling,
  setExtraDrilling,
  drillItems,
  setDrillItems,
  extraKeyway,
  setExtraKeyway,
  keywayItems,
  setKeywayItems,
  extraGear,
  setExtraGear,
  gearItems,
  setGearItems,
  extraThreading,
  setExtraThreading,
  threadItems,
  setThreadItems,
  extraLunette,
  setExtraLunette,
  extraReverse,
  setExtraReverse,
  checkedExtraOps,
  setCheckedExtraOps,
  shaftSegments,
  setShaftSegments,
  extraConeExt,
  setExtraConeExt,
  coneExtItems,
  setConeExtItems,
  extraConeInt,
  setExtraConeInt,
  coneIntItems,
  setConeIntItems,
  extraGroove,
  setExtraGroove,
  grooveItems,
  setGrooveItems,
  extraCuttingOp,
  setExtraCuttingOp,
  cuttingOpItems,
  setCuttingOpItems,
  onCalculate,
}: CalculatorFormProps) {
  const wt: WorkTypeDef | undefined = settings.workTypes[workTypeIdx];
  const hasSubtypes = wt && wt.subtypes && wt.subtypes.length > 0;
  const sub: Subtype | undefined = hasSubtypes ? wt.subtypes[subtypeIdx] : undefined;
  const activeFields = sub ? sub.fields : wt?.fields ?? [];

  // Shaft mode: turning + shaft subtype (or turning with no subtypes)
  const isShaftMode =
    wt?.id === "turning" && (sub?.id === "shaft" || (!hasSubtypes));

  function updateDrillItem<K extends keyof DrillItem>(idx: number, field: K, val: DrillItem[K]) {
    setDrillItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }
  function updateKeywayItem<K extends keyof KeywayItem>(idx: number, field: K, val: KeywayItem[K]) {
    setKeywayItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }
  function updateGearItem<K extends keyof GearItem>(idx: number, field: K, val: GearItem[K]) {
    setGearItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }
  function updateThreadItem<K extends keyof ThreadItem>(idx: number, field: K, val: ThreadItem[K]) {
    setThreadItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }
  function updateShaftSegment<K extends keyof ShaftSegment>(idx: number, field: K, val: ShaftSegment[K]) {
    setShaftSegments((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }
  function updateConeExtItem<K extends keyof ConeItem>(idx: number, field: K, val: ConeItem[K]) {
    setConeExtItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }
  function updateConeIntItem<K extends keyof ConeItem>(idx: number, field: K, val: ConeItem[K]) {
    setConeIntItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }
  function updateGrooveItem<K extends keyof GrooveItem>(idx: number, field: K, val: GrooveItem[K]) {
    setGrooveItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }
  function updateCuttingOpItem<K extends keyof CuttingOpItem>(idx: number, field: K, val: CuttingOpItem[K]) {
    setCuttingOpItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-1">
      {/* Блок: тип обработки и материал */}
      <Card title="Материал и тип изделия" icon="🪙">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Тип обработки">
            <CalcSelect
              value={workTypeIdx}
              onChange={(e) => setWorkTypeIdx(+e.target.value)}
            >
              {settings.workTypes.map((w, i) => (
                <option key={w.id} value={i}>{w.name}</option>
              ))}
            </CalcSelect>
          </Field>
          <Field label="Материал">
            <CalcSelect value={materialIdx} onChange={(e) => setMaterialIdx(+e.target.value)}>
              {settings.materials.map((m, i) => (
                <option key={i} value={i}>{m.name}</option>
              ))}
            </CalcSelect>
          </Field>
        </div>

        {hasSubtypes && (
          <div className="mt-3">
            <Field label="Изделие">
              <CalcSelect value={subtypeIdx} onChange={(e) => setSubtypeIdx(+e.target.value)}>
                {wt.subtypes.map((st, i) => (
                  <option key={st.id} value={i}>{st.name}</option>
                ))}
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

        {/* Shaft segment editor — replaces diameter/length fields */}
        {isShaftMode ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold text-black/50 uppercase tracking-wide">Участки вала</p>
            {shaftSegments.map((seg, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 items-end">
                <Field label="Диаметр (мм)">
                  <CalcInput
                    value={seg.diameter}
                    onChange={(e) => updateShaftSegment(idx, "diameter", +e.target.value)}
                    min={1}
                  />
                </Field>
                <Field label="Длина (мм)">
                  <CalcInput
                    value={seg.length}
                    onChange={(e) => updateShaftSegment(idx, "length", +e.target.value)}
                    min={1}
                  />
                </Field>
                {shaftSegments.length > 1 && (
                  <div className="col-span-2">
                    <button
                      onClick={() => setShaftSegments((prev) => prev.filter((_, i) => i !== idx))}
                      className="h-[44px] w-full rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition"
                    >×</button>
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={() => setShaftSegments((prev) => [...prev, { diameter: 50, length: 100 }])}
              className="rounded-full border border-foreground/15 bg-white/80 px-4 py-1.5 text-xs font-semibold text-black/60 hover:bg-white transition"
            >
              ➕ Добавить участок
            </button>

            {/* holeDiameter is still shown separately */}
            {activeFields.includes("holeDiameter") && (
              <div className="mt-2">
                <Field label={FIELD_LABELS["holeDiameter"] || "holeDiameter"}>
                  <CalcInput
                    value={dims["holeDiameter"] ?? FIELD_DEFAULTS["holeDiameter"] ?? 0}
                    onChange={(e) => setDim("holeDiameter", +e.target.value)}
                    min={0}
                  />
                </Field>
              </div>
            )}
          </div>
        ) : (
          /* Normal dynamic dimension fields */
          activeFields.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {activeFields.map((f) => (
                <Field key={f} label={FIELD_LABELS[f] || f}>
                  <CalcInput
                    value={dims[f] ?? FIELD_DEFAULTS[f] ?? 0}
                    onChange={(e) => setDim(f, +e.target.value)}
                    min={0}
                    step={f.includes("Pitch") || f.includes("pitch") ? 0.1 : 1}
                  />
                </Field>
              ))}
            </div>
          )
        )}

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
          onClick={onCalculate}
          className="mt-4 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-md shadow-orange-400/30 transition hover:bg-orange-600 active:scale-[0.98]"
        >
          Рассчитать стоимость
        </button>
      </Card>

      {/* Блок: доп. операции */}
      <Card title="Дополнительные операции" icon="➕">
        {/* Сверление */}
        <Checkbox id="extraDrilling" checked={extraDrilling} onChange={setExtraDrilling} label="Сверление отверстий" />
        {extraDrilling && (
          <div className="mt-3 space-y-3">
            {drillItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-end">
                <Field label="Диаметр (мм)">
                  <CalcInput value={item.diam} onChange={(e) => updateDrillItem(idx, "diam", +e.target.value)} step={0.1} min={0.1} />
                </Field>
                <Field label="Глубина (мм)">
                  <CalcInput value={item.depth} onChange={(e) => updateDrillItem(idx, "depth", +e.target.value)} step={0.1} min={0.1} />
                </Field>
                <Field label="Количество">
                  <CalcInput value={item.count} onChange={(e) => updateDrillItem(idx, "count", +e.target.value)} min={1} />
                </Field>
                {drillItems.length > 1 && (
                  <button
                    onClick={() => setDrillItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-[44px] w-full rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition"
                  >×</button>
                )}
              </div>
            ))}
            <button
              onClick={() => setDrillItems((prev) => [...prev, { diam: 5, depth: 15, count: 1 }])}
              className="rounded-full border border-foreground/15 bg-white/80 px-4 py-1.5 text-xs font-semibold text-black/60 hover:bg-white transition"
            >
              ➕ Добавить отверстие
            </button>
          </div>
        )}

        {/* Шпоночный паз */}
        <Checkbox id="extraKeyway" checked={extraKeyway} onChange={setExtraKeyway} label="Фрезерование шпоночного паза" />
        {extraKeyway && (
          <div className="mt-3 space-y-3">
            {keywayItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-end">
                <Field label="Длина паза (мм)">
                  <CalcInput value={item.length} onChange={(e) => updateKeywayItem(idx, "length", +e.target.value)} min={1} />
                </Field>
                <Field label="Ширина паза (мм)">
                  <CalcInput value={item.width} onChange={(e) => updateKeywayItem(idx, "width", +e.target.value)} min={1} />
                </Field>
                <Field label="Глубина паза (мм)">
                  <CalcInput value={item.depth} onChange={(e) => updateKeywayItem(idx, "depth", +e.target.value)} step={0.1} min={0.1} />
                </Field>
                {keywayItems.length > 1 && (
                  <button
                    onClick={() => setKeywayItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-[44px] w-full rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition"
                  >×</button>
                )}
              </div>
            ))}
            <button
              onClick={() => setKeywayItems((prev) => [...prev, { length: 30, width: 8, depth: 4 }])}
              className="rounded-full border border-foreground/15 bg-white/80 px-4 py-1.5 text-xs font-semibold text-black/60 hover:bg-white transition"
            >
              ➕ Добавить паз
            </button>
          </div>
        )}

        {/* Нарезание зубьев */}
        <Checkbox id="extraGear" checked={extraGear} onChange={setExtraGear} label="Нарезание зубьев" />
        {extraGear && (
          <div className="mt-3 space-y-3">
            {gearItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-end">
                <Field label="Модуль (мм)">
                  <CalcInput value={item.module} onChange={(e) => updateGearItem(idx, "module", +e.target.value)} step={0.1} min={0.1} />
                </Field>
                <Field label="Число зубьев">
                  <CalcInput value={item.teeth} onChange={(e) => updateGearItem(idx, "teeth", +e.target.value)} min={1} />
                </Field>
                <Field label="Ширина венца (мм)">
                  <CalcInput value={item.width} onChange={(e) => updateGearItem(idx, "width", +e.target.value)} min={1} />
                </Field>
                <Field label="Тип зуба">
                  <CalcSelect value={item.type} onChange={(e) => updateGearItem(idx, "type", e.target.value as GearItem["type"])}>
                    <option value="straight">Прямой</option>
                    <option value="helical">Косой</option>
                    <option value="hypoid">Гипоидный</option>
                  </CalcSelect>
                </Field>
                {gearItems.length > 1 && (
                  <button
                    onClick={() => setGearItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-[44px] w-full rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition col-span-2 sm:col-span-1"
                  >×</button>
                )}
              </div>
            ))}
            <button
              onClick={() => setGearItems((prev) => [...prev, { module: 2.5, teeth: 20, width: 25, type: "straight" }])}
              className="rounded-full border border-foreground/15 bg-white/80 px-4 py-1.5 text-xs font-semibold text-black/60 hover:bg-white transition"
            >
              ➕ Добавить зубчатый венец
            </button>
          </div>
        )}

        {/* Нарезание резьбы */}
        <Checkbox id="extraThreading" checked={extraThreading} onChange={setExtraThreading} label="Нарезание резьбы" />
        {extraThreading && (
          <div className="mt-3 space-y-3">
            {threadItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-3 items-end">
                <Field label="Тип резьбы">
                  <CalcSelect value={item.type} onChange={(e) => updateThreadItem(idx, "type", e.target.value as ThreadItem["type"])}>
                    <option value="external">Наружная</option>
                    <option value="internal">Внутренняя</option>
                  </CalcSelect>
                </Field>
                <Field label="Диаметр (мм)">
                  <CalcInput value={item.diam} onChange={(e) => updateThreadItem(idx, "diam", +e.target.value)} min={1} />
                </Field>
                <Field label="Шаг (мм)">
                  <CalcInput value={item.pitch} onChange={(e) => updateThreadItem(idx, "pitch", +e.target.value)} step={0.1} min={0.1} />
                </Field>
                <Field label="Длина (мм)">
                  <CalcInput value={item.length} onChange={(e) => updateThreadItem(idx, "length", +e.target.value)} min={1} />
                </Field>
                <Field label="Проходов">
                  <CalcInput value={item.passes} onChange={(e) => updateThreadItem(idx, "passes", +e.target.value)} min={1} />
                </Field>
                {threadItems.length > 1 && (
                  <button
                    onClick={() => setThreadItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-[44px] w-full rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition"
                  >×</button>
                )}
              </div>
            ))}
            <button
              onClick={() => setThreadItems((prev) => [...prev, { type: "external", diam: 16, pitch: 2, length: 30, passes: 6 }])}
              className="rounded-full border border-foreground/15 bg-white/80 px-4 py-1.5 text-xs font-semibold text-black/60 hover:bg-white transition"
            >
              ➕ Добавить резьбу
            </button>
          </div>
        )}

        {/* Люнет и кулачки */}
        <Checkbox id="extraLunette" checked={extraLunette} onChange={setExtraLunette} label="Использование люнета" />
        <Checkbox id="extraReverse" checked={extraReverse} onChange={setExtraReverse} label="Обратные кулачки" />

        {/* Конус наружный */}
        <Checkbox id="extraConeExt" checked={extraConeExt} onChange={setExtraConeExt} label="Конус наружный" />
        {extraConeExt && (
          <div className="mt-3 space-y-3">
            {coneExtItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-end">
                <Field label="Большой диаметр (мм)">
                  <CalcInput value={item.coneBigD} onChange={(e) => updateConeExtItem(idx, "coneBigD", +e.target.value)} min={1} />
                </Field>
                <Field label="Малый диаметр (мм)">
                  <CalcInput value={item.coneSmallD} onChange={(e) => updateConeExtItem(idx, "coneSmallD", +e.target.value)} min={1} />
                </Field>
                <Field label="Длина конуса (мм)">
                  <CalcInput value={item.coneLength} onChange={(e) => updateConeExtItem(idx, "coneLength", +e.target.value)} min={1} />
                </Field>
                {coneExtItems.length > 1 && (
                  <button
                    onClick={() => setConeExtItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-[44px] w-full rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition"
                  >×</button>
                )}
              </div>
            ))}
            <button
              onClick={() => setConeExtItems((prev) => [...prev, { coneBigD: 50, coneSmallD: 30, coneLength: 80 }])}
              className="rounded-full border border-foreground/15 bg-white/80 px-4 py-1.5 text-xs font-semibold text-black/60 hover:bg-white transition"
            >
              ➕ Добавить конус
            </button>
          </div>
        )}

        {/* Конус внутренний */}
        <Checkbox id="extraConeInt" checked={extraConeInt} onChange={setExtraConeInt} label="Конус внутренний" />
        {extraConeInt && (
          <div className="mt-3 space-y-3">
            {coneIntItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-end">
                <Field label="Диаметр заготовки (мм)">
                  <CalcInput value={item.diameter ?? 50} onChange={(e) => updateConeIntItem(idx, "diameter", +e.target.value)} min={1} />
                </Field>
                <Field label="Большой диаметр (мм)">
                  <CalcInput value={item.coneBigD} onChange={(e) => updateConeIntItem(idx, "coneBigD", +e.target.value)} min={1} />
                </Field>
                <Field label="Малый диаметр (мм)">
                  <CalcInput value={item.coneSmallD} onChange={(e) => updateConeIntItem(idx, "coneSmallD", +e.target.value)} min={1} />
                </Field>
                <Field label="Длина конуса (мм)">
                  <CalcInput value={item.coneLength} onChange={(e) => updateConeIntItem(idx, "coneLength", +e.target.value)} min={1} />
                </Field>
                {coneIntItems.length > 1 && (
                  <button
                    onClick={() => setConeIntItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-[44px] w-full rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition col-span-2 sm:col-span-1"
                  >×</button>
                )}
              </div>
            ))}
            <button
              onClick={() => setConeIntItems((prev) => [...prev, { diameter: 50, coneBigD: 40, coneSmallD: 20, coneLength: 80 }])}
              className="rounded-full border border-foreground/15 bg-white/80 px-4 py-1.5 text-xs font-semibold text-black/60 hover:bg-white transition"
            >
              ➕ Добавить конус
            </button>
          </div>
        )}

        {/* Канавка под стопорное кольцо */}
        <Checkbox id="extraGroove" checked={extraGroove} onChange={setExtraGroove} label="Канавка под стопорное кольцо" />
        {extraGroove && (
          <div className="mt-3 space-y-3">
            {grooveItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-end">
                <Field label="Диаметр канавки (мм)">
                  <CalcInput value={item.grooveDiam} onChange={(e) => updateGrooveItem(idx, "grooveDiam", +e.target.value)} min={1} />
                </Field>
                <Field label="Ширина канавки (мм)">
                  <CalcInput value={item.grooveWidth} onChange={(e) => updateGrooveItem(idx, "grooveWidth", +e.target.value)} step={0.1} min={0.1} />
                </Field>
                <Field label="Глубина канавки (мм)">
                  <CalcInput value={item.grooveDepth} onChange={(e) => updateGrooveItem(idx, "grooveDepth", +e.target.value)} step={0.1} min={0.1} />
                </Field>
                {grooveItems.length > 1 && (
                  <button
                    onClick={() => setGrooveItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="h-[44px] w-full rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition"
                  >×</button>
                )}
              </div>
            ))}
            <button
              onClick={() => setGrooveItems((prev) => [...prev, { grooveDiam: 40, grooveWidth: 3, grooveDepth: 2 }])}
              className="rounded-full border border-foreground/15 bg-white/80 px-4 py-1.5 text-xs font-semibold text-black/60 hover:bg-white transition"
            >
              ➕ Добавить канавку
            </button>
          </div>
        )}

        {/* Резка металла (доп. операция) */}
        <Checkbox id="extraCuttingOp" checked={extraCuttingOp} onChange={setExtraCuttingOp} label="Резка металла" />
        {extraCuttingOp && (
          <div className="mt-3 space-y-3">
            {cuttingOpItems.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-end">
                  <Field label="Тип резки">
                    <CalcSelect
                      value={item.cutType}
                      onChange={(e) => updateCuttingOpItem(idx, "cutType", e.target.value as CuttingOpItem["cutType"])}
                    >
                      <option value="round">Круглый прокат</option>
                      <option value="sheet">Листовой металл</option>
                    </CalcSelect>
                  </Field>
                  {item.cutType === "round" && (
                    <Field label="Диаметр (мм)">
                      <CalcInput value={item.cutDiam} onChange={(e) => updateCuttingOpItem(idx, "cutDiam", +e.target.value)} min={1} />
                    </Field>
                  )}
                  {item.cutType === "sheet" && (
                    <>
                      <Field label="Толщина (мм)">
                        <CalcInput value={item.sheetThick} onChange={(e) => updateCuttingOpItem(idx, "sheetThick", +e.target.value)} step={0.1} min={0.1} />
                      </Field>
                      <Field label="Ширина (мм)">
                        <CalcInput value={item.sheetWidth} onChange={(e) => updateCuttingOpItem(idx, "sheetWidth", +e.target.value)} min={1} />
                      </Field>
                      <Field label="Длина (мм)">
                        <CalcInput value={item.sheetLength} onChange={(e) => updateCuttingOpItem(idx, "sheetLength", +e.target.value)} min={1} />
                      </Field>
                    </>
                  )}
                  {cuttingOpItems.length > 1 && (
                    <button
                      onClick={() => setCuttingOpItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="h-[44px] w-full rounded-xl bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition"
                    >×</button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => setCuttingOpItems((prev) => [...prev, { cutType: "round", cutDiam: 50, sheetThick: 2, sheetWidth: 1000, sheetLength: 2000 }])}
              className="rounded-full border border-foreground/15 bg-white/80 px-4 py-1.5 text-xs font-semibold text-black/60 hover:bg-white transition"
            >
              ➕ Добавить резку
            </button>
          </div>
        )}

        {/* Кастомные доп. операции из настроек (hardening, oxidizing, carburizing, tooling и пр.) */}
        {/* Исключаем те, что рендерятся отдельно выше (cone_ext, cone_int, groove, cutting_op) */}
        {settings.customExtraOps
          .filter((op: CustomExtraOp) => !DEDICATED_EXTRA_OP_IDS.has(op.id))
          .map((op: CustomExtraOp) => (
            <Checkbox
              key={op.id}
              id={`extra_${op.id}`}
              checked={!!checkedExtraOps[op.id]}
              onChange={(v) => setCheckedExtraOps((prev) => ({ ...prev, [op.id]: v }))}
              label={op.name}
            />
          ))}
      </Card>
    </div>
  );
}
