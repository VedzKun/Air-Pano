"""
Air-Pano Backend v2 — Flask REST API
======================================
Enhanced API with analytics logging, tour sequence, and full scene management.
"""

import json
import os
import time
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

# In-memory analytics store (production would use a database)
analytics_store = []


def _load_scenes() -> dict:
    """Read scenes.json from disk. Loaded per-request in dev for hot-reload."""
    scenes_path = os.path.join(DATA_DIR, "scenes.json")
    with open(scenes_path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Scene API Routes
# ---------------------------------------------------------------------------
@app.route("/api/scenes", methods=["GET"])
def get_scenes():
    """Return all scene definitions including hotspots, annotations,
    inspection zones, and metadata.

    Response shape:
    {
      "metadata": { ... },
      "tourSequence": [...],
      "scenes": [ { id, name, description, imageUrl, hotspots, ... }, ... ]
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
    """Return a single scene by ID."""
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
# Tour API
# ---------------------------------------------------------------------------
@app.route("/api/tour", methods=["GET"])
def get_tour():
    """Return the guided tour sequence.

    Response: { "tourSequence": ["cockpit", "first-class", ...] }
    """
    try:
        data = _load_scenes()
        return jsonify({
            "tourSequence": data.get("tourSequence", []),
            "metadata": data.get("metadata", {})
        }), 200
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify({"error": "Failed to load tour data"}), 500


# ---------------------------------------------------------------------------
# Analytics API
# ---------------------------------------------------------------------------
@app.route("/api/analytics", methods=["POST"])
def post_analytics():
    """Log interaction events from the frontend.

    Expected body:
    {
      "events": [
        {
          "type": "scene_visit" | "hotspot_click" | "time_spent",
          "sceneId": "cockpit",
          "hotspotId": "hs-cockpit-1",    (optional)
          "duration": 12500,               (optional, ms)
          "timestamp": 1700000000000
        }
      ]
    }
    """
    body = request.get_json(silent=True)
    if not body or "events" not in body:
        return jsonify({"error": "Missing 'events' array in request body"}), 400

    events = body["events"]
    if not isinstance(events, list):
        return jsonify({"error": "'events' must be an array"}), 400

    # Enrich each event with server timestamp and store
    server_time = time.time()
    for event in events:
        event["serverTimestamp"] = server_time
        analytics_store.append(event)

    return jsonify({
        "status": "ok",
        "received": len(events),
        "totalStored": len(analytics_store)
    }), 200


@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    """Return all stored analytics events (for debugging / dashboard).

    Query params:
      ?sceneId=cockpit  — filter by scene
      ?type=scene_visit  — filter by event type
    """
    filtered = analytics_store

    scene_filter = request.args.get("sceneId")
    if scene_filter:
        filtered = [e for e in filtered if e.get("sceneId") == scene_filter]

    type_filter = request.args.get("type")
    if type_filter:
        filtered = [e for e in filtered if e.get("type") == type_filter]

    return jsonify({
        "events": filtered,
        "total": len(filtered)
    }), 200


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    """Simple health-check endpoint."""
    return jsonify({"status": "ok", "version": "2.0"}), 200


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("[Air-Pano v2] API starting on http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
