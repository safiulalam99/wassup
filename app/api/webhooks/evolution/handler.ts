import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * Handle contact sync from Evolution API webhook events
 * Processes contacts.set, contacts.upsert, and contacts.update events
 */
async function handleContactsSync(instanceName: string, contacts: any) {
  try {
    // Find the instance in our database to get the userId
    const dbInstance = await prisma.instance.findUnique({
      where: { evolutionName: instanceName },
      select: { userId: true },
    })

    if (!dbInstance) {
      console.error(`Instance ${instanceName} not found in database`)
      return
    }

    const userId = dbInstance.userId

    // contacts can be an array or an object with contacts property
    const contactArray = Array.isArray(contacts) ? contacts : contacts?.contacts || []

    console.log(`Processing ${contactArray.length} contacts for user ${userId}`)

    let syncedCount = 0
    let skippedCount = 0

    for (const contact of contactArray) {
      try {
        // Extract phone number from different possible fields
        const rawPhone = contact.remoteJid || contact.id || contact.phone || contact.number
        if (!rawPhone) {
          console.warn('Contact missing phone number:', contact)
          skippedCount++
          continue
        }

        const phone = rawPhone.replace('@s.whatsapp.net', '').replace('@c.us', '')

        // Skip group chats (contain @g.us)
        if (rawPhone.includes('@g.us')) {
          skippedCount++
          continue
        }

        // Get contact name (prefer pushName, then notify, then verifiedName, else phone)
        const name = contact.pushName || contact.notify || contact.verifiedName || contact.name || phone

        // Upsert contact in our database
        await prisma.contact.upsert({
          where: {
            userId_phone: {
              userId,
              phone,
            },
          },
          update: {
            name, // Update name if contact already exists
          },
          create: {
            userId,
            phone,
            name,
            optedOut: false,
            tags: [],
          },
        })

        syncedCount++
      } catch (contactError) {
        console.error('Failed to sync individual contact:', contactError)
        skippedCount++
      }
    }

    console.log(`Contact sync complete for ${instanceName}: ${syncedCount} synced, ${skippedCount} skipped`)
  } catch (error) {
    console.error('Contact sync error:', error)
  }
}

export async function handleWebhook(req: NextRequest) {
  try {
    const body = await req.json()

    console.log("Evolution API webhook received:", JSON.stringify(body, null, 2))

    const { event, instance, data } = body

    // Handle connection state changes
    if (event === "connection.update") {
      const instanceName = instance
      const state = data?.state || data?.connection

      console.log(`Connection update for ${instanceName}:`, {
        state,
        fullData: data
      })

      // Find the instance in our database
      const dbInstance = await prisma.instance.findUnique({
        where: { evolutionName: instanceName },
      })

      if (dbInstance) {
        let status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" = "DISCONNECTED"

        if (state === "open") {
          status = "CONNECTED"
        } else if (state === "connecting") {
          status = "CONNECTING"
        } else {
          // Handle close, disconnected, logout, etc.
          status = "DISCONNECTED"
        }

        // Extract phone from wuid if available
        const wuid = data?.wuid
        const phone = wuid ? wuid.replace('@s.whatsapp.net', '').replace('@c.us', '') : null

        // Build update data object conditionally
        const updateData: any = { status }

        if (status === "DISCONNECTED") {
          // Clear everything on disconnect
          updateData.phone = null
          updateData.profileName = null
          updateData.profilePictureUrl = null
        } else if (status === "CONNECTED") {
          // Update phone and profile data when connected
          if (phone) updateData.phone = phone
          if (data?.profileName) updateData.profileName = data.profileName
          if (data?.profilePictureUrl) updateData.profilePictureUrl = data.profilePictureUrl
        }
        // For CONNECTING state: only update status, preserve existing data

        // Update instance
        await prisma.instance.update({
          where: { id: dbInstance.id },
          data: updateData,
        })

        console.log(`Updated instance ${instanceName} status to ${status}`, updateData)
      }
    }

    // Handle QR code events
    if (event === "qrcode.updated") {
      console.log(`QR code updated for ${instance}`)
    }

    // Handle message events (optional - for future features)
    if (event === "messages.upsert") {
      console.log(`Message received for ${instance}`)
    }

    // Handle message acknowledgment (sent, delivered, read)
    if (event === "messages.update") {
      console.log(`Message status update for ${instance}`)
    }

    // Handle initial contact loading (occurs once after connection)
    if (event === "contacts.set") {
      console.log(`Contacts set for ${instance}:`, data)
      await handleContactsSync(instance, data)
    }

    // Handle contact enrichment/reload (occurs once with additional info)
    if (event === "contacts.upsert") {
      console.log(`Contacts upsert for ${instance}:`, data)
      await handleContactsSync(instance, data)
    }

    // Handle individual contact updates
    if (event === "contacts.update") {
      console.log(`Contact updated for ${instance}:`, data)
      await handleContactsSync(instance, data)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}
