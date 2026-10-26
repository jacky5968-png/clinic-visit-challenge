import * as THREE from 'three';

// Stylized from the supplied 生達-製劑大樓 photograph. Repeated facade elements
// share instanced geometry so the backdrop stays inexpensive on mobile devices.
export function buildFormulationBuilding() {
  const root = new THREE.Group();
  root.name = 'shengda-formulation-building';
  root.userData.landmark = '生達製劑大樓';
  const batches = new Map<number, THREE.Matrix4[]>();
  const transform = new THREE.Object3D();
  const colors = { wall: 0xf2eee1, trim: 0xfff9eb, brick: 0x975f50, glass: 0x40585c,
    paving: 0xb2b6ac, road: 0x727f80, line: 0xf7e6b1, metal: 0x35474b, hedge: 0x368754 };
  function box(color: number, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
    transform.position.set(x, y, z); transform.rotation.set(0, ry, 0); transform.scale.set(w, h, d);
    transform.updateMatrix();
    const list = batches.get(color) ?? []; list.push(transform.matrix.clone()); batches.set(color, list);
  }
  box(colors.paving, 22, .18, 11.5, 0, .09, .7);
  box(colors.road, 23, .025, 2, 0, .19, 7.1);
  for (let x = -10; x <= 10; x += 2.4) box(colors.line, 1.1, .018, .08, x, .211, 7.1);
  box(colors.wall, 18, 5.1, 7, 0, 2.77, 0);
  box(colors.trim, 18.5, .18, 7.4, 0, 5.39, 0);
  // Recessed rooftop storey and the continuous terracotta roofline.
  box(colors.wall, 16.4, .7, 5.7, 0, 5.81, -.35);
  box(colors.brick, 16.8, .18, 6.05, 0, 6.2, -.35);
  for (const x of [-7.3, 7.3]) box(colors.trim, 1.1, 1.15, 1.2, x, 5.9, -.3);
  for (let col = 0; col < 23; col++) {
    const x = -8.47 + col * .77;
    for (let row = 0; row < 6; row++) {
      const y = .7 + row * .76;
      box(colors.glass, .51, .48, .045, x, y, 3.53);
      box(colors.glass, .51, .48, .045, x, y, -3.53);
    }
  }
  for (let col = 0; col < 24; col++) {
    const x = -8.87 + col * .77;
    box(colors.trim, .17, 4.95, .36, x, 2.79, 3.64);
    box(colors.trim, .17, 4.95, .25, x, 2.79, -3.59);
  }
  for (let row = 0; row < 6; row++) {
    const y = 1.08 + row * .76;
    box(colors.brick, 18.05, .12, 7.07, 0, y, 0);
    box(colors.trim, 18.25, .1, 7.25, 0, y + .1, 0);
  }
  for (const side of [-1, 1]) {
    for (let col = 0; col < 9; col++) {
      const z = -3.06 + col * .76;
      for (let row = 0; row < 6; row++) box(colors.glass, .045, .48, .49, side * 9.025, .7 + row * .76, z);
      box(colors.trim, .34, 4.95, .15, side * 9.14, 2.79, z - .37);
    }
  }
  // Diagonal concrete fins at the base, with a clear central entrance.
  const section = new THREE.Shape(); section.moveTo(0, 0); section.lineTo(.85, 0); section.lineTo(0, 1.5); section.closePath();
  const finGeometry = new THREE.ExtrudeGeometry(section, { depth: .19, bevelEnabled: false });
  finGeometry.rotateY(-Math.PI / 2); finGeometry.translate(.095, 0, 0);
  const finPositions = Array.from({ length: 24 }, (_, n) => -8.87 + n * .77).filter(x => Math.abs(x) > 2.2);
  const fins = new THREE.InstancedMesh(finGeometry, new THREE.MeshStandardMaterial({ color: colors.trim, roughness: .88 }), finPositions.length);
  fins.name = 'formulation-diagonal-concrete-fins'; fins.castShadow = fins.receiveShadow = true;
  finPositions.forEach((x, i) => { transform.position.set(x, .2, 3.7); transform.rotation.set(0, 0, 0); transform.scale.set(1, 1, 1); transform.updateMatrix(); fins.setMatrixAt(i, transform.matrix); });
  root.add(fins);
  box(colors.glass, 3.8, 1.3, .12, 0, .87, 3.75);
  for (const x of [-1.7, -.55, .55, 1.7]) box(colors.metal, .055, 1.3, .15, x, .87, 3.83);
  box(colors.brick, 5.1, .22, 1.4, 0, 1.73, 4.12);
  for (let step = 0; step < 3; step++) box(colors.trim, 4.6 + step * .35, .1, .4, 0, .35 - step * .05, 4.6 + step * .3);
  // Lawn edging, clipped hedges and parking markings frame the forecourt.
  for (const x of [-10.05, 10.05]) box(colors.hedge, .7, .42, 8, x, .43, .15);
  for (let x = -9; x <= 9; x += 1.7) if (Math.abs(x) > 3) box(colors.trim, .045, .018, 1.4, x, .197, 5.5);
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  for (const [color, matrices] of batches) {
    const mesh = new THREE.InstancedMesh(unitBox, new THREE.MeshStandardMaterial({ color, roughness: .88 }), matrices.length);
    mesh.name = 'formulation-facade-' + color.toString(16);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
  }
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#35474b'; ctx.fillRect(0, 0, 1024, 160);
  ctx.fillStyle = '#fff2c5'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 128px "Microsoft JhengHei","微軟正黑體",sans-serif'; ctx.fillText('生達製劑大樓', 512, 86, 960);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4.9, .65), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  plaque.name = 'formulation-building-name'; plaque.position.set(0, 1.81, 4.835); root.add(plaque);
  return root;
}
