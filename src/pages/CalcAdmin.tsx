import { useState, useEffect } from "react";

const API = "https://functions.poehali.dev/0a6ed799-bdd1-4e64-b0fc-a659b48ca233";

interface CalcUserRow {
  id: number;
  email: string;
  full_name: string;
  city: string;
  phone: string;
  company: string;
  created_at: string | null;
  last_login: string | null;
  has_settings: boolean;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function CalcAdmin() {
  const [token, setToken] = useState(() => localStorage.getItem("calcAdminToken") || "");
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [users, setUsers] = useState<CalcUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedSettings, setSelectedSettings] = useState<Record<string, unknown> | null>(null);
  const [selectedUserInfo, setSelectedUserInfo] = useState<Omit<CalcUserRow, "id" | "has_settings"> | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}?action=users`, {
        headers: { "X-Auth-Token": token },
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setToken("");
          localStorage.removeItem("calcAdminToken");
          setError("Неверный токен");
        } else {
          setError(data.error || "Ошибка загрузки");
        }
        return;
      }
      setUsers(data.users || []);
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserSettings(userId: number) {
    if (selectedUser === userId) {
      setSelectedUser(null);
      setSelectedSettings(null);
      setSelectedUserInfo(null);
      return;
    }
    setSelectedUser(userId);
    setSelectedSettings(null);
    setSelectedUserInfo(null);
    const res = await fetch(`${API}?action=user-settings&user_id=${userId}`, {
      headers: { "X-Auth-Token": token },
    });
    const data = await res.json();
    setSelectedSettings(data.settings);
    setSelectedUserInfo({
      email: data.email,
      full_name: data.full_name,
      city: data.city,
      phone: data.phone,
      company: data.company,
      created_at: null,
      last_login: null,
    });
  }

  function handleLogin() {
    setAuthError("");
    if (!tokenInput.trim()) { setAuthError("Введите токен"); return; }
    localStorage.setItem("calcAdminToken", tokenInput.trim());
    setToken(tokenInput.trim());
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      u.city.toLowerCase().includes(q) ||
      u.company.toLowerCase().includes(q)
    );
  });

  // Страница входа
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
          <h1 className="text-xl font-bold mb-1">Управление пользователями</h1>
          <p className="text-sm text-gray-500 mb-5">Калькулятор металлообработки</p>
          <label className="block text-xs font-semibold text-gray-500 mb-1">ADMIN TOKEN</label>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-400 mb-3"
            placeholder="Введите токен из настроек проекта"
          />
          {authError && <p className="text-red-500 text-sm mb-3">{authError}</p>}
          <button
            onClick={handleLogin}
            className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition"
          >
            Войти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Шапка */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Пользователи калькулятора</h1>
          <p className="text-sm text-white/40">
            {loading ? "Загрузка…" : `${users.length} пользователей`}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchUsers}
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/10 transition"
          >
            ↻ Обновить
          </button>
          <button
            onClick={() => { setToken(""); localStorage.removeItem("calcAdminToken"); }}
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/10 transition"
          >
            Выйти
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">
        {/* Список пользователей */}
        <div className="lg:w-[55%] border-r border-white/10">
          {/* Поиск */}
          <div className="p-4 border-b border-white/10">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по email, имени, городу, компании…"
              className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-orange-400"
            />
          </div>

          {error && (
            <div className="m-4 rounded-xl bg-red-900/30 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-white/30 text-sm">Загрузка…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-white/30 text-sm">Нет пользователей</div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((u) => (
                <div
                  key={u.id}
                  onClick={() => fetchUserSettings(u.id)}
                  className={`px-5 py-4 cursor-pointer transition hover:bg-white/5 ${selectedUser === u.id ? "bg-white/10" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white truncate">{u.email}</span>
                        {u.has_settings && (
                          <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-400">
                            настройки
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/40">
                        {u.full_name && <span>👤 {u.full_name}</span>}
                        {u.company && <span>🏢 {u.company}</span>}
                        {u.city && <span>📍 {u.city}</span>}
                        {u.phone && <span>📞 {u.phone}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-white/30">Рег: {fmt(u.created_at)}</p>
                      <p className="text-xs text-white/30">Вход: {fmt(u.last_login)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Панель деталей */}
        <div className="lg:flex-1 p-6">
          {selectedUser === null ? (
            <div className="h-full flex items-center justify-center text-white/20 text-sm">
              Выберите пользователя, чтобы увидеть детали
            </div>
          ) : (
            <div>
              {selectedUserInfo && (
                <div className="mb-5 rounded-xl bg-white/5 border border-white/10 p-4 space-y-1">
                  <p className="text-sm font-bold text-white">{selectedUserInfo.email}</p>
                  {selectedUserInfo.full_name && <p className="text-xs text-white/50">👤 {selectedUserInfo.full_name}</p>}
                  {selectedUserInfo.company && <p className="text-xs text-white/50">🏢 {selectedUserInfo.company}</p>}
                  {selectedUserInfo.city && <p className="text-xs text-white/50">📍 {selectedUserInfo.city}</p>}
                  {selectedUserInfo.phone && <p className="text-xs text-white/50">📞 {selectedUserInfo.phone}</p>}
                </div>
              )}

              {selectedSettings === undefined ? (
                <p className="text-white/40 text-sm">Загрузка…</p>
              ) : selectedSettings === null ? (
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-white/40 text-sm">
                  Пользователь ещё не сохранял настройки
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Настройки калькулятора</p>
                  {/* Ставки */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <p className="text-xs text-white/40">Ставка цеха</p>
                      <p className="text-lg font-bold text-orange-400">
                        {(selectedSettings as { hourlyRate?: number }).hourlyRate?.toLocaleString("ru-RU") ?? "—"} ₽/ч
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <p className="text-xs text-white/40">Наладка</p>
                      <p className="text-lg font-bold text-orange-400">
                        {(selectedSettings as { setupMinutes?: number }).setupMinutes ?? "—"} мин
                      </p>
                    </div>
                  </div>
                  {/* Материалы */}
                  <p className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Материалы</p>
                  <div className="space-y-1 mb-4">
                    {((selectedSettings as { materials?: Array<{ name: string; costPerKg: number; factor: number }> }).materials ?? []).map((m, i) => (
                      <div key={i} className="flex justify-between text-xs py-1 border-b border-white/5">
                        <span className="text-white/70">{m.name}</span>
                        <span className="text-white/40">{m.costPerKg} ₽/кг · коэф. {m.factor}</span>
                      </div>
                    ))}
                  </div>
                  {/* JSON */}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-white/30 hover:text-white/60 transition mb-2">
                      Показать полный JSON настроек
                    </summary>
                    <pre className="rounded-xl bg-black/40 p-3 text-white/50 overflow-x-auto text-xs leading-relaxed">
                      {JSON.stringify(selectedSettings, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
