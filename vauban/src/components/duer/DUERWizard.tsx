import React, { useState } from 'react';
import { AlertCircle, Loader2, FileText, ChevronRight, HelpCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DUERRisk {
  id: string;
  danger: string;
  situation: string;
  gravite: number;
  probabilite: number;
  priorite: number;
  mesures_existantes: string[];
  mesures_proposees: any[];
  suivi: any;
}

interface DUERUnit {
  nom: string;
  risques: DUERRisk[];
}

const DUERWizard = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Données du formulaire
  const [formData, setFormData] = useState({
    sector: '',
    size: 'PME',
    unites: [''],
    historique: '',
    contraintes: '',
    reponses: {}
  });
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [generatedDUER, setGeneratedDUER] = useState<any>(null);
  const [selectedRisk, setSelectedRisk] = useState<DUERRisk | null>(null);
  const [riskExplanation, setRiskExplanation] = useState<any>(null);

  // Étape 1: Infos de base
  const handleStep1Submit = async () => {
    if (!formData.sector || formData.unites.filter(u => u).length === 0) {
      setError('Veuillez remplir le secteur et au moins une unité');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Simuler l'appel API pour les questions
      const response = await fetch('/api/duer/ia-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sector: formData.sector,
          size: formData.size
        })
      });
      
      if (!response.ok) throw new Error('Erreur lors de la récupération des questions');
      
      const data = await response.json();
      setQuestions(data.questions || []);
      setStep(2);
    } catch (err) {
      // Questions par défaut en cas d'erreur
      setQuestions([
        {
          id: 'Q1',
          question: 'Votre entreprise manipule-t-elle des charges lourdes régulièrement?',
          type: 'oui_non',
          justification: 'Évaluer les risques de TMS'
        },
        {
          id: 'Q2',
          question: 'Y a-t-il du travail en hauteur?',
          type: 'oui_non',
          justification: 'Risque de chute grave'
        }
      ]);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // Étape 2: Réponses aux questions
  const handleStep2Submit = () => {
    setStep(3);
  };

  // Étape 3: Génération du DUER
  const generateDUER = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Simuler la génération
      setTimeout(() => {
        setGeneratedDUER({
          duer: {
            secteur: formData.sector,
            date_generation: new Date().toISOString(),
            unites: formData.unites.filter(u => u).map(unite => ({
              nom: unite,
              risques: [
                {
                  id: 'R001',
                  danger: 'Risque de chute de plain-pied',
                  situation: 'Circulation dans les locaux',
                  gravite: 2,
                  probabilite: 3,
                  priorite: 6,
                  mesures_existantes: ['Sol maintenu propre et dégagé'],
                  mesures_proposees: [
                    {
                      type: 'collective',
                      description: 'Installation d\'un éclairage LED avec détecteurs',
                      delai: 'court_terme',
                      cout_estime: '€€',
                      reference: 'INRS ED 950'
                    }
                  ],
                  suivi: {
                    responsable: 'Responsable HSE',
                    echeance: '3 mois',
                    indicateur: 'Nombre d\'incidents'
                  }
                },
                {
                  id: 'R002',
                  danger: 'Troubles musculo-squelettiques',
                  situation: 'Travail sur écran prolongé',
                  gravite: 3,
                  probabilite: 3,
                  priorite: 9,
                  mesures_existantes: ['Pauses régulières'],
                  mesures_proposees: [
                    {
                      type: 'individuelle',
                      description: 'Fournir des supports d\'écran réglables',
                      delai: 'immédiat',
                      cout_estime: '€',
                      reference: 'Art. R4542-1 Code du travail'
                    }
                  ],
                  suivi: {
                    responsable: 'Médecin du travail',
                    echeance: '6 mois',
                    indicateur: 'Plaintes TMS'
                  }
                }
              ]
            })),
            synthese: {
              nb_risques_critiques: 0,
              nb_risques_importants: 1,
              nb_risques_moderes: 1,
              top_3_priorites: ['TMS - Travail sur écran', 'Chute de plain-pied'],
              budget_prevention_estime: '1000-2000€',
              conformite_reglementaire: {
                points_forts: ['DUER établi', 'Mesures identifiées'],
                points_vigilance: ['Formation du personnel à planifier']
              }
            }
          }
        });
        setStep(4);
        setLoading(false);
      }, 2000);
    } catch (err) {
      setError('Erreur lors de la génération du DUER');
      setLoading(false);
    }
  };

  // Expliquer un risque
  const explainRisk = async (risk: DUERRisk) => {
    setSelectedRisk(risk);
    setRiskExplanation(null);
    
    // Simuler l'explication
    setTimeout(() => {
      setRiskExplanation({
        explication: {
          resume_simple: `Le "${risk.danger}" est un risque fréquent qui peut entraîner des arrêts de travail prolongés.`,
          statistiques: '25% des accidents du travail dans les bureaux',
          exemple_accident: 'Un collaborateur s\'est blessé au dos en soulevant une imprimante',
          reference_principale: 'Code du travail - Principes généraux de prévention',
          conseil_pratique: 'Former le personnel aux bons gestes et postures'
        }
      });
    }, 1000);
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 12) return 'text-red-600 bg-red-50';
    if (priority >= 8) return 'text-orange-600 bg-orange-50';
    if (priority >= 4) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getGravityLabel = (level: number) => {
    const labels = ['', 'Faible', 'Modérée', 'Grave', 'Très grave'];
    return labels[level] || '';
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header avec progression */}
        <div className="border-b px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Générateur DUER avec IA
          </h2>
          
          {/* Barre de progression */}
          <div className="mt-4 flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div className={`w-24 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-600">Informations</span>
            <span className="text-gray-600">Questions IA</span>
            <span className="text-gray-600">Génération</span>
            <span className="text-gray-600">Résultat</span>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Étape 1: Informations de base */}
        {step === 1 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Informations sur votre entreprise</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secteur d'activité
                </label>
                <input
                  type="text"
                  value={formData.sector}
                  onChange={(e) => setFormData({...formData, sector: e.target.value})}
                  placeholder="Ex: Commerce de détail, BTP, Services informatiques..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taille de l'entreprise
                </label>
                <select
                  value={formData.size}
                  onChange={(e) => setFormData({...formData, size: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TPE">TPE (1-10 salariés)</option>
                  <option value="PME">PME (10-250 salariés)</option>
                  <option value="ETI">ETI (250-5000 salariés)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unités de travail
                </label>
                {formData.unites.map((unite, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={unite}
                      onChange={(e) => {
                        const newUnites = [...formData.unites];
                        newUnites[index] = e.target.value;
                        setFormData({...formData, unites: newUnites});
                      }}
                      placeholder="Ex: Bureau, Atelier, Entrepôt..."
                      className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    {index === formData.unites.length - 1 && (
                      <button
                        onClick={() => setFormData({...formData, unites: [...formData.unites, '']})}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        +
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Historique d'accidents (optionnel)
                </label>
                <textarea
                  value={formData.historique}
                  onChange={(e) => setFormData({...formData, historique: e.target.value})}
                  placeholder="Décrivez brièvement les accidents survenus..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleStep1Submit}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Étape 2: Questions IA */}
        {step === 2 && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Questions pour affiner votre DUER</h3>
            <p className="text-gray-600 mb-6">
              L'IA a généré ces questions pour mieux comprendre vos risques spécifiques
            </p>

            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium">{q.question}</p>
                      {q.justification && (
                        <p className="text-sm text-gray-600 mt-1">{q.justification}</p>
                      )}
                      
                      {q.type === 'oui_non' && (
                        <div className="mt-3 flex gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={q.id}
                              value="oui"
                              onChange={(e) => setFormData({
                                ...formData,
                                reponses: {...formData.reponses, [q.id]: e.target.value}
                              })}
                              className="mr-2"
                            />
                            Oui
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={q.id}
                              value="non"
                              onChange={(e) => setFormData({
                                ...formData,
                                reponses: {...formData.reponses, [q.id]: e.target.value}
                              })}
                              className="mr-2"
                            />
                            Non
                          </label>
                        </div>
                      )}
                      
                      {q.type === 'texte' && (
                        <input
                          type="text"
                          onChange={(e) => setFormData({
                            ...formData,
                            reponses: {...formData.reponses, [q.id]: e.target.value}
                          })}
                          className="mt-3 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Votre réponse..."
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Retour
              </button>
              <button
                onClick={handleStep2Submit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* Étape 3: Génération */}
        {step === 3 && (
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-4">Prêt à générer votre DUER</h3>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-6">
              <p className="text-gray-700 mb-4">
                L'IA va maintenant analyser vos informations et générer un DUER personnalisé incluant :
              </p>
              <ul className="text-left max-w-md mx-auto space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Identification des risques par unité
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Évaluation gravité/probabilité
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Mesures de prévention adaptées
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Plan d'actions prioritaires
                </li>
              </ul>
            </div>

            <button
              onClick={generateDUER}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Générer mon DUER
                </>
              )}
            </button>
          </div>
        )}

        {/* Étape 4: Résultats */}
        {step === 4 && generatedDUER && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Votre DUER généré</h3>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Exporter PDF
              </button>
            </div>

            {/* Synthèse */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold mb-3">Synthèse</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {generatedDUER.duer.synthese.nb_risques_critiques}
                  </div>
                  <div className="text-sm text-gray-600">Risques critiques</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {generatedDUER.duer.synthese.nb_risques_importants}
                  </div>
                  <div className="text-sm text-gray-600">Risques importants</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {generatedDUER.duer.synthese.nb_risques_moderes}
                  </div>
                  <div className="text-sm text-gray-600">Risques modérés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {generatedDUER.duer.synthese.budget_prevention_estime}
                  </div>
                  <div className="text-sm text-gray-600">Budget prévention</div>
                </div>
              </div>
            </div>

            {/* Risques par unité */}
            {generatedDUER.duer.unites.map((unite: DUERUnit) => (
              <div key={unite.nom} className="mb-6">
                <h4 className="font-semibold mb-3 text-lg">{unite.nom}</h4>
                
                <div className="space-y-3">
                  {unite.risques.map((risque) => (
                    <div key={risque.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className={`w-5 h-5 ${
                              risque.priorite >= 12 ? 'text-red-600' :
                              risque.priorite >= 8 ? 'text-orange-600' :
                              risque.priorite >= 4 ? 'text-yellow-600' :
                              'text-green-600'
                            }`} />
                            <h5 className="font-medium">{risque.danger}</h5>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(risque.priorite)}`}>
                              Priorité: {risque.priorite}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{risque.situation}</p>
                          
                          <div className="flex gap-4 text-sm">
                            <span>Gravité: <strong>{getGravityLabel(risque.gravite)}</strong></span>
                            <span>Probabilité: <strong>{risque.probabilite}/4</strong></span>
                          </div>
                          
                          {risque.mesures_proposees.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-sm font-medium mb-1">Mesures proposées:</p>
                              <ul className="text-sm text-gray-600 list-disc list-inside">
                                {risque.mesures_proposees.map((mesure, idx) => (
                                  <li key={idx}>{mesure.description} ({mesure.cout_estime})</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => explainRisk(risque)}
                          className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Obtenir plus d'informations"
                        >
                          <HelpCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Panel d'explication */}
            {selectedRisk && (
              <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Explication détaillée</h4>
                  <button
                    onClick={() => {setSelectedRisk(null); setRiskExplanation(null);}}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    ×
                  </button>
                </div>
                
                {riskExplanation ? (
                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Résumé simple</h5>
                      <p className="text-sm">{riskExplanation.explication.resume_simple}</p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Statistiques</h5>
                      <p className="text-sm">{riskExplanation.explication.statistiques}</p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Exemple concret</h5>
                      <p className="text-sm">{riskExplanation.explication.exemple_accident}</p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Référence réglementaire</h5>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                        {riskExplanation.explication.reference_principale}
                      </p>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-700 mb-1">Conseil pratique</h5>
                      <p className="text-sm bg-blue-50 p-3 rounded">
                        💡 {riskExplanation.explication.conseil_pratique}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DUERWizard;