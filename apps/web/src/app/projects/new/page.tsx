'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/utils/api'

export default function NewProjectPage() {
  const [name, setName] = useState('')
  const [dbString, setDbString] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetchApi('/v1/projects/connect-db', {
        method: 'POST',
        body: JSON.stringify({ name, dbConnectionString: dbString }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to connect to database')
      }

      router.push('/dashboard')
      router.refresh()
      
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create a Project</h1>
        <p className="text-gray-500 mt-2">
          Connect your Postgres database. Our AI will read your schema and generate a semantic layer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">Project Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Acme Corp Production"
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Database Connection String</label>
          <p className="text-xs text-gray-500 mb-1">
            Must be a PostgreSQL URL (e.g., <code>postgresql://user:pass@host:5432/db</code>)
          </p>
          <input
            type="password"
            required
            value={dbString}
            onChange={(e) => setDbString(e.target.value)}
            placeholder="postgresql://..."
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">
            <strong>Connection Failed:</strong> {error}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Connecting & Generating AI Layer...' : 'Connect Database'}
          </button>
        </div>
      </form>
    </div>
  )
}