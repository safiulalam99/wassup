"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface ConnectWhatsAppProps {
  initialStatus: "DISCONNECTED" | "CONNECTING" | "CONNECTED"
  initialPhone?: string | null
  initialProfileName?: string | null
  initialProfilePicture?: string | null
}

export function ConnectWhatsApp({ initialStatus, initialPhone, initialProfileName, initialProfilePicture }: ConnectWhatsAppProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<"idle" | "loading" | "qr" | "connected" | "error">(
    initialStatus === "CONNECTED" ? "connected" : "idle"
  )
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [phone, setPhone] = useState(initialPhone ?? null)
  const [profileName, setProfileName] = useState(initialProfileName ?? null)
  const [profilePicture, setProfilePicture] = useState(initialProfilePicture ?? null)
  const [errorMsg, setErrorMsg] = useState("")
  const [disconnecting, setDisconnecting] = useState(false)

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status")
      const data = await res.json()
      if (res.ok && data.status === "CONNECTED") {
        setPhone(data.phone ?? null)
        setProfileName(data.profileName ?? null)
        setProfilePicture(data.profilePictureUrl ?? null)
        setPhase("connected")
        setQrCode(null)
        router.refresh()
      }
    } catch (_) { /* silent */ }
  }, [router])

  // Poll while in QR phase
  useEffect(() => {
    if (phase !== "qr") return
    const id = setInterval(checkStatus, 3000)
    return () => clearInterval(id)
  }, [phase, checkStatus])

  const startConnect = async () => {
    setPhase("loading")
    setErrorMsg("")
    try {
      const instanceRes = await fetch("/api/whatsapp/instance", { method: "POST" })
      const instanceData = await instanceRes.json()
      if (!instanceRes.ok) throw new Error(instanceData.error || "Failed to create instance")

      if (instanceData.instance?.status === "CONNECTED") {
        setPhone(instanceData.instance.phone ?? null)
        setPhase("connected")
        router.refresh()
        return
      }

      await fetchQR()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong")
      setPhase("error")
    }
  }

  const fetchQR = async (retry = 0) => {
    try {
      const res = await fetch("/api/whatsapp/qr")
      const data = await res.json()
      
      // If already connected, just refresh status
      if (res.status === 409 && data.alreadyConnected) {
        await checkStatus()
        return
      }
      
      if (res.status === 503) {
        if (retry < 12) {
          setTimeout(() => fetchQR(retry + 1), 2000)
          return
        }
        throw new Error("QR code timed out. Please try again.")
      }
      if (!res.ok) throw new Error(data.error || "Failed to load QR code")
      setQrCode(data.qr)
      setPhase("qr")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load QR code")
      setPhase("error")
    }
  }

  const handleDisconnect = async () => {
    if (!confirm("Disconnect WhatsApp? You'll need to scan the QR code again to reconnect.")) return
    setDisconnecting(true)
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Failed to disconnect")
      }
      setPhase("idle")
      setQrCode(null)
      setPhone(null)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to disconnect")
    } finally {
      setDisconnecting(false)
    }
  }

  // ── Connected state ──────────────────────────────────────────────────────
  if (phase === "connected") {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-[#00ff88]/5 to-transparent border border-[#00ff88]/20 p-5">
        <div className="flex items-center gap-4">
          {/* Profile Picture with Glowing Dot */}
          <div className="relative shrink-0">
            {profilePicture ? (
              <Image
                src={profilePicture}
                alt={profileName || "Profile"}
                width={56}
                height={56}
                className="rounded-full"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-[#00ff88]/15 flex items-center justify-center">
                <svg className="w-7 h-7 text-[#00ff88]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            )}
            {/* Glowing Green Dot */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#00ff88] border-2 border-[#0a0a0f] shadow-lg shadow-[#00ff88]/50 animate-pulse" />
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-base truncate">
              {profileName || "WhatsApp Connected"}
            </p>
            {phone && (
              <p className="text-white/40 text-xs mt-0.5 truncate">{phone}</p>
            )}
          </div>

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {disconnecting ? "..." : "Disconnect"}
          </button>
        </div>
      </div>
    )
  }

  // ── QR code state ────────────────────────────────────────────────────────
  if (phase === "qr" && qrCode) {
    return (
      <div className="rounded-2xl bg-[#111118] border border-[#00ff88]/20 p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          {/* QR */}
          <div className="shrink-0 p-3 bg-white rounded-2xl shadow-xl mx-auto sm:mx-0">
            <Image src={qrCode} alt="WhatsApp QR" width={180} height={180} priority />
          </div>
          {/* Instructions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse block" />
              <p className="text-[#00ff88] text-sm font-semibold">Waiting for scan…</p>
            </div>
            <h3 className="text-white font-semibold mb-2">How to connect</h3>
            <ol className="space-y-1.5 text-sm text-white/60">
              <li className="flex gap-2"><span className="text-[#00ff88] shrink-0">1.</span>Open WhatsApp on your phone</li>
              <li className="flex gap-2"><span className="text-[#00ff88] shrink-0">2.</span>Tap ⋮ Menu → Linked Devices</li>
              <li className="flex gap-2"><span className="text-[#00ff88] shrink-0">3.</span>Tap "Link a Device"</li>
              <li className="flex gap-2"><span className="text-[#00ff88] shrink-0">4.</span>Point your phone at this QR code</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading spinner ──────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="rounded-2xl bg-[#111118] border border-white/8 p-6 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#00ff88]/30 border-t-[#00ff88] rounded-full animate-spin" />
        <p className="text-white/60 text-sm">Setting up WhatsApp connection…</p>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-5 flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center mt-0.5 shrink-0">
          <span className="text-red-400 text-xs font-bold">!</span>
        </div>
        <div className="flex-1">
          <p className="text-red-400 text-sm font-medium">{errorMsg}</p>
          <button onClick={startConnect} className="mt-2 text-xs text-white/50 hover:text-white underline underline-offset-2">
            Try again
          </button>
        </div>
      </div>
    )
  }

  // ── Idle / prompt to connect ─────────────────────────────────────────────
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#00ff88]/8 to-transparent border border-[#00ff88]/20 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 block" />
          <p className="text-white font-semibold text-sm">WhatsApp Not Connected</p>
        </div>
        <p className="text-white/50 text-sm">Connect your WhatsApp to start sending campaigns.</p>
      </div>
      <button
        onClick={startConnect}
        className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00ff88] text-[#0a0a0f] font-semibold text-sm hover:bg-[#00e87a] transition-colors shadow-lg shadow-[#00ff88]/15"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
        Connect WhatsApp
      </button>
    </div>
  )
}
