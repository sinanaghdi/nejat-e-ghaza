import type { FormEvent } from "react";

type Form = {
  business_name: string;
  description: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
};

type Props = {
  value: Form;
  onChange: (value: Form) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  editing?: boolean;
};

export function MerchantProfileForm({ value, onChange, onSubmit, onClose, editing }: Props) {
  const set = (key: keyof Form, nextValue: string) => onChange({ ...value, [key]: nextValue });

  return (
    <div className="modal-backdrop nested-modal">
      <form className="form-modal" onSubmit={onSubmit} aria-labelledby="merchant-profile-form-title">
        <h2 id="merchant-profile-form-title">{editing ? "ویرایش پروفایل فروشگاه" : "ساخت پروفایل فروشگاه"}</h2>
        <p className="form-intro">اطلاعات تماس و نشانی فروشگاه را برای مشتریان کامل کن.</p>

        <label htmlFor="merchant-business-name">
          نام کسب‌وکار
          <input
            id="merchant-business-name"
            name="business_name"
            required
            minLength={2}
            maxLength={160}
            value={value.business_name}
            onChange={(event) => set("business_name", event.target.value)}
            placeholder="نام کافه، رستوران یا فروشگاه"
          />
        </label>

        <label htmlFor="merchant-description">
          معرفی کوتاه <span className="field-optional">(اختیاری)</span>
          <textarea
            id="merchant-description"
            name="description"
            maxLength={1000}
            value={value.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="درباره فروشگاه و نوع غذاها بنویس"
          />
        </label>

        <label htmlFor="merchant-address">
          نشانی کامل
          <input
            id="merchant-address"
            name="address"
            required
            minLength={4}
            maxLength={300}
            value={value.address}
            onChange={(event) => set("address", event.target.value)}
            placeholder="خیابان، کوچه و پلاک"
          />
        </label>

        <label htmlFor="merchant-city">
          شهر
          <input
            id="merchant-city"
            name="city"
            required
            minLength={2}
            maxLength={100}
            value={value.city}
            onChange={(event) => set("city", event.target.value)}
            placeholder="مثلاً کرمانشاه"
          />
        </label>

        <div className="form-grid">
          <label htmlFor="merchant-latitude">
            عرض جغرافیایی <span className="field-optional">(اختیاری)</span>
            <input
              id="merchant-latitude"
              name="latitude"
              inputMode="decimal"
              value={value.latitude}
              onChange={(event) => set("latitude", event.target.value)}
              placeholder="34.3142"
              dir="ltr"
            />
          </label>
          <label htmlFor="merchant-longitude">
            طول جغرافیایی <span className="field-optional">(اختیاری)</span>
            <input
              id="merchant-longitude"
              name="longitude"
              inputMode="decimal"
              value={value.longitude}
              onChange={(event) => set("longitude", event.target.value)}
              placeholder="47.0650"
              dir="ltr"
            />
          </label>
        </div>
        <p className="field-hint">مختصات برای نمایش بهتر موقعیت فروشگاه استفاده می‌شود و پرکردن آن‌ها اختیاری است.</p>

        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>انصراف</button>
          <button className="primary-button" type="submit">{editing ? "ذخیره تغییرات" : "ثبت فروشگاه"}</button>
        </div>
      </form>
    </div>
  );
}
