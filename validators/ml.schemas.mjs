import { z } from "zod";

export const detectAndSaveBody = z.object({
  // userID optional for now; keep if you still send it
  userID: z.coerce.number().int().positive().optional(),
}).strict();