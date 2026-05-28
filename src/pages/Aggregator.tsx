import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AUTH_URL = "https://functions.poehali.dev/0c756925-ed78-4b75-93b0-093a9032f2b0";

export default function Aggregator() {
  const navigate = useNavigate();

  const [loggedIn, setLoggedIn] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [html, setHtml] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const authRes = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", login, password }),
      });
      const authData = await authRes.json();
      if (authData.ok) {
        const htmlRes = await fetch(AUTH_URL);
        const htmlData = await htmlRes.json();
        setHtml(htmlData.html || null);
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
              <p className="mt-1 text-sm text-gray-400">Металлообработка · СМР · Тендеры</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Логин</label>
                <input
                  type="email"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="Email"
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль"
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              {loginError && <p className="text-sm text-red-500">{loginError}</p>}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {loginLoading ? "Проверка…" : "Войти"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col font-sans">
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 md:px-12">
        <Logo />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLoggedIn(false)}
            className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50"
          >
            Выйти
          </button>
          <button
            onClick={() => navigate("/")}
            className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50"
          >
            ← На сайт
          </button>
        </div>
      </nav>

      <div className="flex-1">
        {html ? (
          <iframe
            srcDoc={html}
            className="w-full border-0 bg-white"
            style={{ height: "calc(100vh - 65px)" }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            title="Агрегатор заказов"
          />
        ) : (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <p className="mb-4 text-4xl">📄</p>
              <p className="text-sm text-gray-500">Файл агрегатора ещё не загружен</p>
              <p className="mt-1 text-xs text-gray-400">Загрузите HTML-файл в административной панели</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
