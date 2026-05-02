import { ImagePlus } from "lucide-react";
import { mediaUrl } from "../../api/client";
import { FormField } from "./FormField";

export function UploadField({ label = "Изображение", value, onChange, onUpload }) {
  return (
    <FormField label={label}>
      <div className="upload-field">
        <input value={value || ""} placeholder="URL изображения или загрузка файла" onChange={(event) => onChange(event.target.value)} />
        <label className="button button--neutral">
          <ImagePlus size={17} aria-hidden /> Фото
          <input type="file" accept="image/*" hidden onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])} />
        </label>
      </div>
      {value && <img className="upload-preview" src={mediaUrl(value)} alt="Предпросмотр загруженного изображения" />}
    </FormField>
  );
}
