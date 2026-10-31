'use client'

import { useState } from 'react'
import { fetchApi } from '@/utils/api'

export function UpgradeButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetchApi('/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ projectId, tier: 'growth' })
      })
      const data = await res.json()
      
      if (data.url) {
        window.location.href = data.url; // Redirect to Paystack
      } else {
        alert("Failed to initialize payment.")
      }
    } catch (err) {
      alert("Error connecting to billing server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleUpgrade}
      disabled={loading}
      className="text-xs font-bold text-white bg-gray-900 px-3 py-1.5 rounded hover:bg-gray-800 transition-colors whitespace-nowrap disabled:opacity-50"
    >
      {loading ? 'Loading...' : 'Upgrade'}
    </button>
  )
}