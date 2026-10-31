import { Suspense } from 'react'
import { ProjectsList } from './ProjectsList'

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Suspense fallback={
        <div className="p-12 text-center text-gray-500">
          Loading your projects...
        </div>
      }>
        <ProjectsList />
      </Suspense>
    </div>
  )
}