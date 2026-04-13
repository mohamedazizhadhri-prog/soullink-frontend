import { useState, useCallback, useEffect } from 'react';
import { matchingService } from '@/services/matchingService';
import { socketService } from '@/lib/socket';

export type MatchStep = 'intent' | 'interests' | 'searching' | 'cards';

export function useMatching() {
    const [step, setStep] = useState<MatchStep>('intent');
    const [intent, setIntent] = useState<string>('FRIEND');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [categories, setCategories] = useState<Record<string, string[]>>({});
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [matchResult, setMatchResult] = useState<any>(null);
    const [activeMatches, setActiveMatches] = useState<any[]>([]);
    const [me, setMe] = useState<any>(null);
    const [isQuickMatching, setIsQuickMatching] = useState(false);

    const fetchMatches = useCallback(async () => {
        try {
            const res = await matchingService.getMatches();
            setActiveMatches(res.data?.data?.matches || []);
        } catch (error) {
            console.error('Failed to fetch active matches', error);
        }
    }, []);

    // Initial load
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            try {
                await fetchMatches();
                const userRes = await matchingService.getCurrentUser();
                setMe(userRes.data?.data?.user);

                const res = await matchingService.getInterestCategories();
                setCategories(res.data?.data?.categories || {});
            } catch (error) {
                console.error('Failed to initialize matching', error);
            } finally {
                setIsLoading(false);
            }
        };

        init();

        // Listen for real-time matches
        const handleMatchFound = (data: any) => {
            setMatchResult({ matched: true, matchId: data.matchId, partnerName: data.partnerName });
            setStep('intent'); // Reset or move to a "Success" view
            fetchMatches(); 
        };

        socketService.on('match:found', handleMatchFound);
        socketService.on('match:revealed', fetchMatches);

        return () => {
            socketService.off('match:found', handleMatchFound);
            socketService.off('match:revealed', fetchMatches);
        };
    }, [fetchMatches]);

    const startMatching = async (isQuick = false) => {
        setIsLoading(true);
        setIsQuickMatching(isQuick);
        setStep('searching');
        try {
            const res = await matchingService.joinQueue({
                intent,
                interests: selectedInterests,
                isQuickMatch: isQuick
            });
            
            // If the joinQueue immediately returns a match, we handle it
            // Otherwise, we wait for the socket event
            if (res.data?.data?.match) {
                setMatchResult({ matched: true, matchId: res.data.data.match.id });
                fetchMatches();
            }
        } catch (error) {
            console.error('Failed to join queue', error);
            setStep('intent');
        } finally {
            setIsLoading(false);
        }
    };

    const revealSoul = async (matchId: string) => {
        try {
            await matchingService.revealIdentity(matchId);
            fetchMatches();
        } catch (error) {
            console.error('Reveal failed', error);
        }
    };

    const leaveMatch = async (matchId: string) => {
        try {
            await matchingService.terminateMatch(matchId);
            fetchMatches();
        } catch (error) {
            console.error('Leave match failed', error);
        }
    };

    const toggleInterest = (interest: string) => {
        setSelectedInterests(prev =>
            prev.includes(interest) 
                ? prev.filter(i => i !== interest) 
                : [...prev, interest]
        );
    };

    return {
        step,
        setStep,
        intent,
        setIntent,
        selectedInterests,
        toggleInterest,
        categories,
        isLoading,
        matchResult,
        setMatchResult,
        startMatching,
        revealSoul,
        leaveMatch,
        activeMatches,
        isQuickMatching,
        me
    };
}
