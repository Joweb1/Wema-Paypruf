import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../services/api";
import { useToast } from "../hooks/useToast";

const initialForm = {
  customer_name: "",
  customer_phone: "",
  amount: "",
  description: "",
  order_note: "",
  expires_in_hours: 24,
};

function normalizeMoney(value) {
  const cleaned = value.replace(/,/g, "").trim();
  const match = cleaned.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const [, rawWhole, rawFraction = ""] = match;
  if (![...rawWhole, ...rawFraction].some((digit) => digit !== "0")) return null;
  const whole = rawWhole.replace(/^0+(?=\d)/, "");
  return `${whole}.${rawFraction.padEnd(2, "0")}`;
}

export function CreatePaymentModal({ open, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const titleId = useId();
  const customerInput = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: api.createPayment,
    throwOnError: false,
    onSuccess: (payment) => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setForm(initialForm);
      setErrors({});
      onClose();
      pushToast(`Payment request ${payment.reference} created`);
      navigate(`/payment-link/${payment.id}`);
    },
  });

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => customerInput.current?.focus(), 0);
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !mutation.isPending) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose, mutation.isPending]);

  if (!open) return null;

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const submit = (event) => {
    event.preventDefault();
    const nextErrors = {};
    const normalizedAmount = normalizeMoney(form.amount);
    if (!form.customer_name.trim()) nextErrors.customer_name = "Enter the customer's name.";
    if (!normalizedAmount) nextErrors.amount = "Enter an amount greater than zero with no more than 2 decimal places.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const trimmedDescription = form.description?.trim();
    const finalDescription = trimmedDescription || form.order_note?.trim() || "Payment request";

    void mutation.mutateAsync({
      ...form,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone?.trim() || undefined,
      amount: normalizedAmount,
      description: finalDescription,
      order_note: form.order_note?.trim() || undefined,
    }).catch(() => undefined);
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !mutation.isPending) onClose();
      }}
    >
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">New payment request</span>
            <h2 id={titleId}>Create payment</h2>
            <p>Set the amount and PayPruf will generate a secure link for your customer.</p>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            aria-label="Close create payment form"
          >
            <X size={20} />
          </button>
        </div>

        <form className="payment-form" onSubmit={submit} noValidate>
          {mutation.isError && (
            <div className="inline-alert" role="alert">
              {getErrorMessage(mutation.error)}
            </div>
          )}
          <div className="form-grid">
            <label className="field field-span-2">
              <span>Customer name <b aria-hidden="true">*</b></span>
              <input
                ref={customerInput}
                value={form.customer_name}
                onChange={(event) => setField("customer_name", event.target.value)}
                aria-invalid={Boolean(errors.customer_name)}
                aria-describedby={errors.customer_name ? "customer-name-error" : undefined}
                placeholder="e.g. Chinedu Okafor"
                autoComplete="name"
              />
              {errors.customer_name && (
                <small className="field-error" id="customer-name-error">
                  {errors.customer_name}
                </small>
              )}
            </label>
            <label className="field">
              <span>Customer phone <em>Optional</em></span>
              <input
                value={form.customer_phone}
                onChange={(event) => setField("customer_phone", event.target.value)}
                type="tel"
                placeholder="+234 800 000 0000"
                autoComplete="tel"
              />
            </label>
            <label className="field">
              <span>Amount <b aria-hidden="true">*</b></span>
              <div className="money-input">
                <span>₦</span>
                <input
                  value={form.amount}
                  onChange={(event) => setField("amount", event.target.value.replace(/[^\d.,]/g, ""))}
                  inputMode="decimal"
                  placeholder="25,000"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={errors.amount ? "amount-error" : undefined}
                />
              </div>
              {errors.amount && (
                <small className="field-error" id="amount-error">
                  {errors.amount}
                </small>
              )}
            </label>
            <label className="field field-span-2">
              <span>Description <em>Optional</em></span>
              <input
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
                placeholder="e.g. Order payment"
              />
            </label>
            <label className="field">
              <span>Order or reference note <em>Optional</em></span>
              <input
                value={form.order_note}
                onChange={(event) => setField("order_note", event.target.value)}
                placeholder="e.g. Blue kaftan"
              />
            </label>
            <label className="field">
              <span>Link expires</span>
              <div className="select-wrap">
                <CalendarClock size={17} aria-hidden="true" />
                <select
                  value={form.expires_in_hours}
                  onChange={(event) => setField("expires_in_hours", Number(event.target.value))}
                >
                  <option value={6}>In 6 hours</option>
                  <option value={24}>In 24 hours</option>
                  <option value={48}>In 2 days</option>
                  <option value={72}>In 3 days</option>
                  <option value={168}>In 7 days</option>
                </select>
              </div>
            </label>
          </div>
          <div className="modal-actions">
            <button
              className="button button-ghost"
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </button>
            <button className="button button-primary" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <LoaderCircle className="spin" size={18} /> Creating request
                </>
              ) : (
                <>
                  Generate PayPruf link <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
