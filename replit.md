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

## Database Schema

- `projects` — project name, description, timestamps
- `project_files` — files per project (filename, content, language)
- `project_messages` — chat history per project (role, content)
- `app_settings` — AI provider setting + optional own Anthropic API key
- `users` — Replit Auth user records (id, email, firstName, lastName, profileImageUrl)
- `sessions` — server-side session storage for auth

## Key API Endpoints

All routes prefixed with `/api`:

- `GET /projects` — list all projects
- `POST /projects` — create project
- `GET /projects/:id` — get project with files + messages
- `DELETE /projects/:id` — delete project
- `GET /projects/:id/files` — list files
- `GET /projects/:id/messages` — list messages
- `POST /projects/:id/messages` — send message (SSE streaming)
- `GET /projects/:id/preview` — serve HTML preview
- `PUT /projects/:projectId/files/:fileId` — update file content

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
