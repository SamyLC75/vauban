import { anonymizeName } from "../anonymize";

describe("Anonymisation des noms", () => {
  it("transforme les noms en pseudonymes", () => {
    expect(anonymizeName("Michel")).toBe("Napoléon");
    expect(anonymizeName("Sophie")).toBe("Clemenceau");
  });
});
