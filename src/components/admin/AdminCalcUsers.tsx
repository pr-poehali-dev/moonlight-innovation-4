import { useState } from "react"
import { Input } from "@/components/ui/input"

const CALC_USERS_URL = "https://functions.poehali.dev/0a6ed799-bdd1-4e64-b0fc-a659b48ca233"

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

interface Props {
  token: string
  calcUsers: CalcUserRow[]
  calcUsersLoading: boolean
  loadCalcUsers: () => void
}

export default function AdminCalcUsers({ token, calcUsers, calcUsersLoading, loadCalcUsers }: Props) {
  const [calcUsersSearch, setCalcUsersSearch] = useState("")
  const [calcUsersExpanded, setCalcUsersExpanded] = useState(false)
  const [selectedCalcUser, setSelectedCalcUser] = useState<number | null>(null)
  const [selectedCalcSettings, setSelectedCalcSettings] = useState<Record<string, unknown> | null | undefined>(undefined)

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

  return (
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
            onClick={loadCalcUsers}
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
                            <p className="font-mono text-xs text-foreground/50">₽/час</p>
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
  )
}
