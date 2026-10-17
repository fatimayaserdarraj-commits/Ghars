import Svg, { Circle, Ellipse, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { useI18n } from '@/lib/i18n';

const GREEN = '#3F7E44';

/** UN Sustainable Development Goal 13 (Climate Action) tile, drawn as a vector. */
export function SdgBadge({ size = 96 }: { size?: number }) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="SDG 13 Climate Action">
      <Rect width={100} height={100} fill={GREEN} />
      <SvgText x={7} y={30} fill="#fff" fontSize={28} fontWeight="900">
        13
      </SvgText>
      {ar ? (
        <>
          <SvgText x={93} y={16} fill="#fff" fontSize={10} fontWeight="700" textAnchor="end">
            العمل
          </SvgText>
          <SvgText x={93} y={29} fill="#fff" fontSize={10} fontWeight="700" textAnchor="end">
            المناخي
          </SvgText>
        </>
      ) : (
        <>
          <SvgText x={44} y={17} fill="#fff" fontSize={8.5} fontWeight="800">
            CLIMATE
          </SvgText>
          <SvgText x={44} y={27} fill="#fff" fontSize={8.5} fontWeight="800">
            ACTION
          </SvgText>
        </>
      )}
      {/* An eye whose iris is the Earth. */}
      <Path d="M16 66 Q50 34 84 66 Q50 98 16 66 Z" fill="none" stroke="#fff" strokeWidth={5} strokeLinejoin="round" />
      <Circle cx={50} cy={66} r={14} fill="#fff" />
      <Ellipse cx={50} cy={66} rx={6} ry={14} fill="none" stroke={GREEN} strokeWidth={1.8} />
      <Line x1={36} y1={66} x2={64} y2={66} stroke={GREEN} strokeWidth={1.8} />
      <Line x1={38} y1={59} x2={62} y2={59} stroke={GREEN} strokeWidth={1.4} />
      <Line x1={38} y1={73} x2={62} y2={73} stroke={GREEN} strokeWidth={1.4} />
    </Svg>
  );
}
