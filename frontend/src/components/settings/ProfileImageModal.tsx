import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, RefreshCw, Trash2 } from 'lucide-react';
import axios from 'axios';
import userApi from '../../apis/userApi';
import type { UserResponse } from '../../apis/userApi';
import { toast } from '../../store/useToastStore';
import { initialsAvatarFallback } from '../../utils/avatar';

interface Props {
  isOpen: boolean;
  profile: UserResponse | null;
  onClose: () => void;
  onSuccess: (newImageUrl: string | null) => void | Promise<void>;
}

const TEXT = {
  defaultUser: '\uC0AC\uC6A9\uC790',
  title: '\uD504\uB85C\uD544 \uC0AC\uC9C4',
  previewAlt: '\uD504\uB85C\uD544 \uBBF8\uB9AC\uBCF4\uAE30',
  imageOnly: '\uC774\uBBF8\uC9C0 \uD30C\uC77C\uB9CC \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  imageLimit: '\uD504\uB85C\uD544 \uC774\uBBF8\uC9C0\uB294 10MB \uC774\uD558\uB9CC \uC5C5\uB85C\uB4DC\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
  uploadSuccess: '\uD504\uB85C\uD544 \uC774\uBBF8\uC9C0\uAC00 \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
  uploadFailed: '\uD504\uB85C\uD544 \uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
  uploadError: '\uD504\uB85C\uD544 \uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
  noImage: '\uC0AD\uC81C\uD560 \uD504\uB85C\uD544 \uC774\uBBF8\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  deleteConfirm: '\uD604\uC7AC \uD504\uB85C\uD544 \uC774\uBBF8\uC9C0\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?',
  deleteSuccess: '\uD504\uB85C\uD544 \uC774\uBBF8\uC9C0\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
  deleteFailed: '\uD504\uB85C\uD544 \uC774\uBBF8\uC9C0 \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
  deleteError: '\uD504\uB85C\uD544 \uC774\uBBF8\uC9C0 \uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
  chooseImage: '\uC0C8 \uC774\uBBF8\uC9C0 \uC120\uD0DD',
  imageGuide: 'JPG, PNG, GIF / \uCD5C\uB300 10MB',
  delete: '\uC0AD\uC81C',
  save: '\uC800\uC7A5',
};

export default function ProfileImageModal({ isOpen, profile, onClose, onSuccess }: Props) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fallbackImage = useMemo(
    () => initialsAvatarFallback(profile?.nickname || TEXT.defaultUser),
    [profile?.nickname],
  );

  const handleClose = (force = false) => {
    if (!force && (isSaving || isDeleting)) return;
    setImagePreview(null);
    setSelectedImageFile(null);
    onClose();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(TEXT.imageOnly);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(TEXT.imageLimit);
      return;
    }

    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onload = (loadEvent) => setImagePreview(loadEvent.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedImageFile) return;

    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append('profileImage', selectedImageFile);

      const response = await userApi.updateProfileImage(formData);
      await onSuccess(response.data);
      toast.success(TEXT.uploadSuccess);
      handleClose(true);
    } catch (error: unknown) {
      console.error('Failed to upload image:', error);
      if (axios.isAxiosError(error)) {
        toast.error(TEXT.uploadFailed, error.response?.data?.message);
      } else {
        toast.error(TEXT.uploadError);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!profile?.userProfileImageUrl) {
      toast.error(TEXT.noImage);
      return;
    }

    if (!window.confirm(TEXT.deleteConfirm)) {
      return;
    }

    try {
      setIsDeleting(true);
      await userApi.deleteProfileImage();
      await onSuccess(null);
      toast.success(TEXT.deleteSuccess);
      handleClose(true);
    } catch (error: unknown) {
      console.error('Failed to delete image:', error);
      if (axios.isAxiosError(error)) {
        toast.error(TEXT.deleteFailed, error.response?.data?.message);
      } else {
        toast.error(TEXT.deleteError);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) handleClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="mx-4 flex w-full max-w-md flex-col items-center gap-6 rounded-[32px] bg-white p-8 shadow-2xl"
          >
            <div className="flex w-full items-center justify-between">
              <h3 className="text-xl font-black text-gray-900">{TEXT.title}</h3>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100 transition-colors hover:bg-gray-200"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border-4 border-gray-100 bg-gradient-to-tr from-rose-50 to-emerald-50 shadow-lg">
              <img
                src={imagePreview || profile?.userProfileImageUrl || fallbackImage}
                alt={TEXT.previewAlt}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="flex w-full flex-col items-center gap-3">
              <input
                type="file"
                id="modalProfileImageInput"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <label
                htmlFor="modalProfileImageInput"
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-gray-200 py-3 text-center text-sm font-bold text-gray-500 transition-all hover:border-rose-300 hover:text-rose-500"
              >
                <Upload className="h-4 w-4" />
                {selectedImageFile ? selectedImageFile.name : TEXT.chooseImage}
              </label>
              <p className="text-xs text-gray-400">{TEXT.imageGuide}</p>
            </div>

            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving || isDeleting || !profile?.userProfileImageUrl}
                className="flex flex-1 items-center justify-center gap-2 rounded-[18px] bg-gray-100 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-300"
              >
                {isDeleting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {TEXT.delete}
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedImageFile || isSaving || isDeleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-[18px] bg-rose-500 py-3 text-sm font-black text-white shadow-lg shadow-rose-500/20 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {TEXT.save}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
