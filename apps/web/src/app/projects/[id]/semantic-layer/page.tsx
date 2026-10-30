'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// 1. The actual page content
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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/projects/${projectId}/semantic-layer`)
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/projects/${projectId}/semantic-layer/publish`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to publish')
      const data = await res.json()
      setEmbedSecret(data.secret)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setPublishing(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading semantic layer...</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Semantic Layer</h1>
          <p className="text-gray-500 mt-1">Review the AI-generated descriptions before publishing.</p>
        </div>
        <button 
          onClick={handlePublish}
          disabled={publishing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {publishing ? 'Publishing...' : 'Publish Layer'}
        </button>
      </div>

      <div className="space-y-8">
        {layer?.tables?.map((table: any) => (
          <div key={table.name} className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h2 className="text-lg font-semibold text-gray-800">{table.name}</h2>
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
                        className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" defaultChecked={col.isDimension} className="w-4 h-4 text-blue-600" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" defaultChecked={col.isMeasure} className="w-4 h-4 text-blue-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
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

// 2. The Suspense wrapper (fixes the Next.js 16 error)
export default function SemanticLayerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading dashboard...</div>}>
      <SemanticLayerContent />
    </Suspense>
  )
}