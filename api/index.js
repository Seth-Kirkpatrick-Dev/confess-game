'use strict';

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
}

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const app = express();

// ── Clients ──────────────────────────────────────────────────────────────────
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Stripe webhook MUST receive raw body — register before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10kb' }));

// ── Auth middleware ───────────────────────────────────────────────────────────
const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile?.is_banned) return res.status(403).json({ error: 'Account is banned' });

  req.user = user;
  req.profile = profile;
  next();
};

const requireAdmin = (req, res, next) => {
  const pw = req.headers['x-admin-password'];
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }
  next();
};

// ── Confessions ───────────────────────────────────────────────────────────────
app.get('/api/confessions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.query.userId;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('confessions')
      .select('*, profiles(username)', { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    let userVotes = {};
    if (userId && data.length) {
      const { data: votes } = await supabase
        .from('votes')
        .select('confession_id, vote_type')
        .eq('user_id', userId)
        .in('confession_id', data.map(c => c.id));
      if (votes) {
        userVotes = votes.reduce((acc, v) => ({ ...acc, [v.confession_id]: v.vote_type }), {});
      }
    }

    res.json({
      confessions: data.map(c => ({ ...c, userVote: userVotes[c.id] || null })),
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err) {
    console.error('GET /api/confessions:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/confessions', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Confession cannot be empty' });
    if (content.length > 300) return res.status(400).json({ error: 'Max 300 characters' });

    if (!req.profile?.is_premium) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('confessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .gte('created_at', today.toISOString());
      if ((count || 0) >= 3) {
        return res.status(429).json({
          error: "Daily limit reached (3/day). Upgrade to Premium for unlimited confessions.",
          limitReached: true,
        });
      }
    }

    const { data, error } = await supabase
      .from('confessions')
      .insert({ user_id: req.user.id, content: content.trim() })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ confession: data });
  } catch (err) {
    console.error('POST /api/confessions:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/confessions/:id/vote', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { vote } = req.body;

    if (!['real', 'fake'].includes(vote)) {
      return res.status(400).json({ error: 'Vote must be "real" or "fake"' });
    }

    const { data: confession, error: confErr } = await supabase
      .from('confessions')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (confErr || !confession) return res.status(404).json({ error: 'Confession not found' });
    if (confession.user_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot vote on your own confession' });
    }

    const { data: existing } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('confession_id', id)
      .single();

    if (existing) return res.status(400).json({ error: 'You already voted on this confession' });

    const { error: voteErr } = await supabase
      .from('votes')
      .insert({ user_id: req.user.id, confession_id: id, vote_type: vote });
    if (voteErr) throw voteErr;

    const newReal = vote === 'real' ? confession.real_votes + 1 : confession.real_votes;
    const newFake = vote === 'fake' ? confession.fake_votes + 1 : confession.fake_votes;
    const total = newReal + newFake;

    await supabase
      .from('confessions')
      .update({ real_votes: newReal, fake_votes: newFake })
      .eq('id', id);

    const majority = newReal >= newFake ? 'real' : 'fake';
    let pointsEarned = 0;

    if (vote === majority) {
      pointsEarned = 5;
      await supabase.rpc('add_detection_points', {
        user_id_param: req.user.id,
        points_param: 5,
      });
    }

    const RESOLVE_THRESHOLD = 10;
    if (total >= RESOLVE_THRESHOLD && !confession.is_resolved) {
      await supabase
        .from('confessions')
        .update({ is_resolved: true })
        .eq('id', id);

      if (confession.user_id) {
        const posterPts = majority === 'real' ? 10 : -2;
        await supabase.rpc('add_confession_points', {
          user_id_param: confession.user_id,
          points_param: posterPts,
        });
      }
    }

    res.json({ success: true, real_votes: newReal, fake_votes: newFake, total_votes: total, pointsEarned, userVote: vote });
  } catch (err) {
    console.error('POST /api/confessions/:id/vote:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Leaderboard ───────────────────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  try {
    const [{ data: confessors, error: e1 }, { data: detectors, error: e2 }] = await Promise.all([
      supabase.from('profiles').select('id, username, confession_points, detection_points')
        .eq('is_banned', false).order('confession_points', { ascending: false }).limit(10),
      supabase.from('profiles').select('id, username, confession_points, detection_points')
        .eq('is_banned', false).order('detection_points', { ascending: false }).limit(10),
    ]);

    if (e1 || e2) throw e1 || e2;
    res.json({ confessors, detectors });
  } catch (err) {
    console.error('GET /api/leaderboard:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Profile ───────────────────────────────────────────────────────────────────
app.get('/api/profile', requireAuth, async (req, res) => {
  res.json({ profile: req.profile });
});

// ── Stripe ────────────────────────────────────────────────────────────────────
app.post('/api/stripe/create-checkout', requireAuth, async (req, res) => {
  try {
    let customerId = req.profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { userId: req.user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', req.user.id);
    }

    const origin = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/premium?success=true`,
      cancel_url: `${origin}/premium?cancelled=true`,
      metadata: { userId: req.user.id },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('POST /api/stripe/create-checkout:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

app.post('/api/stripe/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (userId) {
      await supabase.from('profiles').update({ is_premium: true }).eq('id', userId);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const { data: profile } = await supabase
      .from('profiles').select('id').eq('stripe_customer_id', sub.customer).single();
    if (profile) {
      await supabase.from('profiles').update({ is_premium: false }).eq('id', profile.id);
    }
  }

  res.json({ received: true });
});

// ── Admin ─────────────────────────────────────────────────────────────────────
app.get('/api/admin/confessions', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('confessions')
      .select('*, profiles(username, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ confessions: data, total: count });
  } catch (err) {
    console.error('GET /api/admin/confessions:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/confessions/:id', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('confessions')
      .update({ is_deleted: true })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/confessions/:id:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, is_premium, is_banned, confession_points, detection_points, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ users: data });
  } catch (err) {
    console.error('GET /api/admin/users:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users/:id/ban', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: true })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users/:id/unban', requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: false })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// ── Local dev server ──────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

module.exports = app;
