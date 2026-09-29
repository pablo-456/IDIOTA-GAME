import { blogSections } from './blogData';
import './Blog.css';

/**
 * Blog.jsx — Página de información del juego IDIOTA.
 * El contenido vive en blogData.js — edita ese archivo para actualizar la info.
 */

export default function Blog({ onBack }) {
  return (
    <div className="blog">
      {/* Botón volver */}
      <button className="blog__back" onClick={onBack}>
        ← Volver
      </button>

      {/* Header */}
      <header className="blog__header">
        <div className="blog__crown" aria-hidden="true">♛</div>
        <h1 className="blog__title">IDIOTA</h1>
        <p className="blog__tagline">El juego de cartas multijugador</p>
        <div className="blog__divider">
          <span>♠</span><span>♥</span><span>♦</span><span>♣</span>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="blog__content">
        {blogSections.map((section, i) => (
          <section key={i} className="blog__section">
            <h2 className="blog__section-title">{section.title}</h2>
            <div className="blog__placeholder">
              {section.paragraphs.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Footer */}
      <footer className="blog__footer">
        <p>IDIOTA · Juego de cartas multijugador en tiempo real</p>
      </footer>
    </div>
  );
}
