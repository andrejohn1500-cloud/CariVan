import { MeshBuilder, StandardMaterial, Color3, Animation } from '@babylonjs/core';

export function buildOcean(scene) {
  const ocean = MeshBuilder.CreateGround('ocean', {
    width: 120000,
    height: 120000,
    subdivisions: 4
  }, scene);
  ocean.position.y = -2;

  const mat = new StandardMaterial('oceanMat', scene);
  mat.diffuseColor = new Color3(0.05, 0.45, 0.62);
  mat.specularColor = new Color3(0.3, 0.6, 0.8);
  mat.specularPower = 64;
  mat.alpha = 0.88;
  ocean.material = mat;

  const anim = new Animation('wave', 'position.y', 30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE);
  anim.setKeys([
    { frame: 0, value: -2.0 },
    { frame: 30, value: -1.6 },
    { frame: 60, value: -2.0 }
  ]);
  ocean.animations = [anim];
  scene.beginAnimation(ocean, 0, 60, true);
  return ocean;
}