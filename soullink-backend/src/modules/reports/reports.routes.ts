/**
 * Reports Routes — User-facing report submission API
 *
 * All routes require a valid JWT (protect middleware).
 * No admin/moderator restriction — any authenticated user can file a report.
 *
 * POST   /api/reports              → submit a report
 * POST   /api/reports/:id/evidence → upload a screenshot as evidence
 * GET    /api/reports/my           → list my submitted reports
 */

import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { submitReport, uploadEvidence, getMyReports } from './reports.controller.js';

const router = Router();

// All routes require authentication
router.use(protect);

router.post('/',                   submitReport);
router.post('/:id/evidence',       upload.single('evidence'), uploadEvidence);
router.get('/my',                  getMyReports);

export default router;
