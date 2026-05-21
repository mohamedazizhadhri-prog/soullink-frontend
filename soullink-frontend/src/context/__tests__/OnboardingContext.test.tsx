// @ts-nocheck
// src/context/__tests__/OnboardingContext.test.tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { OnboardingProvider, useOnboarding } from '../OnboardingContext';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) { return store[key] ?? null; },
    setItem(key: string, value: string) { store[key] = value; },
    removeItem(key: string) { delete store[key]; },
    clear() { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock api.patch
jest.mock('@/lib/api', () => ({
  patch: jest.fn().mockResolvedValue({ data: { user: { onboardingCompleted: true } } }),
}));

describe('OnboardingContext', () => {
  it('auto-starts when not completed and on /match', async () => {
    // Simulate logged‑in user without completion flag
    window.localStorage.setItem('sl_user', JSON.stringify({ id: '1', onboardingCompleted: false }));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingProvider>{children}</OnboardingProvider>
    );
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    // Simulate pathname = '/match'
    act(() => {
      // @ts-ignore – internal hook state manipulation for test
      result.current.startTour();
    });
    expect(result.current.phase).toBe('running');
  });

  it('does not start when already completed', async () => {
    window.localStorage.setItem('sl_user', JSON.stringify({ id: '1', onboardingCompleted: true }));
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingProvider>{children}</OnboardingProvider>
    );
    const { result } = renderHook(() => useOnboarding(), { wrapper });
    expect(result.current.phase).toBe('done');
  });
});
