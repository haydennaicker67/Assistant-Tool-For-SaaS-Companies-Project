'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchApi } from '@/utils/api'

function SemanticLayerContent() {
  const params = useParams()
  const projectId = params.id as string
  
  const [layer, setLayer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [embedSecret, setEmbedSecret] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLayer() {
      try {
        const res = await fetchApi(`/v1/projects/${projectId}/semantic-layer`)
        if (!res.ok) throw new Error('Failed to fetch semantic layer')
        const data = await res.json()
        setLayer(data.layer)
        if (data.secret) setEmbedSecret(data.secret) 
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchLayer()
  }, [projectId])

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetchApi(`/v1/projects/${projectId}/semantic-layer/publish`, {
        method: 'POST',
        body: JSON.stringify({ layer }), 
      })
      if (!res.ok) throw new Error('Failed to publish')
      const data = await res.json()
      setEmbedSecret(data.secret)
      alert(`Successfully published version ${data.version || ''}!`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setPublishing(false)
    }
  }

  const addMetric = () => {
    const newLayer = { ...layer }
    if (!newLayer.metrics) newLayer.metrics = []
    newLayer.metrics.push({ name: "", label: "", description: "", sqlExpression: "" })
    setLayer(newLayer)
  }

  const updateMetric = (index: number, field: string, value: string) => {
    const newLayer = { ...layer }
    newLayer.metrics[index][field] = value
    setLayer(newLayer)
  }

  if (loading) return <div className="p-8 text-center">Loading semantic layer...</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>

  return (
    <div className="max-w-5xl mx-auto p-8 pb-32">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Semantic Layer</h1>
          <p className="text-gray-500 mt-1">Review the AI-generated descriptions and define custom metrics.</p>
        </div>
        
        <div className="flex gap-4">
          <Link 
            href={`/projects/${projectId}/versions`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200"
          >
            Version History
          </Link>
          <button 
            onClick={handlePublish}
            disabled={publishing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {publishing ? 'Publishing...' : 'Save & Publish Layer'}
          </button>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-4">Tables & Columns</h2>
      <div className="space-y-8 mb-12">
        {layer?.tables?.map((table: any) => (
          <div key={table.name} className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-semibold text-gray-800">{table.name}</h3>
              <p className="text-sm text-gray-500">{table.description}</p>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3">Column</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-center">Dimension</th>
                  <th className="px-4 py-3 text-center">Measure</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((col: any) => (
                  <tr key={col.name} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-800">{col.name}</td>
                    <td className="px-4 py-3 text-gray-500">{col.type}</td>
                    <td className="px-4 py-3">
                      <input 
                        type="text" 
                        defaultValue={col.description}
                        onChange={(e) => { col.description = e.target.value }}
                        className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" defaultChecked={col.isDimension} onChange={(e) => { col.isDimension = e.target.checked }} className="w-4 h-4 text-blue-600" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" defaultChecked={col.isMeasure} onChange={(e) => { col.isMeasure = e.target.checked }} className="w-4 h-4 text-blue-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-lg shadow-sm p-6 mb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Custom Metrics</h2>
            <p className="text-sm text-gray-500">Define business logic (e.g., Revenue) so users don't have to write SQL.</p>
          </div>
          <button onClick={addMetric} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200">
            + Add Metric
          </button>
        </div>

        {(!layer?.metrics || layer.metrics.length === 0) ? (
          <p className="text-sm text-gray-500 italic text-center py-4">No custom metrics defined yet.</p>
        ) : (
          <div className="space-y-4">
            {layer.metrics.map((metric: any, i: number) => (
              <div key={i} className="grid grid-cols-12 gap-4 items-start p-4 bg-gray-50 rounded-lg border">
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input 
                    type="text" 
                    value={metric.name}
                    onChange={(e) => updateMetric(i, 'name', e.target.value)}
                    placeholder="e.g. revenue"
                    className="w-full px-2 py-1 text-sm border rounded" 
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                  <input 
                    type="text" 
                    value={metric.label}
                    onChange={(e) => updateMetric(i, 'label', e.target.value)}
                    placeholder="e.g. Total Revenue"
                    className="w-full px-2 py-1 text-sm border rounded" 
                  />
                </div>
                <div className="col-span-6">
                  <label className="block text-xs font-medium text-gray-700 mb-1">SQL Expression</label>
                  <input 
                    type="text" 
                    value={metric.sqlExpression}
                    onChange={(e) => updateMetric(i, 'sqlExpression', e.target.value)}
                    placeholder="e.g. SUM(orders.amount)"
                    className="w-full px-2 py-1 text-sm font-mono border rounded" 
                  />
                </div>
                <div className="col-span-12">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input 
                    type="text" 
                    value={metric.description}
                    onChange={(e) => updateMetric(i, 'description', e.target.value)}
                    placeholder="What does this metric represent?"
                    className="w-full px-2 py-1 text-sm border rounded" 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {embedSecret && (
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold text-blue-900 mb-2">Success! Your Embed Secret</h2>
          <p className="text-sm text-blue-800 mb-4">
            Save this secret and put it in your backend's <code>.env</code> file. 
            You will use it to sign JWTs for your end-users. It will only be shown once.
          </p>
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              readOnly 
              value={embedSecret}
              className="w-full px-3 py-2 font-mono text-sm bg-white border border-blue-300 rounded-md focus:outline-none"
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(embedSecret)
                alert('Copied to clipboard!')
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
            >
              Copy
            </button>
          </div>

          <Link 
            href={`/projects/${projectId}/dashboard`}
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-md font-bold hover:bg-green-700 transition-colors"
          >
            Go to Test Dashboard →
          </Link>
        </div>
      )}
    </div>
  )
}

export default function SemanticLayerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading dashboard...</div>}>
      <SemanticLayerContent />
    </Suspense>
  )
}