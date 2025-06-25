import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';

// Mock fetch globally
beforeEach(() => {
  globalThis.fetch = vi.fn((url) => {
    const urlObj = new URL(url, 'http://localhost');
    const seed = urlObj.searchParams.get('seed');
    if (seed === '0') {
      return Promise.resolve({
        json: () => Promise.resolve([]),
      });
    }
    return Promise.resolve({
      json: () => Promise.resolve([
        { id: '1', name: 'Produit 1', price: '10' },
        { id: '2', name: 'Produit 2', price: '20' },
      ]),
    });
  });
});

describe('App', () => {
  it('affiche le loader pendant le chargement', async () => {
    render(<App />);
    expect(screen.getByText(/chargement/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/chargement/i)).not.toBeInTheDocument());
  });

  it('affiche la liste des produits', async () => {
    render(<App />);
    await screen.findByText(/Produit 1/);
    expect(screen.getByText(/Produit 1/)).toBeInTheDocument();
    expect(screen.getByText(/Produit 2/)).toBeInTheDocument();
  });

  it('affiche un message si la liste est vide', async () => {
    // Simule un seed qui retourne une liste vide
    render(<App />);
    fireEvent.click(screen.getByText(/recharger/i));
    // On force le seed à 0 pour la prochaine requête
    await waitFor(() => expect(screen.getByText(/aucun produit/i)).toBeInTheDocument());
  });

  it('recharge la liste de produits quand on clique sur le bouton', async () => {
    render(<App />);
    await screen.findByText(/Produit 1/);
    fireEvent.click(screen.getByText(/recharger/i));
    // On attend que le loader apparaisse puis disparaisse
    await waitFor(() => expect(screen.queryByText(/chargement/i)).not.toBeInTheDocument());
    // Les produits doivent toujours être affichés (mock)
    expect(screen.getByText(/Produit 1/)).toBeInTheDocument();
  });
});
