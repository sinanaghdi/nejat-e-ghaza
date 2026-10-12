import type { FormEvent } from "react";

type Form = {
  title: string;
  description: string;
  original_price: string;
  sale_price: string;
  quantity: string;
  pickup_start: string;
  pickup_end: string;
  image_url: string;
};

type Props = {
  value: Form;
  onChange: (value: Form) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  editing?: boolean;
};

export function OfferForm({ value, onChange, onSubmit, onClose, editing }: Props) {
  const set = (key: keyof Form, nextValue: string) => onChange({ ...value, [key]: nextValue });

  return (
    <div className="modal-backdrop nested-modal">
      <form
        className="form-modal"
        onSubmit={onSubmit}
        aria-labelledby="offer-form-title"
      >
        <h2 id="offer-form-title">{editing ? "ویرایش پیشنهاد غذایی" : "ثبت پیشنهاد غذایی جدید"}</h2>
        <p className="form-intro">اطلاعات را دقیق وارد کن تا مشتری زمان و قیمت دریافت را بداند.</p>

        <label htmlFor="offer-title">
          عنوان پیشنهاد
          <input
            id="offer-title"
            name="title"
            required
            minLength={2}
            maxLength={120}
            value={value.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="مثلاً ساندویچ مرغ گریل"
          />
        </label>

        <label htmlFor="offer-description">
          توضیحات <span className="field-optional"> (اختیاری)</span>
          <textarea
            id="offer-description"
            name="description"
            maxLength={1000}
            value={value.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="ترکیبات، اندازه یا نکته مهم درباره غذا"
          />
        </label>

        <div className="two-fields">
          <label htmlFor="offer-original-price">
            قیمت اصلی (تومان)
            <input
              id="offer-original-price"
              name="original_price"
              required
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={value.original_price}
              onChange={(event) => set("original_price", event.target.value)}
              placeholder="مثلاً ۱۸۰۰۰۰"
            />
          </label>
          <label htmlFor="offer-sale-price">
            قیمت با تخفیف (تومان)
            <input
              id="offer-sale-price"
              name="sale_price"
              required
              type="number"
              min="1"
              max={value.original_price || undefined}
              step="1"
              inputMode="numeric"
              value={value.sale_price}
              onChange={(event) => set("sale_price", event.target.value)}
              placeholder="مثلاً ۱۲۰۰۰۰"
            />
          </label>
        </div>
        <p className="field-hint">قیمت تخفیف‌خورده باید کمتر یا مساوی قیمت اصلی باشد.</p>

        <label htmlFor="offer-quantity">
          تعداد موجود
          <input
            id="offer-quantity"
            name="quantity"
            required
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={value.quantity}
            onChange={(event) => set("quantity", event.target.value)}
            placeholder="تعداد بسته‌های قابل تحویل"
          />
        </label>

        <div className="two-fields">
          <label htmlFor="offer-pickup-start">
            شروع بازه دریافت
            <input
              id="offer-pickup-start"
              name="pickup_start"
              required
              type="datetime-local"
              value={value.pickup_start}
              onChange={(event) => set("pickup_start", event.target.value)}
            />
          </label>
          <label htmlFor="offer-pickup-end">
            پایان بازه دریافت
            <input
              id="offer-pickup-end"
              name="pickup_end"
              required
              type="datetime-local"
              min={value.pickup_start || undefined}
              value={value.pickup_end}
              onChange={(event) => set("pickup_end", event.target.value)}
            />
          </label>
        </div>

        <label htmlFor="offer-image-url">
          لینک تصویر <span className="field-optional">(اختیاری)</span>
          <input
            id="offer-image-url"
            name="image_url"
            type="url"
            maxLength={2048}
            value={value.image_url}
            onChange={(event) => set("image_url", event.target.value)}
            placeholder="https://example.com/food.jpg"
            dir="ltr"
          />
        </label>

        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>انصراف</button>
          <button className="primary-button" type="submit">{editing ? "ذخیره تغییرات" : "ثبت پیشنهاد"}</button>
        </div>
      </form>
    </div>
  );
}
