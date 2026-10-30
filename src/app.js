import { state } from './shared/state.js';
import { header, nav } from './shared/ui.js';
import { bindSharedEvents } from './shared/events.js';
import { mapPage } from './public/map.js';
import { formPage } from './public/forms.js';
import { guideList, guideDetail } from './public/guides.js';
import { bindMapEvents } from './public/map-events.js';
import { bindFormEvents } from './public/forms-events.js';
import { bindGuideEvents } from './public/guides-events.js';
import { dashboard } from './authority/dashboard.js';
import { bindAuthorityEvents } from './authority/events.js';

function render() {
  const { route } = state;
  const content = route === 'map' ? mapPage()
    : route === 'report' ? formPage('report')
      : route === 'offer' ? formPage('offer')
        : route === 'guides' ? guideList()
          : route.startsWith('guide/') ? guideDetail(route.split('/')[1])
            : route === 'dashboard' ? dashboard()
              : mapPage();

  document.getElementById('app').innerHTML = `<div class="shell">${header()}${route === 'dashboard' ? content : `<main class="container">${content}</main>${nav()}`}</div>`;
  document.querySelectorAll('[data-map-category]').forEach((marker) => {
    marker.hidden = state.mapFilter !== 'All' && marker.dataset.mapCategory !== state.mapFilter;
  });
}

function navigate(path) {
  state.route = path;
  history.pushState({}, '', `#${path}`);
  render();
  window.scrollTo(0, 0);
}

bindSharedEvents({ navigate, render });
bindMapEvents({ render });
bindFormEvents({ navigate, render });
bindGuideEvents({ navigate, render });
bindAuthorityEvents({ render });
render();
