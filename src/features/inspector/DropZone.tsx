import { useRef, useState, type DragEvent } from "react";

import { t } from "../../i18n";

interface DropZoneProps {
  busy: boolean;
  onSelect(file: File): void;
}

const ACCEPTED_IMAGE_TYPES =
  "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";

export function DropZone({ busy, onSelect }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);

  function selectFirst(files: FileList | null): void {
    const file = files?.item(0);
    if (file !== null && file !== undefined) onSelect(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setActive(false);
    if (!busy) selectFirst(event.dataTransfer.files);
  }

  return (
    <div
      className={`dropzone${active ? " dropzone--active" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!busy) setActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setActive(false);
        }
      }}
      onDrop={handleDrop}
      aria-busy={busy}
    >
      <div className="dropzone__primary">{t("dropzone.primary")}</div>
      <div className="dropzone__or">{t("dropzone.or")}</div>
      <button
        className="btn"
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {t("dropzone.button")}
      </button>
      <input
        ref={inputRef}
        hidden
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        aria-label={t("dropzone.button")}
        onChange={(event) => {
          selectFirst(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
