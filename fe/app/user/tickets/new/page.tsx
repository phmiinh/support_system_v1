"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CreateTicketModal } from "@/components/ui/create-ticket-modal"
import { Button } from "@/components/ui/button"
import { Plus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/components/providers/language-provider"

export default function NewTicketPage() {
  const [showModal, setShowModal] = useState(true)
  const router = useRouter()
  const { t } = useLanguage()

  const handleClose = () => {
    setShowModal(false)
    router.push("/user/tickets")
  }

  const handleSuccess = () => {
    // Modal will close and redirect automatically
  }

  return (
    <DashboardLayout requiredRole="user">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/user/tickets">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.back")}
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{t("tickets.createTitle")}</h1>
              <p className="text-muted-foreground mt-1">{t("tickets.createDescription")}</p>
            </div>
          </div>
        </div>

        {/* Placeholder content */}
        <div className="text-center py-8">
          <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t("tickets.loadingForm")}</p>
        </div>

        {/* Modal */}
        <CreateTicketModal
          isOpen={showModal}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      </div>
    </DashboardLayout>
  )
} 