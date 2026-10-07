import { FileText } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="text-sky-400" size={28} />
          <h1 className="text-2xl font-bold text-white">Conditions d'utilisation</h1>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-400">
          <section>
            <h2 className="text-lg font-semibold text-white mb-2">1. Objet</h2>
            <p>
              FibreFlow est une plateforme destinée à faciliter la gestion des
              organisations, des utilisateurs, des interventions techniques,
              des rapports et des évaluations de satisfaction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">2. Compte utilisateur</h2>
            <p>
              Chaque utilisateur est responsable de la confidentialité de ses
              identifiants et des actions réalisées avec son compte.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">3. Utilisation du service</h2>
            <p>
              Le service doit être utilisé uniquement dans le cadre prévu par
              l'organisation. Toute utilisation abusive, frauduleuse ou non
              autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">4. Rôles et permissions</h2>
            <p>
              Les fonctionnalités accessibles dépendent du rôle attribué au
              compte. Les administrateurs et super-administrateurs disposent
              de permissions de gestion différentes de celles des techniciens.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">5. Interventions et rapports</h2>
            <p>
              Les informations saisies concernant les interventions et les
              rapports doivent être exactes et utilisées dans le cadre
              professionnel prévu par le service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">6. Suspension d'un compte</h2>
            <p>
              Un compte peut être désactivé lorsqu'il ne respecte pas les
              règles d'utilisation ou les règles définies par l'organisation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-2">7. Évolution du service</h2>
            <p>
              Les fonctionnalités de FibreFlow peuvent évoluer afin d'améliorer
              la sécurité, les performances et l'expérience utilisateur.
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
