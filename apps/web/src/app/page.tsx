import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'



export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Your Projects</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user.email}</span>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-red-600 hover:underline">Sign out</button>
          </form>
        </div>
      </div>
      
      <div className="text-center p-12 border-2 border-dashed rounded-lg border-gray-300">
        <p className="text-gray-500 mb-4">You don't have any projects yet.</p>
        <Link 
          href="/projects/new"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
       >
          Create Project
        </Link>
      </div>
    </div>
  )
}