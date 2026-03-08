const EVOLUTION_BASE = process.env.EVOLUTION_API_URL || "http://localhost:8080"
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY

interface EvolutionResponse<T> {
  data?: T
  error?: string
}

interface QRCodeResponse {
  pairingCode: string
  code: string
  count: number
}

interface ConnectionStateResponse {
  instance: {
    instanceName: string
    state: "open" | "close" | "connecting"
  }
}

interface SendTextResponse {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: {
    extendedTextMessage?: {
      text: string
    }
  }
  messageTimestamp: string
  status: string
}

interface Contact {
  id: string
  name?: string
  pushName?: string
  profilePictureUrl?: string
}

class EvolutionAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message)
    this.name = "EvolutionAPIError"
  }
}

async function evolutionFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${EVOLUTION_BASE}${endpoint}`

  const headers = {
    "Content-Type": "application/json",
    "apikey": EVOLUTION_KEY || "",
    ...options.headers,
  }

  try {
    console.log(`[Evolution API] ${options.method || 'GET'} ${url}`)

    const response = await fetch(url, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      console.error(`[Evolution API Error] ${response.status}:`, data)
      throw new EvolutionAPIError(
        data.message || data.response?.message?.[0] || "Evolution API request failed",
        response.status,
        data
      )
    }

    console.log(`[Evolution API Success] ${response.status}`)
    return data as T
  } catch (error) {
    if (error instanceof EvolutionAPIError) {
      throw error
    }
    console.error(`[Evolution API Connection Error]:`, error)
    throw new EvolutionAPIError(
      `Failed to connect to Evolution API: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

export const evolutionClient = {
  /**
   * Create a new WhatsApp instance
   */
  async createInstance(instanceName: string): Promise<any> {
    return evolutionFetch("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    })
  },

  /**
   * Get QR code for instance connection
   */
  async getQR(instanceName: string): Promise<QRCodeResponse> {
    return evolutionFetch<QRCodeResponse>(`/instance/connect/${instanceName}`)
  },

  /**
   * Get connection status of an instance
   */
  async getStatus(instanceName: string): Promise<ConnectionStateResponse> {
    return evolutionFetch<ConnectionStateResponse>(
      `/instance/connectionState/${instanceName}`
    )
  },

  /**
   * Send text message
   */
  async sendText(
    instanceName: string,
    phone: string,
    text: string,
    delayMs?: number
  ): Promise<SendTextResponse> {
    // Evolution API REST expects a plain numeric string — strip + and any @jid suffix
    const number = phone.replace(/\+/g, "").replace(/@.*/, "")

    return evolutionFetch<SendTextResponse>(`/message/sendText/${instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        number,
        text,
        delay: delayMs ?? 1200, // simulates typing presence
      }),
    })
  },

  /**
   * Send media from base64 data (database storage)
   */
  async sendMediaFromBase64(
    instanceName: string,
    phone: string,
    base64Data: string,
    mimeType: string,
    caption: string,
    mediaType: "image" | "document" | "video",
    fileName: string
  ): Promise<any> {
    // Evolution API REST expects a plain numeric string — strip + and any @jid suffix
    const number = phone.replace(/\+/g, "").replace(/@.*/, "")

    // Clean base64 string - remove any whitespace, newlines, or non-base64 chars
    const cleanedBase64 = base64Data.replace(/[^A-Za-z0-9+/=]/g, '')

    console.log(`[Evolution API] Sending ${mediaType} media to ${number}`, {
      mimeType,
      originalLength: base64Data.length,
      cleanedLength: cleanedBase64.length,
      removedChars: base64Data.length - cleanedBase64.length,
      base64Start: cleanedBase64.substring(0, 100),
      base64End: cleanedBase64.substring(cleanedBase64.length - 50),
      hasValidBase64: /^[A-Za-z0-9+/=]+$/.test(cleanedBase64)
    })

    // Simple format that works: number, mediatype, media (plain base64), caption, fileName
    const payload = {
      number,
      mediatype: mediaType,
      media: cleanedBase64,
      caption: caption || "",
      fileName: fileName,
    }

    console.log(`[Evolution API] Payload:`, {
      number,
      mediatype: mediaType,
      hasMedia: !!cleanedBase64,
      mediaLength: cleanedBase64.length,
      fileName,
      caption: caption.substring(0, 50)
    })

    return evolutionFetch(`/message/sendMedia/${instanceName}`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  /**
   * Find contacts in the WhatsApp instance
   * Note: This endpoint may not be available in all Evolution API versions
   */
  async findContacts(instanceName: string): Promise<Contact[]> {
    try {
      // v2 doesn't have findContacts endpoint - return empty array for now
      // Contacts will be available via webhooks when messages are received
      return []
    } catch (error) {
      console.warn('Contact fetch not available, returning empty array')
      return []
    }
  },

  /**
   * Delete instance
   */
  async deleteInstance(instanceName: string): Promise<any> {
    return evolutionFetch(`/instance/delete/${instanceName}`, {
      method: "DELETE",
    })
  },

  /**
   * Logout instance (disconnect without deleting)
   */
  async logoutInstance(instanceName: string): Promise<any> {
    return evolutionFetch(`/instance/logout/${instanceName}`, {
      method: "DELETE",
    })
  },
}

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'video/mp4': 'mp4',
    'video/mpeg': 'mpeg',
  }
  return map[mimeType] || 'bin'
}

export { EvolutionAPIError }
