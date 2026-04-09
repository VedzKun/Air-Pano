/**
 * Hotspot Component
 * ==================
 * Renders clickable navigation markers projected from 3D world-space onto
 * the 2D screen.  Each hotspot has a pitch/yaw that defines its position on
 * the panoramic sphere.  The parent PanoViewer passes the Three.js camera
 * and renderer size so we can project in real-time.
 *
 * Key maths:
 *   pitch/yaw → spherical coords → 3D vector → camera.project → screen xy
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import './Hotspot.css';

// Radius at which hotspots sit (slightly inside the pano sphere so they render in front)
const HOTSPOT_RADIUS = 480;

/**
 * Convert pitch (vertical) and yaw (horizontal) in degrees
 * to a THREE.Vector3 on a sphere of the given radius.
 */
function pitchYawToVector3(pitch, yaw, radius = HOTSPOT_RADIUS) {
  const phi   = THREE.MathUtils.degToRad(90 - pitch);
  const theta = THREE.MathUtils.degToRad(yaw);

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export default function Hotspot({
  hotspot,
  camera,
  rendererSize,
  onClick,
}) {
  const ref = useRef(null);
  const [screenPos, setScreenPos] = useState({ x: -9999, y: -9999 });
  const [visible, setVisible]     = useState(false);

  // World-space position (re-computed only when hotspot data changes)
  const worldPos = useRef(new THREE.Vector3());

  useEffect(() => {
    worldPos.current = pitchYawToVector3(hotspot.pitch, hotspot.yaw);
  }, [hotspot.pitch, hotspot.yaw]);

  // Project 3D → 2D every animation frame
  useEffect(() => {
    if (!camera || !rendererSize) return;

    let rafId;
    function update() {
      const pos = worldPos.current.clone();
      pos.project(camera);

      // pos.z > 1 means behind the camera
      if (pos.z > 1) {
        setVisible(false);
      } else {
        const x = ( pos.x *  0.5 + 0.5) * rendererSize.width;
        const y = (-pos.y *  0.5 + 0.5) * rendererSize.height;
        setScreenPos({ x, y });
        setVisible(true);
      }

      rafId = requestAnimationFrame(update);
    }

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [camera, rendererSize]);

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      onClick(hotspot.targetSceneId);
    },
    [hotspot.targetSceneId, onClick]
  );

  return (
    <button
      ref={ref}
      className={`hotspot ${visible ? 'hotspot--visible' : ''}`}
      id={`hotspot-${hotspot.id}`}
      style={{
        transform: `translate(-50%, -50%) translate(${screenPos.x}px, ${screenPos.y}px)`,
      }}
      onClick={handleClick}
      aria-label={hotspot.label}
    >
      {/* Pulsing ring */}
      <span className="hotspot-ring" />
      {/* Center dot */}
      <span className="hotspot-dot" />
      {/* Tooltip label */}
      <span className="hotspot-label">{hotspot.label}</span>
    </button>
  );
}
