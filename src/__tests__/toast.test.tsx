import { describe, it, expect } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastViewport, toast } from "@/components/ui/toast";

describe("toast", () => {
  it("renders a message pushed via toast()", () => {
    render(<ToastViewport />);
    act(() => {
      toast("Save failed — try again");
    });
    expect(screen.getByText("Save failed — try again")).toBeInTheDocument();
  });
});
