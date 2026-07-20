# Upbox Admin Portal (WMS)

Warehouse inbound admin app with role-based screens and Linnworks-style binrack management.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5174

## Demo logins (password: `password123`)

| Email | Role |
|---|---|
| `dock@upbox.test` | Dock Receiver (A) |
| `sort@upbox.test` | Sorter (B) |
| `putaway@upbox.test` | Putaway (C) |
| `supervisor@upbox.test` | Supervisor |

## Features

- **Dock Receiving** — scan master cartons
- **Sort & Assign** — assign cartons to putaway workers
- **Putaway** — scan products → brand rack → claim empty rack if full
- **Warehouse management** — binrack table, capacity filters, Zone→Aisle→Stack hierarchy
- **Moves management** — from Actions (no Replenishment)
