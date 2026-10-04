import { clamp, type Vec } from "./simulation.ts";

export type CameraMode = "chase" | "cockpit";

export class SubmarinePilot {
  yaw = 0;
  pitch = 0;

  constructor(heading: Vec) {
    this.reset(heading);
  }

  reset(heading: Vec) {
    this.yaw = Math.atan2(heading.z, heading.x);
    this.pitch = clamp(
      Math.atan2(heading.y, Math.hypot(heading.x, heading.z)),
      -1,
      1,
    );
  }

  turn(yaw: number, pitch = 0) {
    this.yaw = Math.atan2(Math.sin(this.yaw + yaw), Math.cos(this.yaw + yaw));
    this.pitch = clamp(this.pitch + pitch, -1, 1);
  }

  get facing(): Vec {
    const level = Math.cos(this.pitch);
    return {
      x: Math.cos(this.yaw) * level,
      y: Math.sin(this.pitch),
      z: Math.sin(this.yaw) * level,
    };
  }

  movement(forward: number, strafe: number, vertical: number): Vec {
    const facing = this.facing;
    return {
      x: facing.x * forward - Math.sin(this.yaw) * strafe,
      y: facing.y * forward + vertical,
      z: facing.z * forward + Math.cos(this.yaw) * strafe,
    };
  }
}

export function cameraPose(sub: Vec, facing: Vec, mode: CameraMode) {
  const horizontal = Math.hypot(facing.x, facing.z) || 1;
  const right = { x: -facing.z / horizontal, z: facing.x / horizontal };
  const offset = mode === "chase" ? -5.8 : 1.68;
  const rise = mode === "chase" ? 2.2 : 0.22;
  const shoulder = mode === "chase" ? 0.55 : 0;
  return {
    position: {
      x: sub.x + facing.x * offset + right.x * shoulder,
      y: sub.y + facing.y * offset + rise,
      z: sub.z + facing.z * offset + right.z * shoulder,
    },
    target: {
      x: sub.x + facing.x * 9,
      y: sub.y + facing.y * 9 + (mode === "chase" ? 0.25 : 0.22),
      z: sub.z + facing.z * 9,
    },
  };
}
