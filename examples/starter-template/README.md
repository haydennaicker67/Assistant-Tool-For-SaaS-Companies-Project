# Vizzly SA — Next.js Starter Template
 
This template shows how to embed Vizzly into a Next.js App Router project. Follow the steps below and you'll have natural-language querying running against your own tenant-isolated data in about 10 minutes.
 
## Table of Contents
 
- [Prerequisites](#prerequisites)
- [Setup (10 minutes)](#setup-10-minutes)
  - [1. Install dependencies](#1-install-dependencies)
  - [2. Configure environment variables](#2-configure-environment-variables)
  - [3. Generate your embed token](#3-generate-your-embed-token)
  - [4. Render the SDK](#4-render-the-sdk)
  - [5. Set up Row-Level Security](#5-set-up-row-level-security)
- [Run it](#run-it)
- [How it works](#how-it-works)
- [Troubleshooting](#troubleshooting)
## Prerequisites
 
- Node.js 18 or later
- [pnpm](https://pnpm.io/) 8 or later
- A PostgreSQL database you control (for the RLS step)
- A Vizzly project ID and embed secret
## Setup (10 minutes)
 
### 1. Install dependencies
 
```bash
pnpm install
```
 
### 2. Configure environment variables
 
Create a `.env.local` file in the root of the template:
 
```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
```
 
For the server-side token signing in step 3, you will also need these variables available to your backend:
 
```env
VIZZLY_EMBED_SECRET="your-embed-secret"
VIZZLY_PROJECT_ID="your-project-id"
```
 
> **Note:** Never prefix `VIZZLY_EMBED_SECRET` with `NEXT_PUBLIC_`. It must stay on the server.
 
### 3. Generate your embed token
 
Vizzly uses short-lived JWTs to authenticate end-users. In your SaaS backend, use the `@vizzly-sa/shared` package to sign a token for the logged-in user:
 
```ts
import { signEmbedToken } from '@vizzly-sa/shared';
 
const token = await signEmbedToken(
  { tenant_id: "user_123", user_id: "merchant_456", role: "viewer" },
  { secret: process.env.VIZZLY_EMBED_SECRET!, projectId: process.env.VIZZLY_PROJECT_ID! }
);
```
 
Pass the resulting `token` to your frontend (for example via a server component prop or an authenticated API route).
 
### 4. Render the SDK
 
Pass the token to the `<VizzlyProvider>`:
 
```tsx
<VizzlyProvider embedToken={token} controlPlaneUrl="..." projectId="...">
  <NLQueryInput />
</VizzlyProvider>
```
 
Replace `controlPlaneUrl` and `projectId` with the values for your Vizzly project.
 
### 5. Set up Row-Level Security
 
Vizzly expects your database tables to have a `tenant_id` column and Row-Level Security enabled:
 
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders 
USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
```
 
Repeat this for every table you want Vizzly to be able to query.
 
## Run it
 
```bash
pnpm dev
```
 
Then open [http://localhost:3000](http://localhost:3000) and try a natural-language query in the input.
 
## How it works
 
1. Your backend signs a short-lived embed token containing the user's `tenant_id`, `user_id` and `role`.
2. The `<VizzlyProvider>` uses that token to authenticate every request from the browser.
3. When a query runs, `app.tenant_id` is set on the database session, so your RLS policy restricts results to that tenant's rows only.
## Troubleshooting
 
| Problem | Likely cause |
| --- | --- |
| `401 Unauthorized` from the API | Token expired or signed with the wrong secret. Generate a fresh token and check `VIZZLY_EMBED_SECRET`. |
| Queries return no rows | The `tenant_id` in the token doesn't match the `tenant_id` values in your tables. |
| `invalid input syntax for type uuid` | Your `tenant_id` column or token claim isn't a UUID. Either use UUIDs or change the `::uuid` cast in your policy. |
| Requests fail in the browser | Check that `NEXT_PUBLIC_API_BASE_URL` points to a running API and that CORS allows your origin. |