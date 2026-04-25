import { z } from "zod";
import { nounTypeEnum } from "@/db/schema/app";

export const nounTypeSchema = z.enum(nounTypeEnum.enumValues);
export type NounType = z.infer<typeof nounTypeSchema>;
export const NOUN_TYPES = nounTypeEnum.enumValues;
