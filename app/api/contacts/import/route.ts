import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

// POST - Import contacts from CSV
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
    const { contacts } = body

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "Invalid contacts data" },
        { status: 400 }
      )
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const contact of contacts) {
      const { name, phone, tags } = contact

      if (!name || !phone) {
        errors.push(`Skipped contact: missing name or phone`)
        skipped++
        continue
      }

      const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`

      try {
        await prisma.contact.upsert({
          where: {
            userId_phone: {
              userId: session.user.id,
              phone: formattedPhone,
            },
          },
          update: {
            name,
            tags: tags || [],
          },
          create: {
            userId: session.user.id,
            name,
            phone: formattedPhone,
            tags: tags || [],
          },
        })
        imported++
      } catch (err) {
        errors.push(`Failed to import ${name} (${phone})`)
        skipped++
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      errors: errors.length > 0 ? errors.slice(0, 10) : [], // Limit to 10 errors
      message: `Imported ${imported} contacts, skipped ${skipped}`,
    })
  } catch (error) {
    console.error("Import contacts error:", error)
    return NextResponse.json(
      { error: "Failed to import contacts" },
      { status: 500 }
    )
  }
}
