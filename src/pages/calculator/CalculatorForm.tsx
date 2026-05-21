import {
  AdminSettings,
  WorkTypeDef,
  Subtype,
  DrillItem,
  KeywayItem,
  GearItem,
  ThreadItem,
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
  onCalculate: () => void;
}

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
  onCalculate,
}: CalculatorFormProps) {
  const wt: WorkTypeDef | undefined = settings.workTypes[workTypeIdx];
  const hasSubtypes = wt && wt.subtypes && wt.subtypes.length > 0;
  const sub: Subtype | undefined = hasSubtypes ? wt.subtypes[subtypeIdx] : undefined;
  const activeFields = sub ? sub.fields : wt?.fields ?? [];

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

        {/* Динамические поля размеров */}
        {activeFields.length > 0 && (
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

        {/* Кастомные доп. операции из настроек */}
        {settings.customExtraOps.map((op: CustomExtraOp) => (
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
