import { uploadClientAvatar } from "../lib/avatar";

export const getAvatarUrl = (name?: string) => {
  const seed = name ? encodeURIComponent(name) : "User";
  return `https://ui-avatars.com/api/?name=${seed}&background=f97316&color=fff&size=256&format=svg`;
};

export const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<File> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Canvas is empty"));
      resolve(new File([blob], "cropped.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  });
};

export async function searchAddress(query: string) {
  if (!query || query.length < 3) return [];
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=za&limit=5`,
    ).catch(() => null);
    if (!response || !response.ok) return [];
    const data = await response.json().catch(() => []);
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
    }));
  } catch (error) {
    console.info("Address search notice:", error);
    return [];
  }
}

export const compressImage = (
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.75,
): Promise<Blob> => {
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
            else reject(new Error("Image compression failed"));
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export const uploadAvatar = async (file: File, userId?: string) => {
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("INVALID_FILE_TYPE");
  }

  try {
    return await uploadClientAvatar(userId || "", file);
  } catch (error: any) {
    console.error("Compression or Upload failed:", error);
    if (error.message === "NETWORK_TIMEOUT" || error.message === "FILE_SIZE_EXCEEDED" || error.message === "INVALID_FILE_TYPE" || error.message === "BUCKET_NOT_FOUND") {
      throw error;
    }
    if (error.message && (error.message.includes("fetch") || error.message.includes("Network"))) {
      throw new Error("NETWORK_ERROR");
    }
    throw error;
  }
};
