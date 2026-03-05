import { ZodError } from "zod";

function formatZodError(err) {
  return err.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
    code: i.code,
  }));
}

/**
 * validate({ body, query, params })
 * Each is a Zod schema (optional).
 * On success -> attaches parsed objects:
 *   req.validated = { body, query, params }
 */
export function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      const validated = {};

      if (schemas.body) validated.body = schemas.body.parse(req.body);
      if (schemas.query) validated.query = schemas.query.parse(req.query);
      if (schemas.params) validated.params = schemas.params.parse(req.params);

      req.validated = validated;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "ValidationError",
          issues: formatZodError(err),
        });
      }
      next(err);
    }
  };
}