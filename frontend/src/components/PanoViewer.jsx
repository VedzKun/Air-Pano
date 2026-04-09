/**
 * PanoViewer — Core 360° Panoramic Renderer
 * ============================================
 * This is the heart of the application.  It creates a Three.js scene with:
 *   1. A large SphereGeometry with inward-facing normals (the "sky-sphere")
 *   2. The panoramic image mapped as a texture onto that sphere
 *   3. A PerspectiveCamera at the centre, controlled by mouse/touch drag
 *   4. Zoom via scroll-wheel (adjusts camera FOV)
 *
 * IMPORTANT RENDERING CONCEPTS:
 *   - The sphere is scaled by (-1, 1, 1) so its normals point inward,
 *     making the texture visible from inside.
 *   - Camera rotation uses lon/lat angles converted to a lookAt target
 *     via spherical coordinate maths.
 *   - Vertical rotation is clamped to ±85° to prevent gimbal-lock flipping.
 *   - Old textures are disposed on scene change to prevent GPU memory leaks.
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import * as THREE from 'three';
import Hotspot from './Hotspot';
import './PanoViewer.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SPHERE_RADIUS   = 500;
const SPHERE_W_SEGS   = 60;
const SPHERE_H_SEGS   = 40;
const FOV_DEFAULT     = 75;
const FOV_MIN         = 30;
const FOV_MAX         = 90;
const LAT_CLAMP       = 85;   // degrees — prevents vertical flip
const DRAG_SPEED      = 0.15; // sensitivity multiplier for mouse/touch drag
const INERTIA_DAMPING = 0.95; // how quickly inertia decays (lower = faster stop)
const INERTIA_CUTOFF  = 0.01; // velocity below which we stop inertia

export default function PanoViewer({ scene: currentScene, onNavigate }) {
  // Refs for Three.js objects (never trigger re-renders)
  const mountRef    = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef   = useRef(null);
  const sceneRef    = useRef(null);
  const meshRef     = useRef(null);
  const textureRef  = useRef(null);
  const rafRef      = useRef(null);

  // Camera orientation state (mutable refs for performance — no re-render per frame)
  const lon         = useRef(0);
  const lat         = useRef(0);
  const isDragging  = useRef(false);
  const prevPointer = useRef({ x: 0, y: 0 });
  const velocity    = useRef({ x: 0, y: 0 });

  // React state — only for values that need to trigger renders
  const [rendererSize, setRendererSize] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [textureLoading, setTextureLoading] = useState(false);

  // -----------------------------------------------------------------------
  // Initialise Three.js (runs once on mount)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;

    // ---- Renderer ----
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ---- Scene ----
    const threeScene = new THREE.Scene();
    sceneRef.current = threeScene;

    // ---- Camera ----
    const camera = new THREE.PerspectiveCamera(
      FOV_DEFAULT,
      mount.clientWidth / mount.clientHeight,
      1,
      1100
    );
    camera.target = new THREE.Vector3(0, 0, 0);
    cameraRef.current = camera;

    // ---- Panoramic Sphere ----
    const geometry = new THREE.SphereGeometry(
      SPHERE_RADIUS,
      SPHERE_W_SEGS,
      SPHERE_H_SEGS
    );
    // Flip normals inward so texture is visible from inside
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    threeScene.add(mesh);
    meshRef.current = mesh;

    // Set initial size state for hotspot projection
    setRendererSize({ width: mount.clientWidth, height: mount.clientHeight });

    // ---- Resize handler ----
    function onResize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      setRendererSize({ width: w, height: h });
    }
    window.addEventListener('resize', onResize);

    // ---- Animation loop ----
    function animate() {
      rafRef.current = requestAnimationFrame(animate);

      // Apply inertia when not dragging
      if (!isDragging.current) {
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

      // Convert lon/lat to camera lookAt target using spherical coords
      const phi   = THREE.MathUtils.degToRad(90 - lat.current);
      const theta = THREE.MathUtils.degToRad(lon.current);

      camera.target.x = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      camera.target.y = SPHERE_RADIUS * Math.cos(phi);
      camera.target.z = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(camera.target);
      renderer.render(threeScene, camera);
    }
    animate();

    // ---- Cleanup ----
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafRef.current);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []); // mount once

  // -----------------------------------------------------------------------
  // Load / swap panoramic texture when the scene changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!currentScene || !meshRef.current) return;

    setTransitioning(true);
    setTextureLoading(true);

    const loader = new THREE.TextureLoader();

    loader.load(
      currentScene.imageUrl,
      (texture) => {
        // Dispose previous texture to free GPU memory
        if (textureRef.current) {
          textureRef.current.dispose();
        }
        textureRef.current = texture;

        // Apply new texture
        texture.colorSpace = THREE.SRGBColorSpace;
        meshRef.current.material.map = texture;
        meshRef.current.material.needsUpdate = true;

        setTextureLoading(false);

        // Brief transition delay for the fade overlay
        setTimeout(() => setTransitioning(false), 400);
      },
      undefined, // onProgress
      (err) => {
        console.error('Failed to load panorama texture:', err);
        setTextureLoading(false);
        setTransitioning(false);
      }
    );
  }, [currentScene]);

  // -----------------------------------------------------------------------
  // Pointer (mouse + touch) handlers for drag-to-rotate
  // -----------------------------------------------------------------------
  const handlePointerDown = useCallback((e) => {
    isDragging.current = true;
    velocity.current = { x: 0, y: 0 };
    const point = e.touches ? e.touches[0] : e;
    prevPointer.current = { x: point.clientX, y: point.clientY };
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    e.preventDefault(); // prevent scroll on mobile
    const point = e.touches ? e.touches[0] : e;
    const dx = (point.clientX - prevPointer.current.x) * DRAG_SPEED;
    const dy = (point.clientY - prevPointer.current.y) * DRAG_SPEED;

    lon.current -= dx;
    lat.current += dy;
    lat.current = THREE.MathUtils.clamp(lat.current, -LAT_CLAMP, LAT_CLAMP);

    velocity.current = { x: -dx, y: -dy };
    prevPointer.current = { x: point.clientX, y: point.clientY };
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // -----------------------------------------------------------------------
  // Zoom via scroll wheel (adjusts FOV)
  // -----------------------------------------------------------------------
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const camera = cameraRef.current;
    if (!camera) return;
    camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.05, FOV_MIN, FOV_MAX);
    camera.updateProjectionMatrix();
  }, []);

  // Attach wheel listener with { passive: false } to allow preventDefault
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
      className="pano-viewer no-select"
      id="pano-viewer"
      ref={mountRef}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      {/* Fade overlay for scene transitions */}
      <div
        className={`pano-transition ${transitioning ? 'pano-transition--active' : ''}`}
      />

      {/* Texture loading indicator */}
      {textureLoading && (
        <div className="pano-loading">
          <div className="pano-loading-bar" />
        </div>
      )}

      {/* Hotspot markers */}
      {currentScene?.hotspots?.map((hs) => (
        <Hotspot
          key={hs.id}
          hotspot={hs}
          camera={cameraRef.current}
          rendererSize={rendererSize}
          onClick={onNavigate}
        />
      ))}
    </div>
  );
}
