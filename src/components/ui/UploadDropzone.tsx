'use client';

import { useState, useCallback, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n/t';
import { cn } from '@/lib/utils';
import { Upload, Camera, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface UploadDropzoneProps {
  onUpload?: (file: File) => Promise<void>;
  orderId?: number;
  uploadPath?: string;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  className?: string;
  multiple?: boolean;
}

export default function UploadDropzone({
  onUpload,
  orderId,
  uploadPath,
  accept = '.pdf,.png,.jpg,.jpeg',
  maxSizeMB = 5,
  label,
  description,
  className,
  multiple = false,
}: UploadDropzoneProps) {
  const router = useRouter();
  const inputId = useId();
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setError(null);
      setSuccess(false);
      setSuccessMessage('');
      const fileArray = Array.from(files);
      for (const file of fileArray) {
        if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
          setError(t('errors.invalidFile'));
          return;
        }
        const maxFileSize = (file.type === 'application/pdf' ? maxSizeMB : Math.min(maxSizeMB, 3)) * 1024 * 1024;
        if (file.size > maxFileSize) {
          setError(t('errors.fileTooLarge', { max: file.type === 'application/pdf' ? String(maxSizeMB) : '3' }));
          return;
        }
      }
      setUploading(true);
      try {
        for (const file of fileArray) {
          if (onUpload) {
            await onUpload(file);
          } else if (orderId && uploadPath) {
            const payload = new FormData();
            payload.set('file', file);
            payload.set('orderId', String(orderId));
            const response = await fetch(uploadPath, { method: 'POST', body: payload });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || t('errors.serverError'));
            if (uploadPath === '/api/lab/upload') {
              setSuccessMessage(t(result.path === 'SIGNED' ? 'seller.labUpload.signedPass' : 'seller.labUpload.unsignedPass'));
            } else {
              setSuccessMessage(t('common.success'));
            }
            router.refresh();
          } else {
            throw new Error(t('errors.serverError'));
          }
        }
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.serverError'));
      } finally {
        setUploading(false);
      }
    },
    [onUpload, orderId, uploadPath, router, maxSizeMB]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const onClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      e.target.value = '';
    },
    [handleFiles]
  );

  return (
    <div className={cn('relative', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onFileChange}
        className="sr-only"
        id={inputId}
        aria-label={label || t('seller.orderStatus.uploadLabReport')}
      />
      <div
        onClick={onClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          'flex flex-col items-center justify-center p-6 border-2 rounded-xl cursor-pointer transition-all min-h-[160px]',
          dragActive
            ? 'border-emerald-500 bg-emerald-50'
            : error
            ? 'border-rose-500 bg-rose-50'
            : success
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            <span className="text-slate-600">{t('common.loading')}</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 text-rose-600">
            <AlertCircle className="w-12 h-12" />
            <span className="text-base font-medium">{error}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setError(null);
              }}
              className="px-4 py-2 text-sm text-rose-600 hover:text-rose-800 underline"
            >
              {t('common.retry')}
            </button>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center gap-3 text-emerald-600">
            <CheckCircle className="w-12 h-12" />
            <span className="text-base font-medium">{successMessage || t('common.success')}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              {label && <p className="text-lg font-medium text-slate-800">{label}</p>}
              {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClick();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
              >
                <FileText className="w-4 h-4" />
                <span>{t('seller.orderStatus.chooseFile')}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClick();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
              >
                <Camera className="w-4 h-4" />
                <span>{t('seller.orderStatus.takePhoto')}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {accept.includes('.pdf') && `PDF ${t('seller.orderStatus.maxSizePDF')}`}
              {accept.includes('.png') && `, PNG/JPEG ${t('seller.orderStatus.maxSizeImage')}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
