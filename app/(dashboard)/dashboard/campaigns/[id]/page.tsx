"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface MessageLog {
  id: string
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED"
  error: string | null
  sentAt: string | null
  contact: {
    name: string
    phone: string
  }
}

interface Campaign {
  id: string
  name: string
  messageText: string
  status: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  throttleMin: number
  throttleMax: number
  dailyLimit: number
  logs: MessageLog[]
}

interface Stats {
  total: number
  sent: number
  failed: number
  pending: number
  skipped: number
}

export default function CampaignDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchCampaign()

      // Poll for updates every 5 seconds if campaign is running
      const interval = setInterval(() => {
        if (campaign?.status === "RUNNING") {
          fetchCampaign()
        }
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [id, campaign?.status])

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`)
      const data = await res.json()
      if (res.ok) {
        setCampaign(data.campaign)
        setStats(data.stats)
      }
    } catch (err) {
      console.error("Failed to fetch campaign:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!campaign || !stats) {
    return (
      <div className="p-8">
        <div className="text-white">Campaign not found</div>
      </div>
    )
  }

  const progress = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/campaigns"
            className="text-white/50 hover:text-white text-sm mb-4 inline-block"
          >
            ← Back to Campaigns
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            {campaign.name}
          </h1>
          <p className="text-white/50">Campaign Details</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-6">
            <div className="text-white/50 text-sm mb-1">Total</div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-6">
            <div className="text-white/50 text-sm mb-1">Sent</div>
            <div className="text-3xl font-bold text-[#00ff88]">
              {stats.sent}
            </div>
          </div>
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-6">
            <div className="text-white/50 text-sm mb-1">Pending</div>
            <div className="text-3xl font-bold text-yellow-400">
              {stats.pending}
            </div>
          </div>
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-6">
            <div className="text-white/50 text-sm mb-1">Failed</div>
            <div className="text-3xl font-bold text-red-400">
              {stats.failed}
            </div>
          </div>
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-6">
            <div className="text-white/50 text-sm mb-1">Skipped</div>
            <div className="text-3xl font-bold text-white/50">
              {stats.skipped}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-[#111118] border border-white/8 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-medium">Progress</h3>
            <span className="text-white/70">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-white/8 rounded-full h-3 overflow-hidden">
            <div
              className="bg-[#00ff88] h-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="bg-[#111118] border border-white/8 rounded-2xl p-6 mb-8">
          <h3 className="text-white font-medium mb-4">Campaign Information</h3>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-white/50 mb-1">Status</div>
              <div className="text-white">{campaign.status}</div>
            </div>
            <div>
              <div className="text-white/50 mb-1">Created</div>
              <div className="text-white">
                {new Date(campaign.createdAt).toLocaleString()}
              </div>
            </div>
            {campaign.startedAt && (
              <div>
                <div className="text-white/50 mb-1">Started</div>
                <div className="text-white">
                  {new Date(campaign.startedAt).toLocaleString()}
                </div>
              </div>
            )}
            {campaign.completedAt && (
              <div>
                <div className="text-white/50 mb-1">Completed</div>
                <div className="text-white">
                  {new Date(campaign.completedAt).toLocaleString()}
                </div>
              </div>
            )}
            <div>
              <div className="text-white/50 mb-1">Throttle</div>
              <div className="text-white">
                {campaign.throttleMin}-{campaign.throttleMax}s
              </div>
            </div>
            <div>
              <div className="text-white/50 mb-1">Daily Limit</div>
              <div className="text-white">{campaign.dailyLimit}</div>
            </div>
          </div>
          <div className="mt-6">
            <div className="text-white/50 mb-2 text-sm">Message</div>
            <div className="text-white bg-white/5 p-4 rounded-lg whitespace-pre-wrap">
              {campaign.messageText}
            </div>
          </div>
        </div>

        {/* Message Logs */}
        <div className="bg-[#111118] border border-white/8 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/8">
            <h3 className="text-white font-medium">Message Logs</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-white/5 sticky top-0">
                <tr>
                  <th className="text-left p-4 text-white/70 font-medium">
                    Contact
                  </th>
                  <th className="text-left p-4 text-white/70 font-medium">
                    Phone
                  </th>
                  <th className="text-left p-4 text-white/70 font-medium">
                    Status
                  </th>
                  <th className="text-left p-4 text-white/70 font-medium">
                    Sent At
                  </th>
                  <th className="text-left p-4 text-white/70 font-medium">
                    Error
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaign.logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-white/8 hover:bg-white/5"
                  >
                    <td className="p-4 text-white">{log.contact.name}</td>
                    <td className="p-4 text-white/70">{log.contact.phone}</td>
                    <td className="p-4">
                      <span
                        className={
                          log.status === "SENT"
                            ? "text-[#00ff88]"
                            : log.status === "FAILED"
                            ? "text-red-400"
                            : log.status === "SKIPPED"
                            ? "text-white/50"
                            : "text-yellow-400"
                        }
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-white/70">
                      {log.sentAt
                        ? new Date(log.sentAt).toLocaleString()
                        : "-"}
                    </td>
                    <td className="p-4 text-red-400 text-sm">
                      {log.error || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
