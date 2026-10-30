import { state, persist } from '../shared/state.js';

export function bindGuideEvents({ navigate, render }) {
  document.addEventListener('click', (event) => {
    const guideLink = event.target.closest('[data-open-guide]');
    if (guideLink) {
      event.preventDefault();
      navigate(`guide/${guideLink.dataset.openGuide}`);
      return;
    }
    const category = event.target.closest('[data-guide-filter]');
    if (category) {
      state.guideCategory = category.dataset.guideFilter;
      state.search = '';
      render();
      return;
    }
    if (event.target.closest('[data-action="clear-search"]')) {
      state.search = '';
      state.guideCategory = 'All';
      render();
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.id !== 'guide-search') return;
    const cursor = event.target.selectionStart;
    state.search = event.target.value;
    render();
    const search = document.getElementById('guide-search');
    search?.focus();
    search?.setSelectionRange(cursor, cursor);
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'guide-filter') {
      state.guideCategory = event.target.value;
      render();
    }
    if (event.target.matches('[data-check]')) {
      state.check[event.target.dataset.check] = event.target.checked;
      persist();
    }
  });
}
