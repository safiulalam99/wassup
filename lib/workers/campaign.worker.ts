import { Worker, Job } from "bullmq"
import { redisConnection } from "@/lib/queue"
import { evolutionClient } from "@/lib/evolution"
import prisma from "@/lib/prisma"
import type { CampaignJobData } from "@/lib/queue"
import { MessageStatus } from "@prisma/client"

// Track daily send counts per instance
const dailySendCounts = new Map<string, { date: string; count: number }>()

function getDailyCount(instanceName: string): number {
  const today = new Date().toISOString().split("T")[0]
  const record = dailySendCounts.get(instanceName)

  if (!record || record.date !== today) {
    // Reset count for new day
    dailySendCounts.set(instanceName, { date: today, count: 0 })
    return 0
  }

  return record.count
}

function incrementDailyCount(instanceName: string): void {
  const today = new Date().toISOString().split("T")[0]
  const record = dailySendCounts.get(instanceName)

  if (!record || record.date !== today) {
    dailySendCounts.set(instanceName, { date: today, count: 1 })
  } else {
    record.count++
  }
}

async function processCampaignJob(job: Job<CampaignJobData>): Promise<void> {
  const { campaignId, contactId, messageLogId, instanceName, phone, messageText, mediaData, mediaType, mediaMimeType, mediaFilename } = job.data

  console.log(`[Worker] Processing job ${job.id} for campaign ${campaignId}`)

  try {
    // Check if contact has opted out
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      throw new Error(`Contact ${contactId} not found`)
    }

    if (contact.optedOut) {
      console.log(`[Worker] Contact ${contactId} has opted out, skipping`)
      await prisma.messageLog.update({
        where: { id: messageLogId },
        data: { status: MessageStatus.SKIPPED },
      })
      await checkCampaignCompletion(campaignId)
      return
    }

    // Check daily send limit
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`)
    }

    const dailyCount = getDailyCount(instanceName)

    if (dailyCount >= campaign.dailyLimit) {
      console.log(
        `[Worker] Daily limit reached for instance ${instanceName} (${dailyCount}/${campaign.dailyLimit})`
      )

      // Delay job to tomorrow 9am
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)

      const delayMs = tomorrow.getTime() - Date.now()

      await job.moveToDelayed(delayMs, job.token!)
      console.log(`[Worker] Job delayed to ${tomorrow.toISOString()}`)
      return
    }

    // Send message via Evolution API
    let response

    if (mediaData && mediaType && mediaMimeType) {
      // Clean and validate base64
      const cleanedMedia = mediaData.replace(/[^A-Za-z0-9+/=]/g, '')
      
      console.log(`[Worker] Sending media message to ${phone}`, {
        mediaType,
        mediaMimeType,
        originalLength: mediaData.length,
        cleanedLength: cleanedMedia.length,
        removedChars: mediaData.length - cleanedMedia.length,
        mediaStart: cleanedMedia.substring(0, 100),
        mediaEnd: cleanedMedia.substring(cleanedMedia.length - 50),
        isValidBase64: /^[A-Za-z0-9+/=]+$/.test(cleanedMedia)
      })
      
      // Validate base64 before sending
      if (!/^[A-Za-z0-9+/=]+$/.test(cleanedMedia)) {
        throw new Error(`Invalid base64 media data detected after cleaning`)
      }
      
      response = await evolutionClient.sendMediaFromBase64(
        instanceName,
        phone,
        cleanedMedia,
        mediaMimeType,
        messageText,
        mediaType as "image" | "document" | "video",
        mediaFilename || "file"
      )
    } else {
      console.log(`[Worker] Sending text message to ${phone}`)
      response = await evolutionClient.sendText(instanceName, phone, messageText)
    }

    // Update message log to SENT
    await prisma.messageLog.update({
      where: { id: messageLogId },
      data: {
        status: MessageStatus.SENT,
        sentAt: new Date(),
      },
    })

    // Increment daily count
    incrementDailyCount(instanceName)

    console.log(`[Worker] Successfully sent message to ${phone}`)

    // Check if campaign is fully done
    await checkCampaignCompletion(campaignId)
  } catch (error) {
    console.error(`[Worker] Error processing job ${job.id}:`, error)

    // Update message log with error
    await prisma.messageLog.update({
      where: { id: messageLogId },
      data: {
        status: MessageStatus.FAILED,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })

    throw error // Triggers BullMQ retry logic
  }
}

// Mark campaign COMPLETED once all message logs reach a terminal state
async function checkCampaignCompletion(campaignId: string): Promise<void> {
  const pendingCount = await prisma.messageLog.count({
    where: { campaignId, status: MessageStatus.PENDING },
  })

  if (pendingCount === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "COMPLETED", completedAt: new Date() },
    })
    console.log(`[Worker] Campaign ${campaignId} marked as COMPLETED`)
  }
}

// Create and export the worker
// concurrency: 1 — process strictly one message at a time
// No limiter needed — delays are baked into job scheduling (cumulative delays)
export const campaignWorker = new Worker<CampaignJobData>(
  "campaigns",
  processCampaignJob,
  {
    connection: redisConnection,
    concurrency: 1,
  }
)

campaignWorker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`)
})

campaignWorker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err)
})

campaignWorker.on("error", (err) => {
  console.error("[Worker] Worker error:", err)
})

console.log("[Worker] Campaign worker started")
