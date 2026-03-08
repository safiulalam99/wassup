"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export function DisconnectButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect WhatsApp? You'll need to scan the QR code again to reconnect.")) {
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/whatsapp/disconnect", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to disconnect")
      }

      // Refresh the page to update the status
      router.refresh()
    } catch (err) {
      console.error("Disconnect error:", err)
      setError(err instanceof Error ? err.message : "Failed to disconnect")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleDisconnect}
        disabled={loading}
        className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Disconnecting..." : "Disconnect WhatsApp"}
      </button>
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  )
}
