import { z } from "zod";

// Coerce string numbers ("2") into numbers
const zCoerceNumber = z.coerce.number();

export const fridgeAddItemBody = z.object({
  name: z.string().trim().min(1, "name is required"),
  // allow negative to decrement
  quantity: zCoerceNumber.optional().default(1),
  // optional: allow caller to force category later if you want
  CategoryID: zCoerceNumber.int().positive().optional(),
  expiryDate: z
    .string()
    .optional()
    .or(z.literal(null))
    .default(null),
}).strict();

import { z } from "zod";

export const fridgeGetItemsQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).optional(),
}).strict();