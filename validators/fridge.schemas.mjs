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
    .datetime({ offset: true })
    .optional()
    .or(z.literal(null))
    .default(null),
}).strict();

export const fridgeGetItemsQuery = z.object({
  // you said you want filter by CategoryID names; your FE may send CategoryID number
  // We'll support either:
  category: z.string().trim().min(1).optional(),      // category name
  categoryId: zCoerceNumber.int().positive().optional(), // category id
  search: z.string().trim().min(1).optional(),
}).strict();