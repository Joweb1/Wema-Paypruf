import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it.each([
    ["CONFIRMED", "Confirmed"],
    ["PENDING", "Pending"],
    ["MISMATCH", "Mismatch"],
    ["NOT_RECEIVED", "Not received"],
  ] as const)("renders %s as accessible text", (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
