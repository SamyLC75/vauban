import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SecuritySettingsForm from "../../components/settings/SecuritySettingsForm";
import { getSensitivity } from "../../utils/sensitivity";

describe("Formulaire de paramétrage confidentialité", () => {
  it("coche et décoche les champs optionnels", () => {
    render(<SecuritySettingsForm />);
    const region = screen.getByLabelText(/Région/i) as HTMLInputElement;
    expect(region.checked).toBe(false);
    fireEvent.click(region);
    expect(region.checked).toBe(true);
    fireEvent.click(region);
    expect(region.checked).toBe(false);
  });

  it("sauve les paramètres", () => {
    render(<SecuritySettingsForm />);
    const region = screen.getByLabelText(/Région/i) as HTMLInputElement;
    fireEvent.click(region);
    const saveBtn = screen.getByRole("button", { name: /Enregistrer/i });
    fireEvent.click(saveBtn);
    expect(getSensitivity().region).toBe(true);
  });
});
