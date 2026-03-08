import { Queue } from "bullmq"

// Use a plain connection options object so BullMQ uses its own bundled ioredis
// (avoids ioredis version-mismatch TypeScript errors)
export const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null as null,
}

export interface CampaignJobData {
  campaignId: string
  contactId: string
  messageLogId: string
  instanceName: string
  phone: string
  messageText: string
  mediaData?: string | null  // base64 encoded media
  mediaType?: string | null  // "image" | "document" | "video"
  mediaMimeType?: string | null  // e.g. "image/jpeg", "application/pdf"
  mediaFilename?: string | null  // original filename
  // throttle settings (seconds) — used for human-like per-job delay
  throttleMin: number
  throttleMax: number
}

export const campaignQueue = new Queue<CampaignJobData>("campaigns", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
    },
  },
})

// redisConnection is already exported above
