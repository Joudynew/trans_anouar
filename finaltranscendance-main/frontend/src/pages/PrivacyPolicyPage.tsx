import { Shield } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="text-sky-400" size={28} />
          <h1 className="text-2xl font-bold text-white">Politique de confidentialité</h1>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-400">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Données collectées</h2>
            <p>
              FibreFlow peut collecter les informations nécessaires au fonctionnement
              du service, notamment le nom, l'adresse e-mail, le numéro de téléphone,
              le rôle de l'utilisateur et les informations liées aux interventions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Utilisation des données</h2>
            <p>
              Ces données sont utilisées pour gérer les comptes utilisateurs,
              organiser les interventions, permettre le suivi des techniciens,
              gérer les communications et recueillir les évaluations de satisfaction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Accès aux données</h2>
            <p>
              L'accès aux données dépend du rôle de l'utilisateur et de son
              organisation. Les administrateurs peuvent gérer les utilisateurs
              autorisés de leur organisation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Sécurité</h2>
            <p>
              FibreFlow met en œuvre des mesures techniques destinées à protéger
              les comptes et les données contre les accès non autorisés.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Modification des données</h2>
            <p>
              Les utilisateurs peuvent demander la modification de leurs
              informations personnelles conformément aux règles applicables
              au service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Contact</h2>
            <p>
              Pour toute question concernant les données personnelles ou cette
              politique, contactez l'administrateur du service FibreFlow.
            </p>
          </section>
        </div>

        <button
          onClick={() => window.history.back()}
          className="btn-secondary mt-10"
        >
          Retour
        </button>
      </div>
    </div>
  );
}
