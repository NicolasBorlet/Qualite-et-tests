import { useEffect, useState } from 'react';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [seed, setSeed] = useState(42);

  const fetchProducts = (currentSeed, scenario = null) => {
    setLoading(true);
    setError(null);
    
    const url = scenario 
      ? `/api/products?scenario=${scenario}`
      : `/api/products?seed=${currentSeed}`;
      
    fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Failed to fetch products`);
        }
        return res.json();
      })
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setProducts([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts(seed);
  }, [seed]);

  const handleReload = () => {
    setSeed(Math.floor(Math.random() * 100000));
  };

  const handleTestScenario = (scenario) => {
    fetchProducts(seed, scenario);
  };

  return (
    <>
      <h1>Catalogue produits</h1>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={handleReload}>Recharger</button>
        <button onClick={() => handleTestScenario('empty')} style={{ marginLeft: '10px' }}>
          Test API Vide
        </button>
        <button onClick={() => handleTestScenario('error')} style={{ marginLeft: '10px' }}>
          Test Erreur 500
        </button>
        <button onClick={() => handleTestScenario('network-error')} style={{ marginLeft: '10px' }}>
          Test Erreur Réseau
        </button>
      </div>
      {loading ? (
        <p>Chargement...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>Erreur: {error}</p>
      ) : products.length === 0 ? (
        <p>Aucun produit disponible.</p>
      ) : (
        <ul>
          {products.map(p => (
            <li key={p.id}>
              {p.name} — {p.price}€
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default App;
