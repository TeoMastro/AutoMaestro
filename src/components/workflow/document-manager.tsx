'use client';

import { useState, useRef, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  initiateDocumentUploadAction,
  triggerDocumentProcessingAction,
  deleteDocumentAction,
} from '@/server-actions/document';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Upload, Trash2, Database, Plus, X } from 'lucide-react';
import { InfoAlert } from '@/components/info-alert';
import { WorkflowDocument } from '@/types/workflow';
import { DocumentStatus, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE_BYTES, MAX_UPLOAD_FILES } from '@/lib/constants';
import { badgeStyles } from '@/lib/badge-styles';

interface DocumentManagerProps {
  workflowId: string;
  initialDocuments: WorkflowDocument[];
}

const STATUS_STYLE: Record<DocumentStatus, string> = {
  pending: badgeStyles.amber,
  processing: badgeStyles.amber,
  ready: badgeStyles.green,
  error: badgeStyles.red,
};

function formatBytes(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentManager({ workflowId, initialDocuments }: DocumentManagerProps) {
  const t = useTranslations('app');
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [metadataPairs, setMetadataPairs] = useState<{ key: string; value: string }[]>([]);

  const updatePair = (index: number, field: 'key' | 'value', value: string) => {
    setMetadataPairs((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const addPair = () => setMetadataPairs((prev) => [...prev, { key: '', value: '' }]);

  const removePair = (index: number) => setMetadataPairs((prev) => prev.filter((_, i) => i !== index));

  // Serialize non-empty pairs to a JSON object string for the server action.
  const buildMetadataJson = useCallback(() => {
    const obj: Record<string, string> = {};
    for (const { key, value } of metadataPairs) {
      const k = key.trim();
      const v = value.trim();
      if (k && v) obj[k] = v;
    }
    return Object.keys(obj).length > 0 ? JSON.stringify(obj) : '';
  }, [metadataPairs]);

  const startPolling = (documentId: string) => {
    setPollingIds((prev) => new Set(prev).add(documentId));

    const interval = setInterval(async () => {
      const res = await fetch(`/api/documents/status?id=${documentId}`);
      if (!res.ok) {
        clearInterval(interval);
        return;
      }

      const data = (await res.json()) as { status: string };
      if (data.status === 'ready' || data.status === 'error') {
        clearInterval(interval);
        setPollingIds((prev) => {
          const next = new Set(prev);
          next.delete(documentId);
          return next;
        });
        router.refresh();
      }
    }, 3000);
  };

  // Validate and stage files — does NOT upload. The user confirms with the OK
  // button so they can optionally attach custom metadata first.
  const stageFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;

      // Client-side validation: filter valid files and collect skipped ones
      const validFiles: File[] = [];
      const skippedNames: string[] = [];

      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (!SUPPORTED_FILE_TYPES.includes(ext as (typeof SUPPORTED_FILE_TYPES)[number])) {
          skippedNames.push(`${file.name} (${t('unsupportedFileType')})`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          skippedNames.push(`${file.name} (${t('fileTooLarge')})`);
          continue;
        }
        validFiles.push(file);
      }

      if (stagedFiles.length + validFiles.length > MAX_UPLOAD_FILES) {
        setAlert({ message: t('tooManyFiles', { max: MAX_UPLOAD_FILES }), type: 'error' });
        return;
      }

      if (validFiles.length === 0) {
        if (skippedNames.length > 0) setAlert({ message: skippedNames.join(', '), type: 'error' });
        return;
      }

      setStagedFiles((prev) => [...prev, ...validFiles]);
      setAlert(skippedNames.length > 0 ? { message: skippedNames.join(', '), type: 'error' } : null);
    },
    [stagedFiles.length, t]
  );

  const removeStagedFile = (index: number) => setStagedFiles((prev) => prev.filter((_, i) => i !== index));

  const cancelStaging = () => {
    setStagedFiles([]);
    setMetadataPairs([]);
    setAlert(null);
  };

  // Upload all staged files with the (optional) shared custom metadata.
  const confirmUpload = useCallback(async () => {
    if (stagedFiles.length === 0) return;

    setUploading(true);
    setAlert(null);
    setUploadProgress({ current: 0, total: stagedFiles.length });

    // Shared across the whole batch — applies to every file uploaded.
    const customMetadataJson = buildMetadataJson();

    let successCount = 0;
    const failedNames: string[] = [];

    for (let i = 0; i < stagedFiles.length; i++) {
      const file = stagedFiles[i];
      setUploadProgress({ current: i + 1, total: stagedFiles.length });

      try {
        // Step 1: Create document record + get signed URL
        const formData = new FormData();
        formData.append('workflow_id', workflowId);
        formData.append('file_name', file.name);
        formData.append('file_size', String(file.size));
        formData.append('file_type', file.type);
        if (customMetadataJson) formData.append('custom_metadata', customMetadataJson);

        const result = await initiateDocumentUploadAction(
          { success: false, errors: {}, formData: { workflow_id: workflowId }, globalError: null },
          formData
        );

        if (!result.success || !result.documentId || !result.signedUploadUrl) {
          failedNames.push(file.name);
          continue;
        }

        // Step 2: Upload directly to Supabase Storage
        const uploadRes = await fetch(result.signedUploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });

        if (!uploadRes.ok) {
          failedNames.push(file.name);
          continue;
        }

        // Step 3: Trigger processing
        await triggerDocumentProcessingAction(result.documentId);

        // Step 4: Start polling
        startPolling(result.documentId);
        successCount++;
      } catch {
        failedNames.push(file.name);
      }
    }

    // Build result message
    if (failedNames.length > 0 && successCount > 0) {
      setAlert({
        message: `${failedNames.join(', ')} ${t('uploadFailed')}. ${t('uploadSuccessCount', { count: successCount })}`,
        type: 'error',
      });
    } else if (failedNames.length > 0) {
      setAlert({ message: `${failedNames.join(', ')} ${t('uploadFailed')}`, type: 'error' });
    }

    // Clear the staging area on completion
    setStagedFiles([]);
    setMetadataPairs([]);

    router.refresh();
    setUploading(false);
    setUploadProgress(null);
  }, [stagedFiles, workflowId, t, router, startPolling, buildMetadataJson]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    if (fileRef.current) fileRef.current.value = '';
    stageFiles(files);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (uploading || isPending) return;
      const files = Array.from(e.dataTransfer.files);
      stageFiles(files);
    },
    [uploading, isPending, stageFiles]
  );

  const handleDelete = (documentId: string) => {
    startTransition(async () => {
      try {
        await deleteDocumentAction(documentId);
        setAlert({ message: t('documentDeletedSuccess'), type: 'success' });
        router.refresh();
      } catch {
        setAlert({ message: t('unexpectedError'), type: 'error' });
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" />
          {t('knowledgeBase')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alert && <InfoAlert message={alert.message} type={alert.type} />}

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && !isPending && fileRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-colors duration-200
            ${
              isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }
            ${uploading || isPending ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.docx,.md"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">
            {uploading && uploadProgress
              ? t('uploadingProgress', { current: uploadProgress.current, total: uploadProgress.total })
              : t('dropFilesHere')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{t('uploadDocumentsHint')}</p>
        </div>

        {/* Staging area — appears once files are selected; upload waits for OK */}
        {stagedFiles.length > 0 && (
          <div className="space-y-4 rounded-lg border p-4">
            {/* Files queued for upload */}
            <div className="space-y-2">
              <Label className="text-sm">{t('filesToUpload')}</Label>
              <div className="space-y-1">
                {stagedFiles.map((file, i) => (
                  <div key={`${file.name}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      {file.name} <span className="text-muted-foreground">· {formatBytes(file.size)}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStagedFile(i)}
                      disabled={uploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom metadata editor — optional, applied to every staged file */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t('customMetadata')}</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addPair} disabled={uploading}>
                  <Plus className="h-3 w-3 mr-1" />
                  {t('addMetadataPair')}
                </Button>
              </div>
              {metadataPairs.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('customMetadataHint')}</p>
              ) : (
                <div className="space-y-2">
                  {metadataPairs.map((pair, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={pair.key}
                        onChange={(e) => updatePair(i, 'key', e.target.value)}
                        placeholder={t('metadataKeyPlaceholder')}
                        disabled={uploading}
                        className="flex-1"
                      />
                      <Input
                        value={pair.value}
                        onChange={(e) => updatePair(i, 'value', e.target.value)}
                        placeholder={t('metadataValuePlaceholder')}
                        disabled={uploading}
                        className="flex-1"
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => removePair(i)} disabled={uploading}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm / cancel */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancelStaging} disabled={uploading}>
                {t('cancel')}
              </Button>
              <Button type="button" onClick={confirmUpload} disabled={uploading}>
                {uploading && uploadProgress
                  ? t('uploadingProgress', { current: uploadProgress.current, total: uploadProgress.total })
                  : t('ok')}
              </Button>
            </div>
          </div>
        )}

        {/* Documents list */}
        {initialDocuments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('noDocumentsFound')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('documentName')}</TableHead>
                <TableHead>{t('documentStatus')}</TableHead>
                <TableHead className="text-right">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[140px]">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.fileType.toUpperCase()} · {formatBytes(doc.fileSizeBytes)}
                        {doc.chunkCount ? ` · ${doc.chunkCount} chunks` : ''}
                      </p>
                      {Object.keys(doc.customMetadata).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(doc.customMetadata).map(([k, v]) => (
                            <Badge key={k} variant="outline" className={`${badgeStyles.indigo} text-[10px]`}>
                              {k}: {v}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_STYLE[doc.status]}>
                      {t(
                        `documentStatus${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}` as Parameters<
                          typeof t
                        >[0]
                      )}
                    </Badge>
                    {pollingIds.has(doc.id) && (
                      <span className="ml-1 text-xs text-muted-foreground animate-pulse">…</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isPending}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('deleteDocumentConfirmation', { name: doc.name })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(doc.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                          >
                            {t('delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
