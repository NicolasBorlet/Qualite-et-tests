import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
  vus: 100,
  duration: '1m',
};

export default function () {
  const url = 'http://localhost:3000/api/bookings'; // À adapter selon l'endpoint réel
  const payload = JSON.stringify({
    userId: Math.floor(Math.random() * 1000),
    classId: Math.floor(Math.random() * 10),
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const res = http.post(url, payload, params);
  check(res, { 'Réservation OK': (r) => r.status === 201 });
  sleep(1);
}
