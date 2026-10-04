import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Species } from "./simulation";

const materials = new Map<string, THREE.MeshStandardMaterial>();
export function material(
  color: THREE.ColorRepresentation,
  roughness = 0.65,
  metalness = 0,
) {
  const key = `${color}-${roughness}-${metalness}`;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    );
  return materials.get(key)!;
}
const sphere = new THREE.SphereGeometry(1, 24, 16);
export function ellipsoid(
  parent: THREE.Object3D,
  color: THREE.ColorRepresentation,
  position: number[],
  scale: number[],
  roughness = 0.6,
  metalness = 0,
) {
  const mesh = new THREE.Mesh(sphere, material(color, roughness, metalness));
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export function tube(
  parent: THREE.Object3D,
  points: THREE.Vector3[],
  radius: number,
  color: THREE.ColorRepresentation,
  segments = 20,
) {
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, segments, radius, 7, false),
    material(color),
  );
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
function fin(
  parent: THREE.Object3D,
  path: number[][],
  color: string,
  z = 0,
  rays = true,
) {
  const shape = new THREE.Shape();
  shape.moveTo(path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i++) shape.lineTo(path[i][0], path[i][1]);
  shape.closePath();
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
      roughness: 0.7,
      transparent: true,
      opacity: 0.94,
    }),
  );
  mesh.position.z = z;
  parent.add(mesh);
  if (rays) {
    const origin = new THREE.Vector3(path[0][0], path[0][1], z + 0.012);
    for (let i = 2; i < path.length - 1; i++) {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          origin,
          new THREE.Vector3(path[i][0], path[i][1], z + 0.012),
        ]),
        new THREE.LineBasicMaterial({
          color: "#fff0c8",
          transparent: true,
          opacity: 0.4,
        }),
      );
      parent.add(line);
    }
  }
  return mesh;
}
function stripe(
  parent: THREE.Object3D,
  x: number,
  width: number,
  color: string,
  bodyScale = [1.25, 0.62, 0.39],
) {
  const vertices: number[] = [],
    indices: number[] = [];
  const n = 40;
  for (let side = 0; side <= 1; side++) {
    const xx = x + (side - 0.5) * width;
    const factor = Math.sqrt(Math.max(0.01, 1 - (xx / bodyScale[0]) ** 2));
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      vertices.push(
        xx,
        Math.cos(a) * (bodyScale[1] * factor + 0.008),
        Math.sin(a) * (bodyScale[2] * factor + 0.008),
      );
      if (side === 0 && i < n) {
        const j = i + n + 1;
        indices.push(i, i + 1, j, i + 1, j + 1, j);
      }
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  parent.add(new THREE.Mesh(geom, material(color)));
}
export function makeFish(species: Species): THREE.Group {
  const group = new THREE.Group();
  const palettes = {
    clown: ["#f39442", "#f8b453"],
    tang: ["#248bea", "#237adb"],
    butterfly: ["#f8d878", "#efb94b"],
    puffer: ["#d7c986", "#acba73"],
  };
  const [body, fins] = palettes[species];
  if (species === "puffer") {
    ellipsoid(group, body, [0, 0, 0], [1, 0.85, 0.7]);
    ellipsoid(group, "#f3eac8", [0.12, -0.35, 0], [0.78, 0.46, 0.67]);
    for (let i = 0; i < 54; i++) {
      const theta = i * 2.39996,
        yy = 1 - i / 27,
        rr = Math.sqrt(1 - yy * yy);
      const normal = new THREE.Vector3(
        rr * Math.cos(theta),
        yy,
        rr * Math.sin(theta),
      );
      if (normal.x > 0.72) continue;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.19, 5),
        material("#8f9e62"),
      );
      spike.position.set(normal.x * 1.01, normal.y * 0.85, normal.z * 0.72);
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      group.add(spike);
    }
    const lip = new THREE.Mesh(
      new THREE.TorusGeometry(0.095, 0.035, 8, 16),
      material("#81764a"),
    );
    lip.rotation.y = Math.PI / 2;
    lip.position.set(0.98, -0.12, 0);
    group.add(lip);
  } else {
    const scales =
      species === "butterfly"
        ? [1.16, 0.9, 0.33]
        : species === "tang"
          ? [1.35, 0.75, 0.32]
          : [1.25, 0.62, 0.39];
    ellipsoid(group, body, [0, 0, 0], scales);
    if (species === "clown") {
      for (const x of [-0.76, 0.08, 0.8]) {
        stripe(group, x, 0.23, "#253c39");
        stripe(group, x, 0.16, "#fff6e5");
      }
    } else if (species === "tang") {
      for (const z of [-0.29, 0.29]) {
        ellipsoid(group, "#172e5c", [-0.2, 0.23, z], [0.78, 0.23, 0.043]);
        ellipsoid(group, "#1b315a", [-0.62, -0.09, z], [0.21, 0.43, 0.036]);
      }
    } else {
      stripe(group, 0.77, 0.15, "#314344", scales);
      for (const z of [-0.3, 0.3])
        ellipsoid(group, "#314344", [-0.64, 0.23, z], [0.18, 0.23, 0.035]);
      for (let i = 0; i < 5; i++)
        stripe(group, -0.36 + i * 0.17, 0.012, "#e5bb50", scales);
    }
    fin(
      group,
      [
        [-0.85, 0.33],
        [-0.72, 0.65],
        [-0.4, 0.93],
        [0, 0.98],
        [0.45, 0.82],
        [0.72, 0.45],
      ],
      species === "tang" ? "#488ffe" : fins,
    );
    fin(
      group,
      [
        [-0.6, -0.35],
        [-0.67, -0.78],
        [-0.23, -0.88],
        [0.3, -0.6],
        [0.55, -0.37],
      ],
      fins,
    );
  }
  const tail = new THREE.Group();
  tail.position.x = species === "puffer" ? -0.88 : -1.16;
  group.add(tail);
  fin(
    tail,
    [
      [0, 0],
      [-0.58, 0.54],
      [-0.81, 0.47],
      [-0.75, 0.2],
      [-0.69, 0],
      [-0.75, -0.2],
      [-0.81, -0.47],
      [-0.58, -0.54],
    ],
    species === "tang" ? "#f5d242" : fins,
  );
  if (species === "clown")
    fin(
      tail,
      [
        [-0.5, 0.4],
        [-0.66, 0.45],
        [-0.68, -0.45],
        [-0.5, -0.4],
      ],
      "#fff1d2",
      0.012,
      false,
    );
  group.userData.tail = tail;
  for (const side of [-1, 1]) {
    const eyeX = species === "puffer" ? 0.63 : 0.9,
      eyeY = species === "puffer" ? 0.28 : 0.15;
    const eyeZ = species === "puffer" ? 0.47 : 0.28;
    ellipsoid(
      group,
      "#fff8e8",
      [eyeX, eyeY, side * eyeZ],
      [0.18, 0.18, 0.085],
      0.25,
    );
    ellipsoid(
      group,
      "#153333",
      [eyeX + 0.055, eyeY, side * (eyeZ + 0.07)],
      [0.095, 0.11, 0.025],
      0.12,
    );
    ellipsoid(
      group,
      "#ffffff",
      [eyeX + 0.082, eyeY + 0.042, side * (eyeZ + 0.092)],
      [0.027, 0.028, 0.014],
      0.1,
    );
    const pec = fin(
      group,
      [
        [0.2, -0.02],
        [-0.1, -0.46],
        [-0.45, -0.47],
        [-0.27, -0.08],
      ],
      fins,
      side * 0.39,
    );
    pec.rotation.y = side * 0.4;
  }
  group.userData.species = species;
  return group;
}

