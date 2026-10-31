'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchApi } from '@/utils/api'

export default function ProjectOverviewPage() {
  const params = useParams()
  const projectId = params.id as string
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetchApi(`/v1/analytics/${projectId}/usage`)
        if (!res.ok) throw new Error('Failed to fetch usage')
        const data = await res.json()
        setChartData(data.chartData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchUsage()
  }, [projectId])

  const maxQueries = Math.max(...chartData.map(d => d.queries), 1);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 border-b pb-4 flex justify-between items-end">
        <div>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Back to Projects
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Project Overview</h1>
          <p className="text-gray-500 mt-1">Track usage and performance for this environment.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Chart Card */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Queries (Last 7 Days)</h2>
          
          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-400">Loading chart...</div>
          ) : chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400">No usage data yet.</div>
          ) : (
            <div className="flex items-end gap-2 h-48 border-b border-gray-200 pb-2">
              {chartData.map((d, i) => {
                const heightPct = (d.queries / maxQueries) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <div className="absolute -top-6 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.queries}
                    </div>
                    <div 
                      className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors" 
                      style={{ height: `${heightPct}%`, minHeight: '4px' }} 
                    />
                    <div className="text-[10px] text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                      {d.date.slice(5)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <Link href={`/projects/${projectId}/dashboard`} className="block bg-green-50 border border-green-200 rounded-lg p-6 hover:bg-green-100 transition-colors">
            <h3 className="font-bold text-green-900 mb-1">Live Test Dashboard</h3>
            <p className="text-sm text-green-700">Interact with the actual SDK and ask questions.</p>
          </Link>
          
          <Link href={`/projects/${projectId}/semantic-layer`} className="block bg-blue-50 border border-blue-200 rounded-lg p-6 hover:bg-blue-100 transition-colors">
            <h3 className="font-bold text-blue-900 mb-1">Edit Semantic Layer</h3>
            <p className="text-sm text-blue-700">Refine AI descriptions and add custom metrics.</p>
          </Link>

          <Link href={`/projects/${projectId}/audit`} className="block bg-gray-50 border border-gray-200 rounded-lg p-6 hover:bg-gray-100 transition-colors">
            <h3 className="font-bold text-gray-900 mb-1">View Audit Log</h3>
            <p className="text-sm text-gray-700">Check compliance and user activity.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}