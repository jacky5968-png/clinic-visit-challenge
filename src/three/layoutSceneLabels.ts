/** Keep enlarged scene labels inside the viewport and apart from each other. */
export interface SceneLabel { id: string; x: number; y: number; width: number; height: number }
export interface PlacedLabel extends SceneLabel { left: number; top: number }
export interface LabelObstacle { left: number; top: number; width: number; height: number }
export function layoutSceneLabels(labels: SceneLabel[], width: number, height: number, obstacles: LabelObstacle[] = []): PlacedLabel[] {
  const margin = 8, gap = 8, captionSpace = 80;
  const placed: PlacedLabel[] = [];
  for (const label of labels) {
    const maxX = Math.max(margin, width - label.width - margin);
    const maxY = Math.max(margin, height - label.height - captionSpace);
    const clamp = (n: number, max: number) => Math.max(margin, Math.min(n, max));
    const left = clamp(label.x - label.width / 2, maxX);
    const top = clamp(label.y - label.height, maxY);
    const xs = [...new Set([left, margin, maxX])];
    const occupied = [...placed, ...obstacles];
    const ys = [top, margin, maxY, ...occupied.flatMap(p => [p.top - label.height - gap, p.top + p.height + gap])];
    for (let y = margin; y <= maxY; y += label.height + gap) ys.push(y);
    const candidates = xs.flatMap(x => ys.map(y => ({ left: x, top: y })))
      .filter(p => p.top >= margin && p.top <= maxY)
      .sort((a, b) => (a.left-left)**2 + (a.top-top)**2 - (b.left-left)**2 - (b.top-top)**2);
    const best = candidates.find(c => occupied.every(p =>
      c.left + label.width + gap <= p.left || c.left >= p.left + p.width + gap ||
      c.top + label.height + gap <= p.top || c.top >= p.top + p.height + gap
    )) ?? { left, top };
    placed.push({ ...label, ...best });
  }
  return placed;
}
