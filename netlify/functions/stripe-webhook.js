const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const userId = session.metadata?.user_id;
    const concours = session.metadata?.concours;
    const quantity = parseInt(session.metadata?.quantity || '1');

    if (userId && concours) {
      await db.from('tickets').insert({
        user_id: userId,
        concours: concours,
        quantity: quantity,
        stripe_session: session.id
      });
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
