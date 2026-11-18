export const trainingLandingZone = { x: 0, z: -22, radius: 3 };

export function trainingLandingCounts(passed, { x, z }) {
  const zone = trainingLandingZone;
  return passed === trainingCourse.sequence.length
    && Math.hypot(x - zone.x, z - zone.z) <= zone.radius;
}

export const trainingCourse = {
  schemaVersion: 3,
  id: 'dqb-first-flight',
  name: 'DQB — Первый полёт',
  trackClass: 'full',
  field: { width: 60, depth: 60, gridSize: 0.5 },
  elements: [18, 30, 42].map((y, index) => ({
    id: `gate-${index + 1}`,
    type: 'gate',
    position: { x: 30, y, z: 0 },
    yaw: Math.PI / 2,
    yawOverridden: true,
    dims: { levels: 1, sillH: 0.15, clearW: 5, clearH: 4.5, levelPitch: 4.6 },
  })),
  sequence: [1, 2, 3].map((number) => ({
    id: `sequence-${number}`,
    elementId: `gate-${number}`,
    apertureIndex: 0,
    entry: 1,
  })),
};
