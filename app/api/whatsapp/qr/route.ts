import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { evolutionClient } from "@/lib/evolution"
import prisma from "@/lib/prisma"
import QRCode from "qrcode"

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

    // Get QR code data from Evolution API
    // If instance doesn't exist in Evolution API (deleted), try to create it first
    let qrData
    try {
      qrData = await evolutionClient.getQR(instance.evolutionName)
    } catch (error: any) {
      // If instance doesn't exist (404), create a new one
      if (error.statusCode === 404) {
        console.log(`Instance ${instance.evolutionName} doesn't exist, creating new one...`)
        await evolutionClient.createInstance(instance.evolutionName)

        // Wait a moment for instance to initialize
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Try getting QR again
        qrData = await evolutionClient.getQR(instance.evolutionName)
      } else {
        throw error
      }
    }

    console.log('QR data received:', qrData)

    // Check if instance is already connected
    if (qrData.instance?.state === 'open') {
      return NextResponse.json(
        { error: "Instance already connected", alreadyConnected: true },
        { status: 409 }
      )
    }

    // Check if we have a valid code
    if (!qrData.code || qrData.code.trim() === '') {
      return NextResponse.json(
        { error: "QR code not ready yet, please wait a moment", qrData },
        { status: 503 }
      )
    }

    // Convert the code to a base64 QR image
    const qrBase64 = await QRCode.toDataURL(qrData.code)

    // Update instance status
    await prisma.instance.update({
      where: { id: instance.id },
      data: { status: "CONNECTING" },
    })

    return NextResponse.json({
      qr: qrBase64,
      pairingCode: qrData.pairingCode,
      count: qrData.count
    })
  } catch (error) {
    console.error("Error fetching QR code:", error)
    return NextResponse.json(
      { error: "Failed to fetch QR code" },
      { status: 500 }
    )
  }
}
