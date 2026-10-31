'use client'

import { useState } from 'react'

export function UpgradeButton({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/v1/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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