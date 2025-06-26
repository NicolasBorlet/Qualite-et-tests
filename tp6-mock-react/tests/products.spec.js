import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.jsx';

// Mock fetch globally
beforeEach(() => {
  globalThis.fetch = vi.fn((url) => {
    const urlObj = new URL(url, 'http://localhost');
    const seed = urlObj.searchParams.get('seed');
    const scenario = urlObj.searchParams.get('scenario');
    
    if (scenario === 'empty') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }
    
    if (scenario === 'error') {
      return Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal Server Error' }),
      });
    }
    
    if (scenario === 'network-error') {
      return Promise.reject(new Error('Network Error'));
    }
    
    if (seed === '0') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    }
    
    return Promise.resolve({
      ok: true,
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
    render(<App />);
    fireEvent.click(screen.getByText(/test api vide/i));
    await waitFor(() => expect(screen.getByText(/aucun produit/i)).toBeInTheDocument());
  });

  it('affiche un message d erreur en cas d erreur serveur', async () => {
    render(<App />);
    fireEvent.click(screen.getByText(/test erreur 500/i));
    await waitFor(() => expect(screen.getByText(/erreur.*500/i)).toBeInTheDocument());
  });

  it('affiche un message d erreur en cas d erreur réseau', async () => {
    render(<App />);
    fireEvent.click(screen.getByText(/test erreur réseau/i));
    await waitFor(() => expect(screen.getByText(/erreur.*network/i)).toBeInTheDocument());
  });

  it('recharge la liste de produits quand on clique sur le bouton', async () => {
    render(<App />);
    await screen.findByText(/Produit 1/);
    fireEvent.click(screen.getByText(/recharger/i));
    await waitFor(() => expect(screen.queryByText(/chargement/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Produit 1/)).toBeInTheDocument();
  });

  it('efface les erreurs précédentes lors d\'une nouvelle requête', async () => {
    render(<App />);
    
    fireEvent.click(screen.getByText(/test erreur 500/i));
    await waitFor(() => expect(screen.getByText(/erreur/i)).toBeInTheDocument());
    
    fireEvent.click(screen.getByText(/recharger/i));
    await waitFor(() => expect(screen.queryByText(/erreur/i)).not.toBeInTheDocument());
    expect(screen.getByText(/Produit 1/)).toBeInTheDocument();
  });
});