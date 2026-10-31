import { Router } from 'express';
import { z } from 'zod';
import { resolveIdentity } from '../../middleware/identity.js';
import { User } from '../../models/user.model.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';

const router = Router();
router.use(resolveIdentity);

router.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.actor.id);
    if (!user) {
      return next(new NotFoundError('User profile not found'));
    }

    res.status(200).json({
      ok: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        notificationPrefs: user.notificationPrefs || { email: true, sms: false },
      },
    });
  } catch (err) {
    next(err);
  }
});

const patchMeSchema = z.object({
  phone: z.string().optional(),
  notificationPrefs: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
  }).optional(),
}).strict();

router.patch('/', async (req, res, next) => {
  try {
    const parsed = patchMeSchema.safeParse(req.body);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(new ValidationError('Invalid fields in profile update', fields));
    }

    const updates = parsed.data;
    const user = await User.findById(req.actor.id);
    if (!user) {
      return next(new NotFoundError('User profile not found'));
    }

    if (updates.phone !== undefined) {
      user.phone = updates.phone;
    }
    if (updates.notificationPrefs) {
      user.notificationPrefs = {
        ...user.notificationPrefs,
        ...updates.notificationPrefs,
      };
    }

    await user.save();

    res.status(200).json({
      ok: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        notificationPrefs: user.notificationPrefs,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
