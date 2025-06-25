import { saveRisks, loadRisks } from "../storage";

describe("Stockage DUER chiffré", () => {
  const fakeRisks = [
    { id: "1", unite: "Atelier", danger: "Chute", gravite: 2, mesures: "Sol antidérapant" }
  ];
  const key = "maClefSuperSecurisee";

  it("sauvegarde et relit les risques chiffrés", () => {
    saveRisks(fakeRisks, key);
    const loaded = loadRisks(key);
    expect(loaded).toEqual(fakeRisks);
  });

  it("échoue avec une mauvaise clé", () => {
    saveRisks(fakeRisks, key);
    const loaded = loadRisks("autreclef");
    expect(loaded).toEqual([]);
  });
});

