// // services/subscriptionPlanService.js
// const { executeQuery } = require('../config/database');

// function mapPlan(row) {
//   return {
//     subscriptionPlanId: row.subscription_plan_id,
//     stripePriceId: row.stripe_price_id,
//     subscriptionDetails: row.subscription_details,
//     price: Number(row.price),
//     interval: row.interval,
//     status: row.status
//   };
// }

// async function getActivePlans() {
//   const result = await executeQuery(
//     `SELECT subscription_plan_id, stripe_price_id, subscription_details, price, interval, status
//      FROM subscription_plans
//      WHERE status = 'active'
//      ORDER BY CASE interval
//         WHEN '30 days' THEN 1
//         WHEN '90 days' THEN 2
//         WHEN '365 days' THEN 3
//         ELSE 4
//      END`
//   );
//   return result.rows.map(mapPlan);
// }

// async function getPlanById(subscriptionPlanId) {
//   const result = await executeQuery(
//     `SELECT subscription_plan_id, stripe_price_id, subscription_details, price, interval, status
//      FROM subscription_plans
//      WHERE subscription_plan_id = $1`,
//     [subscriptionPlanId]
//   );
//   return result.rows.length ? mapPlan(result.rows[0]) : null;
// }

// // Used by checkout — plan must exist AND be active. Frontend is never
// // trusted for price/stripe_price_id, only the plan's integer DB id.
// async function getActivePlanById(subscriptionPlanId) {
//   const plan = await getPlanById(subscriptionPlanId);
//   if (!plan || plan.status !== 'active') return null;
//   return plan;
// }

// module.exports = { getActivePlans, getPlanById, getActivePlanById };


// services/subscriptionPlanService.js
const { executeQuery } = require('../config/database');

function mapPlan(row) {
  return {
    subscriptionPlanId: row.subscription_plan_id,
    stripePriceId: row.stripe_price_id,
    subscriptionDetails: row.subscription_details,
    price: Number(row.price),
    interval: row.interval,
    status: row.status
  };
}

async function getActivePlans() {
  const result = await executeQuery(
    `SELECT subscription_plan_id, stripe_price_id, subscription_details, price, interval, status
     FROM subscription_plans
     WHERE status = 'active'
     ORDER BY CASE interval
        WHEN '30 days' THEN 1
        WHEN '90 days' THEN 2
        WHEN '365 days' THEN 3
        ELSE 4
     END`
  );
  return result.rows.map(mapPlan);
}

async function getPlanById(subscriptionPlanId) {
  const result = await executeQuery(
    `SELECT subscription_plan_id, stripe_price_id, subscription_details, price, interval, status
     FROM subscription_plans
     WHERE subscription_plan_id = $1`,
    [subscriptionPlanId]
  );
  return result.rows.length ? mapPlan(result.rows[0]) : null;
}

async function getActivePlanById(subscriptionPlanId) {
  const plan = await getPlanById(subscriptionPlanId);
  if (!plan || plan.status !== 'active') return null;
  return plan;
}

module.exports = { getActivePlans, getPlanById, getActivePlanById };