import React, { useState } from "react";

import { apiBase, uploadFile } from "../api";

export default function PhotoUploader({ photos, onChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const uploaded = [];
      for (const file of files) {
        const response = await uploadFile(file);
        uploaded.push({
          file_path: response.file_path,
          sort_order: photos.length + uploaded.length,
          is_cover: false
        });
      }
      const next = [...photos, ...uploaded];
      if (next.length && !next.some((photo) => photo.is_cover)) {
        next[0].is_cover = true;
      }
      onChange(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const setCover = (index) => {
    const next = photos.map((photo, idx) => ({
      ...photo,
      is_cover: idx === index
    }));
    onChange(next);
  };

  const move = (index, direction) => {
    const next = [...photos];
    const target = index + direction;
    if (target < 0 || target >= photos.length) {
      return;
    }
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((photo, idx) => {
      photo.sort_order = idx;
    });
    onChange(next);
  };

  const remove = (index) => {
    const next = photos.filter((_, idx) => idx !== index);
    if (next.length && !next.some((photo) => photo.is_cover)) {
      next[0].is_cover = true;
    }
    next.forEach((photo, idx) => {
      photo.sort_order = idx;
    });
    onChange(next);
  };

  return (
    <div className="photo-uploader">
      <label className="upload-drop">
        <input type="file" multiple accept="image/*" onChange={handleFiles} />
        <span>{loading ? "Загрузка..." : "Перетащите фото или выберите"}</span>
      </label>
      {error && <p className="error-text">{error}</p>}
      <div className="photo-list">
        {photos.map((photo, index) => (
          <div key={photo.file_path} className={`photo-item ${photo.is_cover ? "cover" : ""}`}>
            <div
              className="photo-preview"
              style={{
                backgroundImage: `url(${photo.file_path.startsWith("http") ? photo.file_path : `${apiBase}${photo.file_path}`})`
              }}
            />
            <div className="photo-body">
              <span className="photo-title">{photo.is_cover ? "Обложка" : `Фото ${index + 1}`}</span>
              <span className="photo-subtitle">Предпросмотр загруженного изображения</span>
            </div>
            <div className="photo-actions">
              <button className="button ghost" type="button" onClick={() => move(index, -1)}>
                ↑
              </button>
              <button className="button ghost" type="button" onClick={() => move(index, 1)}>
                ↓
              </button>
              <button className="button ghost" type="button" onClick={() => setCover(index)}>
                Сделать обложкой
              </button>
              <button className="button ghost" type="button" onClick={() => remove(index)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
