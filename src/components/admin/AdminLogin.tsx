import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Props {
  token: string
  setToken: (v: string) => void
  authError: boolean
  handleLogin: () => void
}

export default function AdminLogin({ token, setToken, authError, handleLogin }: Props) {
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
