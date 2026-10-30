'use client'

import { useEffect, useState, useRef } from 'react'
import { VizzlyProvider, NLQueryInput } from '@vizzly-sa/sdk'

export function TestDashboardClient({ projectId }: { projectId: string }) {
  const [embedToken, setEmbedToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fetched = useRef(false)

  useEffect(() => {
    // Prevent double-fetching in React 18/19 Strict Mode
    if (fetched.current) return
    fetched.current = true

    async function fetchToken() {
      try {
        const res = await fetch(`/api/token/${projectId}`)
        if (!res.ok) throw new Error('Failed to fetch token')
        const data = await res.json()
        setEmbedToken(data.embedToken)
      } catch (err: any) {
        setError(err.message)
      }
    }
    fetchToken()
  }, [projectId])

  if (error) return <div className="text-red-500">Error: {error}</div>
  if (!embedToken) return <div className="text-gray-500 p-4">Generating secure session...</div>

  return (
    <VizzlyProvider 
      embedToken={embedToken} 
      controlPlaneUrl={process.env.NEXT_PUBLIC_API_BASE_URL!}
      projectId={projectId}
    >
      <div className="p-6 bg-white border rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Ask a question about your data</h2>
        <NLQueryInput />
      </div>
    </VizzlyProvider>
  )
}