import * as api from './api';

export function Handle(e: Error | Response) {
  if (e instanceof Error) {
    console.error(e);
    //@ts-ignore
    window.top.Notify.addNotification({
      title: 'Server Error',
      message:
        'Sorry, something went wrong when trying to communicate with the server. Please try again later.',
      level: 'error',
    });
  }
  if (e instanceof Response) {
    e
      .json()
      .then((apie: api.Error | api.StreamError) => {
        if (typeof apie.error === 'string') {
          //@ts-ignore
          window.top.Notify.addNotification({
            title: e.statusText,
            message: apie.error,
            level: 'error',
          });
        } else {
          //@ts-ignore
          window.top.Notify.addNotification({
            title: e.statusText,
            message: apie.error.message,
            level: 'error',
          });
        }
      })
      .catch(parsee => {
        console.error(parsee);
        //@ts-ignore
        window.top.Notify.addNotification({
          title: 'Server Error',
          message:
            'Sorry, something went wrong when trying to communicate with the server. Please try again later.',
          level: 'error',
        });
      });
  }
}
