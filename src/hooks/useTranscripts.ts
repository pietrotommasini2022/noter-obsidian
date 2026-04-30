/**
 * useTranscripts — manages audio recordings and Gemini transcription.
 *
 * Audio chunks are saved directly in the vault under:
 *   <notesFolder>/Audio/<recordingId>/<recordingId>-<chunkIndex>.<ext>
 *
 * No Supabase Storage, no polling — transcription is handled inline with
 * Gemini multimodal after recording stops. State is kept in-memory; the
 * last transcript per subject is stored in data.json for session restore.
 */

import { useState, useRef, useCallback } from "react";
import { normalizePath } from "obsidian";
import type { Transcript, Subject, LogLine } from "@/lib/types";
import { callGeminiMultimodal } from "@/GeminiClient";
import type { NoterPlugin } from "@/types/plugin";

const AUDIO_CHUNK_TIMESLICE_MS = 10_000; // 10-second chunks

export type RecorderStatus = "idle" | "recording" | "paused" | "processing";

export function useTranscripts(plugin: NoterPlugin, log: (msg: string, type?: LogLine["type"]) => void) {
  const [transcriptsBySubject, setTranscriptsBySubject] = useState<Record<string, Transcript>>({});
  const [recorderStatus, setRecorderStatus] = useState<RecorderStatus>("idle");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [recorderError, setRecorderError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingIdRef = useRef<string | null>(null);
  const nextChunkIndexRef = useRef(0);
  /** Raw audio chunks collected in memory during this recording session. */
  const chunksRef = useRef<{ data: Uint8Array; mimeType: string }[]>([]);
  /** Vault paths where chunks have been saved (for Transcript.audio_paths). */
  const savedPathsRef = useRef<string[]>([]);

  // ─── Path helper ────────────────────────────────────────────────────────────

  function audioChunkPath(recordingId: string, chunkIndex: number, ext: string): string {
    const base = plugin.settings.notesFolder;
    return normalizePath(`${base}/Audio/${recordingId}/${recordingId}-${chunkIndex}.${ext}`);
  }

  // ─── Start recording ────────────────────────────────────────────────────────

  const startRecording = useCallback(async (subject: Subject) => {
    if (!plugin.settings.audioRecordingEnabled) return;
    if (!plugin.settings.audioDisclaimerAcknowledged) return;

    setRecorderError(null);
    setDurationSeconds(0);
    chunksRef.current = [];
    savedPathsRef.current = [];
    nextChunkIndexRef.current = 0;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone access denied";
      setRecorderError(msg);
      log(`Microphone error: ${msg}`, "error");
      return;
    }

    streamRef.current = stream;
    recordingIdRef.current = crypto.randomUUID();

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (!e.data || e.data.size === 0) return;
      void e.data.arrayBuffer().then(async (buf) => {
        const data = new Uint8Array(buf);
        const ext = mimeTypeToExt(recorder.mimeType);
        const chunkIndex = nextChunkIndexRef.current++;
        const recId = recordingIdRef.current!;

        chunksRef.current.push({ data, mimeType: recorder.mimeType });

        // Save chunk to vault (best-effort)
        try {
          const path = audioChunkPath(recId, chunkIndex, ext);
          const dir = path.substring(0, path.lastIndexOf("/"));
          const dirExists = await plugin.app.vault.adapter.exists(dir);
          if (!dirExists) {
            await plugin.app.vault.createFolder(dir).catch(() => {});
          }
          await plugin.app.vault.adapter.writeBinary(path, buf);
          savedPathsRef.current.push(path);
        } catch {
          // Non-critical — audio is still in memory for transcription
        }
      });
    };

    durationTimerRef.current = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);

    recorder.start(AUDIO_CHUNK_TIMESLICE_MS);
    setRecorderStatus("recording");
    log("Recording started", "info");
  }, [plugin, log]);

  // ─── Pause / Resume ─────────────────────────────────────────────────────────

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setRecorderStatus("paused");
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setRecorderStatus("recording");
      durationTimerRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  // ─── Stop + transcribe ───────────────────────────────────────────────────────

  const stopAndTranscribe = useCallback(
    (subject: Subject): Promise<Transcript | null> => {
      return new Promise((resolve) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) {
          resolve(null);
          return;
        }

        if (durationTimerRef.current) {
          clearInterval(durationTimerRef.current);
          durationTimerRef.current = null;
        }

        recorder.onstop = async () => {
          stopStream();
          setRecorderStatus("processing");
          log("Transcribing audio...", "info");

          const transcript = await transcribeChunks(subject);
          setRecorderStatus("idle");
          resolve(transcript);
        };

        if (recorder.state !== "inactive") recorder.stop();
        else {
          stopStream();
          resolve(null);
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depend on plugin and log; recorder refs and local helpers are managed outside React dependency tracking
    [plugin, log]
  );

  // ─── Cancel ─────────────────────────────────────────────────────────────────

  const cancelRecording = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
    stopStream();
    chunksRef.current = [];
    savedPathsRef.current = [];
    setRecorderStatus("idle");
    setDurationSeconds(0);
  }, []);

  // ─── Private helpers ─────────────────────────────────────────────────────────

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function transcribeChunks(subject: Subject): Promise<Transcript | null> {
    const chunks = chunksRef.current;
    if (chunks.length === 0) {
      log("No audio data to transcribe", "warn");
      return null;
    }

    const apiKey = plugin.settings.geminiApiKey;
    if (!apiKey) {
      log("Gemini API key not set — cannot transcribe", "error");
      return null;
    }

    try {
      const response = await callGeminiMultimodal({
        apiKey,
        system:
          "You are an academic transcription assistant. Transcribe the provided lecture audio accurately. Return plain text only, preserving technical terms, formulas, and proper nouns exactly as spoken.",
        prompt: `Transcribe this lecture recording for the subject: ${subject.name}. Return only the transcribed text.`,
        audioParts: chunks,
        maxOutputTokens: 16384,
      });

      const text = response.text.trim();
      if (!text) {
        log("Transcription returned empty text", "warn");
        return null;
      }

      const transcript: Transcript = {
        id: crypto.randomUUID(),
        subject_id: subject.id,
        recording_id: recordingIdRef.current ?? crypto.randomUUID(),
        audio_paths: savedPathsRef.current,
        text,
        lang: "it",
        created_at: new Date().toISOString(),
      };

      setTranscriptsBySubject((prev) => ({
        ...prev,
        [subject.id]: transcript,
      }));

      log("Transcription complete", "success");
      return transcript;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Transcription failed: ${msg}`, "error");
      return null;
    } finally {
      chunksRef.current = [];
      savedPathsRef.current = [];
    }
  }

  return {
    transcriptsBySubject,
    recorderStatus,
    durationSeconds,
    recorderError,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndTranscribe,
    cancelRecording,
  };
}

// ─── Browser helpers ──────────────────────────────────────────────────────────

function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function mimeTypeToExt(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "audio";
}
