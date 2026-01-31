/**
 * Watchdog Avatar – 2D and 3D face tracking
 * MediaPipe Face Landmarker → 2D composite or 3D GLB (Head, Jaw, LeftEye, RightEye)
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

(function () {
  const video = document.getElementById('webcam');
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('status');
  const showDebugEl = document.getElementById('showDebug');
  const scaleEl = document.getElementById('scale');
  const scaleValueEl = document.getElementById('scaleValue');
  const modeEl = document.getElementById('mode');
  const threeContainer = document.getElementById('threeContainer');

  let faceLandmarker = null;
  let watchdogImage = null;
  let lastVideoTime = -1;

  // 3D state
  let scene3d = null;
  let camera3d = null;
  let renderer3d = null;
  let headNode = null;
  let jawNode = null;
  let leftEyeNode = null;
  let rightEyeNode = null;
  let glbLoaded = false;
  let glbLoading = false;
  const smooth = { headYaw: 0, headPitch: 0, headRoll: 0, jawOpen: 0, eyeYaw: 0, eyePitch: 0 };
  let lastPose3d = null;
  const SMOOTHING = 0.25;

  // Where to draw eyes and mouth on the 2D avatar (normalized 0–1)
  const AVATAR_EYES_MOUTH = {
    leftEye:  { x: 0.35, y: 0.38, width: 0.12, height: 0.1 },
    rightEye: { x: 0.65, y: 0.38, width: 0.12, height: 0.1 },
    mouth:    { x: 0.45, y: 0.62, width: 0.22, height: 0.14 }
  };

  const LANDMARKS = {
    leftEye:  [33, 160, 158, 133, 153, 144],
    rightEye: [362, 385, 387, 263, 373, 380],
    mouth:    [61, 291, 0, 17, 78, 308, 324, 318]
  };

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function getRegion(landmarks, indices) {
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const i of indices) {
      const p = landmarks[i];
      if (!p) continue;
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const w = maxX - minX || 0.1;
    const h = maxY - minY || 0.1;
    return {
      x: minX, y: minY, width: w * 1.8, height: h * 1.8,
      centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2
    };
  }

  async function initFaceLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    faceLandmarker = await FaceLandmarker.createFromModelPath(vision,
      'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
    );
    await faceLandmarker.setOptions({ runningMode: 'VIDEO', numFaces: 1 });
  }

  async function startWebcam() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
    video.srcObject = stream;
    return new Promise((resolve) => {
      video.onloadedmetadata = () => { video.play(); resolve(); };
    });
  }

  function drawPlaceholderWatchdog(ctx, width, height) {
    const cx = width / 2, cy = height / 2, scale = Math.min(width, height) * 0.4;
    ctx.save();
    ctx.fillStyle = '#8B6914';
    ctx.strokeStyle = '#5c4610';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, scale * 1.2, scale * 1.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawAvatarBase(ctx, width, height, headScale, headX, headY, headTilt) {
    const scale = scaleEl ? parseFloat(scaleEl.value) : 1;
    const size = Math.min(width, height) * 0.85 * headScale * scale;
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate((headTilt * Math.PI) / 180);
    ctx.translate(-headX, -headY);
    if (watchdogImage && watchdogImage.complete && watchdogImage.naturalWidth) {
      const w = size, h = (watchdogImage.naturalHeight / watchdogImage.naturalWidth) * w;
      ctx.drawImage(watchdogImage, headX - w / 2, headY - h / 2, w, h);
    } else {
      ctx.translate(headX, headY);
      ctx.scale(size / 400, size / 400);
      ctx.translate(-200, -200);
      drawPlaceholderWatchdog(ctx, 400, 400);
    }
    ctx.restore();
  }

  function drawComposite(ctx, video, landmarks, width, height, headScale, headX, headY, headTilt) {
    if (!landmarks || landmarks.length < 400) return;
    const scale = scaleEl ? parseFloat(scaleEl.value) : 1;
    const size = Math.min(width, height) * 0.85 * headScale * scale, half = size / 2;
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate((headTilt * Math.PI) / 180);
    ctx.translate(-headX, -headY);
    const drawRegion = (regionKey, landmarkIndices) => {
      const region = getRegion(landmarks, landmarkIndices);
      const slot = AVATAR_EYES_MOUTH[regionKey];
      const dx = headX - half + slot.x * size, dy = headY - half + slot.y * size;
      const dw = slot.width * size, dh = slot.height * size;
      const sx = (region.centerX - region.width / 2) * video.videoWidth, sy = (region.centerY - region.height / 2) * video.videoHeight;
      const sw = region.width * video.videoWidth, sh = region.height * video.videoHeight;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(dx + dw / 2, dy + dh / 2, dw / 2, dh / 2, 0, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
      ctx.restore();
    };
    drawRegion('leftEye', LANDMARKS.leftEye);
    drawRegion('rightEye', LANDMARKS.rightEye);
    drawRegion('mouth', LANDMARKS.mouth);
    ctx.restore();
  }

  function estimateHeadPose(landmarks) {
    const nose = landmarks[4] || landmarks[1];
    const left = landmarks[33], right = landmarks[263];
    if (!nose || !left || !right) return { x: 0.5, y: 0.5, scale: 1, tilt: 0 };
    const eyeDist = Math.hypot(right.x - left.x, right.y - left.y) || 0.2;
    return { x: nose.x, y: nose.y, scale: 0.3 + 0.4 / eyeDist, tilt: 0 };
  }

  /** From 478 landmarks: head yaw/pitch/roll (radians), jaw open 0–1, eye yaw/pitch (radians) */
  function estimate3DPose(landmarks) {
    const nose = landmarks[4] ?? landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const forehead = landmarks[10] ?? landmarks[151];
    const chin = landmarks[152] ?? landmarks[0];
    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];

    if (!nose) return null;

    const yaw = (nose.x - 0.5) * 1.2;
    const pitch = (0.5 - nose.y) * 1.0;
    let roll = 0;
    if (leftEye && rightEye) {
      roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    }

    let jawOpen = 0;
    if (upperLip && lowerLip) {
      const open = Math.abs(lowerLip.y - upperLip.y);
      jawOpen = Math.min(1, open * 8);
    }

    const eyeYaw = (nose.x - 0.5) * 0.8;
    const eyePitch = (0.5 - nose.y) * 0.6;

    return { headYaw: yaw, headPitch: pitch, headRoll: roll, jawOpen, eyeYaw, eyePitch };
  }

  function drawDebug(ctx, landmarks, width, height) {
    if (!landmarks) return;
    ctx.save();
    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 1;
    for (let i = 0; i < landmarks.length; i++) {
      const p = landmarks[i];
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function init3D(w, h) {
    if (scene3d) return;
    scene3d = new THREE.Scene();
    scene3d.background = new THREE.Color(0x1a1a1a);
    camera3d = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera3d.position.set(0, 0, 2.2);
    camera3d.lookAt(0, 0, 0);
    scene3d.add(camera3d);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0.5, 0.5, 1);
    scene3d.add(light);
    scene3d.add(new THREE.AmbientLight(0xffffff, 0.6));

    renderer3d = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer3d.setSize(w, h);
    renderer3d.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeContainer.appendChild(renderer3d.domElement);
  }

  function loadGLB() {
    if (glbLoaded || glbLoading) return Promise.resolve();
    glbLoading = true;
    setStatus('Loading 3D model…');
    const loader = new GLTFLoader();
    return loader.loadAsync('Watchdog Avatar/watchdog_head.glb')
      .then((gltf) => {
        const root = gltf.scene;
        headNode = root.getObjectByName('Head');
        jawNode = root.getObjectByName('Jaw');
        leftEyeNode = root.getObjectByName('LeftEye');
        rightEyeNode = root.getObjectByName('RightEye');

        if (!headNode) headNode = root;
        root.position.set(0, 0, 0);
        root.rotation.set(0, 0, 0);
        root.scale.setScalar(1);
        scene3d.add(root);
        glbLoaded = true;
        glbLoading = false;
        setStatus('Face tracked');
      })
      .catch((err) => {
        glbLoading = false;
        setStatus('3D load error: ' + (err.message || String(err)));
      });
  }

  function update3DNodes(pose) {
    if (pose) lastPose3d = pose;
    const p = lastPose3d;
    if (!p) return;
    smooth.headYaw = lerp(smooth.headYaw, p.headYaw, SMOOTHING);
    smooth.headPitch = lerp(smooth.headPitch, p.headPitch, SMOOTHING);
    smooth.headRoll = lerp(smooth.headRoll, p.headRoll, SMOOTHING);
    smooth.jawOpen = lerp(smooth.jawOpen, p.jawOpen, SMOOTHING);
    smooth.eyeYaw = lerp(smooth.eyeYaw, p.eyeYaw, SMOOTHING);
    smooth.eyePitch = lerp(smooth.eyePitch, p.eyePitch, SMOOTHING);

    if (headNode) {
      headNode.rotation.order = 'YXZ';
      headNode.rotation.y = smooth.headYaw;
      headNode.rotation.x = smooth.headPitch;
      headNode.rotation.z = smooth.headRoll;
    }
    if (jawNode) {
      jawNode.rotation.x = smooth.jawOpen * 0.6;
    }
    if (leftEyeNode) {
      leftEyeNode.rotation.order = 'YXZ';
      leftEyeNode.rotation.y = smooth.eyeYaw;
      leftEyeNode.rotation.x = smooth.eyePitch;
    }
    if (rightEyeNode) {
      rightEyeNode.rotation.order = 'YXZ';
      rightEyeNode.rotation.y = smooth.eyeYaw;
      rightEyeNode.rotation.x = smooth.eyePitch;
    }
  }

  function tick() {
    if (!faceLandmarker || !video.videoWidth) {
      requestAnimationFrame(tick);
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    const is3D = modeEl && modeEl.value === '3d';

    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      try {
        const result = faceLandmarker.detectForVideo(video, performance.now());
        const faces = result.faceLandmarks || [];
        if (faces.length > 0) {
          const landmarks = faces[0];
          const head = estimateHeadPose(landmarks);
          const headX = head.x * width;
          const headY = head.y * height;

          if (is3D) {
            setStatus('Face tracked');
            if (!scene3d) init3D(width, height);
            if (!glbLoaded && !glbLoading) loadGLB();
            if (glbLoaded) {
              lastPose3d = estimate3DPose(landmarks);
            }
          } else {
            setStatus('Face tracked');
            ctx.clearRect(0, 0, width, height);
            drawAvatarBase(ctx, width, height, head.scale, headX, headY, head.tilt);
            drawComposite(ctx, video, landmarks, width, height, head.scale, headX, headY, head.tilt);
            if (showDebugEl && showDebugEl.checked) drawDebug(ctx, landmarks, width, height);
          }
        } else {
          setStatus('No face – look at the camera');
          if (!is3D) ctx.clearRect(0, 0, width, height);
        }
      } catch (e) {
        setStatus('Error: ' + (e.message || 'detection failed'));
      }
    }

    if (is3D && glbLoaded && renderer3d && scene3d && camera3d) {
      update3DNodes(null);
      renderer3d.render(scene3d, camera3d);
    }

    requestAnimationFrame(tick);
  }

  function resize() {
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;
    if (camera3d) {
      camera3d.aspect = w / h;
      camera3d.updateProjectionMatrix();
    }
    if (renderer3d) renderer3d.setSize(w, h);
  }

  function setMode() {
    const is3D = modeEl && modeEl.value === '3d';
    document.body.classList.toggle('mode-3d', is3D);
    scaleValueEl.parentElement.style.display = is3D ? 'none' : '';
    if (is3D && !scene3d && video.videoWidth) init3D(video.videoWidth, video.videoHeight);
    if (is3D) loadGLB();
  }

  scaleEl.addEventListener('input', () => { scaleValueEl.textContent = scaleEl.value; });
  modeEl.addEventListener('change', setMode);

  async function main() {
    setStatus('Loading model…');
    try {
      await initFaceLandmarker();
      setStatus('Starting webcam…');
      await startWebcam();
      video.addEventListener('loadedmetadata', resize);
      resize();
      setStatus('Ready – look at the camera');
      setMode();
      tick();
    } catch (e) {
      setStatus('Error: ' + (e.message || String(e)));
    }
  }

  watchdogImage = new Image();
  watchdogImage.src = 'assets/watchdog.png';
  watchdogImage.onerror = () => { watchdogImage = null; };

  main();
})();
