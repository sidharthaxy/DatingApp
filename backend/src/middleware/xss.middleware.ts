import { Request, Response, NextFunction } from 'express';

// Basic regex to strip HTML tags. For a real production app handling complex rich text, use DOMPurify.
const stripHtml = (str: string) => {
  return str.replace(/<[^>]*>?/gm, '');
};

const sanitizeObj = (obj: any): any => {
  if (typeof obj === 'string') {
    return stripHtml(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObj(item));
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitizedObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitizedObj[key] = sanitizeObj(obj[key]);
      }
    }
    return sanitizedObj;
  }
  return obj;
};

export const xssClean = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) req.body = sanitizeObj(req.body);
  if (req.query) req.query = sanitizeObj(req.query);
  if (req.params) req.params = sanitizeObj(req.params);
  next();
};
