import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET - Get a single campaign with stats
export async function GET(
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

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        logs: {
          include: {
            contact: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // Calculate stats
    const stats = {
      total: campaign.logs.length,
      sent: campaign.logs.filter((l) => l.status === "SENT").length,
      failed: campaign.logs.filter((l) => l.status === "FAILED").length,
      pending: campaign.logs.filter((l) => l.status === "PENDING").length,
      skipped: campaign.logs.filter((l) => l.status === "SKIPPED").length,
    }

    return NextResponse.json({ campaign, stats })
  } catch (error) {
    console.error("Fetch campaign error:", error)
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    )
  }
}

// PATCH - Update campaign status
export async function PATCH(
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

    const body = await req.json()
    const { status } = body

    // Verify ownership
    const existing = await prisma.campaign.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // For RUNNING status from DRAFT, use the start endpoint
    if (status === "RUNNING" && existing.status === "DRAFT") {
      return NextResponse.json(
        { error: "Use /api/campaigns/{id}/start to start a campaign" },
        { status: 400 }
      )
    }

    const updateData: any = {}

    if (status === "PAUSED") {
      updateData.status = "PAUSED"
    } else if (status === "RUNNING" && existing.status === "PAUSED") {
      updateData.status = "RUNNING"
      // Re-queue pending messages
      // TODO: Implement resume logic
    } else if (status === "COMPLETED") {
      updateData.status = "COMPLETED"
      updateData.completedAt = new Date()
    }

    const campaign = await prisma.campaign.update({
      where: { id: id },
      data: updateData,
    })

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error("Update campaign error:", error)
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a campaign
export async function DELETE(
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

    // Verify ownership
    const existing = await prisma.campaign.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // Don't allow deleting running campaigns
    if (existing.status === "RUNNING") {
      return NextResponse.json(
        { error: "Cannot delete a running campaign. Pause it first." },
        { status: 400 }
      )
    }

    await prisma.campaign.delete({
      where: { id: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete campaign error:", error)
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    )
  }
}
