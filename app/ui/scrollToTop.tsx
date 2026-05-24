'use client';

import { useEffect, useState } from 'react';
import { ArrowUpIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-[99] flex h-12 w-12 items-center justify-center rounded-full bg-swin-red text-white shadow-lg transition-all hover:bg-red-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-swin-red focus:ring-offset-2 dark:bg-swin-red dark:hover:bg-red-700"
          aria-label="Scroll to top"
        >
          <ArrowUpIcon className="h-6 w-6 stroke-2" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
