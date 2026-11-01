import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@vizzly-sa/api/src/lib/db'
import { projects } from '@vizzly-sa/api/src/db/schema'
import { desc, eq } from 'drizzle-orm' // Import eq
import { UpgradeButton } from '@/app/components/UpgradeButton'

export async function ProjectsList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // S2 FIX: Only fetch projects owned by this user
  const allProjects = await db.select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt))

  return (
    <div>
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Projects</h1>
          <p className="text-gray-500 mt-1">Manage your embedded analytics environments.</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-red-600 hover:underline">Sign out</button>
          </form>
        </div>
      </div>

      {allProjects.length > 0 && (
        <div className="mb-6 flex justify-end">
          <Link 
            href="/projects/new"
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800"
          >
            + New Project
          </Link>
        </div>
      )}
      
      {allProjects.length === 0 ? (
        <div className="text-center p-12 border-2 border-dashed rounded-lg border-gray-300 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-6">Get started by connecting your first database.</p>
          <Link 
            href="/projects/new"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allProjects.map((project) => (
            <div key={project.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  
                  <Link href={`/projects/${project.id}/overview`}>
                    <h2 className="text-xl font-bold text-gray-900 truncate hover:text-blue-600 transition-colors">{project.name}</h2>
                  </Link>
                  
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.planTier === 'free' ? 'bg-gray-100 text-gray-800' : 
                    project.planTier === 'growth' ? 'bg-blue-100 text-blue-800' : 
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {project.planTier.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mb-2 font-mono truncate">
                  ID: {project.id}
                </p>
                <p className="text-sm text-gray-500">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="bg-gray-50 px-6 py-3 border-t rounded-b-lg flex flex-wrap gap-3 justify-between items-center">
                <div className="flex flex-wrap gap-3">
                  <Link 
                    href={`/projects/${project.id}/overview`}
                    className="text-sm font-medium text-gray-800 hover:text-gray-900"
                  >
                    Overview
                  </Link>
                  <Link 
                    href={`/projects/${project.id}/semantic-layer`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Edit Layer
                  </Link>
                  <Link 
                    href={`/projects/${project.id}/audit`}
                    className="text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    Audit Log
                  </Link>
                  <Link 
                    href={`/projects/${project.id}/dashboard`}
                    className="text-sm font-medium text-green-600 hover:text-green-800"
                  >
                    View Dashboard →
                  </Link>
                </div>
                
                {project.planTier === "free" && (
                  <UpgradeButton projectId={project.id} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}