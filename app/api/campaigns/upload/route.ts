import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const validMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "video/mp4",
    ]

    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type" },
        { status: 400 }
      )
    }

    // Validate file size (16MB max)
    if (file.size > 16 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 16MB" },
        { status: 400 }
      )
    }

    // Convert to base64 for database storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Data = buffer.toString("base64")

    // Determine media type for Evolution API
    let mediaType: "image" | "document" | "video"
    if (file.type.startsWith("image/")) {
      mediaType = "image"
    } else if (file.type === "video/mp4") {
      mediaType = "video"
    } else {
      mediaType = "document"
    }

    return NextResponse.json({
      data: base64Data,
      type: mediaType,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}
