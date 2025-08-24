// src/components/graphics/EditorTimeline.tsx
import Scene from 'scenejs';
interface EditorTimelineProps {
  scene: Scene | null;
}
export const EditorTimeline: React.FC<EditorTimelineProps> = ({ scene }) => {
  return <div>Timeline - Scene.js @0.3.0</div>;
};