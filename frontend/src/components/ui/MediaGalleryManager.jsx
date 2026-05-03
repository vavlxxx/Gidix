import React from "react";
import { ArrowDown, ArrowUp, Star, X } from "lucide-react";
import { mediaUrl } from "../../api/client";
import { MultiImageUploadField } from "./MultiImageUploadField";

export function MediaGalleryManager({ label = "Фотографии", values = [], cover, onChange, onCoverChange, onUpload }) {
  function setCover(value) {
    onCoverChange?.(value);
    onChange([value, ...values.filter((item) => item !== value)]);
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(index) {
    const next = values.filter((_, current) => current !== index);
    onChange(next);
    if (values[index] === cover) onCoverChange?.(next[0] || "");
  }

  return (
    <div className="media-manager">
      <MultiImageUploadField label={label} values={values} onChange={onChange} onUpload={onUpload} showPreview={false} />
      {!!values.length && (
        <div className="media-manager__grid">
          {values.map((value, index) => (
            <figure key={`${value}-${index}`}>
              <img src={mediaUrl(value)} alt="" />
              <figcaption>
                <button type="button" aria-label="Сделать главным фото" className={value === cover ? "is-active" : ""} onClick={() => setCover(value)}><Star size={14} /></button>
                <button type="button" aria-label="Переместить выше" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={14} /></button>
                <button type="button" aria-label="Переместить ниже" onClick={() => move(index, 1)} disabled={index === values.length - 1}><ArrowDown size={14} /></button>
                <button type="button" aria-label="Удалить фото" onClick={() => remove(index)}><X size={14} /></button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
