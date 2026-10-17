// Pixi application, world container and layers. The world is measured in
// game units: the short side (or 62 % of height on wide screens) is 1000 units.
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
  const layers = {
    bg: new Container(),
    entities: new Container(),
    fx: new Container(),
    hud: new Container(),
  };
  world.addChild(layers.bg, layers.entities, layers.fx, layers.hud);
  app.stage.addChild(world);

  const listeners = [];
  const stage = { app, world, layers, scale: 1, width: 1000, height: 1000 };

  function layout() {
    const { width, height } = app.screen;
    stage.scale = Math.min(width, height * 0.62) / 1000;
    stage.width = width / stage.scale;
    stage.height = height / stage.scale;
    world.scale.set(stage.scale);
    for (const fn of listeners) fn(stage);
  }

  stage.onResize = (fn) => {
    listeners.push(fn);
    return () => listeners.splice(listeners.indexOf(fn), 1);
  };
  stage.toWorld = (px, py) => ({ x: px / stage.scale, y: py / stage.scale });
  app.renderer.on('resize', layout);
  layout();
  return stage;
}
