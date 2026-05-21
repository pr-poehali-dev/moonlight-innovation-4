import {
  WorkType,
  TurningSubtype,
  ToothType,
  ThreadType,
  DrillItem,
  AdminSettings,
} from "./calculator.types";
import { Field, CalcSelect, CalcInput, Checkbox, Card } from "./calculator-ui";

interface CalculatorFormProps {
  settings: AdminSettings;
  workType: WorkType;
  setWorkType: (v: WorkType) => void;
  turningSubtype: TurningSubtype;
  setTurningSubtype: (v: TurningSubtype) => void;
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
  keywayLength: number;
  setKeywayLength: (v: number) => void;
  keywayWidth: number;
  setKeywayWidth: (v: number) => void;
  keywayDepth: number;
  setKeywayDepth: (v: number) => void;
  extraGear: boolean;
  setExtraGear: (v: boolean) => void;
  gearModule: number;
  setGearModule: (v: number) => void;
  gearTeeth: number;
  setGearTeeth: (v: number) => void;
  gearWidth: number;
  setGearWidth: (v: number) => void;
  gearToothType: ToothType;
  setGearToothType: (v: ToothType) => void;
  extraThreading: boolean;
  setExtraThreading: (v: boolean) => void;
  threadType: ThreadType;
  setThreadType: (v: ThreadType) => void;
  threadDiam: number;
  setThreadDiam: (v: number) => void;
  threadPitch: number;
  setThreadPitch: (v: number) => void;
  threadLength: number;
  setThreadLength: (v: number) => void;
  threadPasses: number;
  setThreadPasses: (v: number) => void;
  extraLunette: boolean;
  setExtraLunette: (v: boolean) => void;
  extraReverse: boolean;
  setExtraReverse: (v: boolean) => void;
  extraHardening: boolean;
  setExtraHardening: (v: boolean) => void;
  extraCarburizing: boolean;
  setExtraCarburizing: (v: boolean) => void;
  carburizingCost: number;
  setCarburizingCost: (v: number) => void;
  extraOxidizing: boolean;
  setExtraOxidizing: (v: boolean) => void;
  oxidizingCost: number;
  setOxidizingCost: (v: number) => void;
  onCalculate: () => void;
}

export default function CalculatorForm({
  settings,
  workType,
  setWorkType,
  turningSubtype,
  setTurningSubtype,
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
  keywayLength,
  setKeywayLength,
  keywayWidth,
  setKeywayWidth,
  keywayDepth,
  setKeywayDepth,
  extraGear,
  setExtraGear,
  gearModule,
  setGearModule,
  gearTeeth,
  setGearTeeth,
  gearWidth,
  setGearWidth,
  gearToothType,
  setGearToothType,
  extraThreading,
  setExtraThreading,
  threadType,
  setThreadType,
  threadDiam,
  setThreadDiam,
  threadPitch,
  setThreadPitch,
  threadLength,
  setThreadLength,
  threadPasses,
  setThreadPasses,
  extraLunette,
  setExtraLunette,
  extraReverse,
  setExtraReverse,
  extraHardening,
  setExtraHardening,
  extraCarburizing,
  setExtraCarburizing,
  carburizingCost,
  setCarburizingCost,
  extraOxidizing,
  setExtraOxidizing,
  oxidizingCost,
  setOxidizingCost,
  onCalculate,
}: CalculatorFormProps) {
  function updateDrillItem(idx: number, field: keyof DrillItem, val: number) {
    setDrillItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  }

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

  return (
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
                onChange={(e) => setTurningSubtype(e.target.value as TurningSubtype)}
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
          onClick={onCalculate}
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
  );
}
