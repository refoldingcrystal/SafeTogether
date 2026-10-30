import { state } from '../shared/state.js';
import { toast } from '../shared/ui.js';

export function bindMapEvents({ render }) {
  document.addEventListener('click', (event) => {
    const marker = event.target.closest('[data-marker]');
    if (marker) toast(`${marker.dataset.marker}: demonstration map marker; no live incident data.`);
  });

  document.addEventListener('change', (event) => {
    if (event.target.id !== 'map-filter') return;
    state.mapFilter = event.target.value;
    render();
  });
}
