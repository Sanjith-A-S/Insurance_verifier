import { ValidationError } from '../lib/errors.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const dataToValidate = req[source];
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new ValidationError('Validation failed for input data', fields));
    }

    req[source] = result.data;
    next();
  };
}
