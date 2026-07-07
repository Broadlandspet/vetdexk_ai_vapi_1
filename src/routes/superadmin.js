const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../middleware/auth');
const superadminController = require('../controllers/superadminController'); // match your actual filename

router.get(
    '/users',
    verifyToken,
    requireRole(['superadmin']),
    superadminController.getAllUsers
);


router.get(
    '/hospitals',
    verifyToken,
    requireRole(['superadmin']),
    superadminController.getAllHospitals
);

router.put(
    '/users/:id/role',
    verifyToken,
    requireRole(['superadmin']),
    superadminController.updateUserRole
);


router.put(
    '/users/:id/hospital',
    verifyToken,
    requireRole(['superadmin']),
    superadminController.assignHospitalToUser
);


router.put(
    '/users/:id/status',
    verifyToken,
    requireRole(['superadmin']),
    superadminController.updateUserStatus
);


router.put(
    '/hospitals/:id',
    verifyToken,
    requireRole(['superadmin']),
    superadminController.updateHospital
);


router.put(
    '/hospitals/:id/status',
    verifyToken,
    requireRole(['superadmin']),
    superadminController.updateHospitalStatus
);


router.post(
    '/hospitals',
    verifyToken,
    requireRole(['superadmin']),
    superadminController.createHospital
);


router.get(
    '/pending-registrations',
    verifyToken,
    requireRole(['superadmin']),
    superadminController.getPendingRegistrations
);


router.put(
    '/users/:id/approve',
    verifyToken,
    requireRole(['superadmin']),
    superadminController.approveUser
);

router.put(
    '/users/:id/reject',
    verifyToken,
    requireRole(['superadmin']),
    superadminController.rejectUser
);



module.exports = router;