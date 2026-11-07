(() => {
  const catalog = document.querySelector('.side-catalog');
  const list = catalog?.querySelector('.catalog-body');
  if (!list) return;
  const headings = [...document.querySelectorAll(
    '.post-container h1[id], .post-container h2[id], .post-container h3[id], ' +
    '.post-container h4[id], .post-container h5[id], .post-container h6[id]'
  )];
  if (!headings.length) return;
  const mainLevel = Math.max(2, Math.min(...headings.map(h => Number(h.tagName[1]))));
  const toggle = catalog.querySelector('.catalog-toggle');
  toggle?.setAttribute('aria-expanded', 'true');
  toggle?.addEventListener('click', event => {
    event.preventDefault();
    const folded = catalog.classList.toggle('fold');
    toggle.setAttribute('aria-expanded', String(!folded));
  });
  const english = document.documentElement.lang === 'en';
  const groups = [];
  let group;
  headings.forEach(heading => {
    if (Number(heading.tagName[1]) <= mainLevel || !group) {
      group = {heading, children: []};
      groups.push(group);
    } else group.children.push(heading);
  });
  catalog.classList.add('compact-catalog');
  list.replaceChildren();
  const links = new Map();
  function linkFor(heading) {
    const link = document.createElement('a');
    link.href = '#' + heading.id;
    link.textContent = heading.textContent.trim();
    link.title = link.textContent;
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const targetGroup = groups.find(g => g.heading === heading || g.children.includes(heading));
      groups.forEach(g => setOpen(g, g === targetGroup));
      currentGroup = targetGroup;
      history.pushState(null, '', '#' + heading.id);
      requestAnimationFrame(() => { heading.scrollIntoView({block: 'start'}); update(); });
    });
    links.set(heading, link);
    return link;
  }
  function setOpen(item, open) {
    if (!item.button) return;
    item.button.setAttribute('aria-expanded', String(open));
    item.sublist.hidden = !open;
    item.button.textContent = open ? '−' : '+';
  }
  groups.forEach((item, index) => {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'catalog-row';
    row.append(linkFor(item.heading));
    li.append(row);
    if (item.children.length) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'catalog-expand';
      button.setAttribute('aria-label', (english ? 'Toggle sections: ' : '展开或收起小节：') + item.heading.textContent);
      const sublist = document.createElement('ul');
      sublist.id = 'catalog-group-' + index;
      sublist.className = 'catalog-children';
      button.setAttribute('aria-controls', sublist.id);
      item.children.forEach(heading => {
        const child = document.createElement('li');
        child.append(linkFor(heading));
        sublist.append(child);
      });
      item.button = button; item.sublist = sublist;
      button.addEventListener('click', () => {
        const opening = sublist.hidden;
        update();
        setOpen(item, opening);
      });
      row.append(button); li.append(sublist);
      setOpen(item, false);
    }
    list.append(li);
  });
  let currentGroup = null;
  let queued = false;
  function update() {
    queued = false;
    let current = null;
    headings.forEach(h => { if (h.getBoundingClientRect().top <= 150) current = h; });
    links.forEach((link, heading) => {
      if (heading === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const nextGroup = groups.find(g => g.heading === current || g.children.includes(current));
    if (nextGroup !== currentGroup) {
      groups.forEach(g => setOpen(g, g === nextGroup));
      currentGroup = nextGroup;
    }
  }
  window.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, {passive: true});
  window.addEventListener('load', update);
  update();
})();
