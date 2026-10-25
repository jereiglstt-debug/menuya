import { handle } from '../../server/router.js';

export const onRequest = ({ request, env }) => handle(request, env);
