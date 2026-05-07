import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import orgMiddleware from '../middleware/orgMiddleware.js';
import studentListUpload from '../middleware/studentListUploadMiddleware.js';
import { createClassroom, getClassroomById, getClassrooms, joinClassroom, joinByInviteLink, approveMember, rejectMember, removeMember, importExpectedStudents, clearExpectedStudents, matchExpectedStudent, unmatchExpectedStudent, getPendingMembers, regenerateInviteLink } from '../controllers/classroomController.js';
const router = Router();
router.use(authMiddleware);
router.use(orgMiddleware);
// Core CRUD — :code accepts the 6-char joinCode OR numeric id (legacy)
router.post('/', createClassroom);
router.get('/', getClassrooms);
router.get('/:code', getClassroomById);
// Join
router.post('/join', joinClassroom);
router.post('/invite/:token', joinByInviteLink);
// Member management
router.get('/:id/pending', getPendingMembers);
router.post('/:id/members/:memberId/approve', approveMember);
router.post('/:id/members/:memberId/reject', rejectMember);
router.delete('/:id/members/:userId', removeMember);
// Expected students — supports PDF, Word, Excel, image via Gemini OCR
router.post('/:id/import-students', studentListUpload.single('file'), importExpectedStudents);
router.delete('/:id/expected-students', clearExpectedStudents);
router.post('/:id/expected-students/:expectedId/match/:userId', matchExpectedStudent);
router.delete('/:id/expected-students/:expectedId/match', unmatchExpectedStudent);
// Invite link management
router.post('/:id/regenerate-invite', regenerateInviteLink);
export default router;
