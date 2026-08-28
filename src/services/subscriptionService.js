const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Fetch the most recent subscription row for a given user + hospital,
 * regardless of status (used by both activate and deactivate flows).
 */
async function getSubscriptionForUserHospital(userId, hospitalId) {
    const sql = `
        SELECT *
        FROM subscriptions
        WHERE user_id = $1 AND hospital_id = $2
        ORDER BY created_at DESC
        LIMIT 1
    `;
    const result = await executeQuery(sql, [userId, hospitalId]);
    return result.rows[0] || null;
}

async function getSubscriptionPlan(planId) {
    const sql = `SELECT * FROM subscription_plans WHERE subscription_plan_id = $1`;
    const result = await executeQuery(sql, [planId]);
    return result.rows[0] || null;
}



// /**
//  * subscription_plans.interval is constrained to 'monthly' | 'quarterly' | 'yearly'
//  * but some callers may also store a raw day-count string. Handle both.
//  */
// function intervalToDays(interval) {
//     if (interval === null || interval === undefined) return null;

//     const numeric = Number(interval);
//     if (!isNaN(numeric) && numeric > 0) return numeric;

//     const map = { monthly: 30, quarterly: 90, yearly: 365 };
//     return map[String(interval).toLowerCase()] || null;
// }




/**
 * subscription_plans.interval may be:
 *   - a bare number / numeric string:      "30"
 *   - a named interval:                    "monthly" | "quarterly" | "yearly"
 *   - a "<number> days" style string:       "30 days", "90 Days", "1 day"
 * Handle all three.
 */
function intervalToDays(interval) {
    if (interval === null || interval === undefined) return null;

    const raw = String(interval).trim();

    // Case 1: pure number ("30")
    const numeric = Number(raw);
    if (!isNaN(numeric) && numeric > 0) return numeric;

    // Case 2: named interval
    const namedMap = { monthly: 30, quarterly: 90, yearly: 365 };
    if (namedMap[raw.toLowerCase()]) return namedMap[raw.toLowerCase()];

    // Case 3: "<number> day(s)" style string, e.g. "30 days", "1 day"
    const match = raw.match(/^(\d+)\s*day/i);
    if (match) {
        const days = parseInt(match[1], 10);
        if (days > 0) return days;
    }

    return null;
}








/**
 * DEACTIVATE: mark the subscription as ended.
 */
async function endSubscription(subscriptionId) {
    const sql = `
        UPDATE subscriptions
        SET cancel_at_period_end = true,
            status = 'paused',
            canceled_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
    `;
    const result = await executeQuery(sql, [subscriptionId]);
    return result.rows[0];
}

/**
 * ACTIVATE: update only the fields present in the request body, plus
 * auto-computed current_period_end (from the plan's interval) and
 * status/cancel_at_period_end.
 *
 * Allowed pass-through fields from the body (only applied if present):
 *   stripe_customer_id, stripe_subscription_id, invoice, booking_id, current_period_start
 * subscription_plans_id, if present, drives current_period_end.
 */
const ACTIVATE_PASSTHROUGH_FIELDS = [
    'stripe_customer_id',
    'stripe_subscription_id',
    'invoice',
    'booking_id',
    'current_period_start'
];

async function activateSubscription(userId, hospitalId, body) {
    const sub = await getSubscriptionForUserHospital(userId, hospitalId);
    if (!sub) {
        throw new Error('No subscription record found for this user_id/hospital_id.');
    }

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const field of ACTIVATE_PASSTHROUGH_FIELDS) {
        if (body[field] !== undefined) {
            setClauses.push(`${field} = $${idx}`);
            values.push(body[field]);
            idx++;
        }
    }

    if (body.subscription_plans_id !== undefined) {
        setClauses.push(`subscription_plans_id = $${idx}`);
        values.push(body.subscription_plans_id);
        idx++;

        const plan = await getSubscriptionPlan(body.subscription_plans_id);
        if (!plan) {
            throw new Error(`No subscription plan found for subscription_plans_id: ${body.subscription_plans_id}`);
        }

        const days = intervalToDays(plan.interval);
        if (!days) {
            throw new Error(`Could not determine a day length for plan interval "${plan.interval}".`);
        }

        const currentPeriodEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        setClauses.push(`current_period_end = $${idx}`);
        values.push(currentPeriodEnd);
        idx++;
    }

    // NOTE: flip these two lines if you actually want cancel_at_period_end = true on activate
    setClauses.push(`cancel_at_period_end = $${idx}`);
    values.push(false);
    idx++;

    setClauses.push(`status = $${idx}`);
    values.push('active');
    idx++;

    setClauses.push(`updated_at = NOW()`);

    values.push(sub.id);
    const sql = `
        UPDATE subscriptions
        SET ${setClauses.join(', ')}
        WHERE id = $${idx}
        RETURNING *
    `;

    const result = await executeQuery(sql, values);
    return result.rows[0];
}

module.exports = {
    getSubscriptionForUserHospital,
    getSubscriptionPlan,
    intervalToDays,
    endSubscription,
    activateSubscription
};