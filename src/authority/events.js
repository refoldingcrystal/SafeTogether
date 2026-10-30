import { state, persist } from '../shared/state.js';
import { toast } from '../shared/ui.js';

export function bindAuthorityEvents({ render }) {
  document.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-dash-tab]');
    if (tab) {
      event.preventDefault();
      state.dashboardTab = tab.dataset.dashTab;
      render();
      return;
    }

    const edit = event.target.closest('[data-edit-notice]');
    if (edit) {
      state.editNotice = state.notices.find((notice) => notice.id === edit.dataset.editNotice) || null;
      state.dashboardTab = 'Notice composer';
      render();
      return;
    }

    const publish = event.target.closest('[data-publish-notice]');
    if (publish) {
      const notice = state.notices.find((item) => item.id === publish.dataset.publishNotice);
      if (!notice) return;
      notice.status = 'Published';
      notice.time = 'Just now';
      state.notices.filter((item) => item !== notice && item.status === 'Published').forEach((item) => { item.status = 'Withdrawn'; });
      persist(); render(); toast('Demo notice published to the local map preview.');
      return;
    }

    const withdraw = event.target.closest('[data-expire-notice]');
    if (withdraw) {
      const notice = state.notices.find((item) => item.id === withdraw.dataset.expireNotice);
      if (!notice) return;
      notice.status = 'Withdrawn';
      persist(); render(); toast('Demo notice withdrawn from the map preview.');
      return;
    }

    const reviewButton = event.target.closest('[data-review]');
    if (reviewButton) {
      const report = state.reports.find((item) => item.id === reviewButton.dataset.review);
      if (!report) return;
      const answer = prompt(`Review ${report.id}: type “verify”, “reject”, or “more info”.`);
      if (!answer) return;
      const action = answer.trim().toLowerCase();
      if (action === 'verify') report.status = 'Verified';
      else if (action === 'reject') report.status = 'Rejected';
      else if (action === 'more info') report.status = 'Needs more information';
      else { toast('Choose verify, reject, or more info.'); return; }
      persist(); render(); toast(`Demo report ${report.id} updated to ${report.status}.`);
      return;
    }

    if (event.target.closest('[data-action="new-notice"]')) {
      state.editNotice = null;
      state.dashboardTab = 'Notice composer';
      render();
    }
  });

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('#notice-form');
    if (!form) return;
    event.preventDefault();
    const values = new FormData(form);
    const title = String(values.get('title') || '').trim();
    const body = String(values.get('body') || '').trim();
    if (title.length < 5 || body.length < 10) {
      toast('Add a clear title and enough detail.');
      return;
    }
    if (state.editNotice) {
      state.editNotice.title = title;
      state.editNotice.body = body;
      if (state.editNotice.status === 'Published') state.editNotice.status = 'Draft';
      state.editNotice = null;
    } else {
      state.notices.unshift({ id: `N-${Date.now()}`, title, body, status: 'Draft', time: 'Draft · just now' });
    }
    persist();
    state.dashboardTab = 'Official notices';
    render();
    toast('Demo notice saved as a local draft.');
  });
}
