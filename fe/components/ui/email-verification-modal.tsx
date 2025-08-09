"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/components/providers/toast-provider"
import { Loader2, Mail, RefreshCw } from "lucide-react"

interface EmailVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  email: string
  onVerificationSuccess: () => void
}

export function EmailVerificationModal({
  isOpen,
  onClose,
  email,
  onVerificationSuccess,
}: EmailVerificationModalProps) {
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const { t } = useLanguage()
  const { addToast } = useToast()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: t("emailVerification.error"),
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          token: verificationCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || t("emailVerification.error"))
      }

      addToast({
        type: "success",
        title: t("common.success"),
        message: t("emailVerification.success"),
      })

      onVerificationSuccess()
      onClose()
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || t("emailVerification.error"),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setResendLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/resend-verification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || t("emailVerification.resendError"))
      }

      addToast({
        type: "success",
        title: t("common.success"),
        message: t("emailVerification.resendSuccess"),
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || t("emailVerification.resendError"),
      })
    } finally {
      setResendLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold">{t("emailVerification.title")}</CardTitle>
          <CardDescription>
            {t("emailVerification.description")} <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="verificationCode" className="text-sm font-medium">
              {t("auth.enterCode")}
            </label>
            <Input
              id="verificationCode"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder={t("emailVerification.codePlaceholder")}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleVerify}
              className="w-full"
              disabled={loading || !verificationCode.trim()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? t("emailVerification.loading") : t("emailVerification.verify")}
            </Button>

            <Button
              variant="outline"
              onClick={handleResendCode}
              className="w-full"
              disabled={resendLoading}
            >
              {resendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {!resendLoading && <RefreshCw className="mr-2 h-4 w-4" />}
              {resendLoading ? t("emailVerification.resending") : t("emailVerification.resend")}
            </Button>

            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full"
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>{t("emailVerification.checkSpam")}</p>
            <p>{t("emailVerification.checkEmail")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 