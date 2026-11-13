import { motion } from 'motion/react';
import { PWAInstallButton } from './PWAInstallButton';

interface TopNavProps {
  isOwner: boolean;
  studentLoginId: string | null;
  onOpenAuth: (initialTab?: 'login' | 'register' | 'owner') => void;
  onScrollTo: (sectionId: string) => void;
}

export function TopNav({ isOwner, studentLoginId, onOpenAuth, onScrollTo }: TopNavProps) {
  const ctaLabel = isOwner
    ? 'Owner Console'
    : studentLoginId
      ? `ID: ${studentLoginId}`
      : 'Student Login';

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40 bg-[#09090B]/95 backdrop-blur border-b border-zinc-800/80"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <motion.a
          href="#top"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="text-xl sm:text-2xl font-extrabold tracking-wide text-white uppercase whitespace-nowrap shrink-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          RADHA EDUCATION
        </motion.a>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wider uppercase text-zinc-400">
          {[
            { label: 'Courses', action: () => onScrollTo('featured-courses') },
            { label: 'Live Classes', action: () => onScrollTo('live-classes') },
            { label: 'Recorded', action: () => onScrollTo('recorded-library') },
            { label: 'Study PDFs', action: () => onScrollTo('study-pdfs') },
            { label: 'Pricing', action: () => onScrollTo('pricing') }
          ].map((item) => (
            <motion.button
              key={item.label}
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={item.action}
              className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {item.label}
            </motion.button>
          ))}
        </nav>

        {/* Zone 3: PWA Install + Single Crimson Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />
          <motion.button
            type="button"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              if (isOwner) {
                onScrollTo('owner-console');
              } else {
                onOpenAuth('login');
              }
            }}
            className="px-5 py-2.5 text-xs font-bold tracking-wider uppercase text-white bg-[#E11D2E] hover:bg-[#C81929] rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E11D2E]"
          >
            {ctaLabel}
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
