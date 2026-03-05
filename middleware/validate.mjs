import { ZodError } from "zod";

/**
 * validate({ body?, query?, params? })
 * - Validates req.body/req.query/req.params against provided Zod schemas.
 * - On success: replaces those objects with parsed results (typed/cleaned).
 * - On failure: returns 400 with details.
 */
export function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query);
      if (schemas.params) req.params = schemas.params.parse(req.params);

      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          issues: err.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
      }
      return res.status(400).json({ error: err?.message || "Validation failed" });
    }
  };
}