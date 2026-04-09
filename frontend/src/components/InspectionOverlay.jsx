/**
 * InspectionOverlay — Highlight System for Detailed Inspection
 * ==============================================================
 * When toggled active:
 *   - Shows colored highlight markers at inspection zone locations
 *   - Displays labels for each zone
 *   - Zones are rendered as pulsing translucent markers projected to screen
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import './InspectionOverlay.css';

const ZONE_RADIUS = 480;

function pitchYawToVector3(pitch, yaw, radius = ZONE_RADIUS) {
  const phi = THREE.MathUtils.degToRad(90 - pitch);
  const theta = THREE.MathUtils.degToRad(yaw);
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export default function InspectionOverlay({
  zones,
  camera,
  rendererSize,
  active,
}) {
  const [projectedZones, setProjectedZones] = useState([]);
  const worldPositions = useRef([]);

  // Compute world positions when zones change
  useEffect(() => {
    if (!zones) return;
    worldPositions.current = zones.map((z) => ({
      ...z,
      worldPos: pitchYawToVector3(z.pitch, z.yaw),
    }));
  }, [zones]);

  // Project to screen every frame
  useEffect(() => {
    if (!active || !camera || !rendererSize) return;

    let rafId;
    function update() {
      const projected = worldPositions.current.map((zone) => {
        const pos = zone.worldPos.clone();
        pos.project(camera);

        if (pos.z > 1) {
          return { ...zone, visible: false, x: 0, y: 0 };
        }

        return {
          ...zone,
          visible: true,
          x: (pos.x * 0.5 + 0.5) * rendererSize.width,
          y: (-pos.y * 0.5 + 0.5) * rendererSize.height,
        };
      });

      setProjectedZones(projected);
      rafId = requestAnimationFrame(update);
    }

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [active, camera, rendererSize]);

  if (!active || !zones || zones.length === 0) return null;

  return (
    <div className="inspection-overlay" id="inspection-overlay">
      {projectedZones.map((zone) =>
        zone.visible ? (
          <div
            key={zone.id}
            className="inspection-zone"
            style={{
              transform: `translate(-50%, -50%) translate(${zone.x}px, ${zone.y}px)`,
              width: `${zone.radius * 3}px`,
              height: `${zone.radius * 3}px`,
              '--zone-color': zone.color || '#00D4FF',
            }}
          >
            <span className="inspection-ring" />
            <span className="inspection-fill" />
            <span className="inspection-label">{zone.label}</span>
          </div>
        ) : null
      )}
    </div>
  );
}
