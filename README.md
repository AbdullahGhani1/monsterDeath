# THE ABYSS 🌑

**THE ABYSS** is a high-fidelity, 5-level web-based RPG built with a focus on tactical combat, atmospheric exploration, and rigorous software engineering standards. Navigate through brutal biomes, craft powerful gear, and face the Abyssal Sovereign in this mobile-first dark fantasy experience.

🔗 **Live Demo:** [https://monster-death.surge.sh/](https://monster-death.surge.sh/)

---

## 🎮 Core Features

### ⚔️ Hybrid Combat System
Experience a "Proximity Turn-Based" combat loop. Real-time exploration seamlessly transitions into tactical turn-based engagements when encountering hostiles. Manage your Integrity and Stamina while utilizing actions like **Strike**, **Guard**, and **Heal**.

### 🧠 Advanced Monster AI
Each monster archetype—from the fast **Swarm** to the heavy-hitting **Brute** and the elusive **Hexer**—operates on a custom Finite State Machine (FSM). They utilize **A* Pathfinding** to patrol biomes and pursue players with varying levels of aggression and awareness.

### 🛠️ Crafting & Progression
- **Inventory System:** Scavenge materials like *Broken Hilts* and *Shadow Essence*.
- **The Forge:** Combine materials in your PDA to craft elite weapons like the *Abyssal Blade*.
- **Mission Tracker:** Real-time objective tracking across 5 distinct biomes.

### 🌑 Stealth & Visuals
- **Player Luminance:** A dynamic radial lighting system that creates an oppressive atmosphere.
- **Night Vision:** Toggle specialized gear to pierce the darkness with a translucent green tactical overlay.
- **Cinematic Transitions:** High-res splash screens and screen-shake effects for immersive feedback.

---

## 🛠 Tech Stack & Tooling

This project enforces a rigorous developer experience to ensure scalable and bug-free game logic:

- **Language:** TypeScript (Strict Mode)
- **Build Tool:** Vite (ESNext Native Modules)
- **Architecture:** Entity-Component-System (ECS) Lite via [Miniplex](https://github.com/hmans/miniplex)
- **Rendering:** Custom Canvas2D Engine with Camera Frustum Culling
- **Linting:** ESLint (Flat Config) + @typescript-eslint (Zero `any` policy)
- **Formatting:** Prettier
- **CI/CD:** GitHub Actions automated deployment to Surge.sh

---

## 🏗 Project Architecture

```text
src/
├── assets/          # Centralized Asset Loader (Images, Web Audio)
├── core/
│   ├── ai/          # A* Pathfinding, Finite State Machines
│   ├── ecs/         # World & Entity Definitions
│   ├── level/       # Procedural Generation & Level Management
│   ├── math/        # Spatial Hash Grid for Culling/Proximity
│   └── renderer/    # Canvas2D Camera & Render Logic
├── systems/         # ECS Logic (Combat, Physics, UI Sync, Animation)
└── main.ts          # Game Engine Bootstrap & Main Loop
```

### Performance Optimizations
- **Object Pooling:** Optimized Particle/VFX system to eliminate Garbage Collection pauses on mobile.
- **Spatial Partitioning:** Spatial Hash Grid for efficient proximity checks and entity culling.
- **Frustum Culling:** Only renders tiles and entities visible within the camera's current viewport.

---

## 🚀 Local Development

### Prerequisites
- Node.js (v20+)
- npm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/AbdullahGhani1/monsterDeath.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Building for Production
```bash
npm run build
```

### Quality Control
```bash
npm run lint    # Run strict TypeScript/ESLint checks
npm run format  # Enforce consistent code style
```

---

## 📜 License
ISC License. Built with 🩸 and ⚙️ by Abdullah Ghani.
