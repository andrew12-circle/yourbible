import { supabase } from "@/integrations/supabase/client";

export const JOURNAL_VIDEO_RESUMABLE_THRESHOLD = 6 * 1024 * 1024;
const UPLOAD_IDLE_TIMEOUT_MS = 90_000;

export function journalVideoResumableEndpoint(projectUrl: string): string {
  const url = new URL(projectUrl);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("Video uploads require a secure storage connection.");
  }
  if (/^[^.]+\.supabase\.co$/.test(url.hostname)) {
    url.hostname = url.hostname.replace(".supabase.co", ".storage.supabase.co");
  }
  url.pathname = "/storage/v1/upload/resumable";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export type JournalVideoResumableUploadInput = {
  userId: string;
  bucket: string;
  path: string;
  blob: Blob;
  contentType: string;
  upsert: boolean;
  onProgress?: (loaded: number, total: number) => void;
};

/** Keep retries under the queue's ownership; a failed request never deletes local media. */
export async function uploadJournalVideoResumable(input: JournalVideoResumableUploadInput): Promise<void> {
  const { Upload } = await import("tus-js-client");
  const endpoint = journalVideoResumableEndpoint(import.meta.env.VITE_SUPABASE_URL?.trim() ?? "");
  const storageOrigin = new URL(endpoint).origin;
  const validUploadUrl = (value: string) => {
    try {
      const parsed = new URL(value);
      return parsed.origin === storageOrigin && parsed.pathname.startsWith("/storage/v1/upload/resumable");
    } catch { return false; }
  };

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(idleTimer);
      if (error) {
        // abort(false) keeps the server upload and its fingerprint resumable.
        void upload.abort(false).catch(() => undefined);
        reject(error);
      } else resolve();
    };
    const touch = () => {
      if (settled) return;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => finish(new Error("Video upload paused after the connection stopped responding. It will retry from its last checkpoint.")), UPLOAD_IDLE_TIMEOUT_MS);
    };
    const upload = new Upload(input.blob, {
      endpoint,
      chunkSize: JOURNAL_VIDEO_RESUMABLE_THRESHOLD,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 3_000, 5_000, 10_000],
      headers: { "x-upsert": String(input.upsert) },
      metadata: {
        bucketName: input.bucket,
        objectName: input.path,
        contentType: input.contentType,
        cacheControl: "3600",
      },
      // Scope resume receipts to this account, recording, and exact payload size.
      // No access token, transcript, or journal body enters the fingerprint.
      fingerprint: async () => ["journal-video-v1", endpoint, input.userId, input.bucket,
        input.path, input.blob.size, input.contentType].join("|"),
      onBeforeRequest: async (request) => {
        if (settled) throw new Error("This upload attempt has ended.");
        if (!validUploadUrl(request.getURL())) throw new Error("Untrusted video upload destination.");
        const { data, error } = await supabase.auth.getSession();
        if (settled) throw new Error("This upload attempt has ended.");
        if (error || !data.session || data.session.user.id !== input.userId) {
          throw new Error("Sign in to the recording's account to continue uploading this video.");
        }
        request.setHeader("authorization", `Bearer ${data.session.access_token}`);
        touch();
      },
      onAfterResponse: () => touch(),
      onProgress: (loaded, total) => { touch(); input.onProgress?.(loaded, total); },
      onError: (error) => finish(error),
      onSuccess: () => finish(),
    });
    touch();
    void upload.findPreviousUploads().then((previous) => {
      if (settled) return;
      const resumable = previous.find((item) => item.uploadUrl && validUploadUrl(item.uploadUrl));
      if (resumable) upload.resumeFromPreviousUpload(resumable);
      upload.start();
    }).catch(() => {
      // Storage-blocked browsers can still upload; the durable queue owns recovery.
      if (!settled) upload.start();
    });
  });
}
