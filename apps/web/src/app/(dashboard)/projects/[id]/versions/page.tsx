'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchApi } from '@/utils/api'

export default function VersionHistoryPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  
  const [versions, setVersions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [diffVersion, setDiffVersion] = useState<any>(null)
  const [rollingBack, setRollingBack] = useState(false)

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

  const handleViewDiff = async (versionId: string) => {
    try {
      const res = await fetchApi(`/v1/versions/${projectId}/${versionId}`)
      if (!res.ok) throw new Error('Failed to fetch version details')
      const data = await res.json()
      setDiffVersion(data.layer)
    } catch (err) {
      alert('Error loading diff')
    }
  }

  const handleRollback = async (versionId: string) => {
    if (!confirm("Are you sure you want to rollback to this version? This will overwrite your current semantic layer.")) return;
    
    setRollingBack(true)
    try {
      const res = await fetchApi(`/v1/versions/${projectId}/${versionId}/rollback`, {
        method: 'POST'
      })
      if (!res.ok) throw new Error('Failed to rollback')
      
      alert('Successfully rolled back!')
      router.push(`/projects/${projectId}/semantic-layer`)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setRollingBack(false)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 border-b pb-4">
        <Link href={`/projects/${projectId}/semantic-layer`} className="text-sm text-blue-600 hover:underline mb-2 inline-block">
          ← Back to Semantic Layer
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Version History</h1>
        <p className="text-gray-500 mt-1">View and roll back to previous semantic layer configurations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Version List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Published Versions</h2>
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading versions...</div>
          ) : (
            versions.map((v, index) => (
              <div key={v.id} className="bg-white border rounded-lg p-4 flex justify-between items-center shadow-sm">
                <div>
                  <h3 className="font-bold text-gray-900">Version {v.versionNumber} {index === 0 && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Latest</span>}</h3>
                  <p className="text-sm text-gray-500">{new Date(v.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleViewDiff(v.id)}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                  >
                    View Diff
                  </button>
                  {index !== 0 && (
                    <button 
                      onClick={() => handleRollback(v.id)}
                      disabled={rollingBack}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded hover:bg-gray-800 disabled:opacity-50"
                    >
                      Rollback
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Diff Viewer */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Diff Viewer</h2>
          {!diffVersion ? (
            <div className="bg-gray-50 border border-dashed rounded-lg p-12 text-center text-gray-500">
              Click "View Diff" on a version to inspect its configuration.
            </div>
          ) : (
            <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[600px] shadow-inner">
              <pre className="text-xs text-green-400 font-mono">
                {JSON.stringify(diffVersion, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}