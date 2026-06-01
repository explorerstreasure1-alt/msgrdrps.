import { useRef, useState } from "react";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImageDropzone({
  images,
  onChange,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [over, setOver] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dragIdx = useRef<number | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const urls = await Promise.all(arr.map(fileToDataUrl));
    onChange([...images, ...urls]);
  };

  const addUrl = () => {
    if (!urlInput.trim()) return;
    onChange([...images, urlInput.trim()]);
    setUrlInput("");
  };

  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));

  // reorder by drag
  const onThumbDrop = (target: number) => {
    const from = dragIdx.current;
    if (from === null || from === target) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    onChange(next);
    dragIdx.current = null;
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition " +
          (over
            ? "border-stone-600 bg-[#efe5d4]"
            : "border-stone-300 bg-stone-50 hover:border-stone-400")
        }
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#78716c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></svg>
        <p className="text-sm font-medium text-stone-700">
          Fotoğrafları buraya sürükleyip bırakın
        </p>
        <p className="text-xs text-stone-400">veya tıklayıp seçin (çoklu)</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="flex gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
          placeholder="veya görsel URL'si yapıştırın"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-500"
        />
        <button
          type="button"
          onClick={addUrl}
          className="rounded-lg border border-stone-400 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
        >
          Ekle
        </button>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((src, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => (dragIdx.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onThumbDrop(i)}
              className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-stone-800/80 px-1.5 py-0.5 text-[10px] text-white">
                  Kapak
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white opacity-0 transition group-hover:opacity-100"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
