# PrajaMitra — Government Citizen Grievance Portal

A full-stack citizen complaint management system for Indian government departments.

## Stack

- **Backend**: Node.js + Express (`server.js`)
- **Frontend**: Vanilla HTML/CSS/JS (served as static files)
- **Admin Panel**: React + Vite (`src/admin/`, built to `admin-dist/`)
- **Database**: JSON file (`database.json`, auto-created on first run)
- **AI**: Google Gemini API (optional — app works without it)

## Running the App

```bash
node server.js
```

Runs on **port 5000**. The workflow "Start application" handles this automatically.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Google Gemini AI for complaint generation/search. App falls back gracefully without it. |
| `JWT_SECRET` | Optional | Override default JWT signing secret. |

## Default Logins

| Role | Email | Password |
|---|---|---|
| Citizen | `citizen@gov.in` | `citizen123` |
| Authority | `minister@gov.in` | `admin123` |

## Building the Admin Panel

```bash
npm run build
```

Outputs to `admin-dist/`, served at `/admin`.

## User Preferences

- Keep the existing project structure and stack.
