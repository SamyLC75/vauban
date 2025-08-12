export class FrenchCodesService {
    private static codes = {
      historicalFigures: [
        'Napoleon', 'Charlemagne', 'Louis XIV', 'Jeanne d\'Arc',
        'De Gaulle', 'Clemenceau', 'Lafayette', 'Robespierre'
      ],
      writers: [
        'Moliere', 'Voltaire', 'Rousseau', 'Hugo', 'Zola',
        'Baudelaire', 'Rimbaud', 'Proust', 'Camus', 'Sartre'
      ],
      locations: [
        'Versailles', 'Louvre', 'Montmartre', 'Bastille',
        'Concorde', 'Vendome', 'Rivoli', 'Invalides'
      ],
      culturalIcons: [
        'Asterix', 'Marianne', 'Coq-Gaulois', 'Fleur-de-Lys',
        'Tour-Eiffel', 'Arc-Triomphe', 'Notre-Dame', 'Sacre-Coeur'
      ]
    };
  
    static getRandomCode(): string {
      const allCodes = Object.values(this.codes).flat();
      return allCodes[Math.floor(Math.random() * allCodes.length)];
    }
  
    static generateCodeMapping(realNames: string[]): Map<string, string> {
      const mapping = new Map<string, string>();
      const availableCodes = Object.values(this.codes).flat();
      
      realNames.forEach((name, index) => {
        if (index < availableCodes.length) {
          mapping.set(name, availableCodes[index]);
        }
      });
      
      return mapping;
    }
  }
