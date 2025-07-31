"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

type Language = "en" | "vi"

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const translations = {
  en: {
    // Common
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.viewAll": "View All",
    "system.name": "Support System",

    // Admin Dashboard
    "admin.dashboard.title": "Admin Dashboard",
    "admin.dashboard.description": "Overview of system performance and statistics",
    "admin.dashboard.totalTickets": "Total Tickets",
    "admin.dashboard.processingTickets": "Processing Tickets",
    "admin.dashboard.avgProcessingTime": "Avg Processing Time",
    "admin.dashboard.resolutionRate": "Resolution Rate",
    "admin.dashboard.allTime": "All time",
    "admin.dashboard.currentlyProcessing": "Currently processing",
    "admin.dashboard.averageTime": "Average time",
    "admin.dashboard.thisMonth": "This month",
    "admin.dashboard.statusDistribution": "Status Distribution",
    "admin.dashboard.ticketStatusBreakdown": "Breakdown of tickets by status",
    "admin.dashboard.topStaff": "Top Staff",
    "admin.dashboard.bestPerformers": "Best performing staff this month",
    "admin.dashboard.tickets": "tickets",
    "admin.dashboard.avg": "avg",
    "admin.dashboard.monthlyStats": "Monthly Statistics",
    "admin.dashboard.currentMonthPerformance": "Current month performance overview",
    "admin.dashboard.newTickets": "New Tickets",
    "admin.dashboard.resolvedTickets": "Resolved Tickets",
    "admin.dashboard.pendingTickets": "Pending Tickets",

    // Error
    "error.title": "Error",
    "error.failedToLoad": "Failed to load data",
    "error.noData": "No data available",
  },
  vi: {
    // Common
    "common.loading": "Đang tải...",
    "common.error": "Lỗi",
    "common.success": "Thành công",
    "common.cancel": "Hủy",
    "common.save": "Lưu",
    "common.edit": "Sửa",
    "common.delete": "Xóa",
    "common.viewAll": "Xem tất cả",
    "system.name": "Hệ Thống Hỗ Trợ",

    // Admin Dashboard
    "admin.dashboard.title": "Bảng Điều Khiển Admin",
    "admin.dashboard.description": "Tổng quan hiệu suất và thống kê hệ thống",
    "admin.dashboard.totalTickets": "Tổng Số Ticket",
    "admin.dashboard.processingTickets": "Ticket Đang Xử Lý",
    "admin.dashboard.avgProcessingTime": "Thời Gian Xử Lý TB",
    "admin.dashboard.resolutionRate": "Tỷ Lệ Giải Quyết",
    "admin.dashboard.allTime": "Tất cả thời gian",
    "admin.dashboard.currentlyProcessing": "Đang xử lý",
    "admin.dashboard.averageTime": "Thời gian trung bình",
    "admin.dashboard.thisMonth": "Tháng này",
    "admin.dashboard.statusDistribution": "Phân Bố Trạng Thái",
    "admin.dashboard.ticketStatusBreakdown": "Phân tích ticket theo trạng thái",
    "admin.dashboard.topStaff": "Nhân Viên Xuất Sắc",
    "admin.dashboard.bestPerformers": "Nhân viên hiệu suất cao nhất tháng này",
    "admin.dashboard.tickets": "ticket",
    "admin.dashboard.avg": "tb",
    "admin.dashboard.monthlyStats": "Thống Kê Tháng",
    "admin.dashboard.currentMonthPerformance": "Tổng quan hiệu suất tháng hiện tại",
    "admin.dashboard.newTickets": "Ticket Mới",
    "admin.dashboard.resolvedTickets": "Ticket Đã Giải Quyết",
    "admin.dashboard.pendingTickets": "Ticket Chờ Xử Lý",

    // Error
    "error.title": "Lỗi",
    "error.failedToLoad": "Không thể tải dữ liệu",
    "error.noData": "Không có dữ liệu",
  },
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "vi")) {
      setLanguageState(savedLanguage)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("language", lang)
  }

  const t = (key: string): string => {
    return (translations[language] as Record<string, string>)[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
} 