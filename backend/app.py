"""
Air-Pano Backend — Flask REST API
==================================
Serves scene configuration data for the 360° panoramic virtual tour.
Single endpoint: GET /api/scenes returns all scenes with hotspot definitions.
"""

import json
import os
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS for all routes so the React frontend can call this API
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def _load_scenes() -> dict:
    """Read scenes.json from disk. Loaded per-request in dev for hot-reload
    convenience; in production, this could be cached or backed by a database."""
    scenes_path = os.path.join(DATA_DIR, "scenes.json")
    with open(scenes_path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------
@app.route("/api/scenes", methods=["GET"])
def get_scenes():
    """Return all scene definitions including hotspots.

    Response shape:
    {
      "scenes": [ { id, name, description, imageUrl, hotspots: [...] }, … ]
    }
    """
    try:
        data = _load_scenes()
        return jsonify(data), 200
    except FileNotFoundError:
        return jsonify({"error": "Scene data file not found"}), 500
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid scene data format"}), 500


@app.route("/api/scenes/<scene_id>", methods=["GET"])
def get_scene(scene_id: str):
    """Return a single scene by ID.

    Useful if the frontend wants to lazy-load one scene at a time.
    """
    try:
        data = _load_scenes()
        scene = next(
            (s for s in data["scenes"] if s["id"] == scene_id), None
        )
        if scene is None:
            return jsonify({"error": f"Scene '{scene_id}' not found"}), 404
        return jsonify({"scene": scene}), 200
    except FileNotFoundError:
        return jsonify({"error": "Scene data file not found"}), 500
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid scene data format"}), 500


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    """Simple health-check endpoint for monitoring / readiness probes."""
    return jsonify({"status": "ok"}), 200


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("[Air-Pano] API starting on http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
