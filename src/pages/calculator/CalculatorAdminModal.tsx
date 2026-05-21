import { useState } from "react";
import {
  AdminSettings,
  Material,
  WorkTypeDef,
  Subtype,
  CustomExtraOp,
  FIELD_LABELS,
} from "./calculator.types";
import { Field, CalcInput } from "./calculator-ui";

type AdminTab = "main" | "materials" | "operations" | "worktypes" | "subtypes" | "extraops";

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
  const [tab, setTab] = useState<AdminTab>("main");
  const [edit, setEdit] = useState<AdminSettings>(settings);
  const [subtypeWtIdx, setSubtypeWtIdx] = useState(0);

  if (!open) return null;

  function setEditMat(idx: number, field: keyof Material, val: string | number) {
    setEdit((prev) => {
      const mats = [...prev.materials];
      mats[idx] = { ...mats[idx], [field]: val };
      return { ...prev, materials: mats };
    });
  }

  function setEditWt(idx: number, field: keyof WorkTypeDef, val: string | string[]) {
    setEdit((prev) => {
      const wts = [...prev.workTypes];
      wts[idx] = { ...wts[idx], [field]: val };
      return { ...prev, workTypes: wts };
    });
  }

  function setEditSt(wtIdx: number, stIdx: number, field: keyof Subtype, val: string | string[]) {
    setEdit((prev) => {
      const wts = JSON.parse(JSON.stringify(prev.workTypes)) as WorkTypeDef[];
      wts[wtIdx].subtypes[stIdx] = { ...wts[wtIdx].subtypes[stIdx], [field]: val };
      return { ...prev, workTypes: wts };
    });
  }

  function setEditOp(idx: number, field: keyof CustomExtraOp, val: string | number) {
    setEdit((prev) => {
      const ops = [...prev.customExtraOps];
      ops[idx] = { ...ops[idx], [field]: val };
      return { ...prev, customExtraOps: ops };
    });
  }

  function handleSave() {
    onSave(edit);
    alert("Настройки сохранены");
  }

  const TABS: { id: AdminTab; label: string }[] = [
    { id: "main", label: "Основные" },
    { id: "materials", label: "Материалы" },
    { id: "operations", label: "Операции" },
    { id: "worktypes", label: "Типы обработок" },
    { id: "subtypes", label: "Изделия" },
    { id: "extraops", label: "Доп. операции" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Настройки</h3>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-700">×</button>
        </div>

        {!loggedIn ? (
          <div className="space-y-3">
            <Field label="Логин">
              <CalcInput type="text" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин" />
            </Field>
            <Field label="Пароль">
              <CalcInput type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Пароль" />
            </Field>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={() => {
                if (login === "das-service@inbox.ru" && pass === "autoremex2012") {
                  setLoggedIn(true);
                  setError("");
                  setEdit(settings);
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
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                    tab === t.id ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Таб: Основные */}
            {tab === "main" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ставка цеха (₽/ч)">
                  <CalcInput value={edit.hourlyRate} onChange={(e) => setEdit((p) => ({ ...p, hourlyRate: +e.target.value }))} step={50} />
                </Field>
                <Field label="Наладка на партию (мин)">
                  <CalcInput value={edit.setupMinutes} onChange={(e) => setEdit((p) => ({ ...p, setupMinutes: +e.target.value }))} />
                </Field>
              </div>
            )}

            {/* Таб: Материалы */}
            {tab === "materials" && (
              <div>
                <div className="flex gap-2 mb-2 text-xs font-bold text-gray-500 px-1">
                  <span className="flex-1 min-w-[100px]">Название</span>
                  <span className="w-20">Плотность</span>
                  <span className="w-20">Цена/кг</span>
                  <span className="w-16">Коэф.</span>
                  <span className="w-8"></span>
                </div>
                {edit.materials.map((mat, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2 flex-wrap">
                    <input
                      value={mat.name}
                      onChange={(e) => setEditMat(idx, "name", e.target.value)}
                      className="min-h-[40px] flex-1 min-w-[100px] rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
                      placeholder="Название"
                    />
                    <input type="number" value={mat.density} step={0.01}
                      onChange={(e) => setEditMat(idx, "density", +e.target.value)}
                      className="min-h-[40px] w-20 rounded-xl border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-orange-400" placeholder="Плотность" />
                    <input type="number" value={mat.costPerKg}
                      onChange={(e) => setEditMat(idx, "costPerKg", +e.target.value)}
                      className="min-h-[40px] w-20 rounded-xl border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-orange-400" placeholder="₽/кг" />
                    <input type="number" value={mat.factor} step={0.01}
                      onChange={(e) => setEditMat(idx, "factor", +e.target.value)}
                      className="min-h-[40px] w-16 rounded-xl border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-orange-400" placeholder="Коэф." />
                    <button
                      onClick={() => setEdit((p) => ({ ...p, materials: p.materials.filter((_, i) => i !== idx) }))}
                      className="h-10 w-10 rounded-full bg-red-500 text-white font-bold text-lg flex items-center justify-center hover:bg-red-600"
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => setEdit((p) => ({ ...p, materials: [...p.materials, { name: "Новый", density: 1.0, costPerKg: 0, factor: 1.0 }] }))}
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
                    <Field label="Vc (м/мин)"><CalcInput value={edit.keywayParams.Vc} onChange={(e) => setEdit((p) => ({ ...p, keywayParams: { ...p.keywayParams, Vc: +e.target.value } }))} /></Field>
                    <Field label="fz (мм/зуб)"><CalcInput value={edit.keywayParams.fz} onChange={(e) => setEdit((p) => ({ ...p, keywayParams: { ...p.keywayParams, fz: +e.target.value } }))} step={0.01} /></Field>
                    <Field label="Число зубьев"><CalcInput value={edit.keywayParams.z} onChange={(e) => setEdit((p) => ({ ...p, keywayParams: { ...p.keywayParams, z: +e.target.value } }))} /></Field>
                    <Field label="Глубина за проход (мм)"><CalcInput value={edit.keywayParams.ap} onChange={(e) => setEdit((p) => ({ ...p, keywayParams: { ...p.keywayParams, ap: +e.target.value } }))} step={0.1} /></Field>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold">Зубофрезерование</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Vc (м/мин)"><CalcInput value={edit.gearParams.Vc} onChange={(e) => setEdit((p) => ({ ...p, gearParams: { ...p.gearParams, Vc: +e.target.value } }))} /></Field>
                    <Field label="S (мм/об)"><CalcInput value={edit.gearParams.S} onChange={(e) => setEdit((p) => ({ ...p, gearParams: { ...p.gearParams, S: +e.target.value } }))} step={0.01} /></Field>
                    <Field label="Проходов"><CalcInput value={edit.gearParams.passes} onChange={(e) => setEdit((p) => ({ ...p, gearParams: { ...p.gearParams, passes: +e.target.value } }))} /></Field>
                    <Field label="Диаметр фрезы (мм)"><CalcInput value={edit.gearParams.D_fr} onChange={(e) => setEdit((p) => ({ ...p, gearParams: { ...p.gearParams, D_fr: +e.target.value } }))} /></Field>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold">Нарезание резьбы</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Vc (м/мин)"><CalcInput value={edit.threadParams.Vc} onChange={(e) => setEdit((p) => ({ ...p, threadParams: { Vc: +e.target.value } }))} /></Field>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-bold">Коэффициенты сложности</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Люнет: доп. время (мин)"><CalcInput value={edit.extraFactors.lunetteTime} step={0.1} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, lunetteTime: +e.target.value } }))} /></Field>
                    <Field label="Люнет: коэф."><CalcInput value={edit.extraFactors.lunetteComplexity} step={0.01} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, lunetteComplexity: +e.target.value } }))} /></Field>
                    <Field label="Кулачки: доп. время (мин)"><CalcInput value={edit.extraFactors.reverseTime} step={0.1} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, reverseTime: +e.target.value } }))} /></Field>
                    <Field label="Кулачки: коэф."><CalcInput value={edit.extraFactors.reverseComplexity} step={0.01} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, reverseComplexity: +e.target.value } }))} /></Field>
                    <Field label="Шпоночный паз: коэф."><CalcInput value={edit.extraFactors.keywayComplexity} step={0.01} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, keywayComplexity: +e.target.value } }))} /></Field>
                    <Field label="Зубья: базовый коэф."><CalcInput value={edit.extraFactors.gearBaseComplexity} step={0.01} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, gearBaseComplexity: +e.target.value } }))} /></Field>
                    <Field label="Прямой зуб: коэф."><CalcInput value={edit.extraFactors.toothFactors.straight} step={0.1} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, toothFactors: { ...p.extraFactors.toothFactors, straight: +e.target.value } } }))} /></Field>
                    <Field label="Косой зуб: коэф."><CalcInput value={edit.extraFactors.toothFactors.helical} step={0.1} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, toothFactors: { ...p.extraFactors.toothFactors, helical: +e.target.value } } }))} /></Field>
                    <Field label="Гипоидный зуб: коэф."><CalcInput value={edit.extraFactors.toothFactors.hypoid} step={0.1} onChange={(e) => setEdit((p) => ({ ...p, extraFactors: { ...p.extraFactors, toothFactors: { ...p.extraFactors.toothFactors, hypoid: +e.target.value } } }))} /></Field>
                  </div>
                </div>
              </div>
            )}

            {/* Таб: Типы обработок */}
            {tab === "worktypes" && (
              <div>
                {edit.workTypes.map((wt, idx) => (
                  <div key={wt.id} className="flex gap-2 items-start mb-3 flex-wrap">
                    <input
                      value={wt.name}
                      onChange={(e) => setEditWt(idx, "name", e.target.value)}
                      className="min-h-[40px] w-40 rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
                      placeholder="Название"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">Поля (ключи через запятую)</p>
                      <input
                        value={wt.fields.join(", ")}
                        onChange={(e) => setEditWt(idx, "fields", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                        className="min-h-[40px] w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
                        placeholder="diameter, length, ..."
                      />
                      <p className="text-xs text-gray-300 mt-0.5">
                        Доступные: {Object.keys(FIELD_LABELS).join(", ")}
                      </p>
                    </div>
                    <button
                      onClick={() => setEdit((p) => ({ ...p, workTypes: p.workTypes.filter((_, i) => i !== idx) }))}
                      className="h-10 w-10 rounded-full bg-red-500 text-white font-bold text-lg flex items-center justify-center hover:bg-red-600 flex-shrink-0"
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => setEdit((p) => ({ ...p, workTypes: [...p.workTypes, { id: "custom_" + Date.now(), name: "Новый тип", fields: [], subtypes: [] }] }))}
                  className="mt-2 rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  ➕ Добавить тип обработки
                </button>
              </div>
            )}

            {/* Таб: Изделия */}
            {tab === "subtypes" && (
              <div>
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Тип обработки</label>
                  <select
                    value={subtypeWtIdx}
                    onChange={(e) => setSubtypeWtIdx(+e.target.value)}
                    className="w-full min-h-[40px] rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
                  >
                    {edit.workTypes.map((wt, i) => (
                      <option key={wt.id} value={i}>{wt.name}</option>
                    ))}
                  </select>
                </div>
                {(edit.workTypes[subtypeWtIdx]?.subtypes ?? []).map((st, stIdx) => (
                  <div key={st.id} className="flex gap-2 items-start mb-3 flex-wrap">
                    <input
                      value={st.name}
                      onChange={(e) => setEditSt(subtypeWtIdx, stIdx, "name", e.target.value)}
                      className="min-h-[40px] w-40 rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
                      placeholder="Название"
                    />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">Поля (ключи через запятую)</p>
                      <input
                        value={st.fields.join(", ")}
                        onChange={(e) => setEditSt(subtypeWtIdx, stIdx, "fields", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                        className="min-h-[40px] w-full rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
                        placeholder="diameter, length, ..."
                      />
                    </div>
                    <button
                      onClick={() => setEdit((p) => {
                        const wts = JSON.parse(JSON.stringify(p.workTypes)) as WorkTypeDef[];
                        wts[subtypeWtIdx].subtypes = wts[subtypeWtIdx].subtypes.filter((_, i) => i !== stIdx);
                        return { ...p, workTypes: wts };
                      })}
                      className="h-10 w-10 rounded-full bg-red-500 text-white font-bold text-lg flex items-center justify-center hover:bg-red-600 flex-shrink-0"
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => setEdit((p) => {
                    const wts = JSON.parse(JSON.stringify(p.workTypes)) as WorkTypeDef[];
                    wts[subtypeWtIdx].subtypes.push({ id: "st_" + Date.now(), name: "Новое изделие", fields: [] });
                    return { ...p, workTypes: wts };
                  })}
                  className="mt-2 rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  ➕ Добавить изделие
                </button>
              </div>
            )}

            {/* Таб: Доп. операции */}
            {tab === "extraops" && (
              <div>
                {edit.customExtraOps.map((op, idx) => (
                  <div key={op.id} className="flex gap-2 items-center mb-2 flex-wrap">
                    <input
                      value={op.name}
                      onChange={(e) => setEditOp(idx, "name", e.target.value)}
                      className="min-h-[40px] flex-1 min-w-[120px] rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
                      placeholder="Название"
                    />
                    <select
                      value={op.type}
                      onChange={(e) => setEditOp(idx, "type", e.target.value)}
                      className="min-h-[40px] rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
                    >
                      <option value="cost">Фикс. стоимость</option>
                      <option value="costPerKg">Цена за кг</option>
                    </select>
                    <input
                      type="number"
                      value={op.defaultCost}
                      onChange={(e) => setEditOp(idx, "defaultCost", +e.target.value)}
                      className="min-h-[40px] w-24 rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-orange-400"
                      placeholder="Стоимость"
                    />
                    <button
                      onClick={() => setEdit((p) => ({ ...p, customExtraOps: p.customExtraOps.filter((_, i) => i !== idx) }))}
                      className="h-10 w-10 rounded-full bg-red-500 text-white font-bold text-lg flex items-center justify-center hover:bg-red-600"
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => setEdit((p) => ({ ...p, customExtraOps: [...p.customExtraOps, { id: "op_" + Date.now(), name: "Новая операция", type: "cost", defaultCost: 0 }] }))}
                  className="mt-2 rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  ➕ Добавить операцию
                </button>
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
                onClick={() => { setLoggedIn(false); onClose(); }}
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
