*This project has been created as part of the 42 curriculum by <login1>, <login2>, <login3>, <login4>.*

<!-- TODO (team): replace every <...> placeholder and every "TODO" below before the evaluation. -->

# FibreFlow

## Description

**FibreFlow** is a web application for managing fibre-optic installation and repair
interventions. Organizations (telecom subcontractors) plan interventions, assign them to
their field technicians, follow their progress in real time and collect customer
satisfaction feedback once the job is done.

Key features:

- Secure sign-up / login (email + password, bcrypt-hashed, JWT sessions).
- Three roles: **Super admin** (manages organizations), **Admin** (manages a team and
  plans interventions), **Technician** (handles assigned interventions).
- Multi-organization isolation: a user only ever sees the data of their own organization.
- Intervention planning, assignment, status workflow (`ASSIGNED → EN_ROUTE →
  IN_PROGRESS → COMPLETED / FAILED`) and written intervention reports.
- Real-time updates across all connected users (WebSocket).
- Messaging (group channels and direct messages) inside an organization.
- Friends system between technicians, with notifications.
- Avatar upload.
- Customer satisfaction survey through a unique, public link generated when an
  intervention is completed.
- Admin dashboard with activity feed and statistics (charts).
- Privacy Policy and Terms of Service pages.

## Instructions

### Prerequisites

- Docker ≥ 24 with Docker Compose v2 (`docker compose`)
- GNU Make and OpenSSL (used to generate secrets in `.env`)
- Latest stable Google Chrome

### Run

```bash
git clone <repo-url> fibreflow && cd fibreflow
make
```

`make` creates `.env` from `.env.example` (with a random `JWT_SECRET`, database password
and super-admin password) if it does not exist yet, then runs `docker compose up --build -d`.

Open **https://localhost:8443** (the certificate is self-signed: accept the browser warning).
Ports default to 8443 (HTTPS) and 8080 (HTTP → HTTPS redirect) because rootless
Podman/Docker, as used on 42 machines, cannot bind ports below 1024. Change
`HTTPS_PORT` / `HTTP_PORT` in `.env` if needed.

The first **super admin** account is created at start-up from `SUPER_ADMIN_EMAIL` /
`SUPER_ADMIN_PASSWORD` in `.env`.

Other commands: `make down` (stop), `make logs`, `make clean` (stop **and delete all
data**), `make re`.

### Environment variables

See `.env.example`. `.env` is ignored by Git and must never be committed.

| Variable | Description |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Database credentials |
| `JWT_SECRET` | JWT signing secret (≥ 32 chars) |
| `FRONTEND_URL` | Public URL of the site (CORS) |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | First super-admin account |
| `VITE_API_URL` | API URL seen by the browser (default `/api`, same origin) |
| `SERVER_NAME` | Host name for the self-signed TLS certificate |
| `HTTP_PORT` / `HTTPS_PORT` | Ports published on the host (default 8080 / 8443) |

## Architecture

```
Browser ──HTTPS/WSS──► nginx (host 8443 → 443, TLS, reverse proxy)
                         ├── /        → frontend  (React build served by nginx)
                         ├── /api/    → backend   (Express, port 3001)
                         ├── /uploads → backend   (avatars)
                         └── /ws      → backend   (WebSocket)
                                          └──► PostgreSQL (internal network only)
```

HTTP (host port 8080) only redirects to HTTPS. The database is not exposed outside Docker.

## Team Information

| Login | Role(s) | Responsibilities |
|---|---|---|
| <login1> | Product Owner + Developer | TODO |
| <login2> | Project Manager + Developer | TODO |
| <login3> | Tech Lead + Developer | TODO |
| <login4> | Developer | TODO |

## Project Management

- Work organization: TODO (task split, meeting rhythm…)
- Tools: TODO (GitHub Issues, Trello, Notion…)
- Communication: TODO (Discord, Slack…)

## Technical Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + TypeScript, Vite | Component model, typing, fast builds |
| Styling | Tailwind CSS, lucide-react icons | Responsive utility-first styling |
| Charts | Recharts | Dashboard statistics |
| Backend | Node.js 20, Express 4, TypeScript | Simple, well-known HTTP framework |
| Validation | Zod | Schema validation of every request body |
| Auth | bcryptjs, jsonwebtoken | Salted password hashing, stateless sessions |
| Real time | `ws` | Lightweight WebSocket server |
| ORM | Prisma | Typed queries, versioned migrations |
| Database | PostgreSQL 15 | Relational data with strong constraints |
| Infra | Docker Compose, nginx | Single-command deployment, TLS termination |

