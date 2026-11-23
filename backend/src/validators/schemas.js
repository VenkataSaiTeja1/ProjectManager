const { z } = require('zod');

const loginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine(data => Boolean(data.identifier || data.email), {
  message: 'Roll number or User ID is required',
  path: ['identifier'],
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
});

const createUserSchema = z.object({
  roll_number: z.string().min(1, 'Roll number / ID is required').max(100),
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  role: z.enum(['admin', 'faculty', 'student']),
  password: z.string().min(6).optional().nullable().or(z.literal('')),
  batch_id: z.number().int().positive().optional().nullable(),
});

const updateUserSchema = z.object({
  roll_number: z.string().min(1).max(100).optional(),
  name: z.string().min(2).max(150).optional(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable().or(z.literal('')),
  role: z.enum(['admin', 'faculty', 'student']).optional(),
  batch_id: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().optional(),
});

const batchSchema = z.object({
  name: z.string().min(2, 'Batch name must be at least 2 characters').max(100),
  academic_year: z.string().min(4, 'Academic year is required').max(20),
});

const teamSchema = z.object({
  batch_id: z.number().int().positive('Batch is required'),
  name: z.string().min(2, 'Team name must be at least 2 characters').max(150),
  project_title: z.string().max(300).optional().nullable(),
  project_description: z.string().optional().nullable(),
  lead_id: z.number().int().positive().optional().nullable(),
  guide_id: z.number().int().positive().optional().nullable(),
  status: z.enum(['active', 'pending_review', 'completed']).optional(),
  progress_percent: z.number().int().min(0).max(100).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  member_ids: z.array(z.number().int().positive()).optional(),
});

const dailyUpdateSchema = z.object({
  done_today: z.string().min(1, 'What was done today is required'),
  plan_tomorrow: z.string().optional().nullable(),
  blockers: z.string().optional().nullable(),
  percent_complete: z.number().int().min(0).max(100),
  link: z.string().url().optional().nullable().or(z.literal('')),
});

const weeklyReviewSchema = z.object({
  batch_id: z.number().int().positive('Batch is required'),
  week_no: z.number().int().positive('Week number is required'),
  review_date: z.string().min(1, 'Review date is required'),
  suggestions: z.string().optional().nullable(),
  action_items: z.array(z.object({
    item: z.string(),
    due_date: z.string().optional(),
    completed: z.boolean().optional(),
  })).optional(),
  attachment_link: z.string().optional().nullable(),
});

const announcementSchema = z.object({
  audience_type: z.enum(['all', 'batch', 'team']),
  batch_id: z.number().int().positive().optional().nullable(),
  team_id: z.number().int().positive().optional().nullable(),
  title: z.string().min(2, 'Title is required').max(300),
  message: z.string().min(1, 'Message is required'),
});

const paperSchema = z.object({
  team_id: z.number().int().positive('Team is required'),
  title: z.string().min(2, 'Paper title is required').max(500),
  venue_or_journal: z.string().max(300).optional().nullable(),
  submission_id: z.string().max(100).optional().nullable(),
  status: z.enum(['not_started', 'writing', 'submitted', 'under_review', 'accepted', 'rejected', 'published']).optional(),
  status_date: z.string().optional().nullable(),
  plagiarism_percent: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const followupSchema = z.object({
  team_id: z.number().int().positive('Team is required'),
  note: z.string().min(1, 'Note is required'),
  called_on: z.string().optional().nullable(),
});

const holidaySchema = z.object({
  holiday_date: z.string().min(1, 'Date is required'),
  reason: z.string().min(1, 'Reason is required').max(300),
});

const commentSchema = z.object({
  comment: z.string().min(1, 'Comment is required'),
});

const remarkSchema = z.object({
  review_id: z.number().int().positive(),
  team_id: z.number().int().positive(),
  remark: z.string().min(1, 'Remark is required'),
  status: z.enum(['pending', 'approved', 'needs_work']).optional(),
});

const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  loginSchema, changePasswordSchema, createUserSchema, updateUserSchema,
  batchSchema, teamSchema, dailyUpdateSchema, weeklyReviewSchema,
  announcementSchema, paperSchema, followupSchema, holidaySchema,
  commentSchema, remarkSchema, validate,
};
