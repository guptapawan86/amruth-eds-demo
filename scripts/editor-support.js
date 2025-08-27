import {
  decorateBlock,
  decorateBlocks,
  decorateButtons,
  decorateIcons,
  decorateSections,
  loadBlock,
  loadScript,
  loadSections,
} from './aem.js';
import { decorateRichtext } from './editor-support-rte.js';
import { decorateMain } from './scripts.js';

async function applyChanges(event) {
  // redecorate default content and blocks on patches (in the properties rail)
  const { detail } = event;

  const resource = detail?.request?.target?.resource // update, patch components
    || detail?.request?.target?.container?.resource // update, patch, add to sections
    || detail?.request?.to?.container?.resource; // move in sections
  if (!resource) return false;
  const updates = detail?.response?.updates;
  if (!updates.length) return false;
  const { content } = updates[0];
  if (!content) return false;

  // load dompurify
  await loadScript(`${window.hlx.codeBasePath}/scripts/dompurify.min.js`);

  const sanitizedContent = window.DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });
  const parsedUpdate = new DOMParser().parseFromString(sanitizedContent, 'text/html');
  const element = document.querySelector(`[data-aue-resource="${resource}"]`);

  if (element) {
    if (element.matches('main')) {
      const newMain = parsedUpdate.querySelector(`[data-aue-resource="${resource}"]`);
      newMain.style.display = 'none';
      element.insertAdjacentElement('afterend', newMain);
      decorateMain(newMain);
      decorateRichtext(newMain);
      await loadSections(newMain);
      element.remove();
      newMain.style.display = null;
      // eslint-disable-next-line no-use-before-define
      attachEventListners(newMain);
      return true;
    }

    const block = element.parentElement?.closest('.block[data-aue-resource]') || element?.closest('.block[data-aue-resource]');
    if (block) {
      const blockResource = block.getAttribute('data-aue-resource');
      const newBlock = parsedUpdate.querySelector(`[data-aue-resource="${blockResource}"]`);
      if (newBlock) {
        newBlock.style.display = 'none';
        block.insertAdjacentElement('afterend', newBlock);
        decorateButtons(newBlock);
        decorateIcons(newBlock);
        decorateBlock(newBlock);
        decorateRichtext(newBlock);
        await loadBlock(newBlock);
        block.remove();
        newBlock.style.display = null;
        return true;
      }
    } else {
      // sections and default content, may be multiple in the case of richtext
      const newElements = parsedUpdate.querySelectorAll(`[data-aue-resource="${resource}"],[data-richtext-resource="${resource}"]`);
      if (newElements.length) {
        const { parentElement } = element;
        if (element.matches('.section')) {
          const [newSection] = newElements;
          newSection.style.display = 'none';
          element.insertAdjacentElement('afterend', newSection);
          decorateButtons(newSection);
          decorateIcons(newSection);
          decorateRichtext(newSection);
          decorateSections(parentElement);
          decorateBlocks(parentElement);
          await loadSections(parentElement);
          element.remove();
          newSection.style.display = null;
        } else {
          element.replaceWith(...newElements);
          decorateButtons(parentElement);
          decorateIcons(parentElement);
          decorateRichtext(parentElement);
        }
        return true;
      }
    }
  }

  return false;
}

// set the filter for an UE editable
function setUEFilter(element, filter) {
  element.dataset.aueFilter = filter;
}


