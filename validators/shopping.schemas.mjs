import { z } from "zod";

const zCoerceNumber = z.coerce.number();

export const createShoppingListBody = z.object({}).strict(); // no body needed

export const listIdParams = z.object({
  listID: zCoerceNumber.int().positive(),
}).strict();

export const listItemParams = z.object({
  listID: zCoerceNumber.int().positive(),
  itemID: zCoerceNumber.int().positive(),
}).strict();

export const addShoppingItemBody = z.object({
  name: z.string().trim().min(1, "name is required"),
  quantity: zCoerceNumber.int().min(1, "quantity must be at least 1").optional().default(1),
}).strict();

export const toggleShoppingItemBody = z.object({
  checked: z.coerce.boolean(),
}).strict();