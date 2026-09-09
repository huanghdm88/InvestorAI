import type { Locale } from "@/src/lib/i18n";
import type { FileKind } from "@/src/types";

export const MAX_UPLOAD_FILE_BYTES = 50 * 1024 * 1024;

const FILE_TYPES: Record<
  string,
  { kind: Exclude<FileKind, "other">; mimeTypes: readonly string[] }
> = {
  pdf: { kind: "pdf", mimeTypes: ["application/pdf"] },
  doc: {
    kind: "word",
    mimeTypes: ["application/msword", "application/vnd.ms-office"],
  },
  docx: {
    kind: "word",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/zip",
    ],
  },
  ppt: {
    kind: "ppt",
    mimeTypes: [
      "application/vnd.ms-powerpoint",
      "application/mspowerpoint",
      "application/vnd.ms-office",
    ],
  },
  pptx: {
    kind: "ppt",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/zip",
    ],
  },
  xls: {
    kind: "excel",
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/msexcel",
      "application/x-msexcel",
      "application/vnd.ms-office",
    ],
  },
  xlsx: {
    kind: "excel",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/zip",
    ],
  },
  csv: {
    kind: "excel",
    mimeTypes: [
      "text/csv",
      "application/csv",
      "text/plain",
      "application/vnd.ms-excel",
    ],
  },
};

const GENERIC_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "application/x-ole-storage",
]);

export const UPLOAD_FILE_ACCEPT = Object.keys(FILE_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");

export type UploadRejectionReason = "unsupported-type" | "too-large" | "duplicate";

export interface UploadRejection {
  name: string;
  reason: UploadRejectionReason;
}

export interface UploadValidationResult {
  accepted: File[];
  rejected: UploadRejection[];
}

type UploadMessageKey =
  | "upload.unsupportedType"
  | "upload.tooLarge"
  | "upload.duplicate";

type UploadTranslator = (
  key: UploadMessageKey,
  values?: Record<string, string | number>
) => string;

function extensionOf(name: string) {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex >= 0 ? name.slice(dotIndex + 1).trim().toLowerCase() : "";
}

function normalizedFileName(name: string) {
  return name.trim().normalize("NFKC").toLocaleLowerCase();
}

function hasSupportedType(file: File) {
  const config = FILE_TYPES[extensionOf(file.name)];
  if (!config) return false;

  const mimeType = file.type.trim().toLowerCase();
  return GENERIC_MIME_TYPES.has(mimeType) || config.mimeTypes.includes(mimeType);
}

export function inferUploadFileKind(name: string): FileKind {
  return FILE_TYPES[extensionOf(name)]?.kind ?? "other";
}

export function validateUploadFiles(
  incoming: FileList | readonly File[] | null,
  existingNames: Iterable<string> = []
): UploadValidationResult {
  const accepted: File[] = [];
  const rejected: UploadRejection[] = [];
  const seenNames = new Set(Array.from(existingNames, normalizedFileName));

  Array.from(incoming ?? []).forEach((file) => {
    if (!hasSupportedType(file)) {
      rejected.push({ name: file.name, reason: "unsupported-type" });
      return;
    }
    if (file.size > MAX_UPLOAD_FILE_BYTES) {
      rejected.push({ name: file.name, reason: "too-large" });
      return;
    }

    const normalizedName = normalizedFileName(file.name);
    if (seenNames.has(normalizedName)) {
      rejected.push({ name: file.name, reason: "duplicate" });
      return;
    }

    seenNames.add(normalizedName);
    accepted.push(file);
  });

  return { accepted, rejected };
}

export function uploadRejectionMessages(
  rejected: readonly UploadRejection[],
  locale: Locale,
  translate: UploadTranslator
) {
  const separator = locale === "zh-CN" ? "、" : ", ";
  const namesFor = (reason: UploadRejectionReason) =>
    rejected
      .filter((item) => item.reason === reason)
      .map((item) => item.name)
      .join(separator);

  const unsupportedNames = namesFor("unsupported-type");
  const tooLargeNames = namesFor("too-large");
  const duplicateNames = namesFor("duplicate");

  return [
    unsupportedNames
      ? translate("upload.unsupportedType", { names: unsupportedNames })
      : null,
    tooLargeNames ? translate("upload.tooLarge", { names: tooLargeNames }) : null,
    duplicateNames ? translate("upload.duplicate", { names: duplicateNames }) : null,
  ].filter((message): message is string => Boolean(message));
}
