import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET - Get a single contact
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

    const contact = await prisma.contact.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error("Fetch contact error:", error)
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    )
  }
}

// PATCH - Update a contact
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
    const { name, phone, tags, optedOut } = body

    // Verify ownership
    const existing = await prisma.contact.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) {
      updateData.phone = phone.startsWith("+") ? phone : `+${phone}`
    }
    if (tags !== undefined) updateData.tags = tags
    if (optedOut !== undefined) updateData.optedOut = optedOut

    const contact = await prisma.contact.update({
      where: { id: id },
      data: updateData,
    })

    return NextResponse.json({ contact })
  } catch (error: any) {
    console.error("Update contact error:", error)

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Contact with this phone number already exists" },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a contact
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
    const existing = await prisma.contact.findFirst({
      where: {
        id: id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      )
    }

    await prisma.contact.delete({
      where: { id: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete contact error:", error)
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    )
  }
}