function updateUEInstrumentation() {
debugger;
console.log("hello");
  const main = document.querySelector('main');

  // ----- if browse page, identified by theme
  if (document.querySelector('body[class^=browse-]')) {
    // if there is already a editable browse rail on the page
    const browseRailBlock = main.querySelector('div.browse-rail.block[data-aue-resource]');
    if (browseRailBlock) {
      // only more default sections can be added
      setUEFilter(main, 'main');
      // no more browse rails can be added
      setUEFilter(document.querySelector('.section.browse-rail-section'), 'empty');
    } else {
      // allow adding default sections and browse rail section
      setUEFilter(main, 'main-browse');
    }
    // Update available blocks for tab sections
    const tabSections = main.querySelectorAll('div[data-aue-model^="tab-section"]');
    if (tabSections) {
      tabSections.forEach((elem) => {
        setUEFilter(elem, 'tab-section');
      });
    }

    // Update available blocks for default sections excluding browse-rail-section and tab-section
    main.querySelectorAll('.section:not(.browse-rail-section):not([data-aue-model^="tab-section"])').forEach((elem) => {
      setUEFilter(elem, 'section-browse');
    });

    return;
  }

  // ----- if article page, identified by theme
  if (document.querySelector('body[class^=articles]')) {
    // update available sections
    setUEFilter(main, 'main-article');
    // update available blocks for article content sections
    const articleContentSection = main.querySelector('.article-content-section');
    if (articleContentSection) {
      setUEFilter(articleContentSection, 'article-content-section');
      setIdsforRTETitles(articleContentSection);
    }
    // Update available blocks for tab sections
    const tabSections = main.querySelectorAll('div[data-aue-model^="tab-section"]');
    if (tabSections) {
      tabSections.forEach((elem) => {
        setUEFilter(elem, 'tab-section');
      });
    }

    // Update available blocks for default sections excluding article-header-section, article-content-section and tab-section
    main
      .querySelectorAll(
        '.section:not(.article-content-section):not(.article-header-section):not([data-aue-model^="tab-section"])',
      )
      .forEach((elem) => {
        setUEFilter(elem, 'section-article');
      });

    return;
  }

  // ----- if author bio page, identified by theme
  if (document.querySelector('body[class^=authors-bio-page]')) {
    // update available sections
    setUEFilter(main, 'empty');
    // update the only available default section
    const section = main.querySelector('.section');
    // if there is already an author bio block
    const authorBioBlock = main.querySelector('div.author-bio.block');
    if (authorBioBlock) {
      // no more blocks selectable
      setUEFilter(section, 'empty');
    } else {
      // only allow adding author bio blocks
      setUEFilter(section, 'section-author-bio');
    }
  }

  // ----- if header, identified by theme
  if (document.querySelector('body[class^=header]') || getMetadata('theme') === 'header') {
    // update available sections
    setUEFilter(main, 'empty');
    // update the only available default section
    const section = main.querySelector('.section');
    setUEFilter(section, 'section-header');
  }

  // ----- if footer, identified by theme
  if (document.querySelector('body[class^=footer]') || getMetadata('theme') === 'footer') {
    // update available sections
    setUEFilter(main, 'empty');
    // update the only available default section
    const section = main.querySelector('.section');
    setUEFilter(section, 'section-footer');
  }

  // ----- if profile pages, identified by theme
  if (document.querySelector('body[class^=profile]') || getMetadata('theme') === 'profile') {
    // update available sections
    setUEFilter(main, 'main-profile');
  }

  // ----- if signup-flow-modal pages, identified by theme
  if (document.querySelector('body[class^=signup]')) {
    // update available sections
    setUEFilter(main, 'main-signup');
    main.querySelectorAll('.section').forEach((elem) => {
      setUEFilter(elem, 'sign-up-flow-section');
    });
  }

  // ----- if learning-collections page, identified by theme
  if (document.querySelector('body[class^=learning-collections]') || getMetadata('theme') === 'learning-collections') {
    // update available sections
    setUEFilter(main, 'main-learning-collections');
  }
}

function attachEventListeners(main) {
debugger;
  ['aue:content-patch', 'aue:content-update', 'aue:content-add', 'aue:content-move', 'aue:content-remove'].forEach(
    (eventType) =>
      main?.addEventListener(eventType, async (event) => {
        event.stopPropagation();
        const applied = await applyChanges(event);
        if (applied) {
          updateUEInstrumentation();
          renderSEOWarnings();
          if (main.querySelectorAll('.block.code').length > 0) {
            const { highlightCodeBlock } = await import('./editor-support-blocks.js');
            const updatedEl = event.detail?.element ?? main;
            await highlightCodeBlock(updatedEl);
          }
        } else {
          window.location.reload();
        }
      }),
  );

  main.addEventListener('aue:ui-select', handleEditorSelect);
}

attachEventListners(document.querySelector('main'));

// decorate rich text
// this has to happen after decorateMain(), and everythime decorateBlocks() is called
decorateRichtext();
// in cases where the block decoration is not done in one synchronous iteration we need to listen
// for new richtext-instrumented elements. this happens for example when using experimentation.
const observer = new MutationObserver(() => decorateRichtext());
observer.observe(document, { attributeFilter: ['data-richtext-prop'], subtree: true });
updateUEInstrumentation();
