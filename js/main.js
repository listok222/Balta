import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ========== CONFIG ==========
const IS_MOBILE = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ========== AGE GATE ==========
const ageGate = document.getElementById('age-gate');
const app = document.getElementById('app');

document.getElementById('age-yes').addEventListener('click', () => {
  ageGate.classList.add('hidden');
  app.classList.remove('hidden');
  initExperience();
});

document.getElementById('age-no').addEventListener('click', () => {
  window.location.href = 'https://www.google.com';
});

// ========== VARIETIES DATA ==========
const VARIETIES = [
  { num: '0', name: 'Безалкогольное', abv: '0,0%' },
  { num: '3', name: 'Классическое', abv: '4,8%' },
  { num: '7', name: 'Экспортное', abv: '5,4%' },
  { num: '9', name: 'Крепкое', abv: '8,0%' },
  { num: '5', name: 'Золотое', abv: '5,3%' },
  { num: '6', name: 'Портер', abv: '7,0%' },
];

function populateVarieties() {
  const grid = document.getElementById('varieties-grid');
  VARIETIES.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'variety-card';
    card.innerHTML = `
      <div class="variety-card__num">${v.num}</div>
      <div class="variety-card__name">${v.name}</div>
      <div class="variety-card__abv">${v.abv}</div>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.variety-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
    if (i === 1) card.classList.add('active');
    grid.appendChild(card);
  });
}

// ========== MAIN EXPERIENCE ==========
function initExperience() {
  populateVarieties();

  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03080F);
  scene.fog = new THREE.FogExp2(0x03080F, 0.018);

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.2, 4.5);

  const renderer = new THREE.WebGLRenderer({
    antialias: !IS_MOBILE,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.85;

  const keyLight = new THREE.DirectionalLight(0xB8D4E8, 1.8);
  keyLight.position.set(3, 6, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x1E4A8C, 0.6);
  fillLight.position.set(-4, 2, -2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xE8C547, 0.45);
  rimLight.position.set(-2, 3, -5);
  scene.add(rimLight);

  const ambient = new THREE.AmbientLight(0x0A1F3D, 0.35);
  scene.add(ambient);

  const canGroup = createCan();
  scene.add(canGroup);

  const ramp = createRamp();
  scene.add(ramp);

  const particles = createParticles();
  scene.add(particles);

  let composer = null;
  if (!IS_MOBILE && !REDUCED_MOTION) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.25, 0.4, 0.85
    );
    composer.addPass(bloom);
  }

  const pathPoints = [
    new THREE.Vector3(0, 2.8, 2.2),
    new THREE.Vector3(0.6, 2.1, 1.4),
    new THREE.Vector3(1.1, 1.3, 0.5),
    new THREE.Vector3(0.8, 0.5, -0.4),
    new THREE.Vector3(0.2, -0.1, -1.2),
    new THREE.Vector3(-0.4, -0.4, -2.0),
  ];
  const path = new THREE.CatmullRomCurve3(pathPoints);
  path.curveType = 'catmullrom';
  path.tension = 0.35;

  const getPathData = (t) => {
    const pos = path.getPointAt(THREE.MathUtils.clamp(t, 0, 1));
    const tangent = path.getTangentAt(THREE.MathUtils.clamp(t, 0, 1)).normalize();
    return { pos, tangent };
  };

  let scrollProgress = 0;

  ScrollTrigger.create({
    trigger: '#scroll-content',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.8,
    onUpdate: (self) => {
      scrollProgress = self.progress;
      document.getElementById('progress-fill').style.width = `${self.progress * 100}%`;
      if (self.progress > 0.04) {
        document.getElementById('scroll-hint').classList.add('hidden');
      }
    },
  });

  gsap.to('.hero-title', {
    opacity: 1,
    y: 0,
    duration: 1.4,
    ease: 'power3.out',
    delay: 0.3,
  });
  gsap.to('.hero-subtitle', {
    opacity: 1,
    y: 0,
    duration: 1.2,
    ease: 'power3.out',
    delay: 0.6,
  });

  gsap.utils.toArray('.section-title, .section-lead').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      },
    });
  });

  gsap.utils.toArray('.timeline-item').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1,
      x: 0,
      duration: 0.8,
      delay: i * 0.1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        toggleActions: 'play none none reverse',
      },
    });
  });

  gsap.utils.toArray('.process-step').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      delay: i * 0.08,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        toggleActions: 'play none none reverse',
      },
    });
  });

  gsap.to('.responsible-text', {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.responsible-text',
      start: 'top 85%',
      toggleActions: 'play none none reverse',
    },
  });

  const clock = new THREE.Clock();
  let lastProgress = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = scrollProgress;

    const smoothT = THREE.MathUtils.lerp(lastProgress, t, 0.12);
    lastProgress = smoothT;

    const { pos, tangent } = getPathData(smoothT);
    canGroup.position.copy(pos);

    const lookTarget = pos.clone().add(tangent);
    canGroup.lookAt(lookTarget);
    canGroup.rotateX(Math.PI / 2);
    canGroup.rotation.y += 0.008 + smoothT * 0.015;

    const camOffset = new THREE.Vector3(
      Math.sin(smoothT * Math.PI) * 1.8,
      1.4 - smoothT * 0.6,
      3.2 - smoothT * 1.5
    );
    const desiredCamPos = pos.clone().add(camOffset);
    camera.position.lerp(desiredCamPos, 0.08);
    camera.lookAt(pos.clone().add(new THREE.Vector3(0, 0.15, 0)));

    particles.rotation.y += dt * 0.02;
    particles.position.y = Math.sin(clock.elapsedTime * 0.3) * 0.1;

    if (ramp.material) {
      ramp.material.opacity = THREE.MathUtils.clamp(1 - smoothT * 1.4, 0.15, 0.55);
    }

    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) {
      composer.setSize(window.innerWidth, window.innerHeight);
    }
  });
}

function createCan() {
  const group = new THREE.Group();

  const bodyGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.55, 64, 1, true);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x1A3A6E,
    metalness: 0.92,
    roughness: 0.18,
    clearcoat: 0.7,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.4,
    side: THREE.DoubleSide,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 1024;
  labelCanvas.height = 512;
  const ctx = labelCanvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0F2A55');
  grad.addColorStop(0.5, '#1E4A8C');
  grad.addColorStop(1, '#0A1F3D');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.fillStyle = '#C9A227';
  ctx.fillRect(0, 40, 1024, 8);
  ctx.fillRect(0, 464, 1024, 8);

  ctx.fillStyle = '#F5F9FC';
  ctx.font = 'bold 92px "Playfair Display", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('БАЛТИКА', 512, 230);

  ctx.fillStyle = '#E8C547';
  ctx.font = 'bold 140px "Playfair Display", Georgia, serif';
  ctx.fillText('3', 512, 370);

  ctx.fillStyle = 'rgba(184, 212, 232, 0.85)';
  ctx.font = '28px Inter, sans-serif';
  ctx.fillText('КЛАССИЧЕСКОЕ', 512, 420);

  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.anisotropy = 8;

  const labelGeo = new THREE.CylinderGeometry(0.422, 0.422, 1.1, 64, 1, true);
  const labelMat = new THREE.MeshPhysicalMaterial({
    map: labelTex,
    metalness: 0.3,
    roughness: 0.4,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
  });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.y = 0.05;
  group.add(label);

  const topGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 64);
  const topMat = new THREE.MeshPhysicalMaterial({
    color: 0xC0C8D0,
    metalness: 0.95,
    roughness: 0.12,
    clearcoat: 0.8,
  });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0.805;
  group.add(top);

  const bottom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.41, 0.05, 64),
    topMat
  );
  bottom.position.y = -0.8;
  group.add(bottom);

  const dropGeo = new THREE.SphereGeometry(0.012, 8, 8);
  const dropMat = new THREE.MeshPhysicalMaterial({
    color: 0xD0E8F8,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.6,
    thickness: 0.5,
    transparent: true,
    opacity: 0.7,
  });

  const drops = new THREE.InstancedMesh(dropGeo, dropMat, 40);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 1.3;
    const r = 0.425 + Math.random() * 0.01;
    dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    dummy.scale.setScalar(0.6 + Math.random() * 0.8);
    dummy.updateMatrix();
    drops.setMatrixAt(i, dummy.matrix);
  }
  drops.instanceMatrix.needsUpdate = true;
  group.add(drops);

  group.rotation.y = Math.PI * 0.15;

  return group;
}

function createRamp() {
  const geo = new THREE.PlaneGeometry(6, 8, 32, 32);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.8) * 0.08 + Math.cos(y * 0.5) * 0.06);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xA8C8E0,
    metalness: 0.1,
    roughness: 0.15,
    transmission: 0.55,
    thickness: 1.2,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    envMapIntensity: 1.2,
  });

  const ramp = new THREE.Mesh(geo, mat);
  ramp.rotation.x = -Math.PI / 2.6;
  ramp.rotation.z = -0.15;
  ramp.position.set(0.3, 0.6, 0.2);
  return ramp;
}

function createParticles() {
  const count = IS_MOBILE ? 120 : 280;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    sizes[i] = Math.random() * 0.04 + 0.01;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    color: 0xC8E0F0,
    size: 0.035,
    transparent: true,
    opacity: 0.45,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geo, mat);
}
