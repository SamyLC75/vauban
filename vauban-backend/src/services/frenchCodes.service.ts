export class FrenchCodesService {
    private static codes = {
      historicalFigures: [
        'Napoleon', 'Charlemagne', 'Louis-XIV', 'Jeanne-Arc',
        'De-Gaulle', 'Clemenceau', 'Lafayette', 'Robespierre'
      ],
      writers: [
        'Moliere', 'Voltaire', 'Rousseau', 'Hugo', 'Zola',
        'Baudelaire', 'Rimbaud', 'Proust', 'Camus', 'Sartre'
      ],
      locations: [
        'Versailles', 'Louvre', 'Montmartre', 'Bastille',
        'Concorde', 'Vendome', 'Rivoli', 'Invalides'
      ]
    };
  
    private static usedCodes = new Set<string>();
  
    static getRandomCode(): string {
      const allCodes = Object.values(this.codes).flat();
      const availableCodes = allCodes.filter(code => !this.usedCodes.has(code));
      
      if (availableCodes.length === 0) {
        // Réinitialiser si plus de codes disponibles
        this.usedCodes.clear();
        return this.getRandomCode();
      }
      
      const code = availableCodes[Math.floor(Math.random() * availableCodes.length)];
      this.usedCodes.add(code);
      return code;
    }
  }