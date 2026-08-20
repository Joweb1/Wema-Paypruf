import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pendingPayment } from "../test/fixtures";
import { ToastProvider } from "./Toast";
import { CreatePaymentModal } from "./CreatePaymentModal";

const fetchMock = vi.fn<typeof fetch>();

function renderModal() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/"]}>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<CreatePaymentModal open onClose={vi.fn()} />} />
            <Route path="/payment-link/:paymentId" element={<p>Share page opened</p>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function completeRequiredFields() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/customer name/i), "Chinedu Okafor");
  await user.type(screen.getByLabelText(/^amount/i), "25000");
  await user.type(screen.getByLabelText(/description/i), "Order payment");
  return user;
}

describe("CreatePaymentModal", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("creates a decimal-string payment and opens its share page", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(pendingPayment), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }));
    renderModal();
    const user = await completeRequiredFields();
    await user.click(screen.getByRole("button", { name: /generate paypruf link/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual(expect.objectContaining({
      customer_name: "Chinedu Okafor",
      amount: "25000.00",
      description: "Order payment",
      expires_in_hours: 24,
    }));
    expect(await screen.findByText("Share page opened")).toBeInTheDocument();
  });

  it("shows an actionable API failure without navigating", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      error: { code: "SERVICE_UNAVAILABLE", message: "Payment service is unavailable.", details: null },
    }), { status: 503, headers: { "Content-Type": "application/json" } }));
    renderModal();
    const user = await completeRequiredFields();
    await user.click(screen.getByRole("button", { name: /generate paypruf link/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Payment service is unavailable");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
