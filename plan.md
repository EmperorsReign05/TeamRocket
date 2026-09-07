# Team Rocket AMR Fleet - Master Plan & Specification

**Notice to all contributors:** This file serves as the master specification and progress tracker. It **must** be updated with every Pull Request to reflect the latest state of your tasks. 

---

## 1. Project Overview & Architecture
An Autonomous Mobile Robot (AMR) Fleet Control System consisting of a robust TypeScript-based logic engine and a dynamic real-time frontend dashboard.
* **Frontend**: Next.js, Tailwind CSS, TypeScript (Interactive Web Dashboard).
* **Backend**: Core TypeScript algorithms (A*, PIBT, Auctioning, Simulation Engine) running within the Next.js environment.

## 2. Team Roles & Contributors

### Frontend / Dashboard (`src/app`)
* **Alman**: Primary dashboard architecture, UI scaling, and interactive components.
* **Pranav**: Dashboard improvements, state management, and real-time backend integration.
* **Om**: Minor frontend enhancements, documentation, and basic UI testing.

### Backend / Core Logic (`src/core`)
* **Manavi**: Implementation of simulation logic, state engine, and algorithms.
* **Pushpendra**: Auction systems, core graph-based path planning, and conflict resolution.

---

## 3. Master Task Checklist

### ✅ Achieved
* **Frontend (Alman / Pranav)**
  - [x] Initial Next.js dashboard UI scaffolding (Tailwind, Lucide).
  - [x] Pixel-perfect 2D warehouse map visualization (aisles, shelves, waiting zones).
  - [x] Dynamic environment scaling (UI sliders for robot count and shelf layout).
* **Backend (Manavi / Pushpendra)**
  - [x] Base scaffolding and typing established for core algorithm framework (`types.ts`, `engine.ts`).

### 🔄 Current
* **Frontend (Alman / Pranav / Om)**
  - [x] **Alman/Pranav**: Connect dashboard UI to the core simulation engine to replace mocked state.
  - [ ] **Alman/Pranav**: Enhance dynamic animations for robot transitions and map scaling.
  - [ ] **Om**: Review component accessibility and add minor UI tooltips for the Control Panel.
* **Backend logic (Manavi / Pushpendra)**
  *(Note: Backend team to fill this out in more detail as algorithms are developed)*
  - [ ] **Bug Fix**: Resolve the PIBT infinite priority swapping loop (Priority Inversion Oscillation) in `engine.ts`.
  - [ ] **Bug Fix**: Wire up the mock Control Panel buttons (`SIM CONFLICT`, `SIM DEADLOCK`, `BLOCK AISLE`) to actually mutate `WorldState` instead of just logging text.
  - [ ] Implement the core `assignTask` auction system logic.
  - [x] Complete implementation of A* pathfinding and PIBT safe-move resolution.
  - [x] Connect `stepSimulation` engine lifecycle hooks.

### ⏳ Remaining
* **Integration & Testing**
  - [ ] Resolve split-brain bidding edge cases during high-stress simulations.
  - [ ] End-to-end integration test of the core logic engine with the dashboard state.
* **Deployment**
  - [ ] Final deployment of the application to Vercel/Netlify environments.

---

## 4. Known Errors & Workarounds
- **Aisle Collision / Stuck Robot**: APF local minimums in narrow aisles caused unexpected rotation. Tweaking the APF `rep_mag` and `emergency_stop` limits resolved immediate issues, requires testing on long runs.
- **Split-Brain Bidding**: Rare edge case where robots bid identically. Implemented a 2-second heartbeat cross-check to yield jobs.
- **AMR Priority Inversion / Swap Loop**: AMR 1 and 2 oscillate endlessly around `P1`. This happens because `engine.ts` increments a robot's base priority while it waits. AMR 2 waits, builds priority, and pushes AMR 1 out. AMR 2's priority resets, while AMR 1 starts waiting and building priority, eventually pushing AMR 2 back out. This repeats infinitely.
- **Mock Control Panel Buttons**: The `SIM CONFLICT`, `SIM DEADLOCK`, and `BLOCK AISLE` buttons are not actually implemented. They only write mock text to the Event Log and do not mutate `WorldState`. Only `FAIL AMR-02` currently works.

---

## 5. Important Commands
*(Local Development environment commands)*

**Start Dashboard Application (Frontend & Core Logic)**:
```bash
npm run dev
```
