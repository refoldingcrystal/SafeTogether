import { state } from './state.js';
import { toast } from './ui.js';

export function bindSharedEvents({ navigate, render }) {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-go]');
    if (link) {
      event.preventDefault();
      navigate(link.dataset.go);
      return;
    }

    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'locate') toast('Location is not used in this demo.');
    if (action === 'zoom') toast('Map controls are illustrative in this demo.');
    if (action === 'layers') toast('Only demonstration layers are available.');
  });

  window.addEventListener('popstate', () => {
    state.route = location.hash.slice(1) || 'map';
    render();
  });
}
