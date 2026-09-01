import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  MapPin, 
  Home, 
  Briefcase, 
  Navigation, 
  Plus, 
  Check, 
  Search,
  Building,
  Sparkles
} from "lucide-react";
import { BottomSheet } from "./BottomSheet";
import { UserProfile } from "../types";
import { DEFAULT_COORDS } from "../utils";

interface AddressSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  onSaveAddress: (address: string, coords?: { lat: number; lng: number }) => void;
  onRequestLocation: () => void;
  currentLocationCoords: { lat: number; lng: number } | null;
  triggerHaptic?: (intensity?: number) => void;
}

const POPULAR_TOWNSHIPS = [
  { name: "Soweto (Vilakazi)", city: "Johannesburg", lat: -26.2485, lng: 27.8540, emoji: "🇿🇦" },
  { name: "Braamfontein", city: "Johannesburg", lat: -26.1929, lng: 28.0306, emoji: "🎓" },
  { name: "Tembisa", city: "Ekurhuleni", lat: -25.9964, lng: 28.2268, emoji: "🏘️" },
  { name: "Mamelodi", city: "Pretoria", lat: -25.7069, lng: 28.3275, emoji: "🔥" },
  { name: "Alexandra", city: "Johannesburg", lat: -26.1042, lng: 28.0934, emoji: "🌆" },
  { name: "Umlazi", city: "Durban", lat: -29.9654, lng: 30.8841, emoji: "🌴" },
];

export const AddressSwitcherModal: React.FC<AddressSwitcherModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onSaveAddress,
  onRequestLocation,
  currentLocationCoords,
  triggerHaptic,
}) => {
  const [customInput, setCustomInput] = useState(userProfile.address || "");
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  const activeAddress = userProfile.address || "Select Delivery Address";

  const handleSelectTownship = (township: typeof POPULAR_TOWNSHIPS[0]) => {
    if (triggerHaptic) triggerHaptic(10);
    const fullAddr = `${township.name}, ${township.city}`;
    onSaveAddress(fullAddr, { lat: township.lat, lng: township.lng });
    onClose();
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    if (triggerHaptic) triggerHaptic(12);
    onSaveAddress(customInput.trim());
    setIsEditingCustom(false);
    onClose();
  };

  const handleGPSLocation = () => {
    if (triggerHaptic) triggerHaptic(15);
    onRequestLocation();
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Delivery Address"
      subtitle="Where should we send your hot Kota?"
      maxHeight="max-h-[85vh]"
      triggerHaptic={triggerHaptic}
    >
      <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
        {/* GPS Live Location CTA */}
        <button
          type="button"
          onClick={handleGPSLocation}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/50 text-left hover:bg-orange-100/70 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/20 group-hover:scale-105 transition-transform shrink-0">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">
                Use Current GPS Location
              </p>
              <p className="text-[10px] text-orange-700 dark:text-orange-300 font-semibold">
                Accurate pin for street delivery
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white px-2.5 py-1 rounded-lg shrink-0">
            Locate
          </span>
        </button>

        {/* Current Active Address Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-700/70">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Current Active Address
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/50">
              <Check className="w-2.5 h-2.5" /> Selected
            </span>
          </div>
          <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white line-clamp-2">
            {activeAddress}
          </p>
        </div>

        {/* Custom Address Input */}
        <div>
          <form onSubmit={handleSaveCustom} className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-orange-500" />
              <span>Enter Custom Street / House Address</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g. 7115 Vilakazi Street, Orlando West"
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
              <button
                type="submit"
                disabled={!customInput.trim() || customInput.trim() === userProfile.address}
                className="px-4 py-2.5 bg-slate-900 dark:bg-orange-600 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                Set
              </button>
            </div>
          </form>
        </div>

        {/* Popular Townships / Delivery Hubs */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Popular Township Delivery Hubs</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {POPULAR_TOWNSHIPS.map((township) => {
              const isSelected = activeAddress.toLowerCase().includes(township.name.toLowerCase());
              return (
                <button
                  key={township.name}
                  type="button"
                  onClick={() => handleSelectTownship(township)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-400 font-black ring-1 ring-orange-500/20"
                      : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 hover:border-orange-300 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <span className="text-base shrink-0">{township.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate">{township.name}</p>
                    <p className="text-[9px] text-slate-400 truncate">{township.city}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
