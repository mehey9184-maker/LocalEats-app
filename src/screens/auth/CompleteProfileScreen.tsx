import React, { useState, useRef, ChangeEvent, Suspense } from "react";
import {
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Mail,
  MapPin,
  LocateFixed,
  Upload,
  Camera,
  Loader2,
} from "lucide-react";
import { UserProfile, NotificationState } from "../../types";
import { SUPPORTED_CITIES, formatSAPhone, validateSAPhone } from "../../utils";
import { getAvatarUrl, uploadAvatar } from "../../utils/imageUtils";
import { AddressSearch, LocationPickerMap } from "../../components/MapComponents";
import { WidgetErrorBoundary } from "../../components/WidgetErrorBoundary";

export interface CompleteProfileScreenProps {
  userProfile: UserProfile;
  onBack: () => void;
  onSave: (data: Partial<UserProfile>) => void;
  setNotification: (n: NotificationState) => void;
}

export function CompleteProfileScreen({
  userProfile,
  onBack,
  onSave,
  setNotification,
}: CompleteProfileScreenProps) {
  const [email] = useState(userProfile.email);
  const [address, setAddress] = useState(userProfile.address);
  const [phone, setPhone] = useState(formatSAPhone(userProfile.phone));
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [city, setCity] = useState(userProfile.city);
  const [latitude, setLatitude] = useState<number | undefined>(
    userProfile.latitude
  );
  const [longitude, setLongitude] = useState<number | undefined>(
    userProfile.longitude
  );

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const [formErrors, setFormErrors] = useState<{ fullName?: string }>({});

  const handleSave = async () => {
    if (!fullName || !phone || !city || !address) {
      setNotification({
        message: "Please fill in all required fields to proceed.",
        type: "error",
      });
      return;
    }

    if (!validateSAPhone(phone)) {
      setNotification({
        message: "Invalid South African phone format. Use +27 XX XXX XXXX",
        type: "error",
      });
      return;
    }

    if (!latitude || !longitude) {
      setNotification({
        message:
          "Please search and select your precise address on the map to provide delivery coordinates.",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ fullName, phone, city, address, latitude, longitude });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }
      const file = event.target.files[0];

      if (!file.type.startsWith("image/")) {
        setNotification({
          message: "Please select a valid image file.",
          type: "error",
        });
        return;
      }

      setUploading(true);
      setNotification({
        message: "Compressing photo to <200KB and uploading to Supabase Storage...",
        type: "info",
      });
      const localPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(localPreviewUrl);

      const publicUrl = await uploadAvatar(file, userProfile.id);

      onSave({ photoURL: publicUrl });
      setNotification({
        message: "Profile picture uploaded & saved to Supabase (<200KB)!",
        type: "success",
      });
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreviewUrl);
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      let errorMsg =
        "Something went wrong uploading your photo. Please try again.";
      if (
        error.message === "NETWORK_TIMEOUT" ||
        error.message === "NETWORK_ERROR"
      )
        errorMsg = "Network error. Please check your connection and try again.";
      else if (error.message === "BUCKET_NOT_FOUND")
        errorMsg = "Storage is not configured yet. Please try again later.";

      setNotification({ message: errorMsg, type: "error" });
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleCameraClick = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      cameraInputRef.current?.click();
    } catch (err) {
      setNotification({
        message:
          "Camera permission denied. Please allow camera access in your device settings.",
        type: "error",
      });
    }
  };

  const handleDeletePhoto = () => {
    onSave({ photoURL: "" });
    setPreviewUrl(null);
  };

  return (
    <div className="bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 min-h-[100dvh] flex flex-col">
      <div className="flex-1 flex flex-col w-full max-w-screen-xl mx-auto overflow-x-hidden pb-24 relative">
        {/* Top App Bar */}
        <div className="flex items-center bg-white dark:bg-slate-950 p-4 pb-2 sticky top-0 z-10 border-b border-primary/10 pt-[calc(1rem+env(safe-area-inset-top))]">
          <button
            onClick={onBack}
            className="text-primary flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
            Complete Your Profile
          </h2>
        </div>

        {/* Profile Photo Section */}
        <div className="flex p-8 max-w-md mx-auto w-full">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            ref={fileInputRef}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleUpload}
            disabled={uploading}
            ref={cameraInputRef}
            className="hidden"
          />
          <div className="flex w-full flex-col gap-6 items-center">
            <div className="flex gap-4 flex-col items-center group">
              <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                <div className="bg-primary/5 dark:bg-primary/10 aspect-square rounded-full min-h-32 w-32 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/60 relative">
                  <img
                    src={
                      previewUrl ||
                      userProfile.photoURL ||
                      getAvatarUrl(userProfile.fullName)
                    }
                    alt="Profile Picture"
                    className="w-full h-full object-cover absolute inset-0"
                    referrerPolicy="no-referrer"
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {!previewUrl && !userProfile.photoURL && !uploading && (
                    <User className="w-12 h-12 text-slate-300 dark:text-slate-700 absolute z-0" />
                  )}
                </div>
                <div className="absolute -bottom-2 w-full flex justify-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-primary text-white rounded-full p-2 border-4 border-white dark:border-[#1a110c] shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all"
                    title="Upload Photo"
                  >
                    <Upload className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={handleCameraClick}
                    className="bg-primary text-white rounded-full p-2 border-4 border-white dark:border-[#1a110c] shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all"
                    title="Take Photo"
                  >
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              <div className="text-center space-y-1">
                {(userProfile.photoURL || previewUrl) && (
                  <button
                    onClick={handleDeletePhoto}
                    className="text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors"
                  >
                    Remove Photo
                  </button>
                )}
                <p className="text-slate-900 dark:text-slate-100 text-xl font-bold tracking-tight">
                  {fullName || "Your Name"}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-[13px] max-w-[240px]">
                  Improve your profile by adding a clear photo
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="px-6 space-y-6 max-w-md mx-auto w-full">
          <div className="space-y-4">
            <label className="block">
              <span className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">
                Full Name
              </span>
              <div className="relative group">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  ref={fullNameRef}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setFormErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  className={`w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 outline-none border-2 ${
                    formErrors.fullName
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-200 dark:border-slate-800 focus:ring-primary/20 focus:border-primary"
                  } bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all`}
                  placeholder="e.g. John Doe"
                  type="text"
                />
              </div>
              {formErrors.fullName && (
                <p className="text-red-500 text-[10px] mt-1">
                  {formErrors.fullName}
                </p>
              )}
            </label>

            <label className="block">
              <span className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">
                Phone Number
              </span>
              <div className="relative group">
                <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(formatSAPhone(e.target.value))}
                  className="w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all outline-none"
                  placeholder="e.g. +27 71 234 5678"
                  type="tel"
                />
              </div>
            </label>

            <label className="block opacity-60">
              <span className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">
                Email (Read Only)
              </span>
              <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={email}
                  disabled
                  className="w-full rounded-2xl text-slate-400 border-2 border-slate-100 dark:border-slate-900 bg-slate-100 dark:bg-slate-950 h-14 pl-12 pr-4 text-base font-medium cursor-not-allowed"
                  type="email"
                />
              </div>
            </label>

            <label className="block">
              <span className="block text-slate-700 dark:text-slate-300 text-sm font-bold mb-2 ml-1">
                City
              </span>
              <div className="relative w-full max-w-[100vw] overflow-x-hidden">
                <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-14 pl-12 pr-4 text-base font-medium transition-all outline-none appearance-none"
                >
                  {SUPPORTED_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <div className="space-y-4">
              <label className="block p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl">
                <span className="block text-orange-900 dark:text-orange-300 text-sm font-bold mb-3 ml-1 flex items-center gap-2">
                  <LocateFixed className="w-4 h-4" />
                  Precise Home Location
                </span>

                <div className="space-y-4">
                  <WidgetErrorBoundary fallbackName="Location Search">
                    <Suspense
                      fallback={
                        <div className="h-12 w-full animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                      }
                    >
                      <AddressSearch
                        initialAddress={address}
                        initialCoords={
                          latitude && longitude
                            ? { lat: latitude, lng: longitude }
                            : undefined
                        }
                        onSelect={(data) => {
                          setAddress(data.address);
                          setLatitude(data.lat);
                          setLongitude(data.lng);
                        }}
                      />
                    </Suspense>
                  </WidgetErrorBoundary>

                  {latitude && longitude && (
                    <WidgetErrorBoundary fallbackName="Location Picker">
                      <Suspense
                        fallback={
                          <div className="h-48 w-full animate-pulse bg-slate-200 dark:bg-slate-800 rounded-xl mt-4"></div>
                        }
                      >
                        <LocationPickerMap
                          coords={{ lat: latitude, lng: longitude }}
                          onCoordsChange={(c) => {
                            setLatitude(c.lat);
                            setLongitude(c.lng);
                          }}
                        />
                      </Suspense>
                    </WidgetErrorBoundary>
                  )}

                  {!latitude && (
                    <div className="text-[10px] text-slate-500 italic bg-white dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      * Search your address to drop a precise pin for the rider.
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-4">
          <input
            className="rounded text-primary focus:ring-primary border-slate-300 dark:bg-slate-900"
            id="terms"
            type="checkbox"
            defaultChecked
          />
          <label
            className="text-sm text-slate-500 dark:text-slate-400"
            htmlFor="terms"
          >
            I agree to the{" "}
            <span className="text-primary font-medium">Terms of Service</span>
          </label>
        </div>
      </div>

      {/* Sticky Save Button Container */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-t border-primary/10 max-w-md mx-auto">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-primary hover:bg-primary text-white font-black h-16 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 text-lg disabled:opacity-70 disabled:cursor-wait"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving Profile...
            </>
          ) : (
            <>
              Save Profile Info
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
