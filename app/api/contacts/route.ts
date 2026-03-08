import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET - List all contacts for the user
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

    const { searchParams } = new URL(req.url)
    const tag = searchParams.get("tag")
    const search = searchParams.get("search")

    const where: any = {
      userId: session.user.id,
    }

    if (tag) {
      where.tags = {
        has: tag,
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ]
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error("Fetch contacts error:", error)
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    )
  }
}

// POST - Create a new contact
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
    const { name, phone, tags } = body

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      )
    }

    // Validate phone format (should start with +)
    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`

    const contact = await prisma.contact.create({
      data: {
        userId: session.user.id,
        name,
        phone: formattedPhone,
        tags: tags || [],
      },
    })

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error: any) {
    console.error("Create contact error:", error)

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Contact with this phone number already exists" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 }
    )
  }
}
