// const express = require('express');
// const router = express.Router();
// const callerQueryController = require('../controllers/callerQueryController');
// // const { apiKeyAuth } = require('../middleware/auth');

// const apiKeyAuth = require('../middleware/apiKeyAuth');


// // POST /api/caller-query – Save a query
// router.post('/', apiKeyAuth, callerQueryController.createCallerQuer);

// // GET /api/caller-query – Get all queries (with filters)
// router.get('/', apiKeyAuth, callerQueryController.getCallerQueries);

// // GET /api/caller-query/:id – Get a specific query
// router.get('/:id', apiKeyAuth, callerQueryController.getCallerQueryById);

// // DELETE /api/caller-query/:id – Delete a query
// router.delete('/:id', apiKeyAuth, callerQueryController.deleteCallerQuery);

// module.exports = router;



const express = require('express');
const router = express.Router();
const callerQueryController = require('../controllers/callerQueryController');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// POST /api/caller-query – Save a query
router.post('/', apiKeyAuth, callerQueryController.createCallerQuery);   // ← Fixed: createCallerQuery

// GET /api/caller-query – Get all queries (with filters)
router.get('/', apiKeyAuth, callerQueryController.getCallerQueries);

// GET /api/caller-query/:id – Get a specific query
router.get('/:id', apiKeyAuth, callerQueryController.getCallerQueryById);

// DELETE /api/caller-query/:id – Delete a query
router.delete('/:id', apiKeyAuth, callerQueryController.deleteCallerQuery);

module.exports = router;