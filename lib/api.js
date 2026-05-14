import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({ baseURL: '/api' });

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// ── Confessions ───────────────────────────────────────────────────────────────
export const getConfessions = (page = 1, userId = null) =>
  api.get('/confessions', { params: { page, limit: 20, userId } }).then(r => r.data);

export const postConfession = (content, is_true, prompt_category = null) =>
  api.post('/confessions', { content, is_true, prompt_category }).then(r => r.data);

export const voteOnConfession = (id, vote) =>
  api.post(`/confessions/${id}/vote`, { vote }).then(r => r.data);

export const getConfession = (id) =>
  api.get(`/confessions/${id}`).then(r => r.data);

export const deleteConfession = (id) =>
  api.delete(`/confessions/${id}`).then(r => r.data);

export const reactToConfession = (id, emoji) =>
  api.post(`/confessions/${id}/react`, { emoji }).then(r => r.data);

export const reportConfession = (confessionId, reason, notes = '') =>
  api.post('/reports', { confession_id: confessionId, reason, notes }).then(r => r.data);

export const reportUser = (reportedUserId, reason, notes = '') =>
  api.post('/reports', { reported_user_id: reportedUserId, reason, notes }).then(r => r.data);

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = () =>
  api.get('/notifications').then(r => r.data);

export const markNotificationsRead = (ids) =>
  api.post('/notifications/read', { ids }).then(r => r.data);

// ── Leaderboard ───────────────────────────────────────────────────────────────
export const getLeaderboard = () =>
  api.get('/leaderboard').then(r => r.data);

// ── Profile ───────────────────────────────────────────────────────────────────
export const getProfile = () =>
  api.get('/profile').then(r => r.data);

export const getUserProfile = (username) =>
  api.get(`/profile/${username}`).then(r => r.data);

export const updateAvatar = (style, seed) =>
  api.post('/profile/avatar', { style, seed }).then(r => r.data);

export const updateFeaturedBadge = (achievementId) =>
  api.post('/profile/featured-badge', { achievement_id: achievementId }).then(r => r.data);

export const completeOnboarding = () =>
  api.post('/profile/onboarding').then(r => r.data);

// ── Stripe ────────────────────────────────────────────────────────────────────
export const createCheckoutSession = () =>
  api.post('/stripe/create-checkout').then(r => r.data);

// ── Admin ─────────────────────────────────────────────────────────────────────
const adminApi = (password) => axios.create({
  baseURL: '/api/admin',
  headers: { 'x-admin-password': password },
});

export const adminGetConfessions = (password, page = 1) =>
  adminApi(password).get('/confessions', { params: { page } }).then(r => r.data);

export const adminDeleteConfession = (password, id) =>
  adminApi(password).delete(`/confessions/${id}`).then(r => r.data);

export const adminGetUsers = (password) =>
  adminApi(password).get('/users').then(r => r.data);

export const adminBanUser = (password, id) =>
  adminApi(password).post(`/users/${id}/ban`).then(r => r.data);

export const adminUnbanUser = (password, id) =>
  adminApi(password).post(`/users/${id}/unban`).then(r => r.data);

export const adminGetReports = (password, type) =>
  adminApi(password).get('/reports', { params: { type } }).then(r => r.data);

export const adminRestoreConfession = (password, id) =>
  adminApi(password).post(`/confessions/${id}/restore`).then(r => r.data);

export const adminClearUserFlag = (password, id) =>
  adminApi(password).post(`/users/${id}/clear-flag`).then(r => r.data);
