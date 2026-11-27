// Every change: the page loads without errors, presents (Next, Back) and the editor opens. Seconds.
export const covers = ['*'];

export default async function (t) {
  await t.open('title');
  t.check('the first slide is shown', (await t.eval(`document.querySelector('#stage .scene.is-active')?.dataset.name`)) === 'title');
  await t.key('ArrowRight', 'ArrowRight', 39);
  await t.waitFor(`document.querySelector('#stage .scene.is-active')?.dataset.name !== 'title'`, { label: 'Next goes on' });
  await t.key('ArrowLeft', 'ArrowLeft', 37);
  await t.waitFor(`document.querySelector('#stage .scene.is-active')?.dataset.name === 'title'`, { label: 'Back comes back' });
  t.check('Next and Back work', true);
  await t.key('e', 'KeyE', 69);
  await t.waitFor(`!!document.querySelector('.editor .editor-stage .scene')`, { label: 'the editor opens' });
  t.check('the editor opens with the slide', true);
}
