import { z } from "zod";

export const PRICE_DECIMALS = 4;
export const PRICE_STEP = "0.0001";

export const priceField = () =>
  z.coerce.number().min(0).refine(
    (v) => new RegExp(`^\\d+(\\.\\d{1,${PRICE_DECIMALS}})?$`).test(v.toString()),
    `Máximo ${PRICE_DECIMALS} decimales`
  );

export const priceFieldOptional = () => priceField().optional();
