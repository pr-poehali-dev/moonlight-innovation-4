import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Icon from "@/components/ui/icon"

const API_URL = "https://functions.poehali.dev/2bd7a9a0-3822-4e18-bdd8-38b4a107a4ab"

const CALC_USERS_URL = "https://functions.poehali.dev/0a6ed799-bdd1-4e64-b0fc-a659b48ca233"
const AGGREGATOR_URL = "https://functions.poehali.dev/0c756925-ed78-4b75-93b0-093a9032f2b0"

type Stage = "В производстве" | "Готово" | "Смонтировано"
const STAGES: Stage[] = ["В производстве", "Готово", "Смонтировано"]

interface Project {
  id: number
  title: string
  description: string
  stage: Stage
  images: string[]
}

interface CalcUserRow {
  id: number
  email: string
  full_name: string
  city: string
  phone: string
  company: string
  created_at: string | null
  last_login: string | null
  has_settings: boolean
}

export default function Admin() {
  const [token, setToken] = useState("")
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  const [calcUsers, setCalcUsers] = useState<CalcUserRow[]>([])
  const [calcUsersLoading, setCalcUsersLoading] = useState(false)
  const [calcUsersSearch, setCalcUsersSearch] = useState("")
  const [calcUsersExpanded, setCalcUsersExpanded] = useState(false)
  const [selectedCalcUser, setSelectedCalcUser] = useState<number | null>(null)
  const [selectedCalcSettings, setSelectedCalcSettings] = useState<Record<string, unknown> | null | undefined>(undefined)

  const [aggrHtmlUploading, setAggrHtmlUploading] = useState(false)
  const [aggrHtmlMsg, setAggrHtmlMsg] = useState("")
  const aggrFileRef = useRef<HTMLInputElement>(null)

  const handleAggrHtmlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".html")) { setAggrHtmlMsg("Выберите .html файл"); return }
    setAggrHtmlUploading(true)
    setAggrHtmlMsg("")
    try {
      const html = await file.text()
      const res = await fetch(AGGREGATOR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upload", login: "das-service@inbox.ru", password: "autoremex2012", html }),
      })
      const data = await res.json()
      if (data.ok) setAggrHtmlMsg("✅ Файл загружен успешно")
      else setAggrHtmlMsg("❌ Ошибка: " + (data.error || "неизвестная"))
    } catch { setAggrHtmlMsg("❌ Ошибка соединения") }
    finally {
      setAggrHtmlUploading(false)
      if (aggrFileRef.current) aggrFileRef.current.value = ""
    }
  }

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [stage, setStage] = useState<Stage>("В производстве")
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const headers = { "Content-Type": "application/json", "X-Admin-Token": token }

  const loadProjects = async (t = token) => {
    setLoading(true)
    const res = await fetch(API_URL, { headers: { "X-Admin-Token": t } })
    if (res.status === 403) { setAuthError(true); setLoading(false); return }
    const data = await res.json()
    setProjects(data)
    setLoading(false)
  }

  const loadCalcUsers = async (t = token) => {
    setCalcUsersLoading(true)
    const res = await fetch(`${CALC_USERS_URL}?action=users`, {
      headers: { "X-Auth-Token": t },
    })
    if (res.ok) {
      const data = await res.json()
      setCalcUsers(data.users || [])
    }
    setCalcUsersLoading(false)
  }

  const loadCalcUserSettings = async (userId: number) => {
    if (selectedCalcUser === userId) {
      setSelectedCalcUser(null)
      setSelectedCalcSettings(undefined)
      return
    }
    setSelectedCalcUser(userId)
    setSelectedCalcSettings(undefined)
    const res = await fetch(`${CALC_USERS_URL}?action=user-settings&user_id=${userId}`, {
      headers: { "X-Auth-Token": token },
    })
    if (res.ok) {
      const data = await res.json()
      setSelectedCalcSettings(data.settings ?? null)
    }
  }

  const handleLogin = async () => {
    setAuthError(false)
    const res = await fetch(API_URL, { headers: { "X-Admin-Token": token } })
    if (res.ok) { setAuthed(true); loadProjects(token); loadCalcUsers(token) }
    else setAuthError(true)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploading(true)
    const urls: string[] = []
    for (const file of files) {
      const base64 = await toBase64(file)
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers,
        body: JSON.stringify({ file: base64, content_type: file.type }),
      })
      const data = await res.json()
      if (data.url) urls.push(data.url)
    }
    setUploadedImages((prev) => [...prev, ...urls])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(",")[1])
      }
      reader.readAsDataURL(file)
    })

  const handleCreate = async () => {
    if (!title.trim()) return
    setSaving(true)
    await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ title, description, stage, images: uploadedImages }),
    })
    setTitle("")
    setDescription("")
    setStage("В производстве")
    setUploadedImages([])
    setSaving(false)
    setSuccessMsg("Проект добавлен!")
    setTimeout(() => setSuccessMsg(""), 3000)
    loadProjects()
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить проект?")) return
    await fetch(`${API_URL}/${id}`, { method: "DELETE", headers })
    loadProjects()
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="mb-6 font-sans text-xl font-medium text-foreground">Вход в панель</h1>
          <Input
            type="password"
            placeholder="Пароль администратора"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="mb-3"
          />
          {authError && <p className="mb-3 font-mono text-xs text-red-500">Неверный пароль</p>}
          <Button onClick={handleLogin} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            Войти
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-sans text-2xl font-medium text-foreground">Управление галереей</h1>
          <a href="/" className="font-mono text-sm text-foreground/50 hover:text-orange-500">← На сайт</a>
        </div>

        {/* Форма добавления */}
        <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-sans text-base font-medium text-foreground">Добавить проект</h2>
          <div className="space-y-3">
            <Input placeholder="Название проекта" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} />
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm text-foreground"
            >
              {STAGES.map((s) => <option key={s}>{s}</option>)}
            </select>

            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-foreground/20 px-4 py-3 font-mono text-sm text-foreground/50 hover:border-orange-400 hover:text-orange-500 transition-colors"
              >
                <Icon name="Upload" size={16} />
                {uploading ? "Загружаю..." : "Загрузить фото"}
              </label>
            </div>

            {uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {uploadedImages.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} className="h-16 w-16 rounded-lg object-cover" />
                    <button
                      onClick={() => setUploadedImages((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                    >
                      <Icon name="X" size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {successMsg && <p className="font-mono text-xs text-green-600">{successMsg}</p>}

            <Button
              onClick={handleCreate}
              disabled={!title.trim() || saving || uploading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? "Сохраняю..." : "Добавить проект"}
            </Button>
          </div>
        </div>

        {/* Пользователи калькулятора */}
        <div className="mb-8 rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-sans text-base font-medium">
                Пользователи калькулятора
                <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 font-mono text-xs text-orange-600">
                  {calcUsers.length}
                </span>
              </h2>
              <p className="font-mono text-xs text-foreground/40 mt-0.5">Зарегистрированные через /calculator</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => loadCalcUsers()}
                className="rounded-md border px-3 py-1.5 font-mono text-xs text-foreground/50 hover:bg-gray-50 transition-colors"
              >
                ↻ Обновить
              </button>
              <button
                onClick={() => setCalcUsersExpanded(!calcUsersExpanded)}
                className="rounded-md border px-3 py-1.5 font-mono text-xs text-foreground/50 hover:bg-gray-50 transition-colors"
              >
                {calcUsersExpanded ? "Свернуть ↑" : "Развернуть ↓"}
              </button>
            </div>
          </div>

          {calcUsersExpanded && (
            <>
              {/* Поиск */}
              <div className="border-b px-6 py-3">
                <Input
                  placeholder="Поиск по email, имени, городу, компании…"
                  value={calcUsersSearch}
                  onChange={(e) => setCalcUsersSearch(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              {calcUsersLoading ? (
                <div className="px-6 py-8 text-center font-mono text-sm text-foreground/40">Загружаю…</div>
              ) : calcUsers.length === 0 ? (
                <div className="px-6 py-8 text-center font-mono text-sm text-foreground/40">Нет зарегистрированных пользователей</div>
              ) : (
                <div className="flex flex-col lg:flex-row">
                  {/* Список */}
                  <div className="lg:w-1/2 divide-y border-r">
                    {calcUsers
                      .filter((u) => {
                        const q = calcUsersSearch.toLowerCase()
                        return !q || u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q) || u.city.toLowerCase().includes(q) || u.company.toLowerCase().includes(q) || u.phone.toLowerCase().includes(q)
                      })
                      .map((u) => (
                        <div
                          key={u.id}
                          onClick={() => loadCalcUserSettings(u.id)}
                          className={`cursor-pointer px-6 py-4 hover:bg-gray-50 transition-colors ${selectedCalcUser === u.id ? "bg-orange-50" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-sans text-sm font-medium text-foreground truncate">{u.email}</span>
                                {u.has_settings && (
                                  <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 font-mono text-xs text-orange-600">
                                    настройки
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                                {u.full_name && <span className="font-mono text-xs text-foreground/50">👤 {u.full_name}</span>}
                                {u.company && <span className="font-mono text-xs text-foreground/50">🏢 {u.company}</span>}
                                {u.city && <span className="font-mono text-xs text-foreground/50">📍 {u.city}</span>}
                                {u.phone && <span className="font-mono text-xs text-foreground/50">📞 {u.phone}</span>}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="font-mono text-xs text-foreground/30">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString("ru-RU") : "—"}
                              </p>
                              <p className="font-mono text-xs text-foreground/30">
                                {u.last_login ? "вход: " + new Date(u.last_login).toLocaleDateString("ru-RU") : "не входил"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Детали пользователя */}
                  <div className="lg:flex-1 p-6">
                    {selectedCalcUser === null ? (
                      <p className="font-mono text-sm text-foreground/30 text-center mt-4">
                        Нажмите на пользователя
                      </p>
                    ) : selectedCalcSettings === undefined ? (
                      <p className="font-mono text-sm text-foreground/40">Загрузка…</p>
                    ) : (
                      <div>
                        {selectedCalcSettings === null ? (
                          <div className="rounded-xl border bg-gray-50 px-4 py-3 font-mono text-sm text-foreground/40">
                            Пользователь ещё не сохранял настройки калькулятора
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-xl border bg-gray-50 px-4 py-3 text-center">
                                <p className="font-sans text-xl font-semibold text-orange-500">
                                  {(selectedCalcSettings as { hourlyRate?: number }).hourlyRate?.toLocaleString("ru-RU") ?? "—"}
                                </p>
                                <p className="font-mono text-xs text-foreground/50">₽/ч ставка цеха</p>
                              </div>
                              <div className="rounded-xl border bg-gray-50 px-4 py-3 text-center">
                                <p className="font-sans text-xl font-semibold text-orange-500">
                                  {(selectedCalcSettings as { setupMinutes?: number }).setupMinutes ?? "—"}
                                </p>
                                <p className="font-mono text-xs text-foreground/50">мин наладка</p>
                              </div>
                            </div>

                            <div>
                              <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-foreground/40">
                                Материалы ({((selectedCalcSettings as { materials?: unknown[] }).materials ?? []).length})
                              </p>
                              <div className="rounded-xl border divide-y">
                                {((selectedCalcSettings as { materials?: Array<{ name: string; costPerKg: number; density: number; factor: number }> }).materials ?? []).map((m, i) => (
                                  <div key={i} className="flex items-center justify-between px-3 py-2">
                                    <span className="font-sans text-sm text-foreground">{m.name}</span>
                                    <div className="text-right">
                                      <span className="font-mono text-xs text-orange-500">{m.costPerKg} ₽/кг</span>
                                      <span className="ml-2 font-mono text-xs text-foreground/40">
                                        плот. {m.density} · коэф. {m.factor}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-foreground/40">
                                Типы обработок
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {((selectedCalcSettings as { workTypes?: Array<{ name: string }> }).workTypes ?? []).map((w, i) => (
                                  <span key={i} className="rounded-full bg-gray-100 px-3 py-1 font-mono text-xs text-foreground/60">
                                    {w.name}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <details>
                              <summary className="cursor-pointer font-mono text-xs text-foreground/30 hover:text-foreground/60 transition">
                                Полный JSON настроек
                              </summary>
                              <pre className="mt-2 max-h-48 overflow-y-auto rounded-xl border bg-gray-50 p-3 font-mono text-xs text-foreground/50">
                                {JSON.stringify(selectedCalcSettings, null, 2)}
                              </pre>
                            </details>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Агрегатор — загрузка HTML */}
        <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="mb-1 font-sans text-base font-medium text-foreground">Агрегатор</h2>
          <p className="mb-5 font-mono text-xs text-foreground/40">Загрузите HTML-файл, который будет отображаться на странице /aggregator</p>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-5 py-6 transition hover:border-orange-400 hover:bg-orange-50">
            <Icon name="Upload" size={20} className="shrink-0 text-gray-400" />
            <div className="min-w-0">
              <p className="font-sans text-sm font-medium text-gray-600">
                {aggrHtmlUploading ? "Загрузка…" : "Выбрать HTML-файл"}
              </p>
              <p className="font-mono text-xs text-gray-400">Только .html</p>
            </div>
            <input
              ref={aggrFileRef}
              type="file"
              accept=".html,text/html"
              onChange={handleAggrHtmlUpload}
              disabled={aggrHtmlUploading}
              className="hidden"
            />
          </label>
          {aggrHtmlMsg && (
            <p className={`mt-3 font-mono text-sm ${aggrHtmlMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
              {aggrHtmlMsg}
            </p>
          )}
        </div>

        {/* Список проектов */}
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-sans text-base font-medium">Проекты ({projects.length})</h2>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center font-mono text-sm text-foreground/40">Загружаю...</div>
          ) : projects.length === 0 ? (
            <div className="px-6 py-8 text-center font-mono text-sm text-foreground/40">Нет проектов</div>
          ) : (
            <div className="divide-y">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                  {p.images[0] && (
                    <img src={p.images[0]} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-sm font-medium text-foreground truncate">{p.title}</p>
                    <p className="font-mono text-xs text-foreground/50">{p.stage} · {p.images.length} фото</p>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="shrink-0 rounded-md p-1.5 text-foreground/30 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}