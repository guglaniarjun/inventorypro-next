"use client";
import { useRef, useState } from "react";
import { Camera, Upload, X, ImageIcon } from "lucide-react";

interface ImagePickerProps {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
}

export default function ImagePicker({ value, onChange, label = "Photo" }: ImagePickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB"); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>

      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="w-40 h-40 object-cover rounded-xl border border-border shadow-sm" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"
            title="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed border-border rounded-xl bg-muted/30 text-muted-foreground">
          <ImageIcon className="w-8 h-8 mb-1 opacity-40" />
          <span className="text-xs">No image</span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-input rounded-lg hover:bg-muted transition-colors"
        >
          <Camera className="w-3.5 h-3.5" /> Take Photo
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-input rounded-lg hover:bg-muted transition-colors"
        >
          <Upload className="w-3.5 h-3.5" /> Upload Image
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <p className="text-xs text-muted-foreground">Max 5 MB · JPG, PNG, WEBP</p>

      {/* Camera capture — opens camera directly on mobile */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
      {/* Gallery / file picker */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
