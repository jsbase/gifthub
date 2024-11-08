'use client'

import { Button } from "@/components/ui/button"
import { showInstallPrompt } from "@/app/sw"

export function InstallButton() {
  return (
    <Button
      onClick={showInstallPrompt}
      variant="outline"
    >
      Install App
    </Button>
  )
}
