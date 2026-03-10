/**
 * Custom hook for managing user preferences
 */

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';

interface UserPreferences {
    favoriteGenres: string[];
    onboardingCompleted: boolean;
}

export function usePreferences() {
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    const fetchPreferences = async () => {
        if (!user) {
            setPreferences(null);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/user/preferences', {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
            } else {
                setPreferences({
                    favoriteGenres: [],
                    onboardingCompleted: false,
                });
            }
        } catch (error) {
            console.error('Error fetching preferences:', error);
            setPreferences({
                favoriteGenres: [],
                onboardingCompleted: false,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const savePreferences = async (favoriteGenres: string[]) => {
        try {
            const response = await fetch('/api/user/preferences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ favoriteGenres }),
            });

            if (response.ok) {
                const data = await response.json();
                setPreferences(data.preferences);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error saving preferences:', error);
            return false;
        }
    };

    useEffect(() => {
        fetchPreferences();
    }, [user]);

    return {
        preferences,
        isLoading,
        savePreferences,
        refetch: fetchPreferences,
    };
}
