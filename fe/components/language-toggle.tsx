"use client"

import { Languages } from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { Button } from "@/components/ui/button"

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setLanguage(language === "en" ? "vi" : "en")}
      title={language === "en" ? "Switch to Vietnamese" : "Chuyển sang tiếng Anh"}
    >
      <Languages className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Toggle language</span>
    </Button>
  )
}
