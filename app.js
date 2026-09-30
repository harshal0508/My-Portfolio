import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

gsap.registerPlugin(ScrollTrigger);

/* ══════════════════════════════════
   THREE.JS SETUP
══════════════════════════════════ */
const canvas = document.getElementById('webgl-canvas');
const W = window.innerWidth, H = window.innerHeight;
const scene = new THREE.Scene();
const isMobile = window.matchMedia("(max-width: 900px)").matches;

// Camera setup
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 60);
// On mobile, lower the camera (y = -1.5) and pull back (z = 15) so the character sits cleanly in the TOP half of the screen
camera.position.set(0, isMobile ? -1.5 : 0.5, isMobile ? 15 : 8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Color management for proper GLTF rendering
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

/* ─ LIGHTING ─ */
scene.add(new THREE.AmbientLight(0xffffff, 1.5)); // Bright ambient light so nothing is pure black

const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(3, 5, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.setScalar(2048);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xaaccff, 1.5);
fillLight.position.set(-3, 3, 2);
scene.add(fillLight);

/* ─ CHARACTER GROUP ─ */
const char = new THREE.Group();
char.position.set(isMobile ? 0 : -1.2, -1.5, 0); // Center on mobile, shift left on desktop
scene.add(char);

/* ─ LOAD SKETCHFAB MODEL ─ */
let mixer = null;

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

loader.load('./model_assets/source/model-draco.glb', (gltf) => {
  const model = gltf.scene;
  
  // Calculate bounding box to automatically scale ANY model to the perfect height
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  
  const targetHeight = 3.6; // Desired height of character
  const scale = targetHeight / size.y;
  model.scale.setScalar(scale);
  
  // Center horizontally and put feet perfectly on the ground (Y=0 relative to group)
  model.position.x = -center.x * scale;
  model.position.y = -box.min.y * scale; 
  model.position.z = -center.z * scale;

  // Make materials cast/receive shadows
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  char.add(model);

  // If the Sketchfab model came with a free idle animation, play it automatically!
  if (gltf.animations && gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(gltf.animations[0]).play();
  }
});

/* ══════════════════════════════════
   MOUSE TRACKING & ANIMATION LOOP
══════════════════════════════════ */
const curEl = document.getElementById('cur'), ringEl = document.getElementById('cur-ring');
const mouse = new THREE.Vector2();
let mx = W/2, my = H/2, lmx = W/2, lmy = H/2;

window.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  mouse.x = (e.clientX / W) * 2 - 1;
  mouse.y = -(e.clientY / H) * 2 + 1;
  curEl.style.left = mx + 'px'; curEl.style.top = my + 'px';
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  
  // Play model animations if they exist
  if (mixer) mixer.update(dt);
  
  // Entire character gently rotates to look at the cursor
  const targetRotY = mouse.x * 0.4;
  const targetRotX = -mouse.y * 0.1;
  char.rotation.y += (targetRotY - char.rotation.y) * 0.08;
  char.rotation.x += (targetRotX - char.rotation.x) * 0.08;

  // Cursor ring follow
  lmx += (mx - lmx) * 0.15; lmy += (my - lmy) * 0.15;
  ringEl.style.left = lmx + 'px'; ringEl.style.top = lmy + 'px';

  renderer.render(scene, camera);
}
animate();


/* ══════════════════════════════════
   GSAP SCROLL ANIMATIONS
══════════════════════════════════ */

// 1. Hide Hero Title
gsap.to(".hero-content", {
  scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  y: -100, opacity: 0,
});

// 2. Camera Zoom into Face
gsap.to(camera.position, {
  scrollTrigger: { trigger: "#resume", start: "top bottom", end: "top 20%", scrub: true },
  z: 2.5, // Move much closer
  y: 1.5, // Look exactly at face height
});
// Shift character from the left towards the center as the camera zooms
gsap.to(char.position, {
  scrollTrigger: { trigger: "#resume", start: "top bottom", end: "top 20%", scrub: true },
  x: isMobile ? 0 : -0.4, // Move slightly towards center-left on desktop, stay centered on mobile
});

// 3. Reveal Stickers around the Face
const stickers = ["#s1", "#s4", "#s2", "#s6"];
stickers.forEach((sticker, index) => {
  gsap.to(sticker, {
    scrollTrigger: {
      trigger: "#resume",
      start: `top ${80 - index * 10}%`,
      end: `top ${60 - index * 10}%`,
      scrub: 1,
    },
    scale: 1, opacity: 1, ease: "back.out(1.7)"
  });
});

// 4. Timeline Items Fade In
gsap.utils.toArray(".timeline-item").forEach((item) => {
  gsap.to(item, {
    scrollTrigger: { trigger: item, start: "top 80%", end: "top 50%", scrub: true },
    opacity: 1, x: 20,
  });
});

// 5. Transition to Dark Mode (Works section)
gsap.to("body", {
  scrollTrigger: { trigger: "#works", start: "top bottom", end: "top 50%", scrub: true },
  backgroundColor: "#121212", color: "#ffffff"
});
// Fade out 3D character and stickers when hitting works section
gsap.to([canvas, "#stickers-container", "#fabric-overlay"], {
  scrollTrigger: { trigger: "#works", start: "top bottom", end: "top 20%", scrub: true },
  opacity: 0,
});


// 6. Horizontal Scroll for Works
const horizontalScroll = document.getElementById("horizontal-scroll");
gsap.to(horizontalScroll, {
  scrollTrigger: {
    trigger: ".works-container",
    start: "top top",
    end: "bottom bottom",
    scrub: 1,
  },
  x: () => -(horizontalScroll.scrollWidth - window.innerWidth + 100),
  ease: "none"
});