TODO (team): add your own justifications if they differ.

## Database Schema

Defined in `backend/prisma/schema.prisma` (migrations in `backend/prisma/migrations`).

```
Organization 1──n User
Organization 1──n Intervention
Organization 1──n ActivityLog
Organization 1──n Channel
User 1──n Intervention           (technician assigned)
Intervention 1──n InterventionReport n──1 User (technician)
Intervention 1──1 SatisfactionRating
Channel 1──n ChannelMember n──1 User
Channel 1──n Message n──1 User (sender)
User 1──n Friendship (requester / receiver)
User 1──n Notification
```

| Table | Key fields |
|---|---|
| `Organization` | `id` (uuid), `name` |
| `User` | `id`, `email` (unique), `passwordHash`, `fullName`, `role` (SUPER_ADMIN/ADMIN/TECHNICIAN), `status`, `organizationId`, `avatarUrl` |
| `Intervention` | `id`, `organizationId`, `clientName`, `clientAddress`, `fibreSocket`, `priority`, `status`, `technicianId`, `scheduledAt`, `satisfactionToken` (unique) |
| `InterventionReport` | `id`, `interventionId`, `technicianId`, `content`, `actionTaken` |
| `SatisfactionRating` | `id`, `interventionId` (unique), `rating` (1-5), `comment` |
| `ActivityLog` | `id`, `organizationId`, `interventionId`, `technicianId`, `action`, `detail` |
| `Channel` / `ChannelMember` / `Message` | messaging (DM or GROUP channels) |
| `Friendship` | `requesterId`, `receiverId`, `status` (PENDING/ACCEPTED/REJECTED) |
| `Notification` | `userId`, `type`, `title`, `message`, `read` |

## Features List

| Feature | Description | Member(s) |
|---|---|---|
| Authentication | Sign-up, login, JWT session, password change | TODO |
| Roles & permissions | Super admin / admin / technician access rules | TODO |
| Organizations | Creation and isolation of organizations | TODO |
| Intervention planning | Creation, assignment, filters, status workflow | TODO |
| Intervention reports | Technicians write reports per intervention | TODO |
| Real-time updates | WebSocket notification of data changes | TODO |
| Messaging | Group channels and DMs | TODO |
| Friends & notifications | Friend requests between technicians | TODO |
| Avatar upload | PNG/JPEG/WebP, 2 MB max | TODO |
| Satisfaction survey | Public one-time link after completion | TODO |
| Admin dashboard | Activity feed and statistics | TODO |
| Legal pages | Privacy Policy, Terms of Service | TODO |

## Modules

<!-- TODO (team): keep only the modules you actually claim and can defend.
     The list below is a proposal based on what is in the code. 14 points minimum. -->

| Module | Type | Points | Implementation | Member(s) |
|---|---|---|---|---|
| Framework for both frontend and backend (React + Express) | Major | 2 | TODO | TODO |
| Real-time features with WebSockets | Major | 2 | `backend/src/ws.ts`, `frontend/src/lib/realtime.ts` | TODO |
| User interaction (chat, profiles, friends) | Major | 2 | TODO | TODO |
| Standard user management and authentication | Major | 2 | TODO | TODO |
| Advanced permissions system | Major | 2 | TODO | TODO |
| Organization system | Major | 2 | TODO | TODO |
| ORM (Prisma) | Minor | 1 | TODO | TODO |
| Notification system | Minor | 1 | TODO | TODO |
| File upload and management | Minor | 1 | TODO | TODO |
| **Total** | | **15** | | |

## Individual Contributions

### <login1>
TODO: features / modules / components implemented, challenges and how they were solved.

### <login2>
TODO

### <login3>
TODO

### <login4>
TODO

## Resources

- React — https://react.dev
- Express — https://expressjs.com
- Prisma — https://www.prisma.io/docs
- PostgreSQL — https://www.postgresql.org/docs/
- `ws` — https://github.com/websockets/ws
- Zod — https://zod.dev
- Tailwind CSS — https://tailwindcss.com/docs
- nginx — https://nginx.org/en/docs/
- OWASP Cheat Sheet Series — https://cheatsheetseries.owasp.org

### Use of AI

TODO (team): describe honestly which tasks AI was used for (e.g. code review, security
audit, documentation drafting, debugging) and on which parts of the project.

## Known limitations

- The TLS certificate is self-signed (local evaluation only).
- The JWT is stored in `localStorage`; logout is client-side only (token valid until expiry, 7 days).
