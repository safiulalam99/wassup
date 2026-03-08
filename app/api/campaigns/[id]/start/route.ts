import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { campaignQueue } from "@/lib/queue"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get campaign with logs
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
      include: {
        logs: {
          where: {
            status: "PENDING",
          },
          include: {
            contact: true,
          },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // Get user's WhatsApp instance
    const instance = await prisma.instance.findUnique({
      where: { userId: session.user.id },
    })

    if (!instance) {
      return NextResponse.json(
        { error: "No WhatsApp instance found" },
        { status: 404 }
      )
    }

    if (instance.status !== "CONNECTED") {
      return NextResponse.json(
        { error: "WhatsApp not connected" },
        { status: 400 }
      )
    }

    // Update campaign status to RUNNING
    await prisma.campaign.update({
      where: { id: id },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
      },
    })

    // Queue all pending messages with CUMULATIVE delays for human-like behavior
    // Each message is staggered sequentially so they never fire in bursts
    let cumulativeDelayMs = 0

    // Convert media Buffer to base64 if present
    const mediaData = campaign.mediaData ? Buffer.from(campaign.mediaData).toString('base64') : null

    for (const log of campaign.logs) {
      // Random delay between throttleMin and throttleMax seconds
      const thisDelaySeconds =
        campaign.throttleMin +
        Math.random() * (campaign.throttleMax - campaign.throttleMin)

      cumulativeDelayMs += Math.round(thisDelaySeconds * 1000)

      await campaignQueue.add(
        `campaign-${campaign.id}-contact-${log.contactId}`,
        {
          campaignId: campaign.id,
          contactId: log.contactId,
          messageLogId: log.id,
          instanceName: instance.evolutionName,
          messageText: campaign.messageText,
          mediaData: mediaData,
          mediaType: campaign.mediaType,
          mediaMimeType: campaign.mediaMimeType,
          mediaFilename: campaign.mediaFilename,
          phone: log.contact.phone,
          throttleMin: campaign.throttleMin,
          throttleMax: campaign.throttleMax,
        },
        {
          delay: cumulativeDelayMs,
          removeOnComplete: true,
          removeOnFail: false,
          jobId: `msg-${log.id}`, // idempotent — prevents duplicate queuing
        }
      )
    }

    return NextResponse.json({
      success: true,
      queued: campaign.logs.length,
      message: `Queued ${campaign.logs.length} messages`,
    })
  } catch (error) {
    console.error("Start campaign error:", error)
    return NextResponse.json(
      { error: "Failed to start campaign" },
      { status: 500 }
    )
  }
}
