import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticateJWT } from '../../src/middleware/authMiddleware';

vi.mock('jsonwebtoken');

describe('authenticateJWT', () => {
  it('responds 401 when authorization header is missing', () => {
    const req = { headers: {} } as any;
    const res = { sendStatus: vi.fn() } as any;
    const next = vi.fn();

    authenticateJWT(req, res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('responds 403 when token is invalid', () => {
    const req = { headers: { authorization: 'Bearer badtoken' } } as any;
    const res = { sendStatus: vi.fn() } as any;
    const next = vi.fn();

    vi.mocked(jwt.verify).mockImplementation((_t, _s, cb: any) => {
      cb(new Error('invalid signature'), null);
    });

    authenticateJWT(req, res, next);

    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
