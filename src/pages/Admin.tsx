import { useState } from "react"
import AdminLogin from "@/components/admin/AdminLogin"
import AdminProjectForm from "@/components/admin/AdminProjectForm"
import AdminCalcUsers from "@/components/admin/AdminCalcUsers"
import AdminAggregator from "@/components/admin/AdminAggregator"

const API_URL = "https://functions.poehali.dev/2bd7a9a0-3822-4e18-bdd8-38b4a107a4ab"
const CALC_USERS_URL = "https://functions.poehali.dev/0a6ed799-bdd1-4e64-b0fc-a659b48ca233"

type Stage = "В производстве" | "Готово" | "Смонтировано"

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
    const res = await fetch(`${CALC_USERS_URL}?action=users`, { headers: { "X-Auth-Token": t } })
    if (res.ok) {
      const data = await res.json()
      setCalcUsers(data.users || [])
    }
    setCalcUsersLoading(false)
  }

  const handleLogin = async () => {
    setAuthError(false)
    const res = await fetch(API_URL, { headers: { "X-Admin-Token": token } })
    if (res.ok) { setAuthed(true); loadProjects(token); loadCalcUsers(token) }
    else setAuthError(true)
  }

  if (!authed) {
    return (
      <AdminLogin
        token={token}
        setToken={setToken}
        authError={authError}
        handleLogin={handleLogin}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-sans text-2xl font-medium text-foreground">Управление галереей</h1>
          <a href="/" className="font-mono text-sm text-foreground/50 hover:text-orange-500">← На сайт</a>
        </div>

        <AdminCalcUsers
          token={token}
          calcUsers={calcUsers}
          calcUsersLoading={calcUsersLoading}
          loadCalcUsers={() => loadCalcUsers()}
        />

        <AdminAggregator />

        <AdminProjectForm
          token={token}
          projects={projects}
          loading={loading}
          loadProjects={() => loadProjects()}
        />
      </div>
    </div>
  )
}
