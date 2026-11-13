import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, Eye, FileText, Lock, X } from 'lucide-react';
import {
  formatTierLabel,
  hasTierAccess,
  type PlanTier,
  type StudentProfile,
  type StudyPdfItem
} from '../types';

interface PdfVaultSectionProps {
  pdfs: StudyPdfItem[];
  student: StudentProfile | null;
  studentToken: string | null;
  isOwner: boolean;
  ownerToken: string | null;
  onOpenAuth: (tab: 'login' | 'register' | 'owner', preselectedPlan?: PlanTier) => void;
}

export function PdfVaultSection({
  pdfs,
  student,
  studentToken,
  isOwner,
  ownerToken,
  onOpenAuth
}: PdfVaultSectionProps) {
  const subjects = ['All', ...Array.from(new Set(pdfs.map((p) => p.subject)))];
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [previewPdf, setPreviewPdf] = useState<StudyPdfItem | null>(null);

  const filtered =
    selectedSubject === 'All'
      ? pdfs
      : pdfs.filter((p) => p.subject === selectedSubject);

  const isActiveStudent = student?.status === 'active';

  function resolveAuthorizedPdfUrl(pdf: StudyPdfItem): string {
    if (!pdf.fileUrl.startsWith('/api/media/')) return pdf.fileUrl;
    const sep = pdf.fileUrl.includes('?') ? '&' : '?';
    if (isOwner && ownerToken) {
      return `${pdf.fileUrl}${sep}ot=${encodeURIComponent(ownerToken)}`;
    }
    if (studentToken) {
      return `${pdf.fileUrl}${sep}st=${encodeURIComponent(studentToken)}`;
    }
    return pdf.fileUrl;
  }

  return (
    <section id="study-pdfs" className="py-16 border-t border-zinc-800 bg-[#09090B] text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#E11D2E] mb-1.5">
              03. Study PDFs &amp; Class Notes
            </p>
            <h2
              className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white text-balance"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Download Lecture Workbooks &amp; Practice Sheets
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-sm self-start">
            {subjects.map((subj) => {
              const active = selectedSubject === subj;
              return (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSelectedSubject(subj)}
                  className={`relative px-3 py-1.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="pdf-subject-tab"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="absolute inset-0 bg-[#E11D2E] rounded-sm"
                    />
                  )}
                  <span className="relative z-10">{subj}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border border-zinc-800 rounded-sm overflow-hidden bg-[#14141B]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="py-3.5 px-5">Material Title</th>
                  <th className="py-3.5 px-4">Subject &amp; Module</th>
                  <th className="py-3.5 px-4">Access Tier</th>
                  <th className="py-3.5 px-4">File Size</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-sm">
                {filtered.map((pdf, idx) => {
                  const unlocked = hasTierAccess(
                    student?.plan,
                    pdf.requiredTier,
                    Boolean(isActiveStudent),
                    isOwner
                  );
                  const authUrl = resolveAuthorizedPdfUrl(pdf);
                  return (
                    <motion.tr
                      key={pdf.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.2) }}
                      className="hover:bg-zinc-900/60 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-[#E11D2E] shrink-0" />
                          <div>
                            <div className="font-semibold text-white">{pdf.title}</div>
                            <div className="text-xs font-mono text-zinc-500">{pdf.fileName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-zinc-300">
                        <div>{pdf.subject}</div>
                        <div className="text-xs text-zinc-500">{pdf.chapter}</div>
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-zinc-300">
                        {formatTierLabel(pdf.requiredTier)}
                      </td>
                      <td className="py-4 px-4 font-mono tabular-nums text-xs text-zinc-400">
                        {pdf.fileSizeLabel}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {unlocked ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setPreviewPdf(pdf)}
                              className="px-3 py-1.5 text-xs font-semibold text-zinc-200 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-sm inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Read PDF</span>
                            </motion.button>
                            <motion.a
                              whileTap={{ scale: 0.95 }}
                              href={authUrl}
                              download={pdf.fileName}
                              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white bg-[#E11D2E] hover:bg-[#C81929] rounded-sm inline-flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </motion.a>
                          </div>
                        ) : (
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onOpenAuth('login')}
                            className="px-3 py-1.5 text-xs font-semibold text-[#E11D2E] bg-[#1F1216] border border-[#E11D2E]/40 hover:border-[#E11D2E] rounded-sm inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Login to Unlock</span>
                          </motion.button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inline PDF Reader Modal */}
      <AnimatePresence>
        {previewPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#14141B] rounded-sm border border-zinc-800 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">{previewPdf.title}</h3>
                  <p className="text-xs text-zinc-400">
                    {previewPdf.subject} · {previewPdf.chapter} · {previewPdf.fileSizeLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={resolveAuthorizedPdfUrl(previewPdf)}
                    download={previewPdf.fileName}
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#E11D2E] text-white rounded-sm hover:bg-[#C81929] inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewPdf(null)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-sm hover:bg-zinc-800 cursor-pointer"
                    aria-label="Close PDF viewer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-zinc-900">
                <iframe
                  src={resolveAuthorizedPdfUrl(previewPdf)}
                  title={previewPdf.title}
                  className="w-full h-full border-0"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
