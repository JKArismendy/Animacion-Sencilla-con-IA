// Caja con aristas achaflanadas, compartida por Samario y Tostadito.
// Mide exactamente w x h x d y queda centrada, igual que BoxGeometry.
export function bevelBox(w, h, d, c = 0.012) {
  c = Math.min(c, w / 2.5, h / 2.5, d / 2.5);
  const hw = (w - 2 * c) / 2;
  const hh = (h - 2 * c) / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d - 2 * c,
    bevelEnabled: true,
    bevelThickness: c,
    bevelSize: c,
    bevelOffset: 0,
    bevelSegments: 6,
    steps: 1
  });
  geo.translate(0, 0, -(d - 2 * c) / 2);
  return geo;
}
