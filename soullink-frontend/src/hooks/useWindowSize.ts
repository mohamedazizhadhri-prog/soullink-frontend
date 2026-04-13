import { useState, useEffect } from 'react';

/**
 * Hook to track window dimensions safely on client-side.
 * Returns { width: 0, height: 0 } during SSR.
 */
export function useWindowSize() {
    const [windowSize, setWindowSize] = useState({
        width: 0,
        height: 0,
    });

    useEffect(() => {
        // Set initial size
        setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight,
        });

        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return windowSize;
}
