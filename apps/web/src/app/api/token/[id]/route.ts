import { NextResponse } from 'next/server'
import { db } from '@vizzly-sa/api/src/lib/db'
import { projects } from '@vizzly-sa/api/src/db/schema'
import { eq } from 'drizzle-orm'
import { signEmbedToken } from '@vizzly-sa/shared'
import { decrypt } from '@vizzly-sa/api/src/lib/crypto'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const projectId = resolvedParams.id

  // S12 FIX: Allow passing a role for testing (defaults to admin)
  const url = new URL(request.url);
  const testRole = url.searchParams.get("role") || "admin"; 
  const role = (["viewer", "editor", "admin"].includes(testRole) ? testRole : "admin") as "viewer" | "editor" | "admin";

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
    if (!project || project.userId !== user.id) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 })
    }

    if (!project.embedPrivateKeyEncrypted) {
      return NextResponse.json({ 
        error: "Please publish the semantic layer first to generate RSA keys." 
      }, { status: 400 })
    }

    const privateKey = decrypt(project.embedPrivateKeyEncrypted);

    const embedToken = await signEmbedToken(
      {
        tenant_id: "11111111-1111-1111-1111-111111111111",
        user_id: "test-user-123",
        role: role // S12 FIX: Use the dynamic role
      },
      {
        privateKey: privateKey,
        projectId: projectId,
        ttlSeconds: 3600
      }
    )

    return NextResponse.json({ embedToken })
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}