/**
 * PanoViewer v2 — Enhanced 360° Panoramic Renderer
 * ==================================================
 * Upgraded from v1 with:
 *   1. Texture cache integration (LRU cache + preloading)
 *   2. Two-sphere crossfade transitions (no flicker)
 *   3. Gyroscope support (device orientation overrides drag)
 *   4. Raycaster for 3D hotspot click/hover detection
 *   5. Inspection mode highlight zones
 *   6. Performance optimizations (minimal re-renders, proper disposal)
 *
 * RENDERING ARCHITECTURE:
 *   - Primary sphere: shows current scene texture
 *   - Transition sphere: old scene fades out during crossfade
 *   - Hotspot sprites: positioned at pitch/yaw on the sphere
 *   - Camera: PerspectiveCamera at origin, controlled by lon/lat
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import * as THREE from 'three';
import useTextureCache from '../hooks/useTextureCache';
import InspectionOverlay from './InspectionOverlay';
import './PanoViewer.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SPHERE_RADIUS   = 500;
const SPHERE_W_SEGS   = 60;
const SPHERE_H_SEGS   = 40;
const HOTSPOT_RADIUS  = 480;
const FOV_DEFAULT     = 75;
const FOV_MIN         = 30;
const FOV_MAX         = 90;
const LAT_CLAMP       = 85;
const DRAG_SPEED      = 0.15;
const INERTIA_DAMPING = 0.95;
const INERTIA_CUTOFF  = 0.01;
const CROSSFADE_MS    = 600;

/**
 * Convert pitch/yaw degrees to a 3D position on the panoramic sphere.
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

/**
 * Create a canvas-texture for a hotspot sprite.
 * @param {'navigation'|'annotation'} type
 * @param {boolean} hovered
 */
