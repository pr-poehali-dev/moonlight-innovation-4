import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/0c756925-ed78-4b75-93b0-093a9032f2b0";
const SEARCH_URL = "https://functions.poehali.dev/63646839-5642-4afa-827b-d771c8294f21";

const CATEGORIES = [
  { id: "all", label: "Все", icon: "LayoutGrid" },
  { id: "turning", label: "Токарные работы", icon: "Settings" },
  { id: "tenders", label: "Тендеры", icon: "FileText" },
  { id: "mining", label: "Оборудование", icon: "Wrench" },
  { id: "construction", label: "Подряды", icon: "Building2" },
];

const RELEVANCE_COLOR: Record<string, string> = {
  "высокая": "bg-green-100 text-green-700",
  "средняя": "bg-yellow-100 text-yellow-700",
  "низкая": "bg-gray-100 text-gray-500",
};

const CATEGORY_COLOR: Record<string, string> = {
  "токарные работы": "bg-orange-100 text-orange-700",
  "тендер": "bg-blue-100 text-blue-700",
  "оборудование": "bg-purple-100 text-purple-700",
  "подряд": "bg-teal-100 text-teal-700",
  "другое": "bg-gray-100 text-gray-500",
};

interface SearchResult {
  title: string;
  link: string;
  source: string;
  snippet: string;
  category?: string;
  relevance?: string;
}

export default function Aggregator() {
  const navigate = useNavigate();

  const [loggedIn, setLoggedIn] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searched, setSearched] = useState(false);

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
      if (data.ok) {
        setLoggedIn(true);
      } else {
        setLoginError("Неверный логин или пароль");
      }
    } catch {
      setLoginError("Ошибка соединения");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    setResults([]);
    setSearched(false);
    try {
      const res = await fetch(SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), category }),
      });
      const data = await res.json();
      if (data.error) setSearchError(data.error);
      else setResults(data.results || []);
    } catch {
      setSearchError("Ошибка соединения. Проверьте подключение к интернету.");
    } finally {
      setSearching(false);
      setSearched(true);
    }
  }

  const Logo = () => (
    <button onClick={() => navigate("/")} className="flex items-center transition-transform hover:scale-105">
      <img
        src="https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/7b4ccbce-5c89-46bb-a8d2-35dd09ecdd32.png"
        alt="АЗОМ"
        className="h-14 w-auto"
      />
      <img
        src="https://cdn.poehali.dev/projects/d24e16a8-db41-4ec6-8e08-cb199b98c43e/bucket/77df7b95-de84-41c1-91db-cba1516b2392.png"
        alt="МайнингСтройСервис"
        className="h-14 w-auto -ml-4"
      />
    </button>
  );

  if (!loggedIn) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 font-sans">
        <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 md:px-12">
          <Logo />
          <button onClick={() => navigate("/")} className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50">
            ← На сайт
          </button>
        </nav>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-gray-900">Агрегатор заказов</h1>
              <p className="mt-1 text-sm text-gray-400">Поиск по площадкам, тендерам и доскам объявлений</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Логин</label>
                <input type="email" value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Email" required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Пароль</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </div>
              {loginError && <p className="text-sm text-red-500">{loginError}</p>}
              <button type="submit" disabled={loginLoading}
                className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60">
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
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 md:px-12">
        <Logo />
        <div className="flex items-center gap-3">
          <button onClick={() => setLoggedIn(false)} className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50">
            Выйти
          </button>
          <button onClick={() => navigate("/")} className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50">
            ← На сайт
          </button>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Агрегатор заказов</h1>
          <p className="mt-1 text-sm text-gray-500">ИИ-поиск по Авито, торговым площадкам, тендерам и доскам объявлений</p>
        </div>

        {/* Форма поиска */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например: токарные работы Екатеринбург, запчасти для экскаватора..."
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
            <button type="submit" disabled={searching || !query.trim()}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50">
              {searching ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Ищу…</>
              ) : (
                <><Icon name="Search" size={16} />Найти</>
              )}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  category === cat.id
                    ? "bg-orange-500 text-white"
                    : "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-orange-50 hover:border-orange-200"
                }`}>
                <Icon name={cat.icon as Parameters<typeof Icon>[0]["name"]} size={12} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Поиск */}
        {searching && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
            <p className="font-semibold text-gray-700">ИИ-агент ищет заказы…</p>
            <p className="mt-1 text-sm text-gray-400">Проверяю площадки, доски объявлений и тендеры</p>
          </div>
        )}

        {searchError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{searchError}</div>
        )}

        {/* Нет результатов */}
        {!searching && searched && results.length === 0 && !searchError && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-gray-700">Ничего не найдено</p>
            <p className="mt-1 text-sm text-gray-400">Попробуйте изменить запрос или категорию</p>
          </div>
        )}

        {/* Результаты */}
        {!searching && results.length > 0 && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              Найдено <span className="font-semibold text-gray-800">{results.length}</span> результатов по запросу «{query}»
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {results.map((r, i) => (
                <a key={i} href={r.link} target="_blank" rel="noopener noreferrer"
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                      {r.title}
                    </h3>
                    <Icon name="ExternalLink" size={14} className="mt-0.5 shrink-0 text-gray-400 group-hover:text-orange-500" />
                  </div>
                  <p className="mb-3 line-clamp-2 text-xs text-gray-500 flex-1">{r.snippet}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">{r.source}</span>
                    {r.category && (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_COLOR[r.category] || "bg-gray-100 text-gray-500"}`}>
                        {r.category}
                      </span>
                    )}
                    {r.relevance && (
                      <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${RELEVANCE_COLOR[r.relevance] || "bg-gray-100 text-gray-500"}`}>
                        {r.relevance}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {/* Начальное состояние */}
        {!searching && !searched && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-orange-50 p-6">
              <Icon name="Search" size={32} className="text-orange-400" />
            </div>
            <p className="font-semibold text-gray-700">Введите запрос для поиска</p>
            <p className="mt-1 text-sm text-gray-400 max-w-sm">
              ИИ-агент найдёт заказы, тендеры и объявления на Авито, торговых площадках и в госзакупках
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
