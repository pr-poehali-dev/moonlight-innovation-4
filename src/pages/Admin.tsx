import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Icon from "@/components/ui/icon"

const API_URL = "https://functions.poehali.dev/2bd7a9a0-3822-4e18-bdd8-38b4a107a4ab"
const VISITS_URL = "https://functions.poehali.dev/9fc752ab-8d3d-4236-bc17-543820608736"

type Stage = "В производстве" | "Готово" | "Смонтировано"
const STAGES: Stage[] = ["В производстве", "Готово", "Смонтировано"]

interface Project {
  id: number
  title: string
  description: string
  stage: Stage
  images: string[]
}

export default function Admin() {
  const [token, setToken] = useState("")
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)

  const [visits, setVisits] = useState<{ total: number; unique: number; today: number; week: number } | null>(null)

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

  const loadVisits = async (t = token) => {
    const res = await fetch(VISITS_URL, { headers: { "X-Admin-Token": t } })
    if (res.ok) {
      const data = await res.json()
      setVisits(data)
    }
  }

  const handleLogin = async () => {
    setAuthError(false)
    const res = await fetch(API_URL, { headers: { "X-Admin-Token": token } })
    if (res.ok) { setAuthed(true); loadProjects(token); loadVisits(token) }
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

        {/* Статистика посещений */}
        {visits && (
          <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-sans text-base font-medium text-foreground">Посещения</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Всего", value: visits.total },
                { label: "Уникальных", value: visits.unique },
                { label: "За сегодня", value: visits.today },
                { label: "За неделю", value: visits.week },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border bg-gray-50 px-4 py-3 text-center">
                  <p className="font-sans text-2xl font-semibold text-orange-500">{item.value}</p>
                  <p className="font-mono text-xs text-foreground/50">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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