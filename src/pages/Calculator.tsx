import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagneticButton } from "@/components/magnetic-button";
import {
  WorkType,
  TurningSubtype,
  ToothType,
  ThreadType,
  DrillItem,
  AdminSettings,
  loadSettings,
  getVolumeAndBaseTime,
} from "./calculator/calculator.types";
import CalculatorForm from "./calculator/CalculatorForm";
import CalculatorAdminModal from "./calculator/CalculatorAdminModal";

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
    diameter: 50, length: 100, holeDiameter: 0,
    boltDiam: 10, boltLength: 50, boltPitch: 1.5, boltHeadHeight: 7, boltHeadDiam: 16,
    studDiam: 10, studLength: 80, studPitch: 1.5,
    nutDiam: 10, nutHeight: 8, nutWidth: 17,
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

  function handleSaveAdmin(updated: AdminSettings) {
    setSettings(updated);
    localStorage.setItem("calcAdminSettings", JSON.stringify(updated));
  }

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
            onClick={() => setAdminOpen(true)}
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
          {/* Левая колонка — форма */}
          <CalculatorForm
            settings={settings}
            workType={workType}
            setWorkType={setWorkType}
            turningSubtype={turningSubtype}
            setTurningSubtype={setTurningSubtype}
            materialIdx={materialIdx}
            setMaterialIdx={setMaterialIdx}
            customerMaterial={customerMaterial}
            setCustomerMaterial={setCustomerMaterial}
            dims={dims}
            setDim={setDim}
            quantity={quantity}
            setQuantity={setQuantity}
            extraDrilling={extraDrilling}
            setExtraDrilling={setExtraDrilling}
            drillItems={drillItems}
            setDrillItems={setDrillItems}
            extraKeyway={extraKeyway}
            setExtraKeyway={setExtraKeyway}
            keywayLength={keywayLength}
            setKeywayLength={setKeywayLength}
            keywayWidth={keywayWidth}
            setKeywayWidth={setKeywayWidth}
            keywayDepth={keywayDepth}
            setKeywayDepth={setKeywayDepth}
            extraGear={extraGear}
            setExtraGear={setExtraGear}
            gearModule={gearModule}
            setGearModule={setGearModule}
            gearTeeth={gearTeeth}
            setGearTeeth={setGearTeeth}
            gearWidth={gearWidth}
            setGearWidth={setGearWidth}
            gearToothType={gearToothType}
            setGearToothType={setGearToothType}
            extraThreading={extraThreading}
            setExtraThreading={setExtraThreading}
            threadType={threadType}
            setThreadType={setThreadType}
            threadDiam={threadDiam}
            setThreadDiam={setThreadDiam}
            threadPitch={threadPitch}
            setThreadPitch={setThreadPitch}
            threadLength={threadLength}
            setThreadLength={setThreadLength}
            threadPasses={threadPasses}
            setThreadPasses={setThreadPasses}
            extraLunette={extraLunette}
            setExtraLunette={setExtraLunette}
            extraReverse={extraReverse}
            setExtraReverse={setExtraReverse}
            extraHardening={extraHardening}
            setExtraHardening={setExtraHardening}
            extraCarburizing={extraCarburizing}
            setExtraCarburizing={setExtraCarburizing}
            carburizingCost={carburizingCost}
            setCarburizingCost={setCarburizingCost}
            extraOxidizing={extraOxidizing}
            setExtraOxidizing={setExtraOxidizing}
            oxidizingCost={oxidizingCost}
            setOxidizingCost={setOxidizingCost}
            onCalculate={calculate}
          />

          {/* Правая колонка — результат */}
          <div className="flex flex-col gap-4 lg:w-80">
            {result ? (
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
                    <div key={label} className="flex justify-between text-sm">
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
            ) : (
              <div className="rounded-2xl border border-foreground/10 bg-white/60 p-8 backdrop-blur-md text-center text-black/30 text-sm">
                Заполните параметры и нажмите<br />«Рассчитать стоимость»
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно админки */}
      <CalculatorAdminModal
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        settings={settings}
        onSave={handleSaveAdmin}
      />
    </div>
  );
}
