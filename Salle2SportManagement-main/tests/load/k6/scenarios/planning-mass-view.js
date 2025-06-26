import { check, sleep } from 'k6';
import http from 'k6/http';

export let options = {
  vus: 100,
  duration: '1m',
};

export default function () {
  const url = 'http://localhost:3000/api/classes'; // À adapter selon l'endpoint réel
  const res = http.get(url);
  check(res, { 'Planning consulté': (r) => r.status === 200 });
  sleep(1);
}
