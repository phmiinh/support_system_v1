"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/components/providers/toast-provider"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { LanguageToggle } from "@/components/common/language-toggle"
import { apiClient } from "@/lib/api"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  const { t } = useLanguage()
  const { addToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")
    if (token) {
      verifyEmail(token)
    } else {
      setStatus("error")
      setMessage("Invalid verification token")
    }
  }, [searchParams])

  const verifyEmail = async (token: string) => {
    try {
      await apiClient.verifyEmail(token)
      setStatus("success")
      setMessage("Email verified successfully! You can now login to your account.")
      addToast({
        type: "success",
        title: t("common.success"),
        message: "Email verified successfully!",
      })
    } catch (error: any) {
      setStatus("error")
      setMessage(error.message || "Email verification failed")
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Email verification failed",
      })
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
          <CardTitle className="text-2xl font-bold text-center">{t("auth.verifyEmail")}</CardTitle>
          <CardDescription className="text-center">
            {status === "loading" ? "Verifying your email..." : "Email verification result"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            {status === "loading" && (
              <>
                <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Please wait while we verify your email...</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                    Verification Successful!
                  </h3>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
                <Link href="/login">
                  <Button className="w-full">Continue to Login</Button>
                </Link>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Verification Failed</h3>
                  <p className="text-sm text-muted-foreground">{message}</p>
                </div>
                <div className="space-y-2">
                  <Link href="/register">
                    <Button variant="outline" className="w-full bg-transparent">
                      Register Again
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full">
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
