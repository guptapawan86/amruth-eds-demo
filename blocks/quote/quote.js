export default async function decorate(block) {
  const [quoteWrapper] = block.children;

  const blockquote = document.createElement('blockquote');
  blockquote.textContent = quoteWrapper.textContent.trim();
  quoteWrapper.replaceChildren(blockquote);

  const xfPath = block.dataset.experienceFragment || '/content/refresh/default-xf';
  const variation = block.dataset.experienceFragmentVariation || '';

  // Create XF wrapper
  const xfWrapper = document.createElement('div');
  xfWrapper.classList.add('experience-fragment-wrapper');

  try {
    // Fetch XF HTML from AEM (classic way)
    const url = variation
      ? `${xfPath}.${variation}.html`
      : `${xfPath}.html`;

    const resp = await fetch(url, { credentials: 'include' });
    if (resp.ok) {
      const xfHtml = await resp.text();
      xfWrapper.innerHTML = xfHtml;
    } else {
      xfWrapper.innerHTML = `<p>Unable to load Experience Fragment: ${xfPath}</p>`;
    }
  } catch (e) {
    xfWrapper.innerHTML = '<p>Error loading Experience Fragment</p>';
  }

  // Replace block content with XF
  block.replaceChildren(xfWrapper);
}