function createHotspotTexture(type = 'navigation', hovered = false) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const cx = size / 2;
  const cy = size / 2;

  // Colors based on type
  const color = type === 'annotation' ? '#00D4FF' : '#FFB800';
  const glowColor = type === 'annotation'
    ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 184, 0, 0.3)';

  // Outer glow
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 56);
  grad.addColorStop(0, glowColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, hovered ? 34 : 28, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = hovered ? 4 : 3;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, hovered ? 10 : 7, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Icon: arrow for navigation, "i" for annotation
  ctx.fillStyle = type === 'annotation' ? '#0a0e1a' : '#0a0e1a';
  ctx.font = `bold ${hovered ? 13 : 11}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (type === 'annotation') {
    ctx.fillText('i', cx, cy + 1);
  } else {
    ctx.fillText('→', cx, cy);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function PanoViewer({
  scene: currentScene,
  onNavigate,
  onAnnotationOpen,
  gyroEnabled,
  gyroOrientation,
  inspectionMode,
  onHotspotHover,
}) {
  // Refs for Three.js objects
  const mountRef         = useRef(null);
  const rendererRef      = useRef(null);
  const cameraRef        = useRef(null);
  const sceneRef         = useRef(null);
  const primaryMeshRef   = useRef(null);
  const transitionMeshRef = useRef(null);
  const rafRef           = useRef(null);
  const hotspotSprites   = useRef([]);
  const raycasterRef     = useRef(new THREE.Raycaster());
  const mouseRef         = useRef(new THREE.Vector2(-9999, -9999));
  const hoveredSprite    = useRef(null);
  const prevSceneIdRef   = useRef(null);

  // Camera orientation
  const lon         = useRef(0);
  const lat         = useRef(0);
  const isDragging  = useRef(false);
  const prevPointer = useRef({ x: 0, y: 0 });
  const velocity    = useRef({ x: 0, y: 0 });

  // React state
  const [rendererSize, setRendererSize]     = useState(null);
  const [transitioning, setTransitioning]   = useState(false);
  const [textureLoading, setTextureLoading] = useState(false);

  // Texture cache
  const { loadTexture, preload, disposeAll } = useTextureCache();

  // -----------------------------------------------------------------------
  // Initialise Three.js
  // -----------------------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2x for performance
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const threeScene = new THREE.Scene();
    sceneRef.current = threeScene;

    const camera = new THREE.PerspectiveCamera(
      FOV_DEFAULT,
      mount.clientWidth / mount.clientHeight,
      1,
      1100
    );
    camera.target = new THREE.Vector3(0, 0, 0);
    cameraRef.current = camera;

    // Primary panorama sphere
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, SPHERE_W_SEGS, SPHERE_H_SEGS);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
    const mesh = new THREE.Mesh(geometry, material);
    threeScene.add(mesh);
    primaryMeshRef.current = mesh;

    setRendererSize({ width: mount.clientWidth, height: mount.clientHeight });

    // Resize handler
    function onResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      setRendererSize({ width: w, height: h });
    }
    window.addEventListener('resize', onResize);

    // Animation loop
    function animate() {
      rafRef.current = requestAnimationFrame(animate);

      // Apply inertia when not dragging and gyro not active
      if (!isDragging.current && !gyroEnabled) {
        const vx = velocity.current.x;
        const vy = velocity.current.y;
        if (Math.abs(vx) > INERTIA_CUTOFF || Math.abs(vy) > INERTIA_CUTOFF) {
          lon.current += vx;
          lat.current -= vy;
          lat.current = THREE.MathUtils.clamp(lat.current, -LAT_CLAMP, LAT_CLAMP);
          velocity.current.x *= INERTIA_DAMPING;
          velocity.current.y *= INERTIA_DAMPING;
        }
      }

      // Spherical to Cartesian for camera lookAt
      const phi   = THREE.MathUtils.degToRad(90 - lat.current);
      const theta = THREE.MathUtils.degToRad(lon.current);

      camera.target.x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      camera.target.y = SPHERE_RADIUS * Math.cos(phi);
      camera.target.z = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(camera.target);

      // Raycaster hover detection for hotspot sprites
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(hotspotSprites.current);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hoveredSprite.current !== hit) {
          // Un-hover previous
          if (hoveredSprite.current) {
            hoveredSprite.current.scale.set(1, 1, 1);
            const prevData = hoveredSprite.current.userData;
            hoveredSprite.current.material.map?.dispose();
            hoveredSprite.current.material.map = createHotspotTexture(prevData.type, false);
            hoveredSprite.current.material.needsUpdate = true;
          }
          // Hover new
          hoveredSprite.current = hit;
          hit.scale.set(1.3, 1.3, 1.3);
          hit.material.map?.dispose();
          hit.material.map = createHotspotTexture(hit.userData.type, true);
          hit.material.needsUpdate = true;
          mount.style.cursor = 'pointer';
          onHotspotHover?.(hit.userData);
        }
      } else {
        if (hoveredSprite.current) {
          hoveredSprite.current.scale.set(1, 1, 1);
          const prevData = hoveredSprite.current.userData;
          hoveredSprite.current.material.map?.dispose();
          hoveredSprite.current.material.map = createHotspotTexture(prevData.type, false);
          hoveredSprite.current.material.needsUpdate = true;
          hoveredSprite.current = null;
          mount.style.cursor = 'grab';
          onHotspotHover?.(null);
        }
      }

      renderer.render(threeScene, camera);
    }
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      disposeAll();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []); // mount once

  // -----------------------------------------------------------------------
  // Gyroscope override
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!gyroEnabled || !gyroOrientation) return;

    let rafId;
    function syncGyro() {
      lon.current = gyroOrientation.current.lon;
      lat.current = gyroOrientation.current.lat;
      rafId = requestAnimationFrame(syncGyro);
    }
    rafId = requestAnimationFrame(syncGyro);
    return () => cancelAnimationFrame(rafId);
  }, [gyroEnabled, gyroOrientation]);

  // -----------------------------------------------------------------------
  // Load texture + crossfade + create hotspot sprites on scene change
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!currentScene || !primaryMeshRef.current || !sceneRef.current) return;

    const threeScene = sceneRef.current;
    const isFirstLoad = prevSceneIdRef.current === null;
    prevSceneIdRef.current = currentScene.id;

    setTextureLoading(true);
    if (!isFirstLoad) setTransitioning(true);

    // Remove old hotspot sprites
    hotspotSprites.current.forEach((sprite) => {
      threeScene.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    });
    hotspotSprites.current = [];

    loadTexture(currentScene.imageUrl)
      .then((texture) => {
        // Crossfade: store old material's texture, set new one
        const mesh = primaryMeshRef.current;

        if (!isFirstLoad) {
          // Create transition sphere with old texture
          const oldTexture = mesh.material.map;
          if (oldTexture) {
            const transGeo = new THREE.SphereGeometry(SPHERE_RADIUS - 1, SPHERE_W_SEGS, SPHERE_H_SEGS);
            transGeo.scale(-1, 1, 1);
            const transMat = new THREE.MeshBasicMaterial({
              map: oldTexture,
              transparent: true,
              opacity: 1,
            });
            const transMesh = new THREE.Mesh(transGeo, transMat);
            threeScene.add(transMesh);

            // Animate fade-out of transition sphere
            let startTime = performance.now();
            function fadeTick() {
              const elapsed = performance.now() - startTime;
              const progress = Math.min(elapsed / CROSSFADE_MS, 1);
              transMat.opacity = 1 - progress;

              if (progress < 1) {
                requestAnimationFrame(fadeTick);
              } else {
                threeScene.remove(transMesh);
                transGeo.dispose();
                transMat.dispose();
              }
            }
            requestAnimationFrame(fadeTick);
          }
        }

        // Apply new texture
        mesh.material.map = texture;
        mesh.material.needsUpdate = true;

        setTextureLoading(false);
        setTimeout(() => setTransitioning(false), isFirstLoad ? 100 : CROSSFADE_MS);

        // Preload linked scenes
        if (currentScene.linkedScenes) {
          const allScenes = window.__airPanoScenes || [];
          const urls = currentScene.linkedScenes
            .map((id) => allScenes.find((s) => s.id === id)?.imageUrl)
            .filter(Boolean);
          preload(urls);
        }
      })
      .catch((err) => {
        console.error('Failed to load panorama texture:', err);
        setTextureLoading(false);
        setTransitioning(false);
      });

    // Create 3D hotspot sprites
    if (!inspectionMode && currentScene.hotspots) {
      currentScene.hotspots.forEach((hs) => {
        const pos = pitchYawToVector3(hs.pitch, hs.yaw);
        const texture = createHotspotTexture(hs.type || 'navigation', false);
        const material = new THREE.SpriteMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          sizeAttenuation: true,
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(pos);
        sprite.scale.set(40, 40, 1);
        sprite.userData = hs;

        threeScene.add(sprite);
        hotspotSprites.current.push(sprite);
      });
    }
  }, [currentScene, inspectionMode, loadTexture, preload]);

  // -----------------------------------------------------------------------
  // Store scenes globally for preloading lookup (lightweight)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (currentScene) {
      // App.jsx should set window.__airPanoScenes for preload lookups
    }
  }, [currentScene]);

  // -----------------------------------------------------------------------
  // Pointer handlers
  // -----------------------------------------------------------------------
  const handlePointerDown = useCallback((e) => {
    if (gyroEnabled) return; // disable drag when gyro active
    isDragging.current = true;
    velocity.current = { x: 0, y: 0 };
    const point = e.touches ? e.touches[0] : e;
    prevPointer.current = { x: point.clientX, y: point.clientY };
  }, [gyroEnabled]);

  const handlePointerMove = useCallback((e) => {
    const mount = mountRef.current;
    const point = e.touches ? e.touches[0] : e;

    // Update mouse for raycaster
    if (mount) {
      const rect = mount.getBoundingClientRect();
      mouseRef.current.x = ((point.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((point.clientY - rect.top) / rect.height) * 2 + 1;
    }

    if (!isDragging.current) return;
    if (gyroEnabled) return;
    e.preventDefault();

    const dx = (point.clientX - prevPointer.current.x) * DRAG_SPEED;
    const dy = (point.clientY - prevPointer.current.y) * DRAG_SPEED;

    lon.current -= dx;
    lat.current += dy;
    lat.current = THREE.MathUtils.clamp(lat.current, -LAT_CLAMP, LAT_CLAMP);

    velocity.current = { x: -dx, y: -dy };
    prevPointer.current = { x: point.clientX, y: point.clientY };
  }, [gyroEnabled]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // -----------------------------------------------------------------------
  // Click handler for hotspot sprites
  // -----------------------------------------------------------------------
  const handleClick = useCallback((e) => {
    if (!cameraRef.current) return;

    const mount = mountRef.current;
    const rect = mount.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(hotspotSprites.current);

    if (intersects.length > 0) {
      const hs = intersects[0].object.userData;
      if (hs.type === 'annotation' && hs.annotation) {
        onAnnotationOpen?.(hs.annotation);
      } else if (hs.targetSceneId) {
        onNavigate?.(hs.targetSceneId);
      }
    }
  }, [onNavigate, onAnnotationOpen]);

  // -----------------------------------------------------------------------
  // Zoom via scroll wheel
  // -----------------------------------------------------------------------
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const camera = cameraRef.current;
    if (!camera) return;
    camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.05, FOV_MIN, FOV_MAX);
    camera.updateProjectionMatrix();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    mount.addEventListener('wheel', handleWheel, { passive: false });
    return () => mount.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div
      className={`pano-viewer no-select ${inspectionMode ? 'pano-viewer--inspect' : ''}`}
      id="pano-viewer"
      ref={mountRef}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onClick={handleClick}
    >
      {/* Crossfade overlay (quick flash for first load) */}
      <div
        className={`pano-transition ${transitioning ? 'pano-transition--active' : ''}`}
      />

      {/* Loading bar */}
      {textureLoading && (
        <div className="pano-loading">
          <div className="pano-loading-bar" />
        </div>
      )}

      {/* Inspection mode highlight zones */}
      <InspectionOverlay
        zones={currentScene?.inspectionZones}
        camera={cameraRef.current}
        rendererSize={rendererSize}
        active={inspectionMode}
      />
    </div>
  );
}