export function makeSubmarine() {
  const group = new THREE.Group();
  ellipsoid(group, "#edb947", [0, 0, 0], [1.62, 0.82, 0.81], 0.31, 0.25);
  ellipsoid(group, "#f2ce66", [0.28, 0.33, 0], [1.36, 0.55, 0.76], 0.35, 0.15);
  ellipsoid(group, "#506256", [-1.3, 0, 0], [0.39, 0.52, 0.52], 0.35, 0.65);
  for (const x of [-0.88, 0.54]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.77, 0.042, 10, 48),
      material("#ac823b", 0.3, 0.7),
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    ring.scale.y = 1.01;
    group.add(ring);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 6.28;
      ellipsoid(
        group,
        "#e8d38d",
        [x, Math.cos(a) * 0.78, Math.sin(a) * 0.78],
        [0.035, 0.035, 0.035],
        0.3,
        0.7,
      );
    }
  }
  for (const z of [-0.79, 0.79]) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.08, 12, 36),
      material("#364e4d", 0.3, 0.7),
    );
    rim.position.set(0.23, 0.02, z);
    group.add(rim);
    ellipsoid(
      group,
      "#73d7da",
      [0.23, 0.02, z],
      [0.266, 0.266, 0.042],
      0.1,
      0.6,
    );
    ellipsoid(
      group,
      "#ceffef",
      [0.13, 0.1, z * 1.058],
      [0.075, 0.09, 0.012],
      0.1,
    );
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ellipsoid(
        group,
        "#d8dbb8",
        [0.23 + Math.cos(a) * 0.32, Math.sin(a) * 0.32 + 0.02, z * 1.033],
        [0.026, 0.026, 0.018],
        0.3,
        0.7,
      );
    }
    fin(
      group,
      [
        [-0.8, -0.2],
        [-1.3, -0.65],
        [-0.7, -0.61],
      ],
      "#bd9440",
      z * 0.9,
      false,
    );
  }
  const tower = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.33, 0.32, 5, 20),
    material("#e7b748", 0.32, 0.3),
  );
  tower.position.set(-0.37, 0.92, 0);
  group.add(tower);
  tube(
    group,
    [
      new THREE.Vector3(-0.38, 1.1, 0),
      new THREE.Vector3(-0.38, 1.67, 0),
      new THREE.Vector3(-0.18, 1.82, 0),
      new THREE.Vector3(0.17, 1.82, 0),
    ],
    0.078,
    "#59796d",
  );
  ellipsoid(group, "#81d7cf", [0.18, 1.82, 0], [0.05, 0.1, 0.1], 0.15, 0.5);
  tube(
    group,
    [
      new THREE.Vector3(0.3, -0.76, 0),
      new THREE.Vector3(1.5, -0.76, 0),
      new THREE.Vector3(1.87, -0.71, 0),
    ],
    0.09,
    "#4d655a",
  );
  const muzzle = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.035, 8, 16),
    material("#b4c4a3", 0.3, 0.7),
  );
  muzzle.rotation.y = Math.PI / 2;
  muzzle.position.set(1.87, -0.71, 0);
  group.add(muzzle);
  const propeller = new THREE.Group();
  propeller.position.x = -1.84;
  group.add(propeller);
  for (let i = 0; i < 3; i++) {
    const blade = ellipsoid(
      propeller,
      "#ad9260",
      [0, 0, 0],
      [0.06, 0.53, 0.12],
      0.35,
      0.65,
    );
    blade.rotation.x = (i * Math.PI) / 1.5;
  }
  ellipsoid(propeller, "#eee0ac", [0, 0, 0], [0.16, 0.16, 0.16], 0.25, 0.7);
  const guard = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.045, 8, 40),
    material("#638171", 0.4, 0.6),
  );
  guard.rotation.y = Math.PI / 2;
  guard.position.x = -1.82;
  group.add(guard);
  ellipsoid(group, "#fff3c3", [1.47, 0.13, 0], [0.12, 0.24, 0.24], 0.12);
  const lamp = new THREE.PointLight("#fbefb9", 7, 7, 2);
  lamp.position.set(1.9, 0.1, 0);
  group.add(lamp);
  group.userData.propeller = propeller;
  return group;
}

