'use client';

import { Shell } from '@/components/layout/Shell';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay';

export function MainLayoutClient({ children }: { children: React.ReactNode }) {
    return (
        <OnboardingProvider>
            <Shell>{children}</Shell>
            <OnboardingOverlay />
        </OnboardingProvider>
    );
}
