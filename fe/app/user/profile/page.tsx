"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/hooks/use-toast"
import { apiClient } from "@/lib/api"
import { Loader2, User, Lock, Shield, Eye, EyeOff, QrCode } from "lucide-react"

interface UserProfile {
  id: number
  name: string
  phone: string
  email: string
  role: string
  is_verified: boolean
  two_factor_enabled: boolean
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [show2FADialog, setShow2FADialog] = useState(false)
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [showVerifyEmailDialog, setShowVerifyEmailDialog] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  
  // Form states
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  
  // Password change states
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // 2FA states
  const [twoFACode, setTwoFACode] = useState("")
  const [qrCode, setQrCode] = useState("")
  const [secret, setSecret] = useState("")
  const [showSecret, setShowSecret] = useState(false)

  const { t } = useLanguage()
  const { toast } = useToast()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getProfile() as any
      const userData = response.user
      setProfile(userData)
      setName(userData.name || "")
      setPhone(userData.phone || "")
      setEmail(userData.email || "")
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || "Failed to load profile",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    if (!name.trim() || !email.trim()) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("profile.fillRequiredFields"),
      })
      return
    }

    try {
      setSaving(true)
      await apiClient.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      })

      toast({
        title: t("common.success"),
        description: t("profile.updateSuccess"),
      })

      // Refresh profile data
      await fetchProfile()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("profile.updateError"),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("profile.fillAllPasswordFields"),
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("profile.passwordsDoNotMatch"),
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("profile.passwordTooShort"),
      })
      return
    }

    try {
      setSaving(true)
      await apiClient.changePassword(oldPassword, newPassword)

      toast({
        title: t("common.success"),
        description: t("profile.passwordChangeSuccess"),
      })

      // Reset form
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowPasswordDialog(false)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("profile.passwordChangeError"),
      })
    } finally {
      setSaving(false)
    }
  }

    const handleVerifyEmail = async () => {
    try {
      setVerifying(true)
      await apiClient.verifyEmail(profile?.email || "", verificationCode)
      
      toast({
        title: t("common.success"),
        description: t("auth.emailVerifiedSuccess"),
      })
      
      setShowVerifyEmailDialog(false)
      setVerificationCode("")
      
      // Refresh profile data
      await fetchProfile()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("auth.verificationError"),
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      setResendLoading(true)
      await apiClient.resendVerificationEmail(profile?.email || "")
      
      toast({
        title: t("common.success"),
        description: t("auth.verificationEmailSent"),
      })
      
      // Open verification dialog after sending
      setShowVerifyEmailDialog(true)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("auth.resendError"),
      })
    } finally {
      setResendLoading(false)
    }
  }

  const handleSetup2FA = async () => {
    try {
      setSetupLoading(true)
      const response = await apiClient.setup2FA() as any
      if (response.success) {
        setQrCode(response.qr)
        setSecret(response.secret)
        setShowQRDialog(true)
      } else {
        throw new Error(response.message || "Failed to setup 2FA")
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("profile.setup2FAError"),
      })
    } finally {
      setSetupLoading(false)
    }
  }

  const handleEnable2FA = async () => {
    if (!twoFACode.trim()) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("profile.enter2FACode"),
      })
      return
    }

    try {
      setSaving(true)
      const response = await apiClient.enable2FA(twoFACode.trim()) as any
      
      if (response.success) {
        toast({
          title: t("common.success"),
          description: t("profile.enable2FASuccess"),
        })
      } else {
        throw new Error(response.message || "Failed to enable 2FA")
      }

      setTwoFACode("")
      setShow2FADialog(false)
      setShowQRDialog(false)
      
      // Refresh profile
      await fetchProfile()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("profile.enable2FAError"),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!twoFACode.trim()) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("profile.enter2FACode"),
      })
      return
    }

    try {
      setSaving(true)
      const response = await apiClient.disable2FA(twoFACode.trim()) as any
      
      if (response.success) {
        toast({
          title: t("common.success"),
          description: t("profile.disable2FASuccess"),
        })
      } else {
        throw new Error(response.message || "Failed to disable 2FA")
      }

      setTwoFACode("")
      setShow2FADialog(false)
      
      // Refresh profile
      await fetchProfile()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("profile.disable2FAError"),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout requiredRole="user">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout requiredRole="user">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{t("profile.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("profile.description")}</p>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{t("profile.personalInfo")}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>{t("profile.security")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.personalInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t("profile.name")} *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("profile.namePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("profile.phone")}</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("profile.phonePlaceholder")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("profile.email")} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("profile.emailPlaceholder")}
                    disabled={true} // Email cannot be changed
                  />
                </div>
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-muted-foreground">
                      {profile?.is_verified ? (
                        <span className="text-green-600">{t("profile.emailVerified")}</span>
                      ) : (
                        <span className="text-red-600">{t("profile.emailNotVerified")}</span>
                      )}
                    </div>
                    {!profile?.is_verified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={resendLoading}
                      >
                        {resendLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("profile.sending")}
                          </>
                        ) : (
                          t("profile.verifyNow")
                        )}
                      </Button>
                    )}
                  </div>
                  <Button onClick={handleUpdateProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("profile.saving")}
                      </>
                    ) : (
                      t("profile.saveChanges")
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Password Change */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>{t("profile.changePassword")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowPasswordDialog(true)}>
                  {t("profile.changePassword")}
                </Button>
              </CardContent>
            </Card>

            {/* 2FA */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>{t("profile.twoFactorAuth")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t("profile.twoFactorAuth")}</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.two_factor_enabled 
                        ? t("profile.twoFactorEnabled") 
                        : t("profile.twoFactorDisabled")
                      }
                    </p>
                  </div>
                  <div className="space-x-2">
                    {!profile?.two_factor_enabled ? (
                      <Button onClick={handleSetup2FA} disabled={setupLoading}>
                        {setupLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("profile.settingUp")}
                          </>
                        ) : (
                          t("profile.setup2FA")
                        )}
                      </Button>
                    ) : (
                      <Button 
                        variant="destructive" 
                        onClick={() => setShow2FADialog(true)}
                        disabled={saving}
                      >
                        {t("profile.disable2FA")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Password Change Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("profile.changePassword")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oldPassword">{t("profile.oldPassword")}</Label>
                <div className="relative">
                  <Input
                    id="oldPassword"
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder={t("profile.oldPasswordPlaceholder")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                  >
                    {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("profile.newPassword")}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("profile.newPasswordPlaceholder")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("profile.confirmPassword")}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("profile.confirmPasswordPlaceholder")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleChangePassword} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("profile.changing")}
                    </>
                  ) : (
                    t("profile.changePassword")
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 2FA Setup Dialog */}
        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("profile.setup2FA")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  {t("profile.scanQRCode")}
                </p>
                {qrCode && (
                  <div className="flex justify-center">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">{t("profile.secretKey")}</p>
                  <div className="flex items-center space-x-2">
                    <Input
                      value={showSecret ? secret : "••••••••••••••••"}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("profile.secretKeyDescription")}
                </p>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowQRDialog(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={() => setShow2FADialog(true)}>
                  {t("profile.nextStep")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 2FA Verification Dialog */}
        <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {profile?.two_factor_enabled 
                  ? t("profile.disable2FA") 
                  : t("profile.enable2FA")
                }
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twoFACode">{t("profile.enter2FACode")}</Label>
                <Input
                  id="twoFACode"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShow2FADialog(false)}>
                  {t("common.cancel")}
                </Button>
                <Button 
                  onClick={profile?.two_factor_enabled ? handleDisable2FA : handleEnable2FA}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("profile.verifying")}
                    </>
                  ) : (
                    profile?.two_factor_enabled 
                      ? t("profile.disable2FA") 
                      : t("profile.enable2FA")
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Email Verification Dialog */}
        <Dialog open={showVerifyEmailDialog} onOpenChange={setShowVerifyEmailDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("profile.verifyEmail")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">{t("auth.enterCode")}</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowVerifyEmailDialog(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleVerifyEmail} disabled={verifying || !verificationCode.trim()}>
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("profile.verifying")}
                    </>
                  ) : (
                    t("profile.verifyNow")
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
} 