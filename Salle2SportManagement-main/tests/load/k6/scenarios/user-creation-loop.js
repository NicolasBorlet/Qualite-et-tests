import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
  vus: 50,
  duration: '1m',
};

export default function () {
  const url = 'http://localhost:3000/api/users'; // À adapter selon l'endpoint réel
  const payload = JSON.stringify({
    email: `user${Math.random().toString(36).substring(2, 10)}@test.com`,
    password: 'Test1234!',
    name: 'Test User',
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const res = http.post(url, payload, params);
  check(res, { 'Création OK': (r) => r.status === 201 });
  sleep(1);
}
