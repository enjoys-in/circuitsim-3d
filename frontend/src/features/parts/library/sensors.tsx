import type { InstanceState, Params } from "../../../domain";
import { toNumber } from "../../../shared/lib/format";
import { paint } from "../paint";
import { Lead } from "../primitives/Lead";
import { Silk } from "../primitives/Silk";
import type { PartArtProps, PartFactory } from "../types";
import { EnvSensorDecor, GpsDecor, ImuDecor } from "./decor";
import { moduleFactory } from "./modules";
import { TO92_SIZE, To92, to92Pins } from "./semis";

const UNITS: Record<string, string> = {
  temperature: "°C",
  humidity: "%",
  pressure: "hPa",
  field: "mT",
  accel_z: "m/s²",
  latitude: "°",
  longitude: "°",
};

function sensorReadout(quantities: string[]) {
  return (params: Params, state?: InstanceState): string =>
    quantities
      .map((q) => {
        const value = state?.readings?.[q] ?? toNumber(params[q]);
        return `${Number(value.toFixed(q === "latitude" || q === "longitude" ? 4 : 1))}${UNITS[q] ?? ""}`;
      })
      .join(" · ");
}

const DHT_LEGS = [16, 28, 40];

function Dht22Art() {
  const holes = Array.from({ length: 20 }, (_, i) => [12 + (i % 4) * 9, 10 + Math.floor(i / 4) * 9]);
  return (
    <g>
      {DHT_LEGS.map((x) => (
        <Lead key={x} points={`${x},62 ${x},86`} />
      ))}
      <g filter={paint.shadow}>
        <rect x={4} y={2} width={48} height={62} rx={3} fill={paint.whitePlastic} />
        {holes.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={5} height={5} rx={1} fill="#94a3b8" />
        ))}
      </g>
      <Silk x={28} y={58} size={6.5} tone="ink">
        DHT22
      </Silk>
    </g>
  );
}

const DS18B20_LEGS = ["gnd", "data", "vcc"];
const HALL_LEGS = ["vcc", "gnd", "out"];

function Ds18b20Art() {
  return <To92 label="18B20" legs={DS18B20_LEGS} />;
}

function HallArt({ state }: PartArtProps) {
  return (
    <g>
      <To92 label="A3144" legs={HALL_LEGS} />
      {state?.readings?.field !== undefined && Math.abs(state.readings.field) >= 5 && (
        <circle cx={46} cy={12} r={3} fill="#ef4444" />
      )}
    </g>
  );
}

export const sensorParts: Record<string, PartFactory> = {
  bme280: moduleFactory({
    color: "purple",
    title: "BME280",
    Decor: EnvSensorDecor,
    readout: sensorReadout(["temperature", "humidity"]),
  }),
  mpu6050: moduleFactory({ color: "blue", title: "GY-521", Decor: ImuDecor, readout: sensorReadout(["accel_z"]) }),
  gps_neo6m: moduleFactory({
    color: "blue",
    title: "NEO-6M",
    height: 96,
    Decor: GpsDecor,
    readout: sensorReadout(["latitude", "longitude"]),
  }),
  dht22: () => ({
    width: 56,
    height: 86,
    pins: ["vcc", "data", "gnd"].map((name, i) => ({ name, side: "bottom" as const, x: DHT_LEGS[i], y: 86 })),
    Art: Dht22Art,
    readout: sensorReadout(["temperature", "humidity"]),
  }),
  ds18b20: () => ({
    ...TO92_SIZE,
    pins: to92Pins(DS18B20_LEGS),
    Art: Ds18b20Art,
    readout: sensorReadout(["temperature"]),
  }),
  hall_sensor: () => ({
    ...TO92_SIZE,
    pins: to92Pins(HALL_LEGS),
    Art: HallArt,
    readout: sensorReadout(["field"]),
  }),
};
