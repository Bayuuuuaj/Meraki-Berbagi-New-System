import { motion } from 'framer-motion';
import React from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            className="w-full min-h-screen relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
        >
            {children}
        </motion.div>
    );
}
