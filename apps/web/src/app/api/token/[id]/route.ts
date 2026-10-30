import { NextResponse } from 'next/server'
import { db } from '@vizzly-sa/api/src/lib/db'
import { embedSecrets } from '@vizzly-sa/api/src/db/schema'
import { eq } from 'drizzle-orm'
import { signEmbedToken } from '@vizzly-sa/shared'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const projectId = resolvedParams.id

  try {
    const [secretRecord] = await db.select().from(embedSecrets).where(eq(embedSecrets.projectId, projectId))
    
    if (!secretRecord) {
      return NextResponse.json({ error: "Secret not found" }, { status: 404 })
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