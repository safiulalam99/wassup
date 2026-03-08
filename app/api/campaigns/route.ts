import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET - List all campaigns for the user
export async function GET(req: NextRequest) {
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

    const campaigns = await prisma.campaign.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error("Fetch campaigns error:", error)
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    )
  }
}

// POST - Create a new campaign
export async function POST(req: NextRequest) {
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

    const body = await req.json()
    const {
      name,
      messageText,
      mediaData,
      mediaType,
      mediaFilename,
      mediaMimeType,
      contactIds,
      scheduledAt,
      throttleMin,
      throttleMax,
      dailyLimit,
    } = body

    if (!name || !messageText) {
      return NextResponse.json(
        { error: "Name and message are required" },
        { status: 400 }
      )
    }

    if (!contactIds || contactIds.length === 0) {
      return NextResponse.json(
        { error: "At least one contact is required" },
        { status: 400 }
      )
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        userId: session.user.id,
        name,
        messageText,
        mediaData: mediaData ? Buffer.from(mediaData, "base64") : null,
        mediaFilename: mediaFilename || null,
        mediaMimeType: mediaMimeType || null,
        mediaType: mediaType || null,
        status: "DRAFT",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        throttleMin: throttleMin || 8,
        throttleMax: throttleMax || 25,
        dailyLimit: dailyLimit || 200,
      },
    })

    // Create message logs for each contact
    const messageLogs = contactIds.map((contactId: string) => ({
      campaignId: campaign.id,
      contactId,
      status: "PENDING" as const,
    }))

    await prisma.messageLog.createMany({
      data: messageLogs,
    })

    return NextResponse.json({ campaign }, { status: 201 })
  } catch (error) {
    console.error("Create campaign error:", error)
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    )
  }
}
