(() => {
  const headings = [...document.querySelectorAll('.post-container h2, .post-container h3')];
  const incoming = /^#vlan-section-(\d+)$/.exec(location.hash);
  const destination = incoming && headings[Number(incoming[1]) - 1];
  // Preserve original Jekyll heading IDs and existing incoming Chinese links.
  if (destination) {
    const reveal = () => destination.scrollIntoView({block: 'start'});
    if (document.readyState === 'complete') reveal();
    else window.addEventListener('load', reveal, {once: true});
  }
  document.querySelectorAll('.article-language a').forEach(link => {
    link.addEventListener('click', () => {
      let section = -1;
      headings.forEach((heading, index) => {
        if (heading.getBoundingClientRect().top <= 140) section = index;
      });
      link.hash = section < 0 ? '' : 'vlan-section-' + String(section + 1).padStart(2, '0');
    });
  });
})();
