import { useState } from "react";
import { AdminSettings, Material } from "./calculator.types";
import { Field, CalcInput } from "./calculator-ui";

interface CalculatorAdminModalProps {
  open: boolean;
  onClose: () => void;
  settings: AdminSettings;
  onSave: (s: AdminSettings) => void;
}

export default function CalculatorAdminModal({
  open,
  onClose,
  settings,
  onSave,
}: CalculatorAdminModalProps) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [login, setLogin] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"main" | "materials" | "operations">("main");
  const [edit, setEdit] = useState<AdminSettings>(settings);

  if (!open) return null;

  function handleOpen() {
    setEdit(settings);
  }

  function setEditMat(idx: number, field: keyof Material, val: string | number) {
    setEdit((prev) => {
      const mats = [...prev.materials];
      mats[idx] = { ...mats[idx], [field]: val };
      return { ...prev, materials: mats };
    });
  }

  function handleSave() {
    onSave(edit);
    alert("Настройки сохранены");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Админ-панель</h3>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {!loggedIn ? (
          <div className="space-y-3">
            <Field label="Логин">
              <CalcInput
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Логин"
              />
            </Field>
            <Field label="Пароль">
              <CalcInput
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Пароль"
              />
            </Field>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={() => {
                if (login === "das-service@inbox.ru" && pass === "autoremex2012") {
                  setLoggedIn(true);
                  setError("");
                  handleOpen();
                } else {
                  setError("Неверный логин или пароль");
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
              {(["main", "materials", "operations"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                    tab === t
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t === "main" ? "Основные" : t === "materials" ? "Материалы" : "Операции"}
                </button>
              ))}
            </div>

            {/* Таб: Основные */}
            {tab === "main" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ставка цеха (₽/ч)">
                  <CalcInput
                    value={edit.hourlyRate}
                    onChange={(e) => setEdit((p) => ({ ...p, hourlyRate: +e.target.value }))}
                    step={50}
                  />
                </Field>
                <Field label="Наладка на партию (мин)">
                  <CalcInput
                    value={edit.setupMinutes}
                    onChange={(e) => setEdit((p) => ({ ...p, setupMinutes: +e.target.value }))}
                  />
                </Field>
                <Field label="Закалка (₽/кг)">
                  <CalcInput
                    value={edit.hardeningCostPerKg}
                    onChange={(e) => setEdit((p) => ({ ...p, hardeningCostPerKg: +e.target.value }))}
                    step={10}
                  />
                </Field>
              </div>
            )}

            {/* Таб: Материалы */}
            {tab === "materials" && (
              <div>
                {edit.materials.map((mat, idx) => (
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
                        setEdit((p) => ({
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
                    setEdit((p) => ({
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
            {tab === "operations" && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-sm font-bold">Сверление</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Vc (м/мин)" title="Скорость резания">
                      <CalcInput value={edit.drillParams.Vc} onChange={(e) => setEdit((p) => ({ ...p, drillParams: { ...p.drillParams, Vc: +e.target.value } }))} />
                    </Field>
                    <Field label="f (мм/об)" title="Подача на оборот">
                      <CalcInput value={edit.drillParams.f} onChange={(e) => setEdit((p) => ({ ...p, drillParams: { ...p.drillParams, f: +e.target.value } }))} step={0.01} />
                    </Field>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold">Шпоночный паз</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Vc (м/мин)">
                      <CalcInput value={edit.keywayParams.Vc} onChange={(e) => setEdit((p) => ({ ...p, keywayParams: { ...p.keywayParams, Vc: +e.target.value } }))} />
                    </Field>
                    <Field label="fz (мм/зуб)">
                      <CalcInput value={edit.keywayParams.fz} onChange={(e) => setEdit((p) => ({ ...p, keywayParams: { ...p.keywayParams, fz: +e.target.value } }))} step={0.01} />
                    </Field>
                    <Field label="Число зубьев">
                      <CalcInput value={edit.keywayParams.z} onChange={(e) => setEdit((p) => ({ ...p, keywayParams: { ...p.keywayParams, z: +e.target.value } }))} />
                    </Field>
                    <Field label="Глубина за проход (мм)">
                      <CalcInput value={edit.keywayParams.ap} onChange={(e) => setEdit((p) => ({ ...p, keywayParams: { ...p.keywayParams, ap: +e.target.value } }))} step={0.1} />
                    </Field>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold">Зубофрезерование</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Vc (м/мин)">
                      <CalcInput value={edit.gearParams.Vc} onChange={(e) => setEdit((p) => ({ ...p, gearParams: { ...p.gearParams, Vc: +e.target.value } }))} />
                    </Field>
                    <Field label="S (мм/об)">
                      <CalcInput value={edit.gearParams.S} onChange={(e) => setEdit((p) => ({ ...p, gearParams: { ...p.gearParams, S: +e.target.value } }))} step={0.01} />
                    </Field>
                    <Field label="Проходов">
                      <CalcInput value={edit.gearParams.passes} onChange={(e) => setEdit((p) => ({ ...p, gearParams: { ...p.gearParams, passes: +e.target.value } }))} />
                    </Field>
                    <Field label="Диаметр фрезы (мм)">
                      <CalcInput value={edit.gearParams.D_fr} onChange={(e) => setEdit((p) => ({ ...p, gearParams: { ...p.gearParams, D_fr: +e.target.value } }))} />
                    </Field>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold">Нарезание резьбы</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Vc (м/мин)">
                      <CalcInput value={edit.threadParams.Vc} onChange={(e) => setEdit((p) => ({ ...p, threadParams: { Vc: +e.target.value } }))} />
                    </Field>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold">Коэффициенты сложности</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Люнет: доп. время (мин)">
                      <CalcInput value={edit.extraFactors.lunetteTime} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, lunetteTime: +e.target.value } }))} step={0.1} />
                    </Field>
                    <Field label="Люнет: коэф. сложности">
                      <CalcInput value={edit.extraFactors.lunetteComplexity} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, lunetteComplexity: +e.target.value } }))} step={0.01} />
                    </Field>
                    <Field label="Кулачки: доп. время (мин)">
                      <CalcInput value={edit.extraFactors.reverseTime} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, reverseTime: +e.target.value } }))} step={0.1} />
                    </Field>
                    <Field label="Кулачки: коэф. сложности">
                      <CalcInput value={edit.extraFactors.reverseComplexity} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, reverseComplexity: +e.target.value } }))} step={0.01} />
                    </Field>
                    <Field label="Шпоночный паз: коэф.">
                      <CalcInput value={edit.extraFactors.keywayComplexity} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, keywayComplexity: +e.target.value } }))} step={0.01} />
                    </Field>
                    <Field label="Зубья: базовый коэф.">
                      <CalcInput value={edit.extraFactors.gearBaseComplexity} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, gearBaseComplexity: +e.target.value } }))} step={0.01} />
                    </Field>
                    <Field label="Прямой зуб: коэф.">
                      <CalcInput value={edit.extraFactors.toothFactors.straight} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, toothFactors: { ...p.extraFactors.toothFactors, straight: +e.target.value } } }))} step={0.1} />
                    </Field>
                    <Field label="Косой зуб: коэф.">
                      <CalcInput value={edit.extraFactors.toothFactors.helical} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, toothFactors: { ...p.extraFactors.toothFactors, helical: +e.target.value } } }))} step={0.1} />
                    </Field>
                    <Field label="Гипоидный зуб: коэф.">
                      <CalcInput value={edit.extraFactors.toothFactors.hypoid} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, toothFactors: { ...p.extraFactors.toothFactors, hypoid: +e.target.value } } }))} step={0.1} />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition"
              >
                Сохранить настройки
              </button>
              <button
                onClick={() => {
                  setLoggedIn(false);
                  onClose();
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
  );
}
