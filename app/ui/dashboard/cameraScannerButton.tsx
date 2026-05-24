'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import {
  ViewfinderCircleIcon,
  XMarkIcon,
  PhotoIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  Cog6ToothIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { scanBlob } from '@/lib/barcodeScanner';

const CameraScanner = dynamic(() => import('@/app/ui/dashboard/cameraScanner'), { ssr: false });

const buildNextUrl = (
  pathname: string | null,
  searchParams: ReturnType<typeof useSearchParams>,
  scannedValue: string,
) => {
  const params = new URLSearchParams(searchParams?.toString() ?? '');
  params.set('q', scannedValue);
  return `${pathname ?? '/dashboard/check-in'}?${params.toString()}`;
};

type CameraScannerButtonProps = {
  onDetected?: (value: string) => void;
  uploadLabel?: string;
  modalTitle?: string;
  modalDescription?: string;
  lastScanPrefix?: string;
  className?: string;
};

type DeviceOption = {
  deviceId: string;
  label: string;
};

export default function CameraScannerButton({
  onDetected,
  uploadLabel = 'Upload a photo instead',
  modalTitle = 'Scan barcode',
  modalDescription = 'Point your camera at the barcode. We\u2019ll capture it automatically.',
  lastScanPrefix = 'Last scan',
  className,
}: CameraScannerButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<DeviceOption[]>([]);
  const [deviceListError, setDeviceListError] = useState<string | null>(null);
  const [enumeratingDevices, setEnumeratingDevices] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [successFlash, setSuccessFlash] = useState<string | null>(null);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const modalUploadInputRef = useRef<HTMLInputElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const debugEndRef = useRef<HTMLDivElement | null>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setDebugLog((prev) => [...prev.slice(-80), `[${ts}] ${msg}`]);
  }, []);

  useEffect(() => {
    debugEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [debugLog]);

  const refreshDeviceOptions = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setDeviceListError('Camera API is not supported in this browser.');
      setAvailableDevices([]);
      return;
    }
    try {
      setEnumeratingDevices(true);
      setDeviceListError(null);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter((device) => device.kind === 'videoinput' && device.deviceId !== '')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));
      setAvailableDevices(videoInputs);
      addLog(`Enumerated ${videoInputs.length} camera(s)`);
      if (!videoInputs.length) {
        setDeviceListError('No camera devices detected. Connect a camera or check permissions.');
      }
    } catch (error) {
      console.error('Unable to enumerate camera devices', error);
      setAvailableDevices([]);
      setDeviceListError(
        'Unable to list cameras. Ensure camera permission is granted and try refreshing.',
      );
    } finally {
      setEnumeratingDevices(false);
    }
  }, [addLog]);

  useEffect(() => {
    if (!open) return;
    setDebugLog([]);
    setManualOpen(false);
    setManualValue('');
    setSettingsOpen(false);
    setErrorMessage(null);
    setSuccessFlash(null);
    addLog('Modal opened');
    addLog(
      `Native BarcodeDetector: ${typeof window !== 'undefined' && 'BarcodeDetector' in window}`,
    );
    void refreshDeviceOptions();
  }, [open, refreshDeviceOptions, addLog]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const defaultDetectedHandler = useCallback(
    (value: string) => {
      const nextUrl = buildNextUrl(pathname, searchParams, value);
      router.replace(nextUrl, { scroll: false });
      router.refresh();
    },
    [pathname, router, searchParams],
  );

  const commitDetected = useCallback(
    (value: string) => {
      setLastScan(value);
      setOpen(false);
      setStatusMessage(null);
      if (onDetected) onDetected(value);
      else defaultDetectedHandler(value);
    },
    [defaultDetectedHandler, onDetected],
  );

  // Called by CameraScanner OR the manual-entry form — shows a brief
  // success flash, then closes and hands off the value.
  const handleDetected = useCallback(
    (value: string) => {
      setSuccessFlash(value);
      window.setTimeout(() => commitDetected(value), 450);
    },
    [commitDetected],
  );

  const handleScanError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const handleDebugLog = useCallback((msg: string) => {
    setDebugLog((prev) => [...prev.slice(-80), msg]);
  }, []);

  const toggleFacingMode = () => {
    if (selectedDeviceId) return;
    setFacingMode((current) => (current === 'environment' ? 'user' : 'environment'));
  };

  const decodeImageFile = async (file: File) => {
    setStatusMessage('Processing uploaded image\u2026');
    setErrorMessage(null);
    addLog(`Upload: ${file.name} (${(file.size / 1024).toFixed(0)}KB, ${file.type})`);

    try {
      const origBitmap = await createImageBitmap(file);
      addLog(`Image: ${origBitmap.width}x${origBitmap.height}`);
      origBitmap.close();
    } catch { /* ignore */ }

    const result = await scanBlob(file, addLog);
    if (result) {
      addLog(`DETECTED: "${result.text}" (engine: ${result.engine})`);
      setLastScan(result.text);
      setStatusMessage(null);
      handleDetected(result.text);
    } else {
      setStatusMessage(null);
      setErrorMessage('No barcode detected. Try a clearer photo or a different angle.');
    }
  };

  const handleUploadChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await decodeImageFile(file);
    event.target.value = '';
  };

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = manualValue.trim();
    if (!trimmed) return;
    handleDetected(trimmed);
  };

  useEffect(() => {
    if (manualOpen) {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  }, [manualOpen]);

  const hasMultipleCameras = availableDevices.length > 1;

  return (
    <>
      {/* ---------- Trigger zone (on page) ---------- */}
      <div className={clsx('flex flex-col gap-3', className)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
        {/* Primary: Scan with camera */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative flex w-full flex-1 items-center gap-3 overflow-hidden rounded-card bg-primary px-3.5 py-3 text-left text-on-primary transition hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-on-primary/10 blur-sm transition group-hover:scale-110"
          />
          <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-on-primary/25 bg-on-primary/15 backdrop-blur-sm">
            <ViewfinderCircleIcon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block font-sans text-[9px] font-bold uppercase tracking-[1.3px] opacity-85">
              Fastest way
            </span>
            <span className="block font-display text-[15px] font-semibold leading-tight">
              Scan with camera
            </span>
            <span className="block font-sans text-[11px] opacity-80">
              Point at the barcode · auto-captures
            </span>
          </span>
          <QrCodeIcon className="relative h-4 w-4 flex-shrink-0 opacity-70" />
        </button>

        {/* Secondary: Upload a photo (same coral as Scan) */}
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          className="group relative flex w-full flex-1 items-center gap-3 overflow-hidden rounded-card bg-primary px-3.5 py-3 text-left text-on-primary transition hover:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-dark-canvas"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-on-primary/10 blur-sm transition group-hover:scale-110"
          />
          <span className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-on-primary/25 bg-on-primary/15 backdrop-blur-sm">
            <PhotoIcon className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block font-sans text-[9px] font-bold uppercase tracking-[1.3px] opacity-85">
              No camera?
            </span>
            <span className="block font-display text-[15px] font-semibold leading-tight">
              {uploadLabel}
            </span>
            <span className="block font-sans text-[11px] opacity-80">
              Pick an image from your device
            </span>
          </span>
          <ArrowUpTrayIcon className="relative h-4 w-4 flex-shrink-0 opacity-70" />
        </button>
        </div>

        {lastScan && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-pill border border-success/30 bg-success/10 px-2.5 py-0.5 font-mono text-code font-semibold text-success">
            <CheckCircleIcon className="h-3 w-3" />
            {lastScanPrefix} &middot; {lastScan}
          </span>
        )}

        {statusMessage && (
          <p className="font-sans text-body-sm font-medium text-muted dark:text-on-dark-soft">
            {statusMessage}
          </p>
        )}
        {errorMessage && !open && (
          <p className="font-sans text-body-sm font-medium text-primary dark:text-dark-primary">{errorMessage}</p>
        )}
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleUploadChange(event);
        }}
      />

      {/* ---------- Scanner modal ---------- */}
      {open && (
        <>
          <style jsx global>{`
            @keyframes scanLineDown {
              0% { transform: translateY(-100%); opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { transform: translateY(100%); opacity: 0; }
            }
            @keyframes successPop {
              0% { transform: scale(0.8); opacity: 0; }
              50% { transform: scale(1.05); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="scanner-title"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black sm:bg-black/85 sm:p-4"
          >
            <div className="relative flex h-full w-full flex-col overflow-hidden bg-dark-canvas text-on-dark sm:h-[680px] sm:max-h-[92vh] sm:max-w-xl sm:rounded-card sm:shadow-[0_4px_16px_rgba(20,20,19,0.08)]">
              {/* Top bar */}
              <header className="relative z-10 flex items-center justify-between gap-3 border-b border-dark-hairline bg-black/30 px-4 py-3 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1.5 rounded-full border border-dark-hairline bg-dark-surface-card/40 px-3 py-1.5 font-sans text-button text-on-dark/80 transition hover:bg-dark-surface-strong hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  aria-label="Close scanner"
                >
                  <ArrowLeftIcon className="h-3.5 w-3.5" />
                  Back
                </button>
                <h2 id="scanner-title" className="absolute left-1/2 -translate-x-1/2 font-display text-title-md font-semibold">
                  {modalTitle}
                </h2>
                <div className="flex items-center gap-1.5">
                  {hasMultipleCameras && (
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      disabled={Boolean(selectedDeviceId)}
                      aria-label="Switch camera"
                      className="rounded-pill border border-dark-hairline bg-dark-surface-card/40 p-2 text-on-dark/80 transition hover:bg-dark-surface-strong hover:text-on-dark disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSettingsOpen((v) => !v)}
                    aria-label="Scanner settings"
                    className={clsx(
                      'rounded-pill border p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      settingsOpen
                        ? 'border-on-dark/40 bg-on-dark/15 text-on-dark'
                        : 'border-dark-hairline bg-dark-surface-card/40 text-on-dark/80 hover:bg-dark-surface-strong hover:text-on-dark',
                    )}
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                  </button>
                </div>
              </header>

              {/* Viewfinder */}
              <div className="relative flex-1 bg-black">
                <div className="absolute inset-0">
                  <CameraScanner
                    facingMode={facingMode}
                    deviceId={selectedDeviceId || null}
                    onDetected={handleDetected}
                    onError={handleScanError}
                    onDebugLog={handleDebugLog}
                  />
                </div>

                {/* Subtle vignette for focus */}
                <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

                {/* Aim frame — 4 corner brackets, centered */}
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                  <div className="relative h-[min(62vmin,320px)] w-[min(62vmin,320px)]">
                    {[
                      'left-0 top-0 border-t-[3px] border-l-[3px] rounded-tl-3xl',
                      'right-0 top-0 border-t-[3px] border-r-[3px] rounded-tr-3xl',
                      'left-0 bottom-0 border-b-[3px] border-l-[3px] rounded-bl-3xl',
                      'right-0 bottom-0 border-b-[3px] border-r-[3px] rounded-br-3xl',
                    ].map((cls, i) => (
                      <span
                        key={i}
                        className={clsx(
                          'absolute h-10 w-10 transition-colors',
                          cls,
                          successFlash ? 'border-success' : 'border-accent-teal/80',
                        )}
                      />
                    ))}

                    {/* Scan line */}
                    {!successFlash && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_18px_rgba(184,58,53,0.75)]"
                        style={{ animation: 'scanLineDown 2.2s ease-in-out infinite' }}
                      />
                    )}

                    {/* Success flash */}
                    {successFlash && (
                      <div
                        className="absolute inset-0 flex items-center justify-center rounded-card bg-success/20 backdrop-blur-[2px]"
                        style={{ animation: 'successPop 380ms ease-out' }}
                      >
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success shadow-[0_0_32px_rgba(34,180,108,0.6)]">
                          <CheckCircleIcon className="h-10 w-10 text-on-dark" strokeWidth={1.8} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Helper copy below the viewfinder */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-6 pb-6 pt-10 text-center">
                  <p className="font-mono text-caption-uppercase font-semibold tracking-[2px] text-on-dark/60">
                    Align barcode inside the frame
                  </p>
                  <p className="mt-1 font-sans text-body-sm text-on-dark/75">{modalDescription}</p>
                  {errorMessage && (
                    <p className="pointer-events-auto mx-auto mt-3 inline-block rounded-btn border border-warning/40 bg-warning/10 px-3 py-1.5 font-sans text-body-sm font-medium text-warning">
                      {errorMessage}
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom action bar */}
              <footer className="relative z-10 flex flex-col gap-2 border-t border-dark-hairline bg-black/40 px-4 py-3 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setManualOpen(true)}
                    className="flex items-center gap-1.5 rounded-full border border-dark-hairline bg-dark-surface-card/40 px-3 py-1.5 font-sans text-button text-on-dark/80 transition hover:bg-dark-surface-strong hover:text-on-dark"
                  >
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                    Type barcode
                  </button>
                  <button
                    type="button"
                    onClick={() => modalUploadInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-full border border-dark-hairline bg-dark-surface-card/40 px-3 py-1.5 font-sans text-button text-on-dark/80 transition hover:bg-dark-surface-strong hover:text-on-dark"
                  >
                    <PhotoIcon className="h-3.5 w-3.5" />
                    Upload photo
                  </button>
                </div>

                {/* Manual entry drawer */}
                {manualOpen && (
                  <form
                    onSubmit={handleManualSubmit}
                    className="flex items-center gap-2 rounded-btn border border-dark-hairline bg-dark-surface-card/40 px-3 py-2"
                  >
                    <PencilSquareIcon className="h-4 w-4 flex-shrink-0 text-on-dark-soft" />
                    <input
                      ref={manualInputRef}
                      type="text"
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      placeholder="Enter ISBN, SWI barcode, or loan ID"
                      autoComplete="off"
                      className="flex-1 border-0 bg-transparent font-sans text-body-sm text-on-dark placeholder:text-on-dark-soft outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!manualValue.trim()}
                      aria-disabled={!manualValue.trim()}
                      className="rounded-btn bg-primary hover:bg-primary-active px-3 py-1.5 font-sans text-button text-on-primary transition disabled:bg-primary-disabled disabled:text-muted disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setManualOpen(false);
                        setManualValue('');
                      }}
                      aria-label="Cancel manual entry"
                      className="rounded-pill p-1 text-on-dark-soft hover:bg-dark-surface-strong hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </form>
                )}

                {/* Settings drawer */}
                {settingsOpen && (
                  <div className="space-y-2 rounded-btn border border-dark-hairline bg-dark-surface-card/40 p-3 font-sans text-body-sm text-on-dark/80">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-sans text-caption-uppercase font-semibold text-on-dark-soft">
                        Camera source
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          void refreshDeviceOptions();
                        }}
                        className="inline-flex items-center gap-1 rounded-btn border border-dark-hairline px-2 py-0.5 font-sans text-caption-uppercase font-semibold text-on-dark/70 hover:bg-dark-surface-strong hover:text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <ArrowPathIcon
                          className={clsx('h-3 w-3', enumeratingDevices && 'animate-spin')}
                        />
                        Refresh
                      </button>
                    </div>
                    {availableDevices.length > 0 ? (
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => {
                          setSelectedDeviceId(e.target.value);
                          setErrorMessage(null);
                        }}
                        className="w-full rounded-btn border border-dark-hairline bg-dark-surface-soft px-2.5 py-1.5 font-sans text-body-sm text-on-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <option value="">Auto (browser picks best)</option>
                        {availableDevices.map((d) => (
                          <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-sans text-body-sm text-on-dark-soft">
                        {deviceListError ??
                          (enumeratingDevices
                            ? 'Detecting connected cameras\u2026'
                            : 'No cameras detected yet.')}
                      </p>
                    )}

                    <details className="mt-2">
                      <summary className="cursor-pointer font-sans text-caption-uppercase font-semibold text-on-dark-soft">
                        Debug log ({debugLog.length})
                      </summary>
                      <div className="mt-1.5 max-h-40 overflow-y-auto rounded-btn bg-ink p-1.5 font-mono text-code leading-relaxed text-success">
                        {debugLog.length === 0 ? (
                          <p className="text-on-dark/30">Waiting for events...</p>
                        ) : (
                          debugLog.map((line, i) => (
                            <p key={i} className="break-all">{line}</p>
                          ))
                        )}
                        <div ref={debugEndRef} />
                      </div>
                    </details>
                  </div>
                )}
              </footer>
            </div>
          </div>

          <input
            ref={modalUploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void handleUploadChange(event);
            }}
          />
        </>
      )}
    </>
  );
}
