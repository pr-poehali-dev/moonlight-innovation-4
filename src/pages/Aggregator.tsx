import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "https://functions.poehali.dev/0c756925-ed78-4b75-93b0-093a9032f2b0";

export default function Aggregator() {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [currentHtml, setCurrentHtml] = useState<string | null>(null);
  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", login, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setLoggedIn(true);
        loadHtml();
      } else {
        setLoginError("Неверный логин или пароль");
      }
    } catch {
      setLoginError("Ошибка соединения");
    } finally {
      setLoginLoading(false);
    }
  }

  async function loadHtml() {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      setCurrentHtml(data.html || null);
    } finally {
      setHtmlLoaded(true);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".html")) {
      setUploadMsg("Выберите HTML-файл");
      return;
    }
    setUploading(true);
    setUploadMsg("");
    try {
      const html = await file.text();
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upload", login, password, html }),
      });
      const data = await res.json();
      if (data.ok) {
        setUploadMsg("✅ Файл успешно загружен");
        setCurrentHtml(html);
      } else {
        setUploadMsg("❌ Ошибка: " + (data.error || "неизвестная"));
      }
    } catch {
      setUploadMsg("❌ Ошибка соединения");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Шапка */}
      <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 md:px-12">
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
        <button
          onClick={() => navigate("/")}
          className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50"
        >
          ← На сайт
        </button>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Агрегатор</h1>
        <p className="mb-8 text-sm text-gray-500">Раздел для администраторов</p>

        {!loggedIn ? (
          /* Форма входа */
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-lg font-semibold text-gray-800">Вход</h2>
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
        ) : (
          /* Панель загрузки */
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="mb-2 text-lg font-semibold text-gray-800">Загрузить HTML-файл</h2>
              <p className="mb-6 text-sm text-gray-500">
                Выберите HTML-файл с компьютера. Он заменит текущее содержимое агрегатора.
              </p>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 transition hover:border-orange-400 hover:bg-orange-50">
                <span className="text-3xl">📄</span>
                <span className="text-sm font-semibold text-gray-600">
                  {uploading ? "Загрузка…" : "Нажмите, чтобы выбрать HTML-файл"}
                </span>
                <span className="text-xs text-gray-400">Только .html</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".html,text/html"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {uploadMsg && (
                <p className={`mt-4 text-sm font-medium ${uploadMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
                  {uploadMsg}
                </p>
              )}
            </div>

            {/* Предпросмотр текущего файла */}
            {htmlLoaded && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-base font-semibold text-gray-800">
                  {currentHtml ? "Текущий файл (предпросмотр)" : "Файл ещё не загружен"}
                </h2>
                {currentHtml ? (
                  <iframe
                    srcDoc={currentHtml}
                    className="h-[500px] w-full rounded-xl border border-gray-200 bg-white"
                    sandbox="allow-scripts allow-same-origin"
                    title="Предпросмотр агрегатора"
                  />
                ) : (
                  <p className="text-sm text-gray-400">Загрузите HTML-файл, чтобы он появился здесь.</p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => { setLoggedIn(false); setCurrentHtml(null); setHtmlLoaded(false); }}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 transition hover:bg-gray-50"
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
