import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Copy, Info, LoaderCircle, LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageLoader, RetryButton, StatePanel } from "../components/AsyncState";
import { ReceiptUploader } from "../components/ReceiptUploader";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../hooks/useToast";
import { VerificationProgress } from "../components/VerificationProgress";
import { useCopy } from "../hooks/useCopy";
import { api, getErrorMessage } from "../services/api";
import { formatDateTime, formatMoney } from "../utils/format";

type OperationStage = "idle" | "uploading" | "verifying";

export function CustomerPaymentPage() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { copy, copiedValue } = useCopy();
  const { pushToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [operationStage, setOperationStage] = useState<OperationStage>("idle");

  const paymentQuery = useQuery({
    queryKey: ["public-payment", token],
    queryFn: ({ signal }) => api.getPublicPayment(token, signal),
    enabled: Boolean(token),
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (file) {
        setOperationStage("uploading");
        await api.uploadPublicReceipt(token, file);
        await queryClient.invalidateQueries({ queryKey: ["public-payment", token] });
      }
      setOperationStage("verifying");
      const current = paymentQuery.data?.verification;
      return current ? api.recheckPublicPayment(token) : api.verifyPublicPayment(token);
    },
    onSuccess: (verification) => {
      setOperationStage("idle");
      void queryClient.invalidateQueries({ queryKey: ["public-payment", token] });
      navigate(`/verification/${verification.payment_id}?token=${encodeURIComponent(token)}`);
    },
    onError: (error) => {
      setOperationStage("idle");
      pushToast(getErrorMessage(error), "error");
    },
  });

  if (paymentQuery.isPending) return <PageLoader label="Opening your secure payment request" />;
  if (paymentQuery.isError) {
    return <StatePanel title="This payment link is unavailable" message={getErrorMessage(paymentQuery.error)} action={<RetryButton onClick={() => void paymentQuery.refetch()} />} />;
  }

  const { payment, merchant, payment_instructions: instructions, receipt, verification } = paymentQuery.data;
  const isWorking = verifyMutation.isPending;
  const canVerify = Boolean(file || receipt) && !fileError && !payment.is_expired && !isWorking;

  return (
    <div className="customer-page">
      <section className="customer-intro">
        <div className="merchant-identity"><span><Building2 size={20} aria-hidden="true" /></span><div><small>Payment request from</small><strong>{merchant.business_name}</strong></div></div>
        <span className="eyebrow">Amount to pay</span>
        <h1>{formatMoney(payment.amount, payment.currency)}</h1>
        <p>{payment.description}</p>
        <div className="reference-line"><span>PayPruf reference</span><strong>{payment.reference}</strong><button type="button" onClick={() => void copy(payment.reference, "Payment reference copied")} aria-label="Copy payment reference">{copiedValue === payment.reference ? <Check size={17} /> : <Copy size={17} />}</button></div>
        <div className="payment-expiry"><LockKeyhole size={15} aria-hidden="true" /> Link expires {formatDateTime(payment.expires_at)}</div>
      </section>

      <section className="instruction-card">
        <div className="card-heading-row"><div><span className="eyebrow">What you should pay</span><h2>Make a bank transfer</h2></div><span className="sandbox-label"><ShieldCheck size={14} /> Demo account</span></div>
        <p>Transfer the exact amount to this Wema sandbox / demo account. Include the PayPruf reference in your narration where possible.</p>
        <dl className="bank-details">
          <div><dt>Bank</dt><dd>{instructions.bank_name}</dd></div>
          <div><dt>Account name</dt><dd>{instructions.account_name}</dd></div>
          <div className="account-number-row"><dt>Account number</dt><dd><strong>{instructions.account_number}</strong><button type="button" onClick={() => void copy(instructions.account_number, "Account number copied")}><span className="sr-only">Copy account number</span>{copiedValue === instructions.account_number ? <Check size={17} /> : <Copy size={17} />}</button></dd></div>
        </dl>
        <div className="sandbox-disclaimer"><Info size={17} aria-hidden="true" /><span>This is clearly labelled demonstration bank data. Do not send real funds to this account.</span></div>
      </section>

      <section className="receipt-card">
        <div className="receipt-section-heading"><span><ReceiptText size={21} aria-hidden="true" /></span><div><h2>Already paid?</h2><p>Upload your receipt so PayPruf can extract its details and check the merchant-side record.</p></div></div>

        {verification && (
          <Link className="current-result" to={`/verification/${payment.id}?token=${encodeURIComponent(token)}`}>
            <span>Current verification</span><StatusBadge status={verification.status} /><small>View result</small>
          </Link>
        )}

        {payment.is_expired ? (
          <StatePanel title="This payment request has expired" message="Ask the merchant to create and share a new PayPruf payment link." />
        ) : (
          <>
            <ReceiptUploader file={file} onFile={setFile} onError={setFileError} disabled={isWorking} existingReceipt={receipt} />
            {receipt && !file && <div className="existing-receipt-note"><Check size={16} /> Receipt on file: <strong>{receipt.original_filename}</strong>. You can check again or replace it.</div>}
            {verifyMutation.isError && <div className="inline-alert" role="alert">{getErrorMessage(verifyMutation.error)}</div>}
            <VerificationProgress active={isWorking} />
            {!isWorking && (
              <button className="button button-primary verify-button" type="button" disabled={!canVerify} onClick={() => verifyMutation.mutate()}>
                <ShieldCheck size={19} /> {verification && !file ? "Check payment again" : "Verify payment"}
              </button>
            )}
            {isWorking && <button className="button button-primary verify-button" type="button" disabled><LoaderCircle className="spin" size={19} /> {operationStage === "uploading" ? "Reading receipt" : "Checking payment"}</button>}
            {!file && !receipt && <p className="action-hint">Choose a valid receipt to continue.</p>}
          </>
        )}
        <div className="truth-note"><ShieldCheck size={17} aria-hidden="true" /><span><strong>Your receipt does not confirm payment on its own.</strong> PayPruf compares it with the merchant’s transaction record before showing a result.</span></div>
      </section>
    </div>
  );
}
