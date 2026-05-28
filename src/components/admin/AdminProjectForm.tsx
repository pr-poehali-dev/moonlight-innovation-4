import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Icon from "@/components/ui/icon"

const API_URL = "https://functions.poehali.dev/2bd7a9a0-3822-4e18-bdd8-38b4a107a4ab"

type Stage = "В производстве" | "Готово" | "Смонтировано"
const STAGES: Stage[] = ["В производстве", "Готово", "Смонтировано"]

interface Project {
  id: number
  title: string
  description: string
  stage: Stage
  images: string[]
}

interface Props {
  token: string
  projects: Project[]
  loading: boolean
  loadProjects: () => void
}

export default function AdminProjectForm({ token, projects, loading, loadProjects }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [stage, setStage] = useState<Stage>("В производстве")
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const headers = { "Content-Type": "application/json", "X-Admin-Token": token }

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(",")[1])
      }
      reader.readAsDataURL(file)
    })

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

  return (
    <>
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
    </>
  )
}
