// // services/stripeService.js
// const Stripe = require('stripe');

// if (!process.env.STRIPE_SECRET_KEY) {
//   console.warn('⚠️  STRIPE_SECRET_KEY is not set in .env — Stripe calls will fail.');
// }

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// module.exports = stripe;

// services/stripeService.js
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not set in .env — Stripe calls will fail.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-07-29.dahlia', // pin explicitly — upgrade deliberately, not via Dashboard drift
});

module.exports = stripe;