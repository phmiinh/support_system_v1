"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/providers/auth-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/components/providers/toast-provider"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { LanguageToggle } from "@/components/common/language-toggle"
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)

  const { login, login2FA } = useAuth()
  const { t } = useLanguage()
  const { addToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (show2FA && userId) {
        // Handle 2FA login
        await login2FA(userId, twoFactorCode)
      addToast({
        type: "success",
        title: t("common.success"),
          message: t("auth.loginSuccess"),
      })
      } else {
        // Handle initial login
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Login failed")
        }

        if (data.require_2fa) {
          setUserId(data.user_id)
        setShow2FA(true)
        addToast({
          type: "info",
          title: t("auth.twoFactorAuth"),
          message: t("auth.enterCode"),
        })
          return
        }

        // Regular login success
        await login(email, password)
        addToast({
          type: "success",
          title: t("common.success"),
          message: t("auth.loginSuccess"),
        })
      }
    } catch (error: any) {
        addToast({
          type: "error",
          title: t("common.error"),
          message: error.message || "Login failed",
        })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="absolute top-4 right-4 flex items-center space-x-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">{t("auth.login")}</CardTitle>
          <CardDescription className="text-center">{t("auth.loginDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                {t("auth.email")}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder={t("auth.emailPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                {t("auth.password")}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder={t("auth.passwordPlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {show2FA && (
              <div className="space-y-2">
                <label htmlFor="twoFactorCode" className="text-sm font-medium">
                  {t("auth.twoFactorAuth")}
                </label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  required
                  disabled={loading}
                  placeholder={t("auth.enterCode")}
                  maxLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShow2FA(false)
                    setUserId(null)
                    setTwoFactorCode("")
                  }}
                  className="w-full"
                >
                  {t("common.back")}
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="remember" className="text-sm">
                  {t("auth.rememberMe")}
                </label>
              </div>

              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("auth.signIn")}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("auth.dontHaveAccount")}{" "}
              <Link href="/register" className="text-primary hover:underline">
                {t("auth.signUp")}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
