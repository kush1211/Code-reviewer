# Reviewly — Frontend

Next.js 14 dashboard for Reviewly. Displays connected repos, pull requests, and AI-generated review details.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/repos` | Connected repositories dashboard |
| `/repos/[id]` | Repo detail — PR list with review status |
| `/repos/[id]/prs/[prId]` | PR review detail — verdict, summary, inline comments |

## Tech Stack

- **Next.js 14** — App Router
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** components

## Getting Started

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```
