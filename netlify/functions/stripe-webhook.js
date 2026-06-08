const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  'https://tdcycmlevvhbttxysckn.supabase.co',
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
    const userId = session.client_reference_id;
    const quantity = session.line_items?.data?.[0]?.quantity || 1;

    if (userId) {
      const { error } = await db.from('tickets').insert({
        user_id: userId,
        concours: 'Couteau Bowie | Doppler Gamma',
        quantity: quantity,
        stripe_session: session.id
      });
      
      if (error) {
        console.error('Supabase error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
