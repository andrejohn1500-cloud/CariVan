import { SuzukiSwift }    from './profiles/SuzukiSwift.js';
import { HondaCivicFD2 }  from './profiles/HondaCivicFD2.js';
import { HondaFitHybrid } from './profiles/HondaFitHybrid.js';

const REGISTRY = {
  swift: SuzukiSwift,
  fd2:   HondaCivicFD2,
  fit:   HondaFitHybrid,
  // Future stages will add:
  // evo, impreza, corolla, urvan, corsa
};

export function getProfile(id) {
  return REGISTRY[id] || SuzukiSwift;
}

export function getAllVehicles() {
  return Object.values(REGISTRY);
}

export function hasProfile(id) {
  return Object.prototype.hasOwnProperty.call(REGISTRY, id);
}