export function makeEnemy() {
  const group = new THREE.Group();
  ellipsoid(group, "#6d6e97", [0, 0, 0], [1.6, 0.71, 0.63], 0.45);
  ellipsoid(group, "#c8b6bd", [0.18, -0.36, 0], [1.23, 0.29, 0.51]);
  const tail = new THREE.Group();
  tail.position.x = -1.4;
  group.add(tail);
  fin(
    tail,
    [
      [0, 0],
      [-0.7, 0.8],
      [-1, 1.05],
      [-0.91, 0.1],
      [-0.7, -0.55],
      [-0.5, -0.2],
    ],
    "#4d557c",
  );
  fin(
    group,
    [
      [-0.5, 0.5],
      [-0.55, 1.5],
      [0.2, 0.64],
    ],
    "#535c85",
  );
  for (const side of [-1, 1]) {
    fin(
      group,
      [
        [0.24, -0.26],
        [-0.65, -0.82],
        [-1.05, -0.4],
      ],
      "#535c85",
      side * 0.47,
    );
    ellipsoid(group, "#ff7773", [0.99, 0.22, side * 0.46], [0.17, 0.13, 0.06]);
    ellipsoid(
      group,
      "#302e44",
      [1.04, 0.23, side * 0.51],
      [0.055, 0.085, 0.015],
    );
    for (let i = 0; i < 4; i++)
      tube(
        group,
        [
          new THREE.Vector3(0.15 - i * 0.17, 0.15, side * 0.62),
          new THREE.Vector3(0.08 - i * 0.17, -0.16, side * 0.6),
        ],
        0.014,
        "#394963",
        3,
      );
    fin(
      group,
      [
        [1.37, -0.05],
        [0.79, -0.27],
        [1.36, -0.26],
      ],
      "#4b374e",
      side * 0.35,
      false,
    );
    for (let i = 0; i < 4; i++)
      fin(
        group,
        [
          [0.88 + i * 0.12, -0.12],
          [0.96 + i * 0.12, -0.12],
          [0.94 + i * 0.12, -0.26],
        ],
        "#fff1cd",
        side * 0.366,
        false,
      );
  }
  group.userData.tail = tail;
  return group;
}

