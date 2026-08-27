# Cephalon Slowboat (Discord): Structure

This document serves as the architectural map for the **Cephalon Slowbot Discord** project.

---

## Project Overview

**Cephalon Slowbot (Discord)** is a cross-server Discord LFG and alert bot specifically designed for Warframe's **Void Cascade** level cap community. It automatically polls the Digital Extremes Warframe WorldState API for **Steel Path** cascade fissures. When an active cascade is found, it broadcasts an interactive LFG board to registered Discord servers, allowing players to join squads and mathematically determines the optimal host based on global ping matrices.

---

## Tech Stack

* **Runtime:** Node.js (ES Modules `.mjs`)
* **Library:** `discord.js` (v14+ assumed, using `GatewayIntentBits.Guilds`)
* **Database:** Database: MongoDB Atlas (M0 Free Tier)
* **External API:** DE Raw WorldState (`content.warframe.com/dynamic/worldState.php`)

---

## Code Map (Directory Structure)

### 1. Core Engine

* **`controller.mjs` (Entry Point):** Initializes the Discord client, handles login via environment variables, starts the polling loop, and routes all Discord interactions to the command controller. It also runs a built-in health-check server to keep the bot awake on platforms like Koyeb.
* **`storage.mjs` (State Manager):** Handles caching the active cascades, squads, and server configurations into fast memory, and syncs permanent channel configurations to MongoDB. 
* **`poll.mjs` (The API Checker):** Fetches the DE WorldState API every 60 seconds looking for `MT_VOID_CASCADE` on `SolNode232` (Tuvul Commons) with `Hard` set to true. When found, it emits a signal to the post module to send a message to your discord server.

### 2. Discord Experience

* **`register.mjs` (Deployment Script):** A standalone script used strictly for pushing slash commands (`/setup`, `/guide`) to the Discord API.
* **`commands.mjs` (Interaction Controller):** Handles setup, guide configurations, and whitelists.
* **`post.mjs` (Discord Embed Script):** Listens for events emitted by the poller to broadcast the initial LFG message to registered channels. It is also responsible for automatically cleaning up and deleting old LFG messages across all servers once the mission timer expires. It synchronizes the generated LFG embed text across all registered servers simultaneously and pings squad members when their group fills up.
* **`matchmake.mjs` (The Matrix):** Contains the `pingMatrix` assigning penalty scores between regions, bouncer logic to prevent unplayable connections, and simulates squad compositions to nominate the optimal network host.

