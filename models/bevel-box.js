// Caja con aristas achaflanadas, compartida por Samario y Tostadito.
// Mide exactamente w x h x d y queda centrada, igual que BoxGeometry.
// splitsY (opcional): alturas locales (0 = centro de la caja) donde se añaden
// vértices en las aristas laterales, para poder doblar la forma en ese punto
// al mover vértices (si no, la cara es un solo cuadrilátero y no admite quiebres).
export function bevelBox(w, h, d, c = 0.012, splitsY = []) {
  c = Math.min(c, w / 2.5, h / 2.5, d / 2.5);
  const hw = (w - 2 * c) / 2;
  const hh = (h - 2 * c) / 2;
  const ys = splitsY.filter(y => y > -hh && y < hh).sort((a, b) => a - b);
  const shape = new THREE.Shape();
  shape.moveTo(-hw, -hh);
  shape.lineTo(hw, -hh);
  ys.forEach(y => shape.lineTo(hw, y));
  shape.lineTo(hw, hh);
  shape.lineTo(-hw, hh);
  for (let i = ys.length - 1; i >= 0; i--) shape.lineTo(-hw, ys[i]);
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
  return ys.length ? rebuildCaps(geo, hw, hh, ys) : geo;
}

// La triangulación automática de las tapas (frontal y trasera) une vértices en
// diagonal a través de toda la cara. Al doblar la forma eso deja una raya de luz.
// Aquí se reemplazan por franjas horizontales que pasan por cada altura de corte.
function rebuildCaps(geo, hw, hh, ys) {
  const pos = geo.attributes.position.array;
  const uv = geo.attributes.uv.array;
  let zMax = -Infinity, zMin = Infinity;
  for (let i = 2; i < pos.length; i += 3) { zMax = Math.max(zMax, pos[i]); zMin = Math.min(zMin, pos[i]); }
  const eps = 1e-6;
  const isCap = (t) => [0, 1, 2].every(k => Math.abs(pos[t * 9 + k * 3 + 2] - zMax) < eps) ||
                       [0, 1, 2].every(k => Math.abs(pos[t * 9 + k * 3 + 2] - zMin) < eps);
  const P = [], U = [];
  for (let t = 0; t < pos.length / 9; t++) {
    if (isCap(t)) continue;
    for (let k = 0; k < 3; k++) {
      P.push(pos[t * 9 + k * 3], pos[t * 9 + k * 3 + 1], pos[t * 9 + k * 3 + 2]);
      U.push(uv[t * 6 + k * 2], uv[t * 6 + k * 2 + 1]);
    }
  }
  const rows = [-hh, ...ys, hh];
  const tri = (z, a, b, c) => [a, b, c].forEach(([x, y]) => { P.push(x, y, z); U.push(x, y); });
  for (let r = 0; r < rows.length - 1; r++) {
    const ya = rows[r], yb = rows[r + 1];
    const bl = [-hw, ya], br = [hw, ya], tr = [hw, yb], tl = [-hw, yb];
    // frontal (+z, antihoraria vista desde delante)
    tri(zMax, bl, br, tr); tri(zMax, bl, tr, tl);
    // trasera (-z)
    tri(zMin, bl, tr, br); tri(zMin, bl, tl, tr);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  out.computeVertexNormals();
  return out;
}
