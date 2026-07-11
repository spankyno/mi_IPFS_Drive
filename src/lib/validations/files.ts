import { z } from "zod";

export const createFolderSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(255, "Nombre demasiado largo"),
  parentId: z.string().uuid().nullable(),
});

export const finalizeUploadSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().positive(),
  folderId: z.string().uuid().nullable(),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  isEncrypted: z.boolean().default(false),
  encryptionIv: z.string().nullable().default(null),
  encryptionKey: z.string().nullable().default(null),
});

export const renameFileSchema = z.object({
  fileId: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio").max(255),
});

export const updateTagsSchema = z.object({
  fileId: z.string().uuid(),
  tags: z.array(z.string().min(1).max(40)).max(20),
});

export const setVisibilitySchema = z.object({
  fileId: z.string().uuid(),
  visibility: z.enum(["private", "public", "unlisted"]),
});

export const createShareSchema = z.object({
  fileId: z.string().uuid(),
  permission: z.enum(["view", "download"]).default("view"),
  expiresInDays: z.number().int().positive().max(365).nullable(),
});

export const revokeShareSchema = z.object({
  shareId: z.string().uuid(),
});

export const moveFileSchema = z.object({
  fileId: z.string().uuid(),
  folderId: z.string().uuid().nullable(),
});

export const deleteFileSchema = z.object({
  fileId: z.string().uuid(),
});

export const deleteFolderSchema = z.object({
  folderId: z.string().uuid(),
});

export const renameFolderSchema = z.object({
  folderId: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio").max(255),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type FinalizeUploadInput = z.infer<typeof finalizeUploadSchema>;
export type RenameFileInput = z.infer<typeof renameFileSchema>;
export type MoveFileInput = z.infer<typeof moveFileSchema>;
export type DeleteFileInput = z.infer<typeof deleteFileSchema>;
export type DeleteFolderInput = z.infer<typeof deleteFolderSchema>;
export type RenameFolderInput = z.infer<typeof renameFolderSchema>;
export type UpdateTagsInput = z.infer<typeof updateTagsSchema>;
export type SetVisibilityInput = z.infer<typeof setVisibilitySchema>;
export type CreateShareInput = z.infer<typeof createShareSchema>;
export type RevokeShareInput = z.infer<typeof revokeShareSchema>;
