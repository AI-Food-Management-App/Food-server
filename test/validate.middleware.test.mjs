import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { validate } from "../middleware/validate.mjs";
function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe("validate middleware", () => {
  it("passes valid body and calls next()", () => {
    const schema = z.object({
      name: z.string().min(1),
    });

    const req = { body: { name: "Milk" }, query: {}, params: {} };
    const res = mockRes();
    const next = vi.fn();

    validate({ body: schema })(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 when body invalid", () => {
    const schema = z.object({
      name: z.string().min(1),
    });

    const req = { body: { name: "" }, query: {}, params: {} };
    const res = mockRes();
    const next = vi.fn();

    validate({ body: schema })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});