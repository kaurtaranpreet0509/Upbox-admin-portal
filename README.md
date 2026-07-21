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
| `dock@upbox.test` | Dock Receiver |
| `unpack@upbox.test` | Unpacker |
| `putaway@upbox.test` | Putaway |
| `supervisor@upbox.test` | Supervisor |

(`sort@upbox.test` still works and maps to Unpacker.)

## Flow

1. **Dock** — receive master cartons onto Goods In
2. **Unpack** — open carton, scan each product into a bag/trolley
3. **Supervisor → Assign putaway** — assign staged products to putaway workers with racks
4. **Putaway** — for each unit: scan product, then scan rack (rack is scanned once per product)

## Features

- **Dock Receiving** — scan master cartons
- **Unpack** — open carton and stage products aside
- **Assign putaway** — supervisor assigns staged products + racks to putaway workers
- **Putaway** — product → rack scan loop (no sticky active rack)
- **Warehouse management** — locations table, capacity filters, hierarchy
- **Moves management** — stock moves
