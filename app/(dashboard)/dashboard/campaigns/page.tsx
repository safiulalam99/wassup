"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Campaign {
  id: string
  name: string
  messageText: string
  status: "DRAFT" | "QUEUED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED"
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  _count: {
    logs: number
  }
}

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns")
      const data = await res.json()
      if (res.ok) {
        setCampaigns(data.campaigns)
      }
    } catch (err) {
      console.error("Failed to fetch campaigns:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleStart = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}/start`, {
        method: "POST",
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message || "Campaign started successfully")
        fetchCampaigns()
      } else {
        alert(data.error || "Failed to start campaign")
      }
    } catch (err) {
      console.error("Failed to start campaign:", err)
      alert("An error occurred while starting the campaign")
    }
  }

  const handlePause = async (id: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAUSED" }),
      })

      if (res.ok) {
        fetchCampaigns()
      }
    } catch (err) {
      console.error("Failed to pause campaign:", err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return

    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setCampaigns(campaigns.filter((c) => c.id !== id))
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete campaign")
      }
    } catch (err) {
      console.error("Failed to delete campaign:", err)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-3 items-center text-white/40 text-sm">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          Loading campaigns…
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Campaigns</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {campaigns.length} total
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/campaigns/new")}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-[#00ff88] text-[#0a0a0f] font-semibold text-sm hover:bg-[#00e87a] transition-colors shadow-sm shadow-[#00ff88]/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="hidden sm:inline">New Campaign</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Campaigns List */}
        <div className="space-y-3">
          {campaigns.length === 0 ? (
            <div className="bg-[#111118] border border-white/8 rounded-2xl p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">
                No campaigns yet
              </h3>
              <p className="text-white/40 text-sm mb-5">
                Create your first campaign to start sending bulk messages
              </p>
              <button
                onClick={() => router.push("/dashboard/campaigns/new")}
                className="px-4 py-2 rounded-xl bg-[#00ff88] text-[#0a0a0f] font-semibold text-sm hover:bg-[#00e87a] transition-colors"
              >
                Create Campaign
              </button>
            </div>
          ) : (
            campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-[#111118] border border-white/8 rounded-2xl p-4 sm:p-5 hover:border-white/14 transition-colors"
              >
                <div className="flex flex-col gap-3">
                  {/* Top row: name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white truncate">
                          {campaign.name}
                        </h3>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                            campaign.status === "RUNNING" ? "bg-[#00ff88]/15 text-[#00ff88]" :
                            campaign.status === "PAUSED" ? "bg-yellow-500/15 text-yellow-400" :
                            campaign.status === "COMPLETED" ? "bg-blue-400/15 text-blue-400" :
                            campaign.status === "FAILED" ? "bg-red-500/15 text-red-400" :
                            "bg-white/8 text-white/50"
                          }`}
                        >
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-white/50 text-xs mt-1 line-clamp-1">
                        {campaign.messageText}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/campaigns/${campaign.id}`}
                      className="shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </div>

                  {/* Meta + actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-3 text-xs text-white/40">
                      <span>{campaign._count.logs} recipients</span>
                      <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                      {campaign.completedAt && (
                        <span>Completed {new Date(campaign.completedAt).toLocaleDateString()}</span>
                      )}
                    </div>

                    <div className="flex gap-1.5">
                      {campaign.status === "DRAFT" && (
                        <>
                          <button
                            onClick={() => handleStart(campaign.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#00ff88] hover:bg-[#00e87a] text-[#0a0a0f] rounded-lg transition-colors"
                          >
                            Start
                          </button>
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="px-3 py-1.5 text-xs text-white/50 hover:text-red-400 bg-white/6 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {campaign.status === "RUNNING" && (
                        <button
                          onClick={() => handlePause(campaign.id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 rounded-lg transition-colors"
                        >
                          Pause
                        </button>
                      )}
                      {campaign.status === "PAUSED" && (
                        <>
                          <button
                            onClick={() => handleStart(campaign.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#00ff88] hover:bg-[#00e87a] text-[#0a0a0f] rounded-lg transition-colors"
                          >
                            Resume
                          </button>
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="px-3 py-1.5 text-xs text-white/50 hover:text-red-400 bg-white/6 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {(campaign.status === "COMPLETED" || campaign.status === "FAILED") && (
                        <button
                          onClick={() => handleDelete(campaign.id)}
                          className="px-3 py-1.5 text-xs text-white/50 hover:text-red-400 bg-white/6 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
    </div>
  )
}
