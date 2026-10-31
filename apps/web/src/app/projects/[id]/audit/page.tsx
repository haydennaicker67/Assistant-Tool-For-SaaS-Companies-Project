'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchApi } from '@/utils/api'

export default function AuditLogPage() {
  const params = useParams()
  const projectId = params.id as string
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetchApi(`/v1/audit/${projectId}`)
        if (!res.ok) throw new Error('Failed to fetch logs')
        const data = await res.json()
        setLogs(data.logs)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [projectId])

  const formatAction = (action: string) => {
    const badges: Record<string, string> = {
      query: 'bg-blue-100 text-blue-800',
      semantic_update: 'bg-purple-100 text-purple-800',
      export: 'bg-green-100 text-green-800',
      login: 'bg-gray-100 text-gray-800'
    }
    return badges[action] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex justify-between items-end border-b pb-4">
        <div>
          <Link href={`/projects/${projectId}/semantic-layer`} className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Project
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-500 mt-1">Track all activity across your environment for compliance.</p>
        </div>
        <button className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800">
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading audit logs...</div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Actor</th>
                <th className="px-6 py-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No audit logs found yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${formatAction(log.action)}`}>
                        {log.action.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      {log.actorId}
                    </td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-xs">
                      {log.action === 'query' ? `"${log.details.question}"` : 
                       log.action === 'semantic_update' ? log.details.message : 
                       JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}