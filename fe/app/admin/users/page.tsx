"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/components/providers/language-provider"
import { useToast } from "@/components/providers/toast-provider"
import { apiClient } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { Plus, Search, Edit, Trash2, Users, X } from "lucide-react"

interface User {
  id: number
  name: string
  email: string
  phone: string
  role: string
  is_verified: boolean
  created_at: string
  updated_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState<{ open: boolean; user: User | null }>({ open: false, user: null })
  const [roleDialog, setRoleDialog] = useState<{ open: boolean; user: User | null }>({ open: false, user: null })
  const [selectedRole, setSelectedRole] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: ""
  })

  const { t } = useLanguage()
  const { addToast } = useToast()

  // Debounce search term
  const debouncedSearchTerm = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout
      return (value: string) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          setSearchTerm(value)
        }, 500)
      }
    })(),
    []
  )

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchTerm, roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getUsers({
        keyword: searchTerm,
        role: roleFilter === "all" ? "" : roleFilter,
        page: currentPage,
        limit: 10
      }) as any

      setUsers(response.users || [])
      setTotalPages(response.pagination?.pages || 1)
      setTotalUsers(response.pagination?.total || 0)
    } catch (error: any) {
      console.error("Failed to fetch users:", error)
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to load users",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: "Please fill in all required fields",
      })
      return
    }

    setSubmitting(true)
    try {
      await apiClient.createUser(formData)
      setCreateDialog(false)
      setFormData({ name: "", email: "", phone: "", password: "", role: "" })
      fetchUsers()
      addToast({
        type: "success",
        title: t("common.success"),
        message: "User created successfully",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to create user",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editDialog.user) return

    setSubmitting(true)
    try {
      await apiClient.updateUser(editDialog.user.id.toString(), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role
      })
      setEditDialog({ open: false, user: null })
      setFormData({ name: "", email: "", phone: "", password: "", role: "" })
      fetchUsers()
      addToast({
        type: "success",
        title: t("common.success"),
        message: "User updated successfully",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to update user",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleChangeRole = async () => {
    if (!roleDialog.user || !selectedRole) return

    setSubmitting(true)
    try {
      await apiClient.changeUserRole(roleDialog.user.id.toString(), selectedRole)
      setRoleDialog({ open: false, user: null })
      setSelectedRole("")
      fetchUsers()
      addToast({
        type: "success",
        title: t("common.success"),
        message: "User role changed successfully",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to change user role",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    try {
      await apiClient.deleteUser(userId.toString())
      fetchUsers()
      addToast({
        type: "success",
        title: t("common.success"),
        message: "User deleted successfully",
      })
    } catch (error: any) {
      addToast({
        type: "error",
        title: t("common.error"),
        message: error.message || "Failed to delete user",
      })
    }
  }

  const openEditDialog = (user: User) => {
    setEditDialog({ open: true, user })
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: "",
      role: user.role
    })
  }

  const openRoleDialog = (user: User) => {
    setRoleDialog({ open: true, user })
    setSelectedRole(user.role)
  }

  const handleFilterChange = () => {
    setCurrentPage(1)
    fetchUsers()
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSearchInput("")
    setRoleFilter("all")
    setCurrentPage(1)
    handleFilterChange()
  }

  if (loading) {
    return (
      <DashboardLayout requiredRole="admin">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
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
    <DashboardLayout requiredRole="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{t("admin.users.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.users.description")}</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t("common.search")}
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value)
                    debouncedSearchTerm(e.target.value)
                  }}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="whitespace-nowrap"
              >
                {t("common.clearFilters")}
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Label>{t("admin.users.role")}:</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t("admin.users.selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.users.allRoles")}</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("admin.users.title")} ({users.length})</CardTitle>
                <CardDescription>{t("admin.users.description")}</CardDescription>
              </div>
              <Button onClick={() => setCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("admin.users.addUser")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-medium">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.phone}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'staff' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                        {user.is_verified && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {formatDate(user.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRoleDialog(user)}
                    >
                      {t("admin.users.changeRole")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  {t("common.showing")} {users.length} {t("admin.users.users")} ({t("common.total")}: {totalUsers}, {t("common.page")}: {currentPage}/{totalPages})
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    {t("common.previous")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t("common.next")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create User Dialog */}
        <Dialog open={createDialog} onOpenChange={setCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.users.createUser")}</DialogTitle>
              <DialogDescription>
                {t("admin.users.createUserDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t("admin.users.name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">{t("admin.users.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">{t("admin.users.phone")}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="password">{t("admin.users.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role">{t("admin.users.role")}</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.users.selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleCreateUser} disabled={submitting}>
                {submitting ? t("common.creating") : t("admin.users.createUser")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, user: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.users.editUser")}</DialogTitle>
              <DialogDescription>
                {t("admin.users.editUserDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">{t("admin.users.name")}</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">{t("admin.users.email")}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">{t("admin.users.phone")}</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">{t("admin.users.role")}</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.users.selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog({ open: false, user: null })}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleUpdateUser} disabled={submitting}>
                {submitting ? t("common.updating") : t("common.update")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Role Dialog */}
        <Dialog open={roleDialog.open} onOpenChange={(open) => setRoleDialog({ open, user: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.users.changeRole")}</DialogTitle>
              <DialogDescription>
                {t("admin.users.changeRoleDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="role-select">{t("admin.users.role")}</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("admin.users.selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialog({ open: false, user: null })}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleChangeRole} disabled={submitting}>
                {submitting ? t("common.updating") : t("common.update")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
} 