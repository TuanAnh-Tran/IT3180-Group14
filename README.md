# IT3180 Group 14 - Apartment Management

This repository now keeps the active application at the top level:

```text
IT3180-Group14/
├── backend/                 # Active Spring Boot + MySQL backend
├── frontend/                # Active HTML/CSS/JS frontend
├── docs/                    # Project notes and test documents
├── archive/                 # Old layouts, backups, and prototypes
├── docker-compose.yml       # Main Docker entry point
└── README.md
```

## What To Use

Use these folders for normal development:

- `backend/`: Java Spring Boot REST API, repositories, services, DTOs, models, and SQL schema.
- `frontend/`: static frontend app. Entry point is `frontend/index.html`.
- `docs/`: current project documentation.
- `docker-compose.yml`: starts MySQL, backend, and frontend.

Do not use these as the main app unless you intentionally need old code:

- `archive/legacy-java-backend/`: older Java backend from the previous `03-SourceCodes/backend` layout.
- `archive/node-prototype-pj_v2/`: Node.js prototype.
- `archive/merge-final-frontend/`: old merge backup frontend.
- `archive/old-sourcecodes-layout/`: remaining shell from the old `03-SourceCodes` layout.

## Run With Docker

Requirements: Docker Desktop is running.

From the repository root:

```bash
docker compose up -d --build
```

Then open:

- Frontend: `http://localhost:5500`
- Backend API: `http://localhost:8080`
- MySQL: `localhost:3306`

Stop services:

```bash
docker compose down
```

## Run Manually

Backend:

```bash
cd backend
mvn spring-boot:run
```

Frontend:

Serve the `frontend/` folder with a static server, for example:

```bash
cd frontend
python -m http.server 5500
```

Then open `http://localhost:5500`.

## Demo Accounts

Seed data provides these accounts when backend data is initialized:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | Admin |
| `accountant` | `accountant123` | Accountant |
| `resident1` | `user123` | Resident |

## Cleanup Rules

The repo ignores local-only files that should not cause conflicts:

- IDE settings: `.idea/`, `.vscode/`
- Build output: `**/target/`
- Compiled classes and logs: `*.class`, `*.log`

If Maven or Docker creates these files locally, do not commit them.
