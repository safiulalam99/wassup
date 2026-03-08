import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { evolutionClient } from "@/lib/evolution"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    })

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user already has an instance
    const existingInstance = await prisma.instance.findUnique({
      where: { userId: session.user.id },
    })

    if (existingInstance) {
      return NextResponse.json({ instance: existingInstance })
    }

    // Create unique instance name
    const instanceName = `user_${session.user.id}`

    // Create instance in Evolution API
    await evolutionClient.createInstance(instanceName)

    // Save to database
    const instance = await prisma.instance.create({
      data: {
        userId: session.user.id,
        evolutionName: instanceName,
        status: "DISCONNECTED",
      },
    })

    return NextResponse.json({ instance })
  } catch (error) {
    console.error("Error creating instance:", error)
    return NextResponse.json(
      { error: "Failed to create instance" },
      { status: 500 }
    )
  }
}

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

    return NextResponse.json({ instance })
  } catch (error) {
    console.error("Error fetching instance:", error)
    return NextResponse.json(
      { error: "Failed to fetch instance" },
      { status: 500 }
    )
  }
}
