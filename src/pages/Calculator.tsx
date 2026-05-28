import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MagneticButton } from "@/components/magnetic-button";
import {
  AdminSettings,
  DrillItem,
  KeywayItem,
  GearItem,
  ThreadItem,
  FIELD_DEFAULTS,
  loadSettings,
  saveSettings,
  getVolumeAndBaseTime,
} from "./calculator/calculator.types";
import CalculatorForm from "./calculator/CalculatorForm";
import CalculatorAdminModal from "./calculator/CalculatorAdminModal";
import CalculatorAuthModal, { CalcUser } from "./calculator/CalculatorAuthModal";

const API = "https://functions.poehali.dev/0a6ed799-bdd1-4e64-b0fc-a659b48ca233";

function loadUser(): { user: CalcUser; token: string } | null {
  try {
    const s = localStorage.getItem("calcUser");
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export default function Calculator() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AdminSettings>(loadSettings);

  // Авторизация пользователя
  const [authOpen, setAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CalcUser | null>(() => loadUser()?.user ?? null);
  const [currentToken, setCurrentToken] = useState<string | null>(() => loadUser()?.token ?? null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Тип обработки / изделие
  const [workTypeIdx, setWorkTypeIdx] = useState(0);
  const [subtypeIdx, setSubtypeIdx] = useState(0);

  // Материал
  const [materialIdx, setMaterialIdx] = useState(0);
  const [customerMaterial, setCustomerMaterial] = useState(false);

  // Количество
  const [quantity, setQuantity] = useState(5);

  // Размеры
  const [dims, setDims] = useState<Record<string, number>>(FIELD_DEFAULTS);
  function setDim(key: string, val: number) {
    setDims((prev) => ({ ...prev, [key]: val }));
  }

  // Доп. операции
  const [extraDrilling, setExtraDrilling] = useState(false);
  const [drillItems, setDrillItems] = useState<DrillItem[]>([{ diam: 5, depth: 15, count: 2 }]);
  const [extraKeyway, setExtraKeyway] = useState(false);
  const [keywayItems, setKeywayItems] = useState<KeywayItem[]>([{ length: 30, width: 8, depth: 4 }]);
  const [extraGear, setExtraGear] = useState(false);
  const [gearItems, setGearItems] = useState<GearItem[]>([{ module: 2.5, teeth: 20, width: 25, type: "straight" }]);
  const [extraThreading, setExtraThreading] = useState(false);
  const [threadItems, setThreadItems] = useState<ThreadItem[]>([{ type: "external", diam: 16, pitch: 2, length: 30, passes: 6 }]);
  const [extraLunette, setExtraLunette] = useState(false);
  const [extraReverse, setExtraReverse] = useState(false);
  const [checkedExtraOps, setCheckedExtraOps] = useState<Record<string, boolean>>({});

  // Результат
  const [result, setResult] = useState<{
    pricePerUnit: number;
    totalPrice: number;
    details: Array<[string, string]>;
  } | null>(null);

  // Модалки
  const [adminOpen, setAdminOpen] = useState(false);

  // При логине — загружаем настройки пользователя с сервера
  useEffect(() => {
    if (currentUser) {
      fetch(`${API}?action=settings&user_id=${currentUser.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.settings) {
            setSettings(data.settings as AdminSettings);
            saveSettings(data.settings as AdminSettings);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  function handleLogin(user: CalcUser, token: string) {
    setCurrentUser(user);
    setCurrentToken(token);
    localStorage.setItem("calcUser", JSON.stringify({ user, token }));
  }

  function handleLogout() {
    setCurrentUser(null);
    setCurrentToken(null);
    localStorage.removeItem("calcUser");
    // Вернуть настройки из localStorage
    setSettings(loadSettings());
  }

  async function handleSaveAdmin(updated: AdminSettings) {
    setSettings(updated);
    saveSettings(updated);
    if (workTypeIdx >= updated.workTypes.length) setWorkTypeIdx(0);
    if (materialIdx >= updated.materials.length) setMaterialIdx(0);

    // Синхронизировать с сервером если залогинен
    if (currentUser) {
      setSyncStatus("saving");
      try {
        const res = await fetch(`${API}?action=settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: currentUser.id, settings: updated }),
        });
        setSyncStatus(res.ok ? "saved" : "error");
      } catch {
        setSyncStatus("error");
      }
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  }

  function calculate() {
    const wt = settings.workTypes[workTypeIdx];
    if (!wt) return;
    const hasSubtypes = wt.subtypes && wt.subtypes.length > 0;
    const sub = hasSubtypes ? wt.subtypes[subtypeIdx] : undefined;
    const activeFields = sub ? sub.fields : wt.fields;

    const mat = settings.materials[materialIdx] ?? settings.materials[0];
    const { volume, baseMinutes } = getVolumeAndBaseTime(activeFields, dims, mat.factor);

    const massKg = (volume * mat.density) / 1000;
    const metalCost = customerMaterial ? 0 : massKg * mat.costPerKg;

    let extraTimeMinutes = 0;
    let complexityFactor = 1.0;
    let extraCostPerUnit = 0;

    if (extraDrilling) {
      const dp = settings.drillParams;
      drillItems.forEach(({ diam, depth, count }) => {
        if (diam > 0 && depth > 0 && count > 0) {
          const rpm = (1000 * dp.Vc) / (Math.PI * diam);
          extraTimeMinutes += (depth / (dp.f * rpm)) * count;
        }
      });
    }

    if (extraKeyway) {
      const kp = settings.keywayParams;
      keywayItems.forEach(({ length, width, depth }) => {
        if (length > 0 && width > 0 && depth > 0) {
          const passes = Math.ceil(depth / kp.ap);
          const rpm = (1000 * kp.Vc) / (Math.PI * width);
          extraTimeMinutes += (length * passes) / (kp.fz * kp.z * rpm);
        }
      });
      complexityFactor += settings.extraFactors.keywayComplexity;
    }

    if (extraGear) {
      const gp = settings.gearParams;
      gearItems.forEach(({ module, teeth, width, type }) => {
        if (module > 0 && teeth > 0 && width > 0) {
          const n_w = (1000 * gp.Vc) / (Math.PI * module * teeth);
          const toothFactor = settings.extraFactors.toothFactors[type] || 1.0;
          const gearTime = (width / (gp.S * n_w)) * teeth * gp.passes * toothFactor;
          extraTimeMinutes += gearTime;
          complexityFactor += settings.extraFactors.gearBaseComplexity * toothFactor;
        }
      });
    }

    if (extraThreading) {
      const tp = settings.threadParams;
      threadItems.forEach(({ diam, pitch, length, passes }) => {
        if (diam > 0 && pitch > 0 && length > 0 && passes > 0) {
          const rpm = (1000 * tp.Vc) / (Math.PI * diam);
          extraTimeMinutes += (length * passes) / (pitch * rpm);
        }
      });
    }

    if (extraLunette) {
      extraTimeMinutes += settings.extraFactors.lunetteTime;
      complexityFactor += settings.extraFactors.lunetteComplexity;
    }
    if (extraReverse) {
      extraTimeMinutes += settings.extraFactors.reverseTime;
      complexityFactor += settings.extraFactors.reverseComplexity;
    }

    settings.customExtraOps.forEach((op) => {
      if (checkedExtraOps[op.id]) {
        if (op.type === "cost") extraCostPerUnit += op.defaultCost;
        else if (op.type === "costPerKg") extraCostPerUnit += op.defaultCost * massKg;
      }
    });

    const totalMinutes = baseMinutes * complexityFactor + extraTimeMinutes;
    const totalHours = totalMinutes / 60;
    const qty = Math.max(1, quantity);
    const setupHours = settings.setupMinutes / 60;
    const laborPerUnit = totalHours * settings.hourlyRate + (setupHours * settings.hourlyRate) / qty;
    const unitCost = metalCost + laborPerUnit + extraCostPerUnit;
    const totalCost = unitCost * qty;

    const details: Array<[string, string]> = [
      ["⏱️ Основное время (1 шт)", `${baseMinutes.toFixed(1)} мин`],
      ["⚙️ Коэф. сложности", complexityFactor.toFixed(2)],
      ["➕ Доп. время", `${extraTimeMinutes.toFixed(1)} мин`],
      ["🕒 Общее время (1 шт)", `${totalMinutes.toFixed(1)} мин`],
      ["🏭 Ставка цеха", `${settings.hourlyRate.toLocaleString("ru-RU")} ₽/ч`],
      ["🔧 Наладка на партию", `${settings.setupMinutes} мин`],
      [
        "🧱 Материал (1 шт)",
        customerMaterial ? "заказчика (0 ₽)" : `${Math.round(metalCost).toLocaleString("ru-RU")} ₽`,
      ],
      ["🛠️ Обработка (1 шт)", `${Math.round(laborPerUnit).toLocaleString("ru-RU")} ₽`],
    ];
    if (extraCostPerUnit > 0) {
      details.push(["🔥 Доп. услуги (1 шт)", `${Math.round(extraCostPerUnit).toLocaleString("ru-RU")} ₽`]);
    }

    setResult({ pricePerUnit: Math.round(unitCost), totalPrice: Math.round(totalCost), details });
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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Блок пользователя */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 backdrop-blur-md">
                <p className="text-xs font-semibold text-gray-700">
                  👤 {currentUser.full_name || currentUser.email}
                </p>
                {currentUser.company && (
                  <p className="text-xs text-gray-400">{currentUser.company}</p>
                )}
              </div>
              {syncStatus === "saving" && (
                <span className="text-xs text-gray-400">Сохранение…</span>
              )}
              {syncStatus === "saved" && (
                <span className="text-xs text-green-500">✓ Сохранено</span>
              )}
              {syncStatus === "error" && (
                <span className="text-xs text-red-500">Ошибка сохранения</span>
              )}
              <button
                onClick={handleLogout}
                className="rounded-full border border-gray-300 bg-white/60 px-3 py-1.5 text-xs font-semibold text-gray-500 backdrop-blur-md transition hover:bg-white hover:text-gray-800"
              >
                Выйти
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="rounded-full border border-orange-300 bg-orange-50 px-4 py-1.5 text-xs font-semibold text-orange-600 backdrop-blur-md transition hover:bg-orange-100"
            >
              👤 Войти / Зарегистрироваться
            </button>
          )}
          {currentUser ? (
            <button
              onClick={() => setAdminOpen(true)}
              className="rounded-full border border-gray-300 bg-white/60 px-4 py-1.5 text-xs font-semibold text-gray-500 backdrop-blur-md transition hover:bg-white hover:text-gray-800"
            >
              ⚙️ Настройки
            </button>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="rounded-full border border-gray-300 bg-white/60 px-4 py-1.5 text-xs font-semibold text-gray-400 backdrop-blur-md transition hover:bg-white cursor-pointer"
              title="Войдите, чтобы изменять настройки"
            >
              🔒 Настройки
            </button>
          )}
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
            {settings.workTypes.map((w) => w.name).join(" · ")} · Расчёт с учётом материала, операций и серийности
          </p>
          {/* Баннер для незалогиненных */}
          {!currentUser && (
            <div
              onClick={() => setAuthOpen(true)}
              className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-3 backdrop-blur-md transition hover:bg-orange-100/80"
            >
              <span className="text-xl">🔒</span>
              <div>
                <p className="text-sm font-semibold text-orange-700">Настройки доступны после входа</p>
                <p className="text-xs text-orange-500">Войдите или зарегистрируйтесь, чтобы настроить ставки, материалы и типы изделий под себя</p>
              </div>
              <span className="ml-auto shrink-0 text-xs font-bold text-orange-500">Войти →</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <CalculatorForm
            settings={settings}
            workTypeIdx={workTypeIdx}
            setWorkTypeIdx={(v) => { setWorkTypeIdx(v); setSubtypeIdx(0); }}
            subtypeIdx={subtypeIdx}
            setSubtypeIdx={setSubtypeIdx}
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
            keywayItems={keywayItems}
            setKeywayItems={setKeywayItems}
            extraGear={extraGear}
            setExtraGear={setExtraGear}
            gearItems={gearItems}
            setGearItems={setGearItems}
            extraThreading={extraThreading}
            setExtraThreading={setExtraThreading}
            threadItems={threadItems}
            setThreadItems={setThreadItems}
            extraLunette={extraLunette}
            setExtraLunette={setExtraLunette}
            extraReverse={extraReverse}
            setExtraReverse={setExtraReverse}
            checkedExtraOps={checkedExtraOps}
            setCheckedExtraOps={setCheckedExtraOps}
            onCalculate={calculate}
          />

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
                  *Расчёт носит оценочный характер. Цены указаны с НДС. Точное КП — после консультации с технологом.
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

      <CalculatorAdminModal
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        settings={settings}
        onSave={handleSaveAdmin}
      />

      <CalculatorAuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}