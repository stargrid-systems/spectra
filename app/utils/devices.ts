export type DeviceType = "meter" | "ecube" | "inverter";

export type DeviceStatus = "online" | "offline";

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  status: DeviceStatus;
}

export interface DeviceConfig {
  icon: string;
  color: "info" | "success" | "warning";
}

export const deviceConfig: Record<DeviceType, DeviceConfig> = {
  meter: { icon: "i-lucide-gauge", color: "info" },
  ecube: { icon: "i-lucide-battery", color: "success" },
  inverter: { icon: "i-lucide-zap", color: "warning" },
};

export function isDeviceType(value: string): value is DeviceType {
  return value === "meter" || value === "ecube" || value === "inverter";
}
