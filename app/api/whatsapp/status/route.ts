import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { evolutionClient } from "@/lib/evolution"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const instance = await prisma.instance.findUnique({
      where: { userId: session.user.id },
    })

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    // Get status from Evolution API
    let statusData
    try {
      statusData = await evolutionClient.getStatus(instance.evolutionName)
    } catch (error: any) {
      // If instance doesn't exist in Evolution API (404), it's disconnected
      if (error.statusCode === 404) {
        console.log(`Instance ${instance.evolutionName} not found in Evolution API, marking as disconnected`)

        // Update database to reflect disconnected state
        await prisma.instance.update({
          where: { id: instance.id },
          data: {
            status: "DISCONNECTED",
            phone: null,
          },
        })

        return NextResponse.json({
          status: "DISCONNECTED",
          phone: null,
          profileName: null,
          profilePictureUrl: null,
        })
      }
      throw error
    }

    console.log(`Status check for ${instance.evolutionName}:`, statusData.instance.state)

    // Map Evolution API status to our status
    let status: "DISCONNECTED" | "CONNECTING" | "CONNECTED" = "DISCONNECTED"
    if (statusData.instance.state === "open") {
      status = "CONNECTED"
    } else if (statusData.instance.state === "connecting") {
      status = "CONNECTING"
    } else {
      // Any other state (close, disconnected, etc.) = DISCONNECTED
      status = "DISCONNECTED"
    }

    // Update instance in database
    const updatedInstance = await prisma.instance.update({
      where: { id: instance.id },
      data: {
        status,
        // Clear phone number if disconnected
        phone: status === "DISCONNECTED" ? null : (statusData.instance.instanceName || instance.phone),
      },
    })

    return NextResponse.json({
      status: updatedInstance.status,
      phone: updatedInstance.phone,
      profileName: updatedInstance.profileName,
      profilePictureUrl: updatedInstance.profilePictureUrl,
    })
  } catch (error) {
    console.error("Error fetching status:", error)
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    )
  }
}
