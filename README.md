# Watchdog Avatar – 2D & 3D face tracking

React on camera with a **watchdog avatar** in two modes:

- **2D image:** Your real eyes and mouth are composited onto a 2D image; head movement drives position/scale.
- **3D model (GLB):** A rigged GLB (Head, Jaw, LeftEye, RightEye) is driven by face tracking: head pose → Head, mouth open → Jaw, gaze → LeftEye/RightEye.

Uses **face-api.js** (TensorFlow.js + 68-point face landmarks) and **Three.js** in the browser. Loads via script tags so it works on GitHub Pages.

## Quick start

- **On your phone (no webcam on PC):** Deploy to GitHub Pages (see below), then open the Pages URL on your phone and allow the camera.
- **Local (with webcam):** Run a local server so the camera works (HTTPS or localhost):
  ```bash
  npx serve .
  ```
  Then open the URL shown (e.g. `http://localhost:3000`) and allow webcam.

## 2D mode – replace the avatar image

- Add your watchdog image as **`assets/watchdog.png`**.
- If the file is missing, a brown placeholder shape is used.
- Adjust eye/mouth positions in `js/app.js` (`AVATAR_EYES_MOUTH`) to match your image.

## 3D mode – GLB model

- The app loads **`Watchdog Avatar/watchdog_head.glb`** when you switch to **3D model (GLB)**.
- The GLB should have named nodes: **Head**, **Jaw**, **LeftEye**, **RightEye** (as in the ChatGPT-generated rig).
- Mapping: head pose → Head rotation; mouth open → Jaw rotation (X); gaze → LeftEye / RightEye rotation.
- If your rig uses different axes (e.g. jaw on Z), edit `update3DNodes()` in `js/app.js` (e.g. `jawNode.rotation.z`).

## Use for YouTube reactions

1. Open the app in a browser (or deploy to GitHub Pages, see below).
2. In **OBS**: add a **Browser Source** (if you use the deployed URL) or **Window Capture** of the browser tab.
3. Add your reaction video as another source and arrange layout (e.g. video + watchdog side-by-side or PiP).

## Deploy to GitHub (run as a web app)

Deploying to **GitHub Pages** gives you a public HTTPS URL so you can use the app from any device (including your phone, which has a camera).

### 1. Push this repo to GitHub

- If you haven’t already: create a new repository on GitHub (e.g. `watchdog-avatar`).
- From your project folder:

  ```bash
  git init
  git add .
  git commit -m "Watchdog avatar web app"
  git branch -M main
  git remote add origin https://github.com/<your-username>/<repo-name>.git
  git push -u origin main
  ```

### 2. Turn on GitHub Pages

- In the repo: **Settings** → **Pages** (left sidebar).
- Under **Build and deployment**:
  - **Source:** Deploy from a branch
  - **Branch:** `main` (or `master`) → **/ (root)**
- Click **Save**. After a minute or two, the site will be at:

  **`https://<your-username>.github.io/<repo-name>/`**

### 3. Test on your phone

- On your phone, open that URL in **Chrome** or **Safari** (HTTPS is required for webcam).
- When the page asks for camera access, tap **Allow**.
- The app will use your phone’s front camera; you can switch between **2D image** and **3D model (GLB)** and test the avatar.

**Note:** Webcam only works over **HTTPS**. GitHub Pages is HTTPS, so it works. Opening `index.html` from disk (`file://`) will not allow the camera.

## Tech

- **face-api.js** (TensorFlow.js) for face detection and 68-point landmarks; **Three.js** for 3D GLB.
- Vanilla JS, no build step. Scripts: `tf.min.js`, `face-api.min.js` from CDN.

## License

Code: MIT. MediaPipe is Apache 2.0. Use your own images for the avatar.
