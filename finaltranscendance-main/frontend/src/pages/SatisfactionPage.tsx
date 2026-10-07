import { FormEvent, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

interface InterventionData {
  clientName: string;
  technicianName?: string;
}

interface SatisfactionData {
  intervention: InterventionData;
  submitted: boolean;
}

export function SatisfactionPage({ token }: { token: string }) {
  const [data, setData] = useState<SatisfactionData | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/interventions/satisfaction/${token}`)
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setData(result);
        setSubmitted(result.submitted);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erreur');
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (rating < 1) {
      setError('Veuillez sélectionner une note.');
      return;
    }

    setSending(true);

    try {
      const res = await fetch(
        `${API_URL}/interventions/satisfaction/${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rating,
            comment: comment.trim(),
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="satisfaction-page">
        <div className="satisfaction-card">
          <p>Chargement de votre intervention…</p>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="satisfaction-page">
        <div className="satisfaction-card satisfaction-error">
          <div className="satisfaction-icon">!</div>
          <h1>Oups…</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="satisfaction-page">
        <div className="satisfaction-card satisfaction-success">
          <div className="satisfaction-success-icon">✓</div>
          <h1>Merci pour votre retour !</h1>
          <p>
            Votre avis a bien été enregistré.
            Il nous aide à améliorer la qualité de nos interventions.
          </p>
        </div>
      </main>
    );
  }

  const displayedRating = hoverRating || rating;

  return (
    <main className="satisfaction-page">
      <div className="satisfaction-card">

        <div className="satisfaction-brand">
          <div className="satisfaction-brand-mark">F</div>
          <span>FibreFlow</span>
        </div>

        <div className="satisfaction-header">
          <span className="satisfaction-eyebrow">
            Intervention terminée
          </span>

          <h1>Votre avis compte</h1>

          <p>
            Bonjour <strong>{data?.intervention.clientName}</strong>,
            comment s’est passée votre intervention ?
          </p>
        </div>

        {data?.intervention.technicianName && (
          <div className="satisfaction-technician">
            <div className="satisfaction-technician-avatar">
              {data.intervention.technicianName.charAt(0).toUpperCase()}
            </div>

            <div>
              <span>Technicien</span>
              <strong>{data.intervention.technicianName}</strong>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="satisfaction-rating-section">
            <h2>Comment évaluez-vous notre service ?</h2>

            <div
              className="satisfaction-stars"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    value <= displayedRating
                      ? 'satisfaction-star active'
                      : 'satisfaction-star'
                  }
                  onMouseEnter={() => setHoverRating(value)}
                  onClick={() => setRating(value)}
                  aria-label={`${value} étoile${value > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>

            <div className="satisfaction-rating-label">
              {displayedRating === 0 && 'Sélectionnez une note'}
              {displayedRating === 1 && 'Très insatisfait'}
              {displayedRating === 2 && 'Insatisfait'}
              {displayedRating === 3 && 'Moyen'}
              {displayedRating === 4 && 'Satisfait'}
              {displayedRating === 5 && 'Très satisfait'}
            </div>
          </div>

          <div className="satisfaction-field">
            <label htmlFor="comment">
              Votre commentaire <span>(optionnel)</span>
            </label>

            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Dites-nous ce que vous avez pensé de l’intervention…"
              rows={5}
              maxLength={1000}
            />

            <div className="satisfaction-counter">
              {comment.length}/1000
            </div>
          </div>

          {error && (
            <div className="satisfaction-form-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="satisfaction-submit"
            disabled={sending || rating < 1}
          >
            {sending ? 'Envoi en cours…' : 'Envoyer mon avis'}
          </button>

        </form>

        <p className="satisfaction-footer">
          Merci de prendre quelques secondes pour partager votre expérience.
        </p>

      </div>
    </main>
  );
}