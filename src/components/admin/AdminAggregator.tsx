import { useRef, useState } from "react"
import Icon from "@/components/ui/icon"

const AGGREGATOR_URL = "https://functions.poehali.dev/0c756925-ed78-4b75-93b0-093a9032f2b0"

export default function AdminAggregator() {
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

  return (
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
  )
}
