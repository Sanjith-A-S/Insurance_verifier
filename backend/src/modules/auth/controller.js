import * as authService from './service.js';

export async function register(req, res, next) {
  try {
    const result = await authService.registerClaimant(req.body);
    res.status(201).json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.body.email, req.body.password);
    res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

