import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ReceiptUploader } from "./ReceiptUploader";

function Harness({ onError = vi.fn() }: { onError?: (message: string | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  return <ReceiptUploader file={file} onFile={setFile} onError={onError} />;
}

describe("ReceiptUploader", () => {
  it("shows a validated selected receipt", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText(/choose receipt/i);
    await user.upload(input, new File(["image"], "transfer.jpg", { type: "image/jpeg" }));
    expect(screen.getByText("transfer.jpg")).toBeInTheDocument();
    expect(screen.getByText("Ready to upload")).toBeInTheDocument();
  });

  it("explains invalid receipt formats", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onError = vi.fn();
    render(<Harness onError={onError} />);
    await user.upload(screen.getByLabelText(/choose receipt/i), new File(["text"], "notes.txt", { type: "text/plain" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("PNG, JPG, JPEG, or PDF");
    expect(onError).toHaveBeenCalled();
  });
});
