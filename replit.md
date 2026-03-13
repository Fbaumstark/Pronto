# AI App Builder — Workspace

## Overview

A full-stack AI-powered app building tool similar to Replit, where users describe what they want to build and Claude AI generates the code in real time.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Anthropic Claude via Replit AI Integrations (`@workspace/integrations-anthropic-ai`)
- **Frontend**: React + Vite + Tailwind CSS + CodeMirror

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── ai-builder/         # React frontend (AI builder UI)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   ├── integrations-anthropic-ai/  # Anthropic AI client
│   └── replit-auth-web/    # useAuth() hook for browser auth state
├── scripts/
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Features

- **User accounts**: Replit Auth (OIDC/PKCE) — login page, session management, logout
- **Projects**: Create and manage multiple app-building projects (per user in future)
- **Chat interface**: Describe what to build in natural language
- **AI code generation**: Claude generates complete, working HTML/CSS/JS code
- **File tree**: View and manage generated files per project
- **Live preview**: Instant preview of generated HTML in an iframe
- **Streaming**: Real-time streaming of Claude's response as it writes code
- **Code editor**: CodeMirror syntax-highlighted code viewer
- **Responsive preview**: Desktop, tablet, and mobile preview modes
- **AI Provider toggle**: Switch between Replit AI Integration and own Anthropic API key
- **Templates**: 6 built-in starter templates (Landing Page, Portfolio, Dashboard, Todo App, Blog, E-Commerce)
- **Version History**: Auto-snapshot saved after every AI generation; restore any prior version
- **Deployment**: One-click publish to stable public URL (`/api/published/:slug`); take offline anytime
- **Custom Domains**: Attach a custom domain to a deployed project (CNAME-based)
- **Credits system**: 50,000 free credits on signup; 5,000 deducted per AI request; balance shown in sidebar

## Database Schema

- `projects` — project name, description, userId (FK), timestamps
- `project_files` — files per project (filename, content, language)
- `project_messages` — chat history per project (role, content)
- `project_versions` — file snapshots (projectId, versionNumber, label, filesSnapshot JSON)
- `deployments` — deployment records (projectId, slug, customDomain, isLive)
- `credit_ledger` — credit transactions (userId, amount, type, description)
- `templates` — starter templates (name, description, category, emoji, files JSON)
- `app_settings` — AI provider setting + optional own Anthropic API key
- `users` — Replit Auth user records (id, email, firstName, lastName, profileImageUrl)
- `sessions` — server-side session storage for auth

## Key API Endpoints

All routes prefixed with `/api`:

- `GET /projects` — list projects (filtered by userId when authenticated)
- `POST /projects` — create project (optional templateId in body)
- `GET /projects/:id` — get project with files + messages
- `DELETE /projects/:id` — delete project
- `GET /projects/:id/files` — list files
- `GET /projects/:id/messages` — list messages
- `POST /projects/:id/messages` — send message (SSE streaming, deducts 5k credits, auto-saves version)
- `GET /projects/:id/preview` — serve HTML preview
- `PUT /projects/:projectId/files/:fileId` — update file content
- `GET /templates` — list all templates
- `GET /projects/:id/versions` — list version snapshots
- `POST /projects/:id/versions/restore/:versionId` — restore a version
- `GET /projects/:id/deployment` — get deployment status
- `POST /projects/:id/deploy` — deploy/redeploy project
- `POST /projects/:id/undeploy` — take project offline
- `PUT /projects/:id/deployment/domain` — set custom domain
- `GET /published/:slug` — serve published app (public, no auth)
- `GET /credits` — get current user credit balance
- `GET /credits/history` — get credit transaction history

## How AI Code Generation Works

1. User sends a message to the project chat
2. Backend fetches current project files and chat history
3. Anthropic Claude receives a system prompt with file context
4. Claude streams back a response with explanations + `<file name="...">` blocks
5. Backend parses file blocks, updates DB, sends SSE events to frontend
6. Frontend updates file tree and auto-refreshes preview

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all lib packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **Codegen** — `pnpm --filter @workspace/api-spec run codegen`
- **DB push** — `pnpm --filter @workspace/db run push`
