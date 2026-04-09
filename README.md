# Air-Pano — 360° Panoramic Virtual Tour

An interactive 360° panoramic virtual tour of a commercial aircraft interior, built with **React + Three.js** (frontend) and **Python Flask** (backend REST API).

Explore the cockpit, first class, business class, economy, and galley — all rendered as immersive WebGL panoramic spheres with clickable hotspot navigation.

---

## 🏗️ Architecture

```
Air-Pano/
├── backend/
│   ├── app.py                  # Flask REST API entry point
│   ├── requirements.txt        # Python dependencies
│   └── data/
│       └── scenes.json         # Scene + hotspot configuration
├── frontend/
│   ├── vite.config.js          # Vite config with API proxy
│   ├── index.html              # Entry HTML
│   ├── public/
│   │   └── panoramas/          # 360° equirectangular images
│   └── src/
│       ├── main.jsx            # React entry point
│       ├── App.jsx             # Root component (state orchestration)
│       ├── App.css
│       ├── index.css           # Global design system
│       ├── api/
│       │   └── scenes.js       # Axios API client
│       ├── hooks/
│       │   └── useScenes.js    # Custom hook for scene data
│       └── components/
│           ├── PanoViewer.jsx   # Three.js 360° sphere renderer
│           ├── PanoViewer.css
│           ├── Hotspot.jsx     # Projected 3D navigation markers
│           ├── Hotspot.css
│           ├── Overlay.jsx     # HUD: scene info, nav, fullscreen
│           ├── Overlay.css
│           ├── Loader.jsx      # Loading spinner
│           └── Loader.css
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.8+**
- **Node.js 18+** and **npm**

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

The Flask API will start on **http://localhost:5000**.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server will start on **http://localhost:5173** and proxy `/api/*` requests to the Flask backend.

### 3. Open the Tour

Navigate to **http://localhost:5173** in your browser.

---

## 🎮 Controls

| Action         | Desktop              | Mobile           |
| -------------- | -------------------- | ---------------- |
| Look around    | Click + drag         | Touch + drag     |
| Zoom in/out    | Scroll wheel         | Pinch (planned)  |
| Navigate scene | Click hotspot marker | Tap hotspot      |
| Fullscreen     | ⛶ button (top-right) | ⛶ button         |

---

## 📡 API

| Endpoint              | Method | Description              |
| --------------------- | ------ | ------------------------ |
| `/api/scenes`         | GET    | Get all scenes + hotspots |
| `/api/scenes/<id>`    | GET    | Get a single scene        |
| `/api/health`         | GET    | Health check              |

---

## 🧠 Key Technical Concepts

### Spherical Mapping
A `SphereGeometry(500, 60, 40)` is scaled by `(-1, 1, 1)` to invert normals, making the panoramic texture visible from inside the sphere.

### Camera Control
Mouse/touch delta is converted to lon/lat angles, then translated to a 3D lookAt target via spherical coordinate conversion:
```
phi   = deg2rad(90 - lat)
theta = deg2rad(lon)
target = (R·sin(φ)·cos(θ), R·cos(φ), R·sin(φ)·sin(θ))
```

### Hotspot Projection
Hotspot pitch/yaw is converted to a 3D position on the sphere, then projected to screen coordinates using `Vector3.project(camera)` each frame.

---

## 🎨 Design

- **Theme**: Dark premium (navy/charcoal)
- **Accents**: Electric blue `#00D4FF` + amber `#FFB800`
- **Panels**: Glassmorphism with backdrop-blur
- **Typography**: Inter from Google Fonts
- **Animations**: Pulsing hotspots, fade transitions, loading spinner

---

## 📜 License

MIT
