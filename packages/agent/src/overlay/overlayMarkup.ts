/** Shadow DOM content of the overlay: app styles stay out, ours stay in. */
export const OVERLAY_MARKUP = `
<style>
  .veil { position: fixed; inset: 0; background: rgba(15, 44, 74, .10); cursor: not-allowed; }
  .bar { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; align-items: center;
    padding: 6px 8px 6px 12px; border-radius: 8px; background: #0F2C4A; color: #E3E3E3; font: 12px/16px system-ui, sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,.25); cursor: default; max-width: calc(100vw - 24px); flex-wrap: wrap; }
  .bar b { font-weight: 600; }
  .hint { opacity: .75; }
  button { font: inherit; border-radius: 5px; border: 1px solid rgba(255,255,255,.25); background: transparent; color: inherit; padding: 2px 8px; cursor: pointer; }
  button.pri { background: #A8C7FA; color: #062E6F; border-color: transparent; }
</style>
<div class="veil" id="veil"></div>
<div class="bar" role="status"><b id="label"></b><span class="hint" id="hint"></span>
  <button class="pri" id="back" type="button"></button><button id="unlock" type="button"></button></div>`;

export const OVERLAY_HOST_STYLE = 'position:fixed;inset:0;z-index:2147483647;display:block';

/** Keyboard input would still reach a field that had focus under the veil. */
export const KEY_EVENTS = ['keydown', 'keypress', 'keyup', 'beforeinput', 'input', 'paste'];

/** Pointer input the veil swallows. */
export const POINTER_EVENTS = [
  'click',
  'mousedown',
  'mouseup',
  'pointerdown',
  'pointerup',
  'touchstart',
  'wheel',
  'contextmenu',
  'dblclick',
];
