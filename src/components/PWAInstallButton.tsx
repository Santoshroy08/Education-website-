import { useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  showFallbackTrigger?: boolean;
}

export function PWAInstallButton({ showFallbackTrigger = false }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-100 bg-[#14141B] border border-zinc-700 hover:border-[#E11D2E] hover:text-white rounded-sm transition-colors cursor-pointer whitespace-nowrap"
      >
        <Download className="w-3.5 h-3.5 text-[#E11D2E]" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS || showFallbackTrigger) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-200 bg-[#14141B] border border-zinc-700 hover:border-[#E11D2E] hover:text-white rounded-sm transition-colors cursor-pointer whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#E11D2E]" />
          <span>{isIOS ? 'Install on iOS' : 'Get App'}</span>
        </button>

        {showGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Install Radha Education App"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          >
            <div className="w-full max-w-sm rounded-sm border border-zinc-800 bg-[#14141B] p-6 text-zinc-100 shadow-2xl">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3
                  className="text-lg font-extrabold uppercase tracking-wide text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Install Radha Education App
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Close install guide"
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isIOS ? (
                <div className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                  <p className="flex items-start gap-2">
                    <Share className="w-4 h-4 text-[#E11D2E] shrink-0 mt-0.5" />
                    <span>
                      1. Tap the <strong className="text-white">Share</strong> button in your Safari toolbar.
                    </span>
                  </p>
                  <p>
                    2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong> to launch Radha Education as a full-screen app.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 text-sm text-zinc-300 leading-relaxed">
                  <p>
                    Open this Radha Education link directly in <strong className="text-white">Chrome, Edge, or Android Browser</strong>, then tap the browser menu <strong className="text-white">(Install App / Add to Home Screen)</strong>.
                  </p>
                  <p className="text-xs text-zinc-400">
                    The app runs full-screen with offline caching for courses, study schedules, and faster reloads.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-5 w-full py-2.5 rounded-sm bg-[#E11D2E] hover:bg-[#C81929] text-xs font-bold uppercase tracking-wider text-white cursor-pointer transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
