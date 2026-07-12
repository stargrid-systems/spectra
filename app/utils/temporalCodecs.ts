// Vendored from zod-temporal (BSD-2-Clause, DASPRiD)
// https://github.com/DASPRiD/zod-temporal
import * as z from "zod/v4/mini";

export const instantCodec = z.codec(
  z.string(),
  z.custom<Temporal.Instant>((value) => value instanceof Temporal.Instant),
  {
    decode: (value, ctx) => {
      try {
        return Temporal.Instant.from(value);
      } catch {
        ctx.issues.push({
          code: "custom",
          message: "Invalid instant",
          input: ctx.value,
        });
        return undefined as never;
      }
    },
    encode: (value) => value.toString(),
  },
);