let seed = 36;
function random() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
export function makeKelp(x: number, z: number, height: number, color: string) {
  const group = new THREE.Group();
  group.position.set(x, 0.65, z);
  for (let strand = 0; strand < 5; strand++) {
    const h = height * (0.65 + random() * 0.4),
      spread = (strand - 2) * 0.22;
    const points = [
      new THREE.Vector3(spread, 0, 0),
      new THREE.Vector3(spread + 0.35, h * 0.33, 0.15),
      new THREE.Vector3(spread - 0.3, h * 0.68, -0.1),
      new THREE.Vector3(spread + 0.4, h, 0.2),
    ];
    tube(group, points, 0.035, "#438a59");
    for (let i = 0; i < 5; i++) {
      const y = h * (0.16 + i * 0.15),
        side = i % 2 ? -1 : 1,
        reach = 0.6 + random() * 0.6;
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(spread, y, 0),
        new THREE.Vector3(spread + side * reach * 0.4, y + 0.4, 0.12),
        new THREE.Vector3(spread + side * reach, y + 0.85, 0.1),
        new THREE.Vector3(spread + side * reach * 0.9, y + 1.1, 0),
      ]);
      const vertices: number[] = [],
        indices: number[] = [];
      for (let j = 0; j <= 12; j++) {
        const t = j / 12,
          p = path.getPoint(t),
          width = Math.sin(t * Math.PI) * 0.25;
        vertices.push(p.x, p.y, p.z - width, p.x, p.y, p.z + width);
        if (j < 12) {
          const k = j * 2;
          indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      geom.setIndex(indices);
      geom.computeVertexNormals();
      const leaf = new THREE.Mesh(
        geom,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.65,
          side: THREE.DoubleSide,
        }),
      );
      leaf.castShadow = true;
      group.add(leaf);
      tube(
        group,
        [path.getPoint(0), path.getPoint(0.5), path.getPoint(1)],
        0.012,
        "#a0ba73",
        8,
      );
    }
  }
  group.userData.sway = random() * 6.28;
  return group;
}
export function makeCoral(x: number, z: number, color: string, height = 2.8) {
  const group = new THREE.Group();
  group.position.set(x, 0.65, z);
  function branch(
    start: THREE.Vector3,
    vector: THREE.Vector3,
    radius: number,
    depth: number,
  ) {
    const end = start.clone().add(vector);
    tube(
      group,
      [
        start,
        start
          .clone()
          .lerp(end, 0.5)
          .add(new THREE.Vector3(0, 0.12, 0)),
        end,
      ],
      radius,
      color,
      8,
    );
    ellipsoid(group, color, end.toArray(), [
      radius * 1.12,
      radius * 1.12,
      radius * 1.12,
    ]);
    if (depth > 0)
      for (let i = 0; i < 3; i++)
        branch(
          end,
          new THREE.Vector3(
            (random() - 0.5) * height * 0.65,
            vector.y * 0.64,
            (random() - 0.5) * height * 0.4,
          ),
          radius * 0.63,
          depth - 1,
        );
  }
  for (let i = 0; i < 3; i++)
    branch(
      new THREE.Vector3((i - 1) * 0.3, 0, 0),
      new THREE.Vector3((i - 1) * 0.5, height * 0.4, 0),
      0.14,
      2,
    );
  return group;
}
export function makeRock(
  x: number,
  z: number,
  scale: number[],
  color = "#769691",
) {
  const geom = new THREE.DodecahedronGeometry(1, 1);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const factor = 0.9 + random() * 0.2;
    pos.setXYZ(
      i,
      pos.getX(i) * factor,
      pos.getY(i) * factor,
      pos.getZ(i) * factor,
    );
  }
  geom.computeVertexNormals();
  const rock = new THREE.Mesh(geom, material(color));
  rock.position.set(x, 0.7 + scale[1] * 0.55, z);
  rock.scale.set(scale[0], scale[1], scale[2]);
  rock.rotation.y = random() * 6;
  rock.castShadow = true;
  rock.receiveShadow = true;
  return rock;
}
export function makeRuins() {
  const group = new THREE.Group();
  group.position.set(2.4, 0.75, -2.4);
  group.rotation.y = -0.12;
  const stone = material("#88a99b", 0.88);
  for (const x of [-1.6, 1.6]) {
    for (let i = 0; i < 4; i++) {
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.64, 1.05),
        stone,
      );
      block.position.set(x + (random() - 0.5) * 0.13, i * 0.65 + 0.3, 0);
      block.rotation.y = (random() - 0.5) * 0.12;
      block.castShadow = true;
      block.receiveShadow = true;
      group.add(block);
    }
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.23, 0.26, 1.28), stone);
    foot.position.set(x, 0.04, 0);
    group.add(foot);
  }
  // Separate wedge stones make the arch feel carved and weathered.
  for (let i = 0; i < 10; i++) {
    const shape = new THREE.Shape();
    const a = (i / 10) * Math.PI + 0.012,
      b = ((i + 1) / 10) * Math.PI - 0.012;
    shape.moveTo(Math.cos(a) * 1.24, Math.sin(a) * 1.24);
    shape.lineTo(Math.cos(a) * 2, Math.sin(a) * 2);
    shape.absarc(0, 0, 2, a, b, false);
    shape.lineTo(Math.cos(b) * 1.24, Math.sin(b) * 1.24);
    shape.absarc(0, 0, 1.24, b, a, true);
    const wedge = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, {
        depth: 1.02,
        bevelEnabled: true,
        bevelSize: 0.05,
        bevelThickness: 0.05,
        bevelSegments: 1,
        steps: 1,
      }),
      stone,
    );
    wedge.position.set(0, 2.45, -0.5);
    wedge.castShadow = true;
    wedge.receiveShadow = true;
    group.add(wedge);
  }
  for (let i = 0; i < 18; i++) {
    const moss = ellipsoid(
      group,
      "#547d64",
      [-2.2 + random() * 4.4, random() * 0.2 + 0.3, (random() - 0.5) * 1.5],
      [0.18 + random() * 0.3, 0.09, 0.16],
    );
    moss.rotation.y = random() * 6;
  }
  for (let i = 0; i < 3; i++) {
    const brick = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.7), stone);
    brick.position.set(3 + random() * 1.3, 0.18, 0.7 + random());
    brick.rotation.set(0, random() * 3, 0.2);
    group.add(brick);
  }
  return group;
}
export function makeChest() {
  const group = new THREE.Group();
  group.position.set(-3, 0.7, 3.4);
  group.rotation.y = -0.28;
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.65, 0.83),
    material("#826447"),
  );
  box.position.y = 0.35;
  group.add(box);
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.43, 0.43, 1.35, 16, 1, false, 0, Math.PI),
    material("#a68150"),
  );
  lid.rotation.z = Math.PI / 2;
  lid.rotation.y = Math.PI / 2;
  lid.position.set(0, 0.69, -0.02);
  group.add(lid);
  for (const x of [-0.43, 0.43]) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.76, 0.88),
      material("#ceb676", 0.4, 0.6),
    );
    band.position.set(x, 0.44, 0);
    group.add(band);
  }
  const lock = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.23, 0.06),
    material("#e7ca79", 0.3, 0.7),
  );
  lock.position.set(0, 0.52, 0.46);
  group.add(lock);
  for (let i = 0; i < 6; i++)
    ellipsoid(
      group,
      "#edd587",
      [0.6 + random() * 0.7, 0.09, 0.5 + random() * 0.8],
      [0.11, 0.035, 0.11],
      0.2,
      0.7,
    );
  return group;
}
export function makeTubeCoral(x: number, z: number) {
  const group = new THREE.Group();
  group.position.set(x, 0.65, z);
  for (let i = 0; i < 9; i++) {
    const h = 0.45 + random() * 0.95,
      cx = (random() - 0.5) * 1.7,
      cz = (random() - 0.5) * 1;
    const cylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.23, h, 14, 1, true),
      new THREE.MeshStandardMaterial({
        color: "#639eb5",
        side: THREE.DoubleSide,
        roughness: 0.6,
      }),
    );
    cylinder.position.set(cx, h / 2, cz);
    group.add(cylinder);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.045, 8, 16),
      material("#92c5cb"),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(cx, h, cz);
    group.add(rim);
    ellipsoid(group, "#355b67", [cx, h - 0.14, cz], [0.14, 0.025, 0.14]);
  }
  return group;
}
export function sandTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#cbc3a2";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 24000; i++) {
    ctx.fillStyle = ["#acaf92", "#ded4b3", "#b6b496", "#f0dfba"][i % 4];
    ctx.globalAlpha = 0.25 + random() * 0.3;
    ctx.fillRect(
      random() * 512,
      random() * 512,
      1 + random() * 2,
      1 + random() * 2,
    );
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeHabitat(scene: THREE.Scene) {
  const decor = new THREE.Group();
  scene.add(decor);
  const sand = new THREE.Mesh(
    new THREE.BoxGeometry(28, 0.7, 14),
    new THREE.MeshStandardMaterial({
      map: sandTexture(),
      color: "#e5dbb6",
      roughness: 0.95,
    }),
  );
  sand.position.y = 0.35;
  sand.receiveShadow = true;
  decor.add(sand);
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(28.35, 0.24, 14.35),
    material("#406764", 0.45, 0.4),
  );
  base.position.y = -0.1;
  decor.add(base);
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#69beb3",
    transparent: true,
    opacity: 0.055,
    roughness: 0.08,
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(28, 13), glass);
  back.position.set(0, 7.1, -7);
  decor.add(back);
  for (const x of [-14, 14]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(14, 13), glass);
    side.rotation.y = Math.PI / 2;
    side.position.set(x, 7.1, 0);
    decor.add(side);
  }
  const edges: THREE.Vector3[] = [];
  for (const x of [-14, 14])
    for (const z of [-7, 7]) {
      edges.push(new THREE.Vector3(x, 0.7, z), new THREE.Vector3(x, 13.6, z));
    }
  for (const y of [0.7, 13.6]) {
    for (const z of [-7, 7])
      edges.push(new THREE.Vector3(-14, y, z), new THREE.Vector3(14, y, z));
    for (const x of [-14, 14])
      edges.push(new THREE.Vector3(x, y, -7), new THREE.Vector3(x, y, 7));
  }
  decor.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(edges),
      new THREE.LineBasicMaterial({
        color: "#afd9d0",
        transparent: true,
        opacity: 0.2,
      }),
    ),
  );
  const caustics = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { time: { value: 0 } },
    vertexShader:
      "varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "varying vec2 vUv; uniform float time; void main(){vec2 p=vUv*vec2(38.,22.); float a=sin(p.x+sin(p.y*1.3+time*.4)*1.4+time*.3);float b=sin(p.y+sin(p.x*1.2-time*.25)*1.5);float c=pow(max(0.,1.-abs(a+b)*1.4),8.);gl_FragColor=vec4(.65,.96,.81,c*.14);}",
  });
  const lightPattern = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 14),
    caustics,
  );
  lightPattern.rotation.x = -Math.PI / 2;
  lightPattern.position.y = 0.708;
  decor.add(lightPattern);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(28, 14),
    new THREE.MeshStandardMaterial({
      color: "#b0e5d1",
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      roughness: 0.18,
      metalness: 0.3,
      depthWrite: false,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 13.5;
  decor.add(water);
  const plants: THREE.Group[] = [];
  const plantSpecs: [number, number, number, string][] = [
    [-11, -4, 7.5, "#558d69"],
    [-9.4, -5, 9, "#70a77a"],
    [-12, -0.5, 5.5, "#427d62"],
    [10.6, -4.5, 8.6, "#82b88b"],
    [12, -2, 6, "#518d67"],
    [9, -5.5, 5, "#578f79"],
    [-6, -5.8, 4, "#7bab71"],
    [6, -5.5, 3.7, "#6f9f71"],
  ];
  for (const spec of plantSpecs) {
    const plant = makeKelp(...spec);
    plants.push(plant);
    decor.add(plant);
  }
  const rockSpecs: [number, number, number[], string?][] = [
    [-10, -3, [2.4, 2.2, 1.7]],
    [-12, -1.5, [1.7, 1.5, 1.5]],
    [-8.1, -4.6, [1.8, 3.2, 1.6]],
    [10.2, -3.2, [2.8, 2.6, 1.6]],
    [12, 0, [1.5, 1.7, 1.3]],
    [8.2, -4.9, [1.8, 3.4, 1.5]],
    [-7, 3.7, [1.5, 0.8, 1.2]],
    [8.4, 3.4, [1.5, 1, 1.2]],
  ];
  rockSpecs.forEach((spec) => decor.add(makeRock(...spec)));
  decor.add(
    makeCoral(-9.8, 1.2, "#d6928e", 3.5),
    makeCoral(9.8, 1.9, "#dc9d90", 3.3),
    makeCoral(-6.5, -3, "#baa1c3", 2.1),
    makeCoral(6.8, 3.8, "#ce9c88", 2),
    makeTubeCoral(-8, 2.8),
    makeTubeCoral(8.4, -0.8),
    makeRuins(),
    makeChest(),
  );
  for (let i = 0; i < 42; i++) {
    const x = (random() - 0.5) * 26,
      z = (random() - 0.5) * 12,
      s = 0.08 + random() * 0.23;
    decor.add(
      makeRock(
        x,
        z,
        [s * 1.5, s * 0.6, s],
        ["#a4ad98", "#c9c4a5", "#8ba295"][i % 3],
      ),
    );
  }
  // Shell and small sea stars in the foreground.
  for (let i = 0; i < 4; i++) {
    const star = new THREE.Shape();
    for (let j = 0; j < 10; j++) {
      const a = (j * Math.PI) / 5,
        r = j % 2 ? 0.17 : 0.46;
      if (j === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    star.closePath();
    const mesh = new THREE.Mesh(
      new THREE.ExtrudeGeometry(star, {
        depth: 0.07,
        bevelEnabled: true,
        bevelSize: 0.045,
        bevelThickness: 0.04,
        bevelSegments: 2,
      }),
      material("#d89978"),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = random() * 6;
    mesh.position.set(-9 + i * 5.5, 0.74, 4.4 + random());
    decor.add(mesh);
  }
  for (const plant of plants) mergeStaticMeshes(plant);
  mergeStaticMeshes(decor, new Set(plants));
  return { caustics, plants };
}

// Bake the many handmade mesh pieces into a small number of material batches.
// Kelp is batched individually, retaining its animated root transform.
function mergeStaticMeshes(
  root: THREE.Group,
  excluded = new Set<THREE.Group>(),
) {
  root.updateWorldMatrix(true, true);
  const inverse = root.matrixWorld.clone().invert();
  const batches = new Map<
    string,
    {
      material: THREE.MeshStandardMaterial;
      geometries: THREE.BufferGeometry[];
      meshes: THREE.Mesh[];
    }
  >();
  const walk = (object: THREE.Object3D) => {
    if (excluded.has(object as THREE.Group)) return;
    if (
      object instanceof THREE.Mesh &&
      object.material instanceof THREE.MeshStandardMaterial &&
      !object.material.transparent
    ) {
      const mat = object.material;
      const key = `${mat.color.getHex()}-${mat.roughness}-${mat.metalness}-${mat.side}-${mat.map?.uuid || ""}`;
      let batch = batches.get(key);
      if (!batch) {
        batch = { material: mat, geometries: [], meshes: [] };
        batches.set(key, batch);
      }
      const geom = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      geom.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
      batch.geometries.push(geom);
      batch.meshes.push(object);
    }
    for (const child of object.children) walk(child);
  };
  walk(root);
  for (const batch of batches.values()) {
    if (batch.meshes.length < 2) {
      for (const g of batch.geometries) g.dispose();
      continue;
    }
    const geometry = mergeGeometries(batch.geometries);
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, batch.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      batch.meshes.forEach((m) => m.removeFromParent());
      root.add(mesh);
    }
    for (const g of batch.geometries) g.dispose();
  }
}

export function fishThumbnail(species: Species, renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#e6fff8", "#759f99", 1.7));
  const light = new THREE.DirectionalLight("#fff3d4", 1.8);
  light.position.set(3, 5, 6);
  scene.add(light);
  const fish = makeFish(species);
  fish.rotation.y = -0.35;
  fish.rotation.z = 0.12;
  scene.add(fish);
  const camera = new THREE.OrthographicCamera(-2.3, 2.3, 1.55, -1.55, 0.1, 20);
  camera.position.set(0, 0.45, 7);
  camera.lookAt(0, 0.1, 0);
  renderer.setSize(320, 216);
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, camera);
  const image = renderer.domElement.toDataURL("image/png");
  // Thumbnails share cached materials and sphere geometry with the main scene.
  disposeModel(fish);
  return image;
}

export function disposeModel(
  object: THREE.Object3D,
  protectedMaterials = new Set<THREE.Material>(),
) {
  const shared = new Set<THREE.Material>(materials.values());
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Line)) return;
    if (child.geometry !== sphere) child.geometry.dispose();
    for (const mat of Array.isArray(child.material)
      ? child.material
      : [child.material]) {
      if (!shared.has(mat) && !protectedMaterials.has(mat)) mat.dispose();
    }
  });
}
