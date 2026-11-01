import { NextResponse } from 'next/server'
import { db } from '@vizzly-sa/api/src/lib/db'
import { embedSecrets, projects } from '@vizzly-sa/api/src/db/schema'
import { eq } from 'drizzle-orm'
import { signEmbedToken } from '@vizzly-sa/shared'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const projectId = resolvedParams.id

  try {
    // S6 FIX: Verify the user is logged in
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // S6 FIX: Verify the user owns this project
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project || project.userId !== user.id) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    // Now fetch the secret and mint the token
    const [secretRecord] = await db.select().from(embedSecrets).where(eq(embedSecrets.projectId, projectId))
    
    if (!secretRecord) {
      return NextResponse.json({ 
        error: "No embed secret found. Please publish the semantic layer first." 
      }, { status: 404 })
    }

    const embedToken = await signEmbedToken(
      {
        tenant_id: "11111111-1111-1111-1111-111111111111",
        user_id: "test-user-123",
        role: "admin"
      },
      {
        secret: secretRecord.secret,
        projectId: projectId,
        ttlSeconds: 3600
      }
    )

    return NextResponse.json({ embedToken })
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}