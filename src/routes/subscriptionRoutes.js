const express =
    require('express');

const controller =
    require('../controllers/subscriptionController');


const router =
    express.Router();


// ============================================================================
// PRIVATE MANUAL-PAUSE GUARD
//
// Header:
//
// x-subscription-pause-key: YOUR_SECRET
//
// Cron does NOT use this route.
// ============================================================================

function requirePauseKey(
    req,
    res,
    next
) {

    const configuredKey =
        process.env
            .SUBSCRIPTION_PAUSE_MANUAL_KEY;


    if (
        !configuredKey
    ) {

        return res.status(503).json({

            success:
                false,

            error:
                'Manual subscription pause endpoint is disabled.'
        });
    }


    const providedKey =
        req.headers[
            'x-subscription-pause-key'
        ];


    if (
        !providedKey
        ||
        providedKey !== configuredKey
    ) {

        return res.status(401).json({

            success:
                false,

            error:
                'Unauthorized'
        });
    }


    return next();
}


// ============================================================================
// MANUAL PAUSE
// ============================================================================

router.post(
    '/:id/pause-now',

    requirePauseKey,

    controller.pauseNow
);


module.exports =
    router;