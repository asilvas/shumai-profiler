import {
  StartServer,
  createHandler,
  renderAsync,
} from "solid-start/entry-server";
import { processRequest } from './server/collector';
import URL from 'url';

export default createHandler(
  renderAsync((event) => {
    if (event.request.method === 'POST' && URL.parse(event.request.url).pathname === '/logger') {
      return processRequest(event.request);
    }

    return <StartServer event={event} />
  })
);
