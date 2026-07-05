import React, { useState, useEffect } from 'react';
import { useStore } from '../StoreContext';
import { X, ShieldAlert, Copy, Check, ExternalLink, AlertCircle, HelpCircle } from 'lucide-react';

export function AuthErrorModal() {
  const { authError, setAuthError, theme } = useStore();
  const [copied, setCopied] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  useEffect(() => {
    // Detect if we are running inside an iframe
    try {
      setIsIframe(window.self !== window.top);
    } catch (e) {
      setIsIframe(true);
    }
  }, []);

  if (!authError) return null;

  const currentDomain = authError.domain || window.location.hostname;
  const isUnauthorizedDomain = authError.code === 'auth/unauthorized-domain';
  const isPopupBlocked = authError.code === 'auth/popup-blocked' || authError.message.includes('popup');
  const isConfigNotFound = authError.code === 'auth/configuration-not-found';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div id="auth-error-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-red-100 dark:border-red-950/30 overflow-hidden transition-all duration-300 scale-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/20 dark:to-amber-950/10 px-6 py-5 border-b border-red-100 dark:border-red-950/30 flex items-start gap-3">
          <div className="bg-red-500/10 p-2 rounded-full text-red-600 dark:text-red-400 mt-0.5">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Authentication Issue Detected
            </h3>
            <p className="text-xs text-red-600/90 dark:text-red-400/80 font-mono mt-0.5">
              Error code: {authError.code}
            </p>
          </div>
          <button 
            onClick={() => setAuthError(null)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dialog Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Detailed Diagnosis Card */}
          {isUnauthorizedDomain ? (
            <div className="space-y-4">
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4 text-sm text-gray-700 dark:text-slate-300">
                <p className="font-semibold text-amber-800 dark:text-amber-400 mb-1">What's happening?</p>
                Firebase is blocking your login request because this website's domain is not on your Firebase project's <strong className="text-amber-900 dark:text-amber-300">"Authorised Domains"</strong> list. This is a security measure to prevent unauthorized use of your database.
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Current Application Domain
                </label>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 dark:text-slate-200 overflow-x-auto">
                  <span className="flex-1 select-all break-all">{currentDomain}</span>
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-850 text-xs text-gray-600 dark:text-slate-400 hover:text-gray-800 border border-gray-200 dark:border-slate-850 px-2.5 py-1.5 rounded-md font-sans transition-all active:scale-95 shadow-sm shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-600 dark:text-green-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  How to Fix (Step-by-Step):
                </h4>
                <ol className="text-sm space-y-2.5 text-gray-600 dark:text-slate-300 list-decimal pl-4">
                  <li>
                    Go to the{' '}
                    <a 
                      href={`https://console.firebase.google.com/project/${authError.code ? 'shahnawaz-pasu-ahaar-67fcc' : ''}/authentication/settings`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[#2D5A27] dark:text-[#4CA23B] font-medium hover:underline inline-flex items-center gap-0.5"
                    >
                      Firebase Console Authentication Settings <ExternalLink className="w-3 h-3" />
                    </a>.
                  </li>
                  <li>
                    Under the <strong className="text-gray-800 dark:text-slate-200">Settings</strong> tab, click <strong className="text-gray-800 dark:text-slate-200">Authorised domains</strong> in the left-hand list.
                  </li>
                  <li>
                    Click the <strong className="text-gray-800 dark:text-slate-200">Add domain</strong> button.
                  </li>
                  <li>
                    Paste the copied domain (<code className="bg-gray-100 dark:bg-slate-950 px-1 py-0.5 rounded font-mono text-xs">{currentDomain}</code>) and click <strong className="text-gray-800 dark:text-slate-200">Add</strong>.
                  </li>
                </ol>
              </div>
            </div>
          ) : isPopupBlocked || isIframe ? (
            <div className="space-y-4">
              <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 dark:border-blue-900/30 rounded-xl p-4 text-sm text-gray-700 dark:text-slate-300">
                <p className="font-semibold text-blue-800 dark:text-blue-400 mb-1">What's happening?</p>
                The login window was blocked because this application is running inside a secure preview <strong className="text-blue-900 dark:text-blue-300">iframe</strong>. Modern browsers block login popups inside frames to protect your credentials.
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Quick Solutions:
                </h4>
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-slate-950 p-4 border border-gray-100 dark:border-slate-850 rounded-xl flex items-start gap-3">
                    <span className="flex items-center justify-center bg-[#2D5A27] text-white rounded-full w-5 h-5 text-xs font-bold shrink-0 mt-0.5">1</span>
                    <div className="flex-1 space-y-1.5">
                      <p className="font-medium text-gray-800 dark:text-slate-200 text-sm">Recommended: Open in a New Tab</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Opening the site in its own browser tab bypasses all iframe constraints entirely, allowing the login popup to trigger flawlessly.</p>
                      <button 
                        onClick={openInNewTab}
                        className="flex items-center gap-1.5 bg-[#2D5A27] hover:bg-[#23471E] text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-all shadow-sm active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Store in New Tab</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-950 p-4 border border-gray-100 dark:border-slate-850 rounded-xl flex items-start gap-3">
                    <span className="flex items-center justify-center bg-gray-400 text-white rounded-full w-5 h-5 text-xs font-bold shrink-0 mt-0.5">2</span>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium text-gray-800 dark:text-slate-200 text-sm">Alternative: Allow Popups</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Look at the right-hand corner of your browser's address bar. If there is a blocked-popup icon (a window with a red X), click it and select "Always allow popups from this site", then try signing in again.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : isConfigNotFound ? (
            <div className="space-y-4">
              <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4 text-sm text-gray-700 dark:text-slate-300">
                <p className="font-semibold text-amber-800 dark:text-amber-400 mb-1">What's happening?</p>
                Google Sign-In is not enabled as an authentication provider in your Firebase project.
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  How to Fix:
                </h4>
                <ol className="text-sm space-y-2.5 text-gray-600 dark:text-slate-300 list-decimal pl-4">
                  <li>Go to your <strong className="text-gray-800 dark:text-slate-200">Firebase Console</strong> &rarr; <strong className="text-gray-800 dark:text-slate-200">Authentication</strong> &rarr; <strong className="text-gray-800 dark:text-slate-200">Sign-in method</strong> tab.</li>
                  <li>Click <strong className="text-gray-800 dark:text-slate-200">Add new provider</strong> and select <strong className="text-gray-800 dark:text-slate-200">Google</strong> from the list.</li>
                  <li>Toggle the <strong className="text-gray-800 dark:text-slate-200">Enable</strong> switch to active.</li>
                  <li>Configure your project's support email from the dropdown menu, then click <strong className="text-gray-800 dark:text-slate-200">Save</strong>.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-xl p-4 text-sm text-gray-700 dark:text-slate-300">
                <p className="font-semibold text-red-800 dark:text-red-400 mb-1">Error Message Detail:</p>
                <p className="font-mono text-xs text-red-600 dark:text-red-400 break-all">{authError.message}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Troubleshooting Tips:
                </h4>
                <ul className="text-sm space-y-2 text-gray-600 dark:text-slate-300 list-disc pl-4">
                  <li>Check your internet connection and ensure your network doesn't block Firebase domains.</li>
                  <li>Verify that your Firebase configuration keys in `.env` or `firebase-applet-config.json` are valid and haven't expired.</li>
                  <li>If running inside the AI Studio preview, click the <strong className="text-gray-800 dark:text-slate-200">Open Store in New Tab</strong> button below to see if bypassing the iframe resolves the issue.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 dark:bg-slate-950/40 px-6 py-4 border-t border-gray-100 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            Resolving configuration issues takes about 2 minutes.
          </p>
          <div className="flex gap-2.5">
            {isIframe && (
              <button 
                onClick={openInNewTab}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 font-medium text-sm px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-800 transition-all shadow-sm active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in New Tab</span>
              </button>
            )}
            <button 
              onClick={() => setAuthError(null)}
              className="flex-1 sm:flex-initial flex items-center justify-center bg-[#2D5A27] hover:bg-[#23471E] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
