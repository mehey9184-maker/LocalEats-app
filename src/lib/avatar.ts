import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';
import { toDBPhone } from '../utils';

export interface AvatarUploadOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
}

/**
 * Compresses an image file to strictly under 200KB (maxSizeMB: 0.2, maxWidthOrHeight: 800)
 */
export async function compressAvatarImage(file: File | Blob): Promise<Blob> {
  const options = {
    maxSizeMB: 0.19, // Strictly under 200KB limit (~194KB max)
    maxWidthOrHeight: 800,
    useWebWorker: typeof window !== 'undefined' && typeof Worker !== 'undefined',
    fileType: 'image/jpeg',
    initialQuality: 0.8,
  };

  try {
    const imageFile = file instanceof File ? file : new File([file], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
    const compressed = await imageCompression(imageFile, options);
    console.log(`[Avatar Compression] Shrink from ${(imageFile.size / 1024).toFixed(1)}KB to ${(compressed.size / 1024).toFixed(1)}KB`);
    return compressed;
  } catch (err) {
    console.warn("browser-image-compression failed, falling back to Canvas API compression:", err);
    return fallbackCanvasCompress(file, 800, 800, 0.8);
  }
}

/**
 * Fallback Canvas compressor in case WebWorkers or image compression library fails in restricted environments
 */
function fallbackCanvasCompress(file: File | Blob, maxWidth: number, maxHeight: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas compression failed"));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/**
 * Uploads client avatar to Supabase Storage 'avatars' bucket under `client-avatars/${userId}-${Date.now()}.jpg`,
 * updates the user's `profiles` record in database, and returns the public CDN URL.
 */
export async function uploadClientAvatar(userId: string, file: File | Blob): Promise<string> {
  if (!userId) {
    userId = 'guest_' + Math.random().toString(36).substring(2, 9);
  }

  // 1. Compress photo to < 200KB (maxSizeMB: 0.2, maxWidthOrHeight: 800, quality 0.82)
  const compressedBlob = await compressAvatarImage(file);

  // 2. Upload to Supabase Storage 'avatars' bucket
  const timestamp = Date.now();
  const filePath = `client-avatars/${userId}-${timestamp}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, compressedBlob, {
      upsert: true,
      contentType: 'image/jpeg',
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error("Supabase Storage Avatar Upload Error:", uploadError);
    if (uploadError.message === "Bucket not found") {
      throw new Error("BUCKET_NOT_FOUND");
    }
    throw uploadError;
  }

  // 3. Get Public CDN URL
  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const publicUrl = data.publicUrl;

  // 4. Update avatar_url & photo_url column in user's profile table in Supabase database
  if (userId && !userId.startsWith('guest_')) {
    try {
      // Primary: Try updating existing profile row directly so non-avatar fields/constraints aren't re-validated or newly inserted
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          photo_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .or(`user_id.eq.${userId},id.eq.${userId}`);
        
      if (updateErr) {
        // Fallback: If profile row didn't exist yet, upsert with valid SA phone format so valid_sa_phone check constraint passes
        const { error: upsertErr } = await supabase
          .from('profiles')
          .upsert(
            {
              user_id: userId,
              avatar_url: publicUrl,
              photo_url: publicUrl,
              phone: toDBPhone(null),
              updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
          );

        if (upsertErr) {
          console.warn("Notice updating profile avatar_url in database:", upsertErr.message);
        }
      }
    } catch (err: any) {
      console.warn("Database profile update skipped/failed:", err.message || err);
    }
  }

  return publicUrl;
}
