import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
  vus: 50,
  duration: '1m',
};

export default function () {
  const bookingId = Math.floor(Math.random() * 1000); // À adapter selon vos données
  const url = `http://localhost:3000/api/bookings/${bookingId}`; // À adapter selon l'endpoint réel
  const res = http.del(url);
  check(res, { 'Annulation OK': (r) => r.status === 200 || r.status === 204 });
  sleep(1);
}
