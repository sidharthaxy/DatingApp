import { z } from 'zod';

export const updateMeSchema = z.object({
  first_name: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  height_cm: z.number().min(100).max(250).optional(),
  job_title: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  living_in: z.string().max(100).optional(),
  dob: z.string().datetime().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY']).optional(),
}).strict();

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).strict();

export const updateInterestsSchema = z.object({
  interest_ids: z.array(z.string().uuid()).min(1).max(10),
}).strict();

export const updateFcmTokenSchema = z.object({
  fcm_token: z.string().min(10),
}).strict();
