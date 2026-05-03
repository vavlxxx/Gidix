import React from "react";
import { ImagePlus, X } from "lucide-react";
import { mediaUrl } from "../../api/client";
import { FormField } from "./FormField";

export function MultiImageUploadField({ label = "Фотографии", values = [], onChange, onUpload, showPreview = true }) {
  const [uploading, setUploading] = React.useState(false);

  async function uploadFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of list) {
        const asset = await onUpload(file);
        uploaded.push(asset.url);
      }
      onChange([...values, ...uploaded]);
    } finally {
      setUploading(false);
    }
  }

  function remove(index) {
    onChange(values.filter((_, current) => current !== index));
  }

  return (
    <FormField label={label}>
      <div className="multi-upload">
        <textarea value={values.join("\n")} onChange={(event) => onChange(event.target.value.split(/\n|,/).map((value) => value.trim()).filter(Boolean))} placeholder="URL фотографий, каждая ссылка с новой строки" />
        <label className="button button--neutral">
          <ImagePlus size={17} aria-hidden /> {uploading ? "Загрузка..." : "Добавить фото"}
          <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={(event) => uploadFiles(event.target.files)} />
        </label>
      </div>
      {showPreview && !!values.length && (
        <div className="multi-upload__grid">
          {values.map((value, index) => (
            <figure key={`${value}-${index}`}>
              <img src={mediaUrl(value)} alt="" />
              <button type="button" aria-label="Удалить фотографию" onClick={() => remove(index)}><X size={14} /></button>
            </figure>
          ))}
        </div>
      )}
    </FormField>
  );
}
