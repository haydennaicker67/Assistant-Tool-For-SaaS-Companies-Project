# Vizzly SA — Next.js Starter Template

This is a minimal Next.js App Router template showing how to embed the Vizzly SA analytics dashboard into your SaaS product.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Setup (10 minutes)](#setup-10-minutes)
  - [1. Install dependencies](#1-install-dependencies)
  - [2. Configure environment variables](#2-configure-environment-variables)
  - [3. Set up Row-Level Security (RLS)](#3-set-up-row-level-security-rls)
  - [4. Generate an embed token](#4-generate-an-embed-token)
  - [5. Render the SDK](#5-render-the-sdk)
- [Run it](#run-it)
- [How it works](#how-it-works)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18 or later and [pnpm](https://pnpm.io/)
- A Vizzly SA account and a published project
- Your Vizzly **Embed Secret** (found in the dashboard)
- A PostgreSQL database you control (Supabase, Neon, etc.)

## Setup (10 minutes)

### 1. Install dependencies

```bash
pnpm install
pnpm add @vizzly-sa/sdk @vizzly-sa/shared
```

### 2. Configure environment variables

Create a `.env.local` file:

```env
VIZZLY_EMBED_SECRET="your-secret-here"
VIZZLY_PROJECT_ID="your-project-id-here"
```

> **Note:** Never prefix `VIZZLY_EMBED_SECRET` with `NEXT_PUBLIC_`. It must stay on the server.

### 3. Set up Row-Level Security (RLS)

In your Postgres database, make sure every table you want to query has a `tenant_id` column, and enable RLS:

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders 
USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```

Repeat this for every table Vizzly should be able to query.

### 4. Generate an embed token

In your SaaS backend (e.g. a Next.js API route), generate a short-lived JWT for the logged-in user:

```ts
// app/api/vizzly-token/route.ts
import { signEmbedToken } from '@vizzly-sa/shared';

export async function GET() {
  // In a real app, get the user's tenant_id from their session
  const tenantId = "your-end-users-tenant-id"; 

  const token = await signEmbedToken(
    { tenant_id: tenantId, user_id: "user_123", role: "viewer" },
    { secret: process.env.VIZZLY_EMBED_SECRET!, projectId: process.env.VIZZLY_PROJECT_ID! }
  );

  return Response.json({ token });
}
```

> **Note:** Because the RLS policy above casts `tenant_id` to `uuid`, the `tenant_id` you put in the token must be a valid UUID.

### 5. Render the SDK

Pass the token to `<VizzlyProvider>` and render `<NLQueryInput>`:

```tsx
// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { VizzlyProvider, NLQueryInput } from '@vizzly-sa/sdk';

export default function Dashboard() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/vizzly-token')
      .then(res => res.json())
      .then(data => setToken(data.token));
  }, []);

  if (!token) return <div>Loading analytics...</div>;

  return (
    <VizzlyProvider 
      embedToken={token} 
      controlPlaneUrl="https://api.vizzly.co.za" // Or your local API URL
      projectId="your-project-id-here"
    >
      <div className="p-8">
        <h1>Analytics</h1>
        <NLQueryInput placeholder="Ask a question about your data..." />
      </div>
    </VizzlyProvider>
  );
}
```

## Run it

```bash
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000) and ask a question about your data.

## How it works

1. Your backend signs a short-lived embed token containing the user's `tenant_id`, `user_id` and `role`.
2. `<VizzlyProvider>` uses that token to authenticate every request from the browser.
3. Before each query, Vizzly sets `app.tenant_id` on the database session, so your RLS policy restricts results to that tenant's rows only.

## Troubleshooting

| Problem | Likely cause |
| --- | --- |
| `401 Unauthorized` from the API | Token expired or signed with the wrong secret. Fetch a fresh token and check `VIZZLY_EMBED_SECRET`. |
| Queries return no rows | The `tenant_id` in the token doesn't match the `tenant_id` values in your tables. |
| `invalid input syntax for type uuid` | Your `tenant_id` claim or column isn't a UUID. Use UUIDs, or change the `::uuid` cast in your policy. |
| Requests fail in the browser | Check that `controlPlaneUrl` points to a running API and that CORS allows your origin. |
| Imports don't resolve | If you're running this inside the monorepo, import paths may differ slightly from the published packages. |