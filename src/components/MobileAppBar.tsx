import { BookOpen, FileText, KeyRound, PlayCircle, Radio } from 'lucide-react';

interface MobileAppBarProps {
  isOwner: boolean;
  studentLoginId: string | null;
  onScrollTo: (sectionId: string) => void;
  onOpenAuth: (tab?: 'login' | 'register' | 'owner') => void;
}

export function MobileAppBar({
  isOwner,
  studentLoginId,
  onScrollTo,
  onOpenAuth
}: MobileAppBarProps) {
  return (
    <nav
      aria-label="Mobile App Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#09090B]/95 backdrop-blur-md border-t border-zinc-800 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-16">
        <button
          type="button"
          onClick={() => onScrollTo('featured-courses')}
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-white active:text-[#E11D2E] cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>Courses</span>
        </button>

        <button
          type="button"
          onClick={() => onScrollTo('live-classes')}
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-white active:text-[#E11D2E] cursor-pointer"
        >
          <Radio className="w-4 h-4 text-[#E11D2E]" />
          <span>Live</span>
        </button>

        <button
          type="button"
          onClick={() => onScrollTo('recorded-library')}
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-white active:text-[#E11D2E] cursor-pointer"
        >
          <PlayCircle className="w-4 h-4" />
          <span>Videos</span>
        </button>

        <button
          type="button"
          onClick={() => onScrollTo('study-pdfs')}
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-white active:text-[#E11D2E] cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          <span>PDFs</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isOwner) {
              onScrollTo('owner-console');
            } else {
              onOpenAuth('login');
            }
          }}
          className="flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-[#E11D2E]/15 border-l border-zinc-800 cursor-pointer"
        >
          <KeyRound className="w-4 h-4 text-[#E11D2E]" />
          <span>{isOwner ? 'Owner' : studentLoginId ? 'ID' : 'Portal'}</span>
        </button>
      </div>
    </nav>
  );
}
