import React, { useState } from 'react';

export interface GuideSection {
  title: string;
  icon?: string;
  description: string;
  tips?: string[];
  workflow?: string[];
}

export interface PortalGuideData {
  portalName: string;
  badge: string;
  portalDescription: string;
  currentSectionKey: string;
  sections: Record<string, GuideSection>;
}

interface ContextualHelpDrawerProps {
  guideData: PortalGuideData;
  isOpen: boolean;
  onClose: () => void;
  onSelectSection?: (sectionKey: string) => void;
}

export const ContextualHelpDrawer: React.FC<ContextualHelpDrawerProps> = ({
  guideData,
  isOpen,
  onClose,
  onSelectSection,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>(guideData.currentSectionKey);
  const [searchQuery, setSearchQuery] = useState('');

  // Update selection when drawer opens or current section changes
  React.useEffect(() => {
    setSelectedKey(guideData.currentSectionKey);
  }, [guideData.currentSectionKey, isOpen]);

  if (!isOpen) return null;

  const currentSection = guideData.sections[selectedKey] || Object.values(guideData.sections)[0];
  const sectionKeys = Object.keys(guideData.sections);

  const filteredKeys = searchQuery.trim()
    ? sectionKeys.filter((key) => {
        const sec = guideData.sections[key];
        const text = `${sec.title} ${sec.description} ${sec.tips?.join(' ') || ''} ${sec.workflow?.join(' ') || ''}`.toLowerCase();
        return text.includes(searchQuery.toLowerCase());
      })
    : sectionKeys;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end animate-fadeIn">
      {/* Click backdrop to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-white shadow-2xl h-full flex flex-col z-10 animate-slideInRight">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">💡</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white leading-none">Portal Guide & Help</h2>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary-600/80 text-white px-2 py-0.5 rounded-full">
                    {guideData.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{guideData.portalName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close help"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-slate-300 mt-3 leading-relaxed">
            {guideData.portalDescription}
          </p>

          {/* Search box */}
          <div className="mt-4 relative">
            <input
              type="text"
              placeholder="Search features, workflows, rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Section Selector Pills */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 overflow-x-auto flex gap-1.5 scrollbar-thin">
          {filteredKeys.map((key) => {
            const sec = guideData.sections[key];
            const isViewing = selectedKey === key;
            const isCurrentPage = guideData.currentSectionKey === key;

            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedKey(key);
                  if (onSelectSection) onSelectSection(key);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isViewing
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {sec.icon && <span>{sec.icon}</span>}
                <span>{sec.title}</span>
                {isCurrentPage && (
                  <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                    isViewing ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                  }`}>
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-700">
          {currentSection ? (
            <>
              {/* Section Header */}
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{currentSection.icon || '📌'}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{currentSection.title}</h3>
                    <p className="text-xs text-slate-500">Section Overview & Workflow</p>
                  </div>
                  {onSelectSection && selectedKey !== guideData.currentSectionKey && (
                    <button
                      onClick={() => {
                        onSelectSection(selectedKey);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <span>Go to section</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 text-xs text-slate-800 leading-relaxed">
                {currentSection.description}
              </div>

              {/* Step-by-Step Workflow */}
              {currentSection.workflow && currentSection.workflow.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <span>🪜</span> Step-by-Step Workflow
                  </h4>
                  <ol className="space-y-2 text-xs">
                    {currentSection.workflow.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="text-slate-700 leading-relaxed pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Pro-Tips & Rules */}
              {currentSection.tips && currentSection.tips.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <span>💡</span> Tips & Important Rules
                  </h4>
                  <ul className="space-y-2 text-xs">
                    {currentSection.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-amber-50/70 p-2.5 rounded-lg border border-amber-100/80 text-amber-950">
                        <span className="text-amber-500 flex-shrink-0 mt-0.5">✦</span>
                        <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">No section selected or matching your search.</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Need further help? Ask a director or admin.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
