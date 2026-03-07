import { ZodError } from "zod";

function formatZodError(err) {
  return err.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
    code: i.code,
  }));
}

export function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      req.validated = {};

      if (schemas.body) {
        req.validated.body = schemas.body.parse(req.body);
      }

      if (schemas.query) {
        req.validated.query = schemas.query.parse(req.query);
      }

      if (schemas.params) {
        req.validated.params = schemas.params.parse(req.params);
      }

      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          issues: formatZodError(err),
        });
      }

      return res.status(400).json({
        error: err?.message || "Validation failed",
      });
    }
  };
}