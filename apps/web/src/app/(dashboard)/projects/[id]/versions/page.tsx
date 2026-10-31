'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchApi } from '@/utils/api'

export default function VersionHistoryPage() {
  const params = useParams()
  const projectId = params.id as string
  const [versions, setVersions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await fetchApi(`/v1/versions/${projectId}`)
        if (!res.ok) throw new Error('Failed to fetch versions')
        const data = await res.json()
        setVersions(data.versions)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchVersions()
  }, [projectId])

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8 border-b pb-4">
        <Link href={`/projects/${projectId}/semantic-layer`} className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← Back to Semantic Layer
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Version History</h1>
        <p className="text-gray-500 mt-1">View and roll back to previous semantic layer configurations.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading versions...</div>
      ) : (
        <div className="space-y-4">
          {versions.map((v, index) => (
            <div key={v.id} className="bg-white border rounded-lg p-4 flex justify-between items-center shadow-sm">
              <div>
                <h3 className="font-bold text-gray-900">Version {v.versionNumber} {index === 0 && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Latest</span>}</h3>
                <p className="text-sm text-gray-500">{new Date(v.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100">
                  View Diff
                </button>
                {index !== 0 && (
                  <button className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded hover:bg-gray-800">
                    Rollback
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}