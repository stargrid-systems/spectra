import type { Device, DeviceType } from "~/utils/devices";

const mockDevices: Device[] = [
  { id: "1", type: "meter", name: "Main Energy Meter", status: "online" },
  { id: "2", type: "meter", name: "Solar Production Meter", status: "online" },
  { id: "3", type: "ecube", name: "Battery Storage eCube", status: "online" },
  { id: "4", type: "inverter", name: "Solar Inverter 1", status: "online" },
  { id: "5", type: "inverter", name: "Solar Inverter 2", status: "online" },
];

const mockDeviceById: Record<string, Device> = Object.fromEntries(
  mockDevices.map((device) => [device.id, device]),
);

export function useDevices() {
  return useAsyncData("devices", async () => mockDevices, {
    server: false,
  });
}

export function useDevice(type: DeviceType, id: string) {
  return useAsyncData(`device-${type}-${id}`, async () => mockDeviceById[id] ?? null, {
    server: false,
  });
}
