const subscriptionPauseService =
    require('../services/subscriptionPauseService');


// ============================================================================
// PAUSE NOW
// ============================================================================

async function pauseNow(
    req,
    res,
    next
) {

    try {

        const input = {

            unused_time_from:
                req.body?.unused_time_from
                ??
                process.env
                    .SUBSCRIPTION_PAUSE_UNUSED_TIME_FROM
                ??
                'none',


            outstanding_usage_through:
                req.body?.outstanding_usage_through
                ??
                process.env
                    .SUBSCRIPTION_PAUSE_OUTSTANDING_USAGE_THROUGH
                ??
                'now',


            invoicing_behavior:
                req.body?.invoicing_behavior
                ??
                process.env
                    .SUBSCRIPTION_PAUSE_INVOICING_BEHAVIOR
                ??
                'pending_invoice_item'
        };


        const data =
            await subscriptionPauseService
                .pauseSubscriptionNow(
                    req.params.id,
                    input
                );


        return res.json({

            success:
                true,

            data
        });


    } catch (
        error
    ) {

        return next(
            error
        );
    }
}


module.exports = {
    pauseNow
};