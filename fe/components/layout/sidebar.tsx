"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"
import {
  Home,
  Ticket,
  User,
  BookOpen,
  Bell,
  Settings,
  Users,
  Tag,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const pathname = usePathname()

  const userMenuItems = [
    {
      title: t("nav.dashboard"),
      href: "/user/dashboard",
      icon: Home,
    },
    {
      title: t("nav.tickets"),
      href: "/user/tickets",
      icon: Ticket,
    },
    {
      title: t("nav.profile"),
      href: "/user/profile",
      icon: User,
    },
    {
      title: t("nav.knowledgeBase"),
      href: "/user/knowledge-base",
      icon: BookOpen,
    },
    {
      title: t("nav.notifications"),
      href: "/user/notifications",
      icon: Bell,
    },
  ]

  const adminMenuItems = [
    {
      title: t("nav.dashboard"),
      href: "/admin/dashboard",
      icon: Home,
    },
    {
      title: t("nav.tickets"),
      href: "/admin/tickets",
      icon: Ticket,
    },
    {
      title: t("nav.users"),
      href: "/admin/users",
      icon: Users,
    },
    {
      title: t("nav.knowledgeBase"),
      href: "/admin/knowledge-base",
      icon: BookOpen,
    },
    {
      title: t("nav.ticketAttributes"),
      href: "/admin/ticket-attributes",
      icon: Tag,
    },
    {
      title: t("nav.settings"),
      href: "/admin/settings",
      icon: Settings,
    },
  ]

  const menuItems = user?.role === "admin" ? adminMenuItems : userMenuItems

  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center flex-1 h-16">
          <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
          </div>
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground">
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <item.icon size={20} />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.fullName}</p>
            <p className="text-xs text-sidebar-foreground/70 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors w-full text-left",
            "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
          title={collapsed ? t("auth.logout") : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span>{t("auth.logout")}</span>}
        </button>
      </div>
    </div>
  )
}
