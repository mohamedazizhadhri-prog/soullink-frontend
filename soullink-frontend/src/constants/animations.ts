import { Variants } from "framer-motion";

export const SPRINGS = {
    default: { damping: 25, stiffness: 150 },
    gentle: { damping: 30, stiffness: 100 },
    bouncy: { type: "spring", damping: 15, stiffness: 300 },
    heavy: { damping: 40, stiffness: 30 },
    lazy: { damping: 40, stiffness: 15 }
};

export const TRANSITIONS = {
    fast: { duration: 0.2, ease: "easeOut" },
    normal: { duration: 0.3, ease: "easeInOut" },
    slow: { duration: 0.8, ease: "easeInOut" }
};

export const COMMON_VARIANTS: Record<string, Variants> = {
    fadeIn: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
    },
    scaleUp: {
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0, opacity: 0 }
    },
    slideUp: {
        initial: { y: 20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: 20, opacity: 0 }
    }
};
