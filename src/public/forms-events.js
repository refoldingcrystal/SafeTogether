import { state, persist } from '../shared/state.js';
import { toast } from '../shared/ui.js';

export function bindFormEvents({ navigate, render }) {
  document.addEventListener('click', (event) => {
    const choice = event.target.closest('[data-choice]');
    if (!choice) return;
    choice.parentElement.querySelectorAll('.choice').forEach((button) => button.classList.remove('selected'));
    choice.classList.add('selected');
    choice.closest('form').elements.category.value = choice.dataset.choice;
    choice.closest('form').querySelector('[data-error="category"]').style.display = 'none';
  });

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('#main-form');
    if (!form) return;
    event.preventDefault();
    const values = new FormData(form);
    const category = values.get('category');
    const description = String(values.get('description') || '').trim();
    const locationText = String(values.get('location') || '').trim();
    let valid = true;
    [['category', Boolean(category)], ['description', description.length >= 5], ['location', locationText.length >= 2]].forEach(([key, okay]) => {
      form.querySelector(`[data-error="${key}"]`).style.display = okay ? 'none' : 'block';
      if (!okay) valid = false;
    });
    if (!valid) {
      toast('Please complete the highlighted fields.');
      return;
    }

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = form.dataset.form === 'report' ? 'Submitting…' : 'Publishing…';
    document.getElementById('form-state').textContent = 'Saving to this device…';
    setTimeout(() => {
      const id = `ST-${Math.floor(3000 + Math.random() * 6000)}`;
      if (form.dataset.form === 'report') {
        state.reports.unshift({ id, category, description, location: locationText, time: 'Just now', status: 'Awaiting review', source: 'Community report' });
        persist();
        toast(`Demo report saved as ${id}. No authority has been notified.`);
        navigate('map');
        return;
      }

      state.offers.unshift({ id, category, description, location: locationText, time: 'Just now', availability: values.get('availability'), status: 'Demo offer' });
      persist();
      toast('Demo offer saved on this device. It is not publicly listed.');
      render();
    }, 450);
  });
}
