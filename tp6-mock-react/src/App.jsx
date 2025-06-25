import { useEffect, useState } from 'react';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [seed, setSeed] = useState(42);

  const fetchProducts = (currentSeed) => {
    setLoading(true);
    fetch(`/api/products?seed=${currentSeed}`)
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts(seed);
  }, [seed]);

  const handleReload = () => {
    setSeed(Math.floor(Math.random() * 100000));
  };

  return (
    <>
      <h1>Catalogue produits</h1>
      <button onClick={handleReload}>Recharger</button>
      {loading ? (
        <p>Chargement...</p>
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
