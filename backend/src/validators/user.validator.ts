import { z } from 'zod';

const optionalString = (min: number, max: number) =>
  z.string().min(min).max(max).optional().or(z.literal('').transform(() => undefined));

export const updateMeSchema = z.object({
  first_name: optionalString(2, 50),
  bio: z.string().max(500).optional().or(z.literal('').transform(() => undefined)),
  height_cm: z.number().min(100).max(250).optional(),
  job_title: optionalString(1, 100),
  company: optionalString(1, 100),
  living_in: optionalString(1, 100),
  dob: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY']).optional(),
}).strict();

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
}).strict();

export const updateInterestsSchema = z.object({
  interest_ids: z.array(z.string().uuid()).min(0).max(50),
}).strict();

export const updateFcmTokenSchema = z.object({
  fcm_token: z.string().min(10),
}).strict();
