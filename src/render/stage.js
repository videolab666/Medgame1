// Pixi application, world container and layers. The world is measured in
// game units: the short side of the screen is 1000 units.
import { Application, Container } from 'pixi.js';

export async function createStage(root) {
  const app = new Application();
  await app.init({
    resizeTo: window,
    antialias: true,
    backgroundAlpha: 0,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
    preference: 'webgl',
  });
  root.append(app.canvas);

  const world = new Container();
  const content = new Container();
  const layers = {
    bg: new Container(),
    entities: new Container(),
    fx: new Container(),
    hud: new Container(),
  };
  // Background, objects and effects live inside `content` so the king can
  // zoom the scene without moving the HUD (flash overlays, tutorial hand).
  content.addChild(layers.bg, layers.entities, layers.fx);
  world.addChild(content, layers.hud);
  app.stage.addChild(world);

  const listeners = [];
  const cam = { zoom: 1, x: 0, y: 0 };
  const stage = { app, world, content, layers, cam, scale: 1, width: 1000, height: 1000 };

  function applyCamera() {
    const z = cam.zoom;
    const cx = stage.width / 2 + cam.x;
    const cy = stage.height / 2 + cam.y;
    content.scale.set(z);
    content.position.set(cx * (1 - z), cy * (1 - z));
  }

  function layout() {
    const { width, height } = app.screen;
    stage.scale = Math.min(width, height) / 1000;
    stage.width = width / stage.scale;
    stage.height = height / stage.scale;
    world.scale.set(stage.scale);
    applyCamera();
    for (const fn of listeners) fn(stage);
  }

  // Game camera: zoom around the world centre, shifted by (x, y) world units.
  // The king uses it to look closer and to pull toward each cut.
  stage.setCamera = ({ zoom = 1, x = 0, y = 0 }) => {
    cam.zoom = zoom;
    cam.x = x;
    cam.y = y;
    applyCamera();
  };
  stage.onResize = (fn) => {
    listeners.push(fn);
    return () => listeners.splice(listeners.indexOf(fn), 1);
  };
  stage.toWorld = (px, py) => {
    const z = cam.zoom;
    const cx = stage.width / 2 + cam.x;
    const cy = stage.height / 2 + cam.y;
    return {
      x: (px / stage.scale - cx * (1 - z)) / z,
      y: (py / stage.scale - cy * (1 - z)) / z,
    };
  };
  app.renderer.on('resize', layout);
  layout();
  return stage;
}
