import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) {
    return "N/A"
  }
  
  try {
    const dateObj = new Date(date)
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return "Invalid Date"
    }
    
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    }).format(dateObj)
  } catch (error) {
    return "Invalid Date"
  }
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "new":
    case "mới":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
    case "in_progress":
    case "đang xử lý":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
    case "pending":
    case "chờ xử lý":
    case "chờ phản hồi":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
    case "resolved":
    case "đã giải quyết":
    case "đã xử lý":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
    case "closed":
    case "đã đóng":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
  }
}

export function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "low":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
    case "high":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
    case "urgent":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100"
  }
}
