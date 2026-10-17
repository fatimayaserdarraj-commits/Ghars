import Svg, { Circle, ClipPath, Defs, Rect } from 'react-native-svg';
import { useId } from 'react';

/** Default profile picture: a soft sage person silhouette. */
export function UserAvatar({ size = 44, radius = 16 }: { size?: number; radius?: number }) {
  const clip = `avatar-${useId()}`;
  // Corner radius is given in points; convert it to the 100-unit viewBox.
  const r = (radius / size) * 100;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <ClipPath id={clip}>
          <Rect width={100} height={100} rx={r} ry={r} />
        </ClipPath>
      </Defs>
      <Rect width={100} height={100} rx={r} ry={r} fill="#DCE7D3" />
      <Circle cx={50} cy={41.7} r={20.8} fill="#8FB283" clipPath={`url(#${clip})`} />
      <Circle cx={50} cy={105} r={36} fill="#8FB283" clipPath={`url(#${clip})`} />
    </Svg>
  );
}
