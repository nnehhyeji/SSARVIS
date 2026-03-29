import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, RefreshCw } from 'lucide-react';
import axios from 'axios';
import userApi from '../../apis/userApi';
import type { UserResponse } from '../../apis/userApi';
import { toast } from '../../store/useToastStore';

interface Props {
  isOpen: boolean;
  profile: UserResponse | null;
  onClose: () => void;
  onSuccess: (newImageUrl: string) => void;
}

export default function ProfileImageModal({ isOpen, profile, onClose, onSuccess }: Props) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    setImagePreview(null);
    setSelectedImageFile(null);
    onClose();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있어요.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('이미지 크기는 10MB 이하여야 해요.');
      return;
    }

    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedImageFile) return;
    try {
      setIsSaving(true);
      const formData = new FormData();
      formData.append('profileImage', selectedImageFile);

      const response = await userApi.updateProfileImage(formData);
      const newImageUrl = response.data;
      onSuccess(newImageUrl);
      handleClose();
      toast.success('프로필 이미지가 변경되었어요.');
    } catch (error: unknown) {
      console.error('Failed to upload image:', error);
      if (axios.isAxiosError(error)) {
        toast.error('이미지 업로드에 실패했어요.', error.response?.data?.message);
      } else {
        toast.error('이미지 업로드 중 오류가 발생했어요.');
      }
    } finally {
      setIsSaving(false);
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
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-white rounded-[40px] p-10 shadow-2xl w-full max-w-md mx-4 flex flex-col items-center gap-8"
          >
            {/* 헤더 */}
            <div className="w-full flex items-center justify-between">
              <h3 className="text-2xl font-black text-gray-900">프로필 이미지 변경</h3>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 이미지 미리보기 */}
            <div className="w-40 h-40 rounded-full border-4 border-gray-100 shadow-lg overflow-hidden bg-gradient-to-tr from-pink-100 to-green-100 flex items-center justify-center">
              {imagePreview ? (
                <img src={imagePreview} alt="미리보기" className="w-full h-full object-cover" />
              ) : profile?.userProfileImageUrl ? (
                <img
                  src={profile.userProfileImageUrl}
                  alt="현재 이미지"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="flex gap-2 mb-1">
                    <div className="w-2 h-3 bg-gray-700 rounded-full" />
                    <div className="w-2 h-3 bg-gray-700 rounded-full" />
                  </div>
                  <div className="w-4 h-2.5 border-b-2 border-gray-700 rounded-full" />
                </div>
              )}
            </div>

            {/* 파일 선택 */}
            <div className="w-full flex flex-col items-center gap-3">
              <input
                type="file"
                id="modalProfileImageInput"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <label
                htmlFor="modalProfileImageInput"
                className="w-full py-4 border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-3xl text-center font-bold text-gray-400 hover:text-blue-400 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                {selectedImageFile ? selectedImageFile.name : '사진 선택하기'}
              </label>
              <p className="text-xs text-gray-400">* JPG, PNG, GIF · 최대 10MB</p>
            </div>

            {/* 액션 버튼 */}
            <div className="w-full flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-4 rounded-[20px] bg-gray-100 hover:bg-gray-200 font-black text-gray-500 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedImageFile || isSaving}
                className="flex-1 py-4 rounded-[20px] bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 disabled:text-gray-400 font-black text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
              >
                {isSaving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
                {isSaving ? '업로드 중...' : '업로드'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
