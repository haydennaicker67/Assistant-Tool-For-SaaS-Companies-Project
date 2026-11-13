'use client'

import { useState } from 'react'
import { fetchApi } from '@/utils/api'

export function DeleteProjectButton({ projectId, projectName }: { projectId: string, projectName: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete "${projectName}"? This will permanently delete all audit logs and usage data.`)) return;
    
    setLoading(true)
    try {
      const res = await fetchApi(`/v1/projects/${projectId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      window.location.reload()
    } catch (err: any) {
      alert(err.message)
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
    >
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  )
}