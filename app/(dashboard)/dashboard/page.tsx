import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import prisma from "@/lib/prisma"
import { ConnectWhatsApp } from "@/components/connect-whatsapp"

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-white/8 text-white/50",
  RUNNING:   "bg-[#00ff88]/15 text-[#00ff88]",
  PAUSED:    "bg-yellow-500/15 text-yellow-400",
  COMPLETED: "bg-blue-400/15 text-blue-400",
  FAILED:    "bg-red-500/15 text-red-400",
  QUEUED:    "bg-purple-400/15 text-purple-400",
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const userId = session.user.id

  const [contactCount, campaignCount, messagesSent, instance, recentCampaigns] = await Promise.all([
    prisma.contact.count({ where: { userId } }),
    prisma.campaign.count({ where: { userId } }),
    prisma.messageLog.count({ where: { campaign: { userId }, status: "SENT" } }),
    prisma.instance.findUnique({ where: { userId } }),
    prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { logs: true } } },
    }),
  ])

  const isConnected = instance?.status === "CONNECTED"
  const firstName = session.user.name?.split(" ")[0] ?? session.user.email.split("@")[0]

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Hey, {firstName} 👋
        </h1>
        <p className="text-white/40 text-sm mt-0.5">{session.user.email}</p>
      </div>

      {/* ── WhatsApp connection ────────────────────────────────────────── */}
      <div className="mb-6">
        <ConnectWhatsApp
          initialStatus={isConnected ? "CONNECTED" : "DISCONNECTED"}
          initialPhone={instance?.phone}
          initialProfileName={instance?.profileName}
          initialProfilePicture={instance?.profilePictureUrl}
        />
      </div>

      {/* ── Stats grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-[#111118] border border-white/8 rounded-2xl p-4 sm:p-5">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wide mb-2">Contacts</p>
          <p className="text-2xl sm:text-3xl font-bold text-white">{contactCount.toLocaleString()}</p>
          <Link href="/dashboard/contacts" className="text-[#00ff88] text-xs mt-1 inline-block hover:underline">
            View all →
          </Link>
        </div>
        <div className="bg-[#111118] border border-white/8 rounded-2xl p-4 sm:p-5">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wide mb-2">Campaigns</p>
          <p className="text-2xl sm:text-3xl font-bold text-white">{campaignCount.toLocaleString()}</p>
          <Link href="/dashboard/campaigns" className="text-[#00ff88] text-xs mt-1 inline-block hover:underline">
            View all →
          </Link>
        </div>
        <div className="bg-[#111118] border border-white/8 rounded-2xl p-4 sm:p-5">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wide mb-2">Sent</p>
          <p className="text-2xl sm:text-3xl font-bold text-white">{messagesSent.toLocaleString()}</p>
          <p className="text-white/30 text-xs mt-1">messages</p>
        </div>
      </div>

      {/* ── Recent Campaigns ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-base">Recent Campaigns</h2>
          <Link
            href="/dashboard/campaigns/new"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#00ff88] text-[#0a0a0f] hover:bg-[#00e87a] transition-colors shadow-sm shadow-[#00ff88]/20"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New
          </Link>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-8 sm:p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </div>
            <p className="text-white/60 font-medium mb-1">No campaigns yet</p>
            <p className="text-white/30 text-sm mb-4">Create your first campaign to start sending messages.</p>
            <Link
              href="/dashboard/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00ff88] text-[#0a0a0f] font-semibold text-sm hover:bg-[#00e87a] transition-colors"
            >
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentCampaigns.map((c: any) => (
              <Link
                key={c.id}
                href={`/dashboard/campaigns/${c.id}`}
                className="flex items-center gap-4 bg-[#111118] border border-white/8 rounded-2xl px-4 py-3.5 hover:border-white/16 hover:bg-white/[0.03] transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate group-hover:text-white/90">{c.name}</p>
                  <p className="text-white/40 text-xs mt-0.5 truncate">{c.messageText}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] ?? "bg-white/8 text-white/50"}`}>
                    {c.status}
                  </span>
                  <span className="text-white/30 text-xs">{c._count.logs} msgs</span>
                  <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            ))}
            {campaignCount > 5 && (
              <Link
                href="/dashboard/campaigns"
                className="block text-center py-3 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                View all {campaignCount} campaigns →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
