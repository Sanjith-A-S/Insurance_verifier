import multer from 'multer';
import { env } from '../config/env.js';
import { UploadRejectedError } from '../lib/errors.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
  },
});

export const singleFileUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new UploadRejectedError(
              `Uploaded file exceeds maximum size limit of ${env.MAX_UPLOAD_MB}MB`,
              [{ field: 'file', message: `File size exceeds ${env.MAX_UPLOAD_MB}MB` }]
            )
          );
        }
        return next(
          new UploadRejectedError(`Upload rejected: ${err.message}`, [
            { field: 'file', message: err.message },
          ])
        );
      }
      return next(err);
    }
    next();
  });
};
