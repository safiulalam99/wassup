"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Contact {
  id: string
  name: string
  phone: string
  tags: string[]
  optedOut: boolean
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Campaign data
  const [name, setName] = useState("")
  const [messageText, setMessageText] = useState("")
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [scheduledAt, setScheduledAt] = useState("")
  const [throttleMin, setThrottleMin] = useState(8)
  const [throttleMax, setThrottleMax] = useState(25)
  const [dailyLimit, setDailyLimit] = useState(200)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  // Contacts
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchContacts()
  }, [search])

  const fetchContacts = async () => {
    try {
      const url = search
        ? `/api/contacts?search=${encodeURIComponent(search)}`
        : "/api/contacts"
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setContacts(data.contacts.filter((c: Contact) => !c.optedOut))
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err)
    } finally {
      setContactsLoading(false)
    }
  }

  const handleToggleContact = (id: string) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    const allIds = contacts.map((c) => c.id)
    setSelectedContacts(allIds)
  }

  const handleDeselectAll = () => {
    setSelectedContacts([])
  }

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: Images (JPEG, PNG, GIF, WebP), PDF, MP4')
      return
    }

    // Validate file size (max 16MB)
    if (file.size > 16 * 1024 * 1024) {
      setError('File size must be less than 16MB')
      return
    }

    setMediaFile(file)
    setError('')
  }

  const handleRemoveMedia = () => {
    setMediaFile(null)
  }

  const handleSubmit = async () => {
    setError("")
    setLoading(true)

    try {
      let mediaData: string | null = null
      let mediaType: string | null = null
      let mediaFilename: string | null = null
      let mediaMimeType: string | null = null

      // Upload media file if present
      if (mediaFile) {
        setUploadingMedia(true)
        const formData = new FormData()
        formData.append('file', mediaFile)

        const uploadRes = await fetch('/api/campaigns/upload', {
          method: 'POST',
          body: formData,
        })

        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Failed to upload media')
        }

        mediaData = uploadData.data
        mediaType = uploadData.type
        mediaFilename = uploadData.filename
        mediaMimeType = uploadData.mimeType
        setUploadingMedia(false)
      }

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          messageText,
          contactIds: selectedContacts,
          scheduledAt: scheduledAt || null,
          throttleMin,
          throttleMax,
          dailyLimit,
          mediaData,
          mediaType,
          mediaFilename,
          mediaMimeType,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        router.push("/dashboard/campaigns")
      } else {
        setError(data.error || "Failed to create campaign")
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setLoading(false)
      setUploadingMedia(false)
    }
  }

  const canProceedStep1 = name && messageText
  const canProceedStep2 = selectedContacts.length > 0
  const canSubmit = canProceedStep1 && canProceedStep2

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Create Campaign
          </h1>
          <p className="text-white/50">
            Send bulk messages to your contacts
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1
                  ? "bg-[#00ff88] text-[#0a0a0f]"
                  : "bg-white/8 text-white/50"
              }`}
            >
              1
            </div>
            <span className="text-white">Message</span>
          </div>
          <div className="flex-1 h-px bg-white/8"></div>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2
                  ? "bg-[#00ff88] text-[#0a0a0f]"
                  : "bg-white/8 text-white/50"
              }`}
            >
              2
            </div>
            <span className="text-white">Contacts</span>
          </div>
          <div className="flex-1 h-px bg-white/8"></div>
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 3
                  ? "bg-[#00ff88] text-[#0a0a0f]"
                  : "bg-white/8 text-white/50"
              }`}
            >
              3
            </div>
            <span className="text-white">Settings</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Step 1: Message */}
        {step === 1 && (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">
              Step 1: Compose Message
            </h2>

            <div className="space-y-6">
              <Input
                label="Campaign Name"
                type="text"
                placeholder="Black Friday Sale"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Message Text
                </label>
                <textarea
                  className="w-full bg-white/5 border border-white/8 rounded-lg p-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
                  rows={6}
                  placeholder="Hello! We're having a special promotion..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  required
                />
                <p className="mt-2 text-white/50 text-sm">
                  {messageText.length} characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Attachment (optional)
                </label>
                {mediaFile ? (
                  <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/8 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{mediaFile.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveMedia}
                      className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*,.pdf,video/mp4"
                      onChange={handleMediaChange}
                      className="block w-full text-white/60 text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#00ff88]/10 file:text-[#00ff88] file:text-sm file:font-medium file:cursor-pointer hover:file:bg-[#00ff88]/20"
                    />
                    <p className="mt-2 text-white/40 text-xs">
                      Supported: Images (JPEG, PNG, GIF, WebP), PDF, MP4. Max 16MB.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                onClick={() => router.push("/dashboard/campaigns")}
                className="bg-white/8 hover:bg-white/12 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a0a0f]"
              >
                Next: Select Contacts →
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Contacts */}
        {step === 2 && (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">
              Step 2: Select Contacts
            </h2>

            <div className="mb-6">
              <Input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="mb-4 flex gap-3">
              <button
                onClick={handleSelectAll}
                className="text-[#00ff88] hover:text-[#00dd77] text-sm"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="text-white/50 hover:text-white text-sm"
              >
                Deselect All
              </button>
              <span className="text-white/50 text-sm ml-auto">
                {selectedContacts.length} selected
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 mb-6">
              {contactsLoading ? (
                <div className="text-white/50 text-center py-8">
                  Loading contacts...
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-white/50 text-center py-8">
                  No contacts found
                </div>
              ) : (
                contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/8 rounded-lg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => handleToggleContact(contact.id)}
                      className="w-4 h-4 rounded border-white/20 text-[#00ff88] focus:ring-[#00ff88]"
                    />
                    <div className="flex-1">
                      <div className="text-white">{contact.name}</div>
                      <div className="text-white/50 text-sm">
                        {contact.phone}
                      </div>
                    </div>
                    {contact.tags.length > 0 && (
                      <div className="flex gap-1">
                        {contact.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-[#00ff88]/10 text-[#00ff88] text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </label>
                ))
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                onClick={() => setStep(1)}
                className="bg-white/8 hover:bg-white/12 text-white"
              >
                ← Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a0a0f]"
              >
                Next: Configure Settings →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div className="bg-[#111118] border border-white/8 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">
              Step 3: Campaign Settings
            </h2>

            <div className="space-y-6">
              <Input
                label="Schedule (optional)"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Min Delay (seconds)"
                  type="number"
                  min={1}
                  value={throttleMin}
                  onChange={(e) => setThrottleMin(Number(e.target.value))}
                />
                <Input
                  label="Max Delay (seconds)"
                  type="number"
                  min={1}
                  value={throttleMax}
                  onChange={(e) => setThrottleMax(Number(e.target.value))}
                />
              </div>

              <Input
                label="Daily Limit"
                type="number"
                min={1}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
              />

              <div className="bg-white/5 border border-white/8 rounded-lg p-4">
                <h3 className="text-white font-medium mb-2">Summary</h3>
                <ul className="text-white/70 text-sm space-y-1">
                  <li>• Campaign: {name}</li>
                  <li>• Recipients: {selectedContacts.length} contacts</li>
                  <li>
                    • Delay: {throttleMin}-{throttleMax}s between messages
                  </li>
                  <li>• Daily limit: {dailyLimit} messages</li>
                  <li>
                    • Schedule:{" "}
                    {scheduledAt
                      ? new Date(scheduledAt).toLocaleString()
                      : "Send immediately"}
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                onClick={() => setStep(2)}
                className="bg-white/8 hover:bg-white/12 text-white"
              >
                ← Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || loading || uploadingMedia}
                className="bg-[#00ff88] hover:bg-[#00dd77] text-[#0a0a0f]"
              >
                {uploadingMedia ? "Uploading media..." : loading ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
