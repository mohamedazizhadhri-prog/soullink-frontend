import api from '@/lib/api';

export interface MatchPreference {
  intent: 'FRIEND' | 'DEEP_BOND' | 'GAMING' | 'STUDY_BUDDY' | 'ROMANCE';
  selectedInterests: string[];
  ageRangeMin?: number;
  ageRangeMax?: number;
  preferOnline?: boolean;
}

export const matchingService = {
  /** Get daily suggestions for the user */
  getSuggestions: () => api.get('/matching/suggestions'),

  /** Like or Pass a candidate */
  actOnSuggestion: (candidateId: string, action: 'like' | 'pass') =>
    api.post(`/matching/suggestions/${candidateId}/action`, { action }),

  /** Get list of active mutual matches */
  getMatches: () => api.get('/matching/matches'),

  /** Get current logged in user details */
  getCurrentUser: () => api.get('/users/me'),

  /** Get current matching preferences */
  getPreference: () => api.get('/matching/preference'),

  /** Update matching preferences (intent, interests, etc) */
  updatePreference: (data: Partial<MatchPreference>) => api.put('/matching/preference', data),

  /** Get the static list of all interest categories and tags */
  getInterestCategories: () => api.get('/matching/interests/categories'),

  /** Join the matching queue */
  joinQueue: (data: { intent: string; interests: string[]; isQuickMatch: boolean }) =>
    api.post('/matching/queue', data),

  /** Request soul reveal */
  revealIdentity: (matchId: string) =>
    api.post(`/matching/matches/${matchId}/reveal`),

  /** Leave/Quit a match */
  terminateMatch: (matchId: string) =>
    api.delete(`/matching/matches/${matchId}`),

  /** Get messages for a match conversation */
  getMatchMessages: (matchId: string) =>
    api.get(`/matching/matches/${matchId}/messages`),

  /** Send a message in a match conversation */
  sendMatchMessage: (matchId: string, content: string) =>
    api.post(`/matching/matches/${matchId}/messages`, { content }),
};
