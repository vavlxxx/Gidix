import React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { mediaUrl } from "../../api/client";

export function MasonryGallery({ images = [], title = "Галерея экскурсии" }) {
  const [active, setActive] = React.useState(null);
  if (!images.length) return null;

  function next(direction) {
    setActive((index) => (index + direction + images.length) % images.length);
  }

  return (
    <section className="masonry-section">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          <p>Фотографии маршрута и точек интереса.</p>
        </div>
      </div>
      <div className="masonry-gallery">
        {images.map((image, index) => (
          <button type="button" key={`${image}-${index}`} className={`masonry-gallery__item masonry-gallery__item--${index % 5}`} onClick={() => setActive(index)}>
            <img src={mediaUrl(image)} alt="" />
          </button>
        ))}
      </div>
      {active !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Просмотр фотографии">
          <button className="lightbox__close" type="button" aria-label="Закрыть просмотр" onClick={() => setActive(null)}><X size={22} /></button>
          <button className="lightbox__nav lightbox__nav--prev" type="button" aria-label="Предыдущая фотография" onClick={() => next(-1)}><ChevronLeft size={30} /></button>
          <img src={mediaUrl(images[active])} alt="" />
          <button className="lightbox__nav lightbox__nav--next" type="button" aria-label="Следующая фотография" onClick={() => next(1)}><ChevronRight size={30} /></button>
          <div className="lightbox__counter">{active + 1} / {images.length}</div>
        </div>
      )}
    </section>
  );
}
