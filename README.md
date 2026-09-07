# AMR Fleet Control Dashboard

This repository contains the frontend dashboard for the Autonomous Mobile Robot (AMR) Fleet Control system. It is a standalone Next.js application designed to visualize a dynamic 2D warehouse map, monitor active tasks, and provide an interactive control panel.

The application currently uses mock static states to render its UI. The backend team can seamlessly connect this frontend to a real backend (e.g., ROS 2 via WebSockets) by replacing the mock data with live streams.

## Technologies Used

* Framework: Next.js (React)
* Styling: Tailwind CSS
* Icons: Lucide-React
* Language: TypeScript

## Setup and Installation

### Prerequisites
* Node.js (v18+)
* npm (or yarn/pnpm)

### Running the Development Server

Clone the repository and install the dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your web browser. The page will auto-reload when you make edits.

## File Structure

The project follows a standard Next.js `src` directory layout:

* `src/app/page.tsx`: The primary dashboard view. It contains the entire UI layout (Sidebar, Header, 2D Map, Control Panel, Metrics, Fleet Status). This is the only file the backend team needs to modify to wire up live data.
* `src/app/globals.css`: Contains custom CSS, specifically the grid pattern background for the warehouse map and custom scrollbar styling.
* `src/app/layout.tsx`: The root layout for Next.js, managing global font imports and HTML/body tags.
* `tailwind.config.ts`: Configuration file for Tailwind CSS themes and utility classes.

## Backend Integration Guide

The dashboard is engineered to be instantly plug-and-play for the backend team. All dynamic data is managed via state variables (`useState`) located at the very top of `src/app/page.tsx`.

To connect this dashboard to a live backend system:

### 1. Locate the Mock Data
Open `src/app/page.tsx`. You will find three TypeScript types (`RobotStatus`, `TaskStatus`, `LogEntry`) and their corresponding initial mock arrays:
* `INITIAL_ROBOTS`: Array defining robot ID, color, XY coordinates, battery level, and status string.
* `INITIAL_TASKS`: Array defining active/pending tasks and their assignment.
* `INITIAL_LOGS`: Array of event strings to display in the live scroll log.

### 2. Replace with Live State
Replace the initial state hooks with empty arrays (or default configurations) and write `useEffect` hooks to populate them via WebSocket or REST API listeners:

```typescript
// Example Implementation
const [robots, setRobots] = useState<RobotStatus[]>([]);

useEffect(() => {
  const socket = new WebSocket('ws://your-backend-address');
  
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'ROBOT_UPDATE') {
      setRobots(data.payload);
    }
  };
  
  return () => socket.close();
}, []);
```

### 3. Coordinate System (2D Map)
The warehouse map is rendered as a highly responsive 20x13 CSS Grid. 
* The X-axis ranges from 0 to 19 (Left to Right).
* The Y-axis ranges from 0 to 12 (Top to Bottom).

To move a robot, the backend simply needs to update its `{ x: number, y: number }` coordinates in the `robots` array. The UI will automatically transition the robot icon across the screen.

### 4. Interactive Controls
The Control Panel buttons at the bottom of the screen currently trigger mock UI updates. The backend team should locate the action handlers (e.g., `handleCreateTask`, `handleToggleSimulation`, `handleSimulateConflict`) inside `src/app/page.tsx` and replace the mock state changes with API POST requests or WebSocket emits to trigger actual backend behavior.
