"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"

interface Contact {
  id: string
  name: string
  phone: string
  tags: string[]
  optedOut: boolean
  createdAt: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null!)

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
        setContacts(data.contacts)
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return

    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setContacts(contacts.filter((c) => c.id !== id))
      }
    } catch (err) {
      console.error("Failed to delete contact:", err)
    }
  }

  const handleToggleOptOut = async (contact: Contact) => {
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optedOut: !contact.optedOut }),
      })

      if (res.ok) {
        const data = await res.json()
        setContacts(
          contacts.map((c) => (c.id === contact.id ? data.contact : c))
        )
      }
    } catch (err) {
      console.error("Failed to update contact:", err)
    }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    // Skip header row if it exists
    const hasHeader = lines[0].toLowerCase().includes("name")
    const dataLines = hasHeader ? lines.slice(1) : lines

    const importContacts = dataLines.map((line) => {
      const [name, phone, tagsStr] = line.split(",").map((s) => s.trim())
      return {
        name,
        phone,
        tags: tagsStr ? tagsStr.split(";").map((t) => t.trim()) : [],
      }
    })

    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: importContacts }),
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message)
        fetchContacts()
        setShowImportModal(false)
      } else {
        alert(data.error || "Import failed")
      }
    } catch (err) {
      console.error("Import error:", err)
      alert("Failed to import contacts")
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-3 items-center text-white/40 text-sm">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          Loading contacts…
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Contacts</h1>
            <p className="text-white/40 text-sm mt-0.5">
              {contacts.length} total
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 text-sm font-medium text-white/70 bg-white/6 border border-white/8 hover:bg-white/10 hover:text-white rounded-xl transition-colors"
            >
              Import CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#00ff88] text-[#0a0a0f] hover:bg-[#00e87a] rounded-xl transition-colors shadow-sm shadow-[#00ff88]/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Contacts Table — scrollable on mobile */}
        <div className="bg-[#111118] border border-white/8 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead className="bg-white/[0.04]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide hidden sm:table-cell">Tags</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-white/40 text-sm">
                    No contacts found. Import CSV or add manually.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-t border-white/6 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-white text-sm font-medium">{contact.name}</td>
                    <td className="px-4 py-3 text-white/60 text-sm">{contact.phone}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex gap-1.5 flex-wrap">
                        {contact.tags.length > 0 ? (
                          contact.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-[#00ff88]/10 text-[#00ff88] text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {contact.optedOut ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Opted Out</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#00ff88]/15 text-[#00ff88]">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleToggleOptOut(contact)}
                          className="text-white/40 hover:text-white text-xs transition-colors"
                        >
                          {contact.optedOut ? "Opt In" : "Opt Out"}
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <ImportModal
            onClose={() => setShowImportModal(false)}
            onImport={handleImportCSV}
            fileInputRef={fileInputRef}
          />
        )}

        {/* Add Modal */}
        {showAddModal && (
          <AddContactModal
            onClose={() => setShowAddModal(false)}
            onAdd={() => {
              fetchContacts()
              setShowAddModal(false)
            }}
          />
        )}
    </div>
  )
}

function ImportModal({
  onClose,
  onImport,
  fileInputRef,
}: {
  onClose: () => void
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement>
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111118] border border-white/8 rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-2">Import Contacts</h2>
        <p className="text-white/50 text-sm mb-5">
          Upload a CSV file with columns: name, phone, tags (optional, semicolon-separated)
        </p>

        <div className="mb-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={onImport}
            className="block w-full text-white/60 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#00ff88] file:text-[#0a0a0f] file:text-sm file:font-medium file:cursor-pointer hover:file:bg-[#00e87a]"
          />
        </div>

        <div className="bg-white/[0.04] border border-white/8 rounded-xl p-3 mb-5">
          <p className="text-white/40 text-xs font-mono leading-relaxed">
            name,phone,tags<br />
            John Doe,+1234567890,vip;customer<br />
            Jane Smith,+0987654321,customer
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium text-white/60 bg-white/6 border border-white/8 hover:bg-white/10 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function AddContactModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: () => void
}) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [tags, setTags] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          tags: tags ? tags.split(",").map((t) => t.trim()) : [],
        }),
      })

      const data = await res.json()

      if (res.ok) {
        onAdd()
      } else {
        setError(data.error || "Failed to add contact")
      }
    } catch (err) {
      setError("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111118] border border-white/8 rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold text-white mb-5">Add Contact</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Phone"
            type="tel"
            placeholder="+1234567890"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Input
            label="Tags (comma-separated)"
            type="text"
            placeholder="vip, customer"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-white/60 bg-white/6 border border-white/8 hover:bg-white/10 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-[#00ff88] text-[#0a0a0f] hover:bg-[#00e87a] transition-colors disabled:opacity-50"
            >
              {loading ? "Adding…" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
