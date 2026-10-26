export function lockModalScroll() {
  const root = document.documentElement, body = document.body;
  const x = window.scrollX, y = window.scrollY;
  const previousRoot = { overflow: root.style.overflow, overscrollBehavior: root.style.overscrollBehavior };
  const previousBody = { position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, overflow: body.style.overflow, overscrollBehavior: body.style.overscrollBehavior };
  // A fixed body also prevents background rubber-band scrolling on mobile WebKit.
  Object.assign(root.style, { overflow: 'hidden', overscrollBehavior: 'none' });
  Object.assign(body.style, { position: 'fixed', top: `${-y}px`, left: `${-x}px`, width: '100%', overflow: 'hidden', overscrollBehavior: 'none' });
  return () => {
    Object.assign(root.style, previousRoot); Object.assign(body.style, previousBody);
    window.scrollTo({ left: x, top: y, behavior: 'instant' });
  };
}
