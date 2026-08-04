const express = require('express');
const router = express.Router();

const { verifyToken, requireRole } = require('../middleware/auth');
const superadminController = require('../controllers/superadminController'); // match your actual filename

const credentialController = require('../controllers/credentialController');




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




// User routes
router.delete('/users/:id', verifyToken , requireRole(['superadmin']), superadminController.deleteUser);
 
// Hospital routes
router.delete('/hospitals/:id', verifyToken ,  requireRole(['superadmin']),   superadminController.deleteHospital);




// router.delete('/hospitals/:id', verifyToken ,  requireRole(['superadmin']),   superadminController.deleteHospital);

router.post('/credentials', verifyToken ,  requireRole(['superadmin']), credentialController.saveCredentials);



// router.post('/credentials-resources', superadminController.createCredentialsResources);

router.post('/credentials-resources', verifyToken ,  requireRole(['superadmin']), superadminController.createCredentialsResources);





// Delete via hospital_id in the body — matches your requested path style
// router.post('/credentials-resources/delete', superadminController.deleteCredentialsResources);

router.post('/credentials-resources/delete', verifyToken ,  requireRole(['superadmin']), superadminController.deleteCredentialsResources);


// Also available as a proper REST DELETE with hospital_id as a URL param
// router.delete('/credentials-resources/:hospitalId', superadminController.deleteCredentialsResources);
router.delete('/credentials-resources/:hospitalId', verifyToken ,  requireRole(['superadmin']), superadminController.deleteCredentialsResources);





router.get('/credentials-resources/:hospitalId', verifyToken ,  requireRole(['superadmin']), credentialController.getCredentials);




module.exports = router;