import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { evolutionClient } from "@/lib/evolution"

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

    // Get the user's WhatsApp instance
    const instance = await prisma.instance.findUnique({
      where: { userId: session.user.id },
    })

    if (!instance) {
      return NextResponse.json(
        { error: "No WhatsApp instance found" },
        { status: 404 }
      )
    }

    // Delete the instance from Evolution API completely
    // This ensures a fresh QR code on next connection
    try {
      await evolutionClient.deleteInstance(instance.evolutionName)
      console.log(`Deleted Evolution API instance: ${instance.evolutionName}`)
    } catch (error) {
      console.warn(`Failed to delete instance, it may not exist:`, error)
      // Continue anyway - we'll update our database
    }

    // Update instance status in database
    await prisma.instance.update({
      where: { id: instance.id },
      data: {
        status: "DISCONNECTED",
        phone: null,
        profileName: null,
        profilePictureUrl: null,
      },
    })

    return NextResponse.json({
      success: true,
      message: "WhatsApp disconnected successfully",
    })
  } catch (error) {
    console.error("Disconnect error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect" },
      { status: 500 }
    )
  }
}
