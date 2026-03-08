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

    if (instance.status !== "CONNECTED") {
      return NextResponse.json(
        { error: "WhatsApp not connected" },
        { status: 400 }
      )
    }

    // Fetch contacts from Evolution API
    const contacts = await evolutionClient.findContacts(instance.evolutionName)

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({
        synced: 0,
        message: "No contacts found",
      })
    }

    // Bulk upsert contacts (deduplicate by phone)
    let syncedCount = 0
    for (const contact of contacts) {
      // Skip contacts without valid phone numbers
      if (!contact.id || !contact.id.includes("@")) {
        continue
      }

      // Extract phone number (format: "1234567890@c.us" -> "+1234567890")
      const phone = contact.id.split("@")[0]
      const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`

      // Use pushName or id as name fallback
      const name = contact.pushName || contact.id.split("@")[0]

      await prisma.contact.upsert({
        where: {
          userId_phone: {
            userId: session.user.id,
            phone: formattedPhone,
          },
        },
        update: {
          name,
        },
        create: {
          userId: session.user.id,
          name,
          phone: formattedPhone,
        },
      })

      syncedCount++
    }

    return NextResponse.json({
      synced: syncedCount,
      message: `Successfully synced ${syncedCount} contacts`,
    })
  } catch (error) {
    console.error("Contact sync error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync contacts" },
      { status: 500 }
    )
  }
}
