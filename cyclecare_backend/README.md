# CycleCare Backend Setup

## Prerequisites
- Node.js (v18+)
- PostgreSQL (v13+)
- Redis (v6+)

## Installation
```bash
npm install
```

## Configuration
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Update the `.env` file with your PostgreSQL and other credentials.

## Database
1. Create a PostgreSQL database named `cyclecare`.
2. Run migrations:
```bash
npm run migration:run
```
3. Seed initial data (subscription plans):
```bash
npm run seed:run
```

## Running the App
```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

Swagger API documentation will be available at `http://localhost:3000/api/docs`.
