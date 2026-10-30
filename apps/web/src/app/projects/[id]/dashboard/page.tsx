import { db } from '@vizzly-sa/api/src/lib/db'
import { embedSecrets } from '@vizzly-sa/api/src/db/schema'
import { eq } from 'drizzle-orm'
import { signEmbedToken } from '@vizzly-sa/shared'
import { TestDashboardClient } from './client'

export default async function TestDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const projectId = resolvedParams.id

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Test Dashboard</h1>
        <p className="text-gray-500 mt-1">
          This is exactly what your end-users will see. 
          It is rendering the <code>@vizzly-sa/sdk</code> live against your database.
        </p>
      </div>

      <TestDashboardClient projectId={projectId} />
    </div>
  )
}