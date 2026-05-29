import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/0c756925-ed78-4b75-93b0-093a9032f2b0";
const SEARCH_URL = "https://functions.poehali.dev/63646839-5642-4afa-827b-d771c8294f21";

const TOPICS = [
  { id: "mining",   label: "Горное оборудование",    icon: "Mountain",   color: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "crusher",  label: "Дробильное оборудование", icon: "Cog",        color: "bg-orange-100 text-orange-800 border-orange-200" },
  { id: "smr",      label: "СМР",                     icon: "HardHat",    color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "finishing",label: "Отделочные работы",       icon: "PaintBucket", color: "bg-green-100 text-green-800 border-green-200" },
];

const STATUS_OPTIONS = ["Новый","В работе","Письмо отправлено","КП отправлено","Переговоры","Заказ получен","Отказ","Закрыт"];
const STATUS_COLOR: Record<string,string> = {
  "Новый": "bg-blue-100 text-blue-700",
  "В работе": "bg-green-100 text-green-700",
  "Письмо отправлено": "bg-yellow-100 text-yellow-700",
  "КП отправлено": "bg-orange-100 text-orange-700",
  "Переговоры": "bg-indigo-100 text-indigo-700",
  "Заказ получен": "bg-emerald-100 text-emerald-700",
  "Отказ": "bg-red-100 text-red-700",
  "Закрыт": "bg-gray-100 text-gray-500",
};

interface Tender {
  id: number;
  external_id: string;
  source: string;
  title: string;
  customer_name: string;
  region: string;
  price_to: number | null;
  deadline: string | null;
  published_at: string | null;
  processing_types: string;
  category: string;
  topic_label: string;
  url: string;
  user_status: string;
  comments: string;
  favorite: boolean;
}

export default function Aggregator() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTopic, setActiveTopic] = useState("mining");
  const [loadingTopics, setLoadingTopics] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, Tender[]>>({});
  const [selected, setSelected] = useState<Tender | null>(null);
  const [localStatus, setLocalStatus] = useState<Record<number, string>>({});
  const [localComment, setLocalComment] = useState<Record<number, string>>({});
  const [localFav, setLocalFav] = useState<Record<number, boolean>>({});
  const [filterFav, setFilterFav] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", login, password }),
      });
      const data = await res.json();
      if (data.ok) setLoggedIn(true);
      else setLoginError("Неверный логин или пароль");
    } catch { setLoginError("Ошибка соединения"); }
    finally { setLoginLoading(false); }
  }

  const loadTopic = useCallback(async (topicId: string) => {
    if (results[topicId] || loadingTopics[topicId]) return;
    setLoadingTopics(p => ({ ...p, [topicId]: true }));
    try {
      const res = await fetch(SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic_id: topicId }),
      });
      const data = await res.json();
      setResults(p => ({ ...p, [topicId]: data.results || [] }));
    } catch {
      setResults(p => ({ ...p, [topicId]: [] }));
    } finally {
      setLoadingTopics(p => ({ ...p, [topicId]: false }));
    }
  }, [results, loadingTopics]);

  // Загружаем первое направление сразу после входа
  useEffect(() => {
    if (loggedIn) loadTopic("mining");
  }, [loggedIn]);

  function handleTabClick(topicId: string) {
    setActiveTopic(topicId);
    loadTopic(topicId);
  }

  function refreshTopic(topicId: string) {
    setResults(p => { const n = { ...p }; delete n[topicId]; return n; });
    setLoadingTopics(p => ({ ...p, [topicId]: false }));
    setTimeout(() => loadTopic(topicId), 50);
  }

  function fmtPrice(p: number | null) {
    if (!p) return "—";
    if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)} млн ₽`;
    if (p >= 1_000) return `${(p / 1_000).toFixed(0)} тыс ₽`;
    return `${p} ₽`;
  }

  const currentTenders = (results[activeTopic] || []).filter(t => {
    if (filterFav && !localFav[t.id] && !t.favorite) return false;
    const st = localStatus[t.id] || t.user_status || "Новый";
    if (filterStatus && st !== filterStatus) return false;
    return true;
  });

  const Logo = () => (
    <button onClick={() => navigate("/")} className="flex items-center transition-transform hover:scale-105">
      <img src="https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/7b4ccbce-5c89-46bb-a8d2-35dd09ecdd32.png" alt="АЗОМ" className="h-12 w-auto" />
      <img src="https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/77df7b95-de84-41c1-91db-cba1516b2392.png" alt="МСС" className="h-12 w-auto -ml-3" />
    </button>
  );

  if (!loggedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 font-sans">
        <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 md:px-12">
          <Logo />
          <button onClick={() => navigate("/")} className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50">← На сайт</button>
        </nav>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">Агрегатор тендеров</h1>
              <p className="mt-1 text-sm text-gray-400">Горное · Дробильное · СМР · Отделка</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Логин</label>
                <input type="email" value={login} onChange={e => setLogin(e.target.value)} placeholder="Email" required className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Пароль</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль" required className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </div>
              {loginError && <p className="text-sm text-red-500">{loginError}</p>}
              <button type="submit" disabled={loginLoading} className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60">
                {loginLoading ? "Проверка…" : "Войти"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 font-sans">
      {/* Шапка */}
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 md:px-12 sticky top-0 z-20 shadow-sm">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="hidden md:flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Icon name="Sparkles" size={12} /> ИИ-поиск
          </span>
          <button onClick={() => setLoggedIn(false)} className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50">Выйти</button>
          <button onClick={() => navigate("/")} className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50">← На сайт</button>
        </div>
      </nav>

      {/* Табы направлений */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-8">
        <div className="flex gap-1 overflow-x-auto py-2">
          {TOPICS.map(t => {
            const isActive = activeTopic === t.id;
            const isLoading = loadingTopics[t.id];
            const count = results[t.id]?.length;
            return (
              <button
                key={t.id}
                onClick={() => handleTabClick(t.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold border transition-all ${
                  isActive
                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                <Icon name={t.icon} size={15} />
                {t.label}
                {isLoading && <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {!isLoading && count !== undefined && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-2 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setFilterFav(p => !p)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${filterFav ? "bg-yellow-50 border-yellow-300 text-yellow-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
        >
          <Icon name="Star" size={13} /> Избранные
        </button>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 outline-none focus:border-orange-400"
        >
          <option value="">Все статусы</option>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <button
          onClick={() => refreshTopic(activeTopic)}
          disabled={loadingTopics[activeTopic]}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
        >
          <Icon name="RefreshCw" size={13} className={loadingTopics[activeTopic] ? "animate-spin" : ""} />
          Обновить
        </button>
        <span className="text-xs text-gray-400">Найдено: {currentTenders.length}</span>
      </div>

      {/* Таблица */}
      <div className="flex-1 overflow-auto px-4 md:px-8 py-4">
        {loadingTopics[activeTopic] && !results[activeTopic] ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
            <p className="text-sm font-medium">DeepSeek ищет тендеры…</p>
            <p className="mt-1 text-xs">Анализируем торговые площадки</p>
          </div>
        ) : currentTenders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Icon name="SearchX" size={40} className="mb-3 text-gray-300" />
            <p className="text-sm font-medium">Тендеры не найдены</p>
            <p className="mt-1 text-xs">Попробуйте обновить или снять фильтры</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 w-8"></th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Тендер</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 hidden md:table-cell">Заказчик</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 hidden lg:table-cell">Регион</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-400 hidden md:table-cell">НМЦ</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 hidden lg:table-cell">Срок</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Статус</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">Открыть</th>
                </tr>
              </thead>
              <tbody>
                {currentTenders.map((t, i) => {
                  const status = localStatus[t.id] || t.user_status || "Новый";
                  const isFav = localFav[t.id] ?? t.favorite;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors hover:bg-orange-50/50 ${isFav ? "bg-yellow-50/40" : i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setLocalFav(p => ({ ...p, [t.id]: !isFav })); }}
                          className={`transition ${isFav ? "text-yellow-400" : "text-gray-200 hover:text-yellow-300"}`}
                        >
                          <Icon name="Star" size={14} />
                        </button>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight">{t.title}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">{t.source} · №{t.external_id}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-gray-600 max-w-[160px] line-clamp-2">{t.customer_name}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-xs text-gray-500">{t.region}</p>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <p className="text-xs font-semibold text-gray-700">{fmtPrice(t.price_to)}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-xs text-gray-500">{t.deadline || "—"}</p>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <select
                          value={status}
                          onChange={e => setLocalStatus(p => ({ ...p, [t.id]: e.target.value }))}
                          className={`rounded-lg border-0 px-2 py-1 text-[11px] font-semibold outline-none cursor-pointer ${STATUS_COLOR[status] || "bg-gray-100 text-gray-600"}`}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        {t.url ? (
                          <a href={t.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-orange-50 border border-orange-200 px-2.5 py-1 text-[11px] font-semibold text-orange-600 transition hover:bg-orange-100">
                            <Icon name="ExternalLink" size={11} /> Открыть
                          </a>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модалка детали */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div className="pr-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-500">{selected.category} · {selected.source}</p>
                <h2 className="mt-1 text-base font-bold text-gray-900 leading-snug">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <Icon name="X" size={18} />
              </button>
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Номер", `№${selected.external_id}`],
                ["Заказчик", selected.customer_name],
                ["Регион", selected.region],
                ["НМЦ", fmtPrice(selected.price_to)],
                ["Срок подачи", selected.deadline || "—"],
                ["Опубликован", selected.published_at || "—"],
                ["Тип работ", selected.processing_types],
                ["Площадка", selected.source],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  <p className="mt-0.5 font-medium text-gray-800">{val}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 px-6 py-4">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Комментарий</p>
              <textarea
                value={localComment[selected.id] ?? selected.comments ?? ""}
                onChange={e => setLocalComment(p => ({ ...p, [selected.id]: e.target.value }))}
                rows={2}
                placeholder="Добавьте заметку…"
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <select
                value={localStatus[selected.id] || selected.user_status || "Новый"}
                onChange={e => setLocalStatus(p => ({ ...p, [selected.id]: e.target.value }))}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              >
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
              {selected.url && (
                <a href={selected.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-600">
                  <Icon name="ExternalLink" size={15} /> Открыть тендер
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}