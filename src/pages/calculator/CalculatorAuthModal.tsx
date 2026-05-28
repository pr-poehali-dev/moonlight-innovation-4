import { useState } from "react";
import { Field, CalcInput } from "./calculator-ui";

const API = "https://functions.poehali.dev/0a6ed799-bdd1-4e64-b0fc-a659b48ca233";

export interface CalcUser {
  id: number;
  email: string;
  full_name: string;
  city: string;
  phone: string;
  company: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onLogin: (user: CalcUser, token: string) => void;
}

type Mode = "login" | "register";

export default function CalculatorAuthModal({ open, onClose, onLogin }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit() {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email и пароль обязательны");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("Пароль минимум 6 символов");
      return;
    }
    setLoading(true);
    try {
      const body =
        mode === "register"
          ? { email, password, full_name: fullName, city, phone, company }
          : { email, password };

      const res = await fetch(`${API}?action=${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Ошибка сервера");
        return;
      }
      onLogin(data.user, data.token);
      onClose();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-black">
            {mode === "login" ? "Вход в аккаунт" : "Регистрация"}
          </h3>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 hover:text-gray-700">×</button>
        </div>

        {/* Переключатель */}
        <div className="flex gap-2 mb-5 rounded-xl bg-gray-100 p-1">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                mode === m ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {m === "login" ? "Войти" : "Зарегистрироваться"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <Field label="Email *">
            <CalcInput
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.ru"
            />
          </Field>
          <Field label="Пароль *">
            <CalcInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Минимум 6 символов" : "Ваш пароль"}
            />
          </Field>

          {mode === "register" && (
            <>
              <Field label="Имя / ФИО">
                <CalcInput
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                />
              </Field>
              <Field label="Компания">
                <CalcInput
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="ООО Металл"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Город">
                  <CalcInput
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Абакан"
                  />
                </Field>
                <Field label="Телефон">
                  <CalcInput
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 900 000-00-00"
                  />
                </Field>
              </div>
            </>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white shadow-md shadow-orange-400/30 transition hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Загрузка…" : mode === "login" ? "Войти" : "Зарегистрироваться"}
        </button>

        <p className="mt-3 text-center text-xs text-gray-400">
          Войдите, чтобы сохранить настройки калькулятора и использовать их на любом устройстве
        </p>
      </div>
    </div>
  );
}
