// src/lib/text.ts
import { z } from "zod";

// Guide and crafting content is fully translated: both languages are required.
export const FullTextSchema = z.object({ en: z.string().min(1), it: z.string().min(1) });
export type FullText = z.infer<typeof FullTextSchema>;
