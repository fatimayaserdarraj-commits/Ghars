import { Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { colors } from '@/theme';

import { AppText } from './ui';

/** Render `*italic*` spans. */
function Italic({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\s][^*]*?\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.length > 2 && p.startsWith('*') && p.endsWith('*') ? (
          <Text key={i} style={{ fontStyle: 'italic' }}>
            {p.slice(1, -1)}
          </Text>
        ) : (
          p
        ),
      )}
    </>
  );
}

/** Render `**bold**` spans (which may contain `*italic*`) and `*italic*` spans inside one line. */
function Inline({ text, color }: { text: string; color?: string }) {
  const parts = text.split(/(\*\*.+?\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.length > 4 && p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={{ fontWeight: '700', color: color ?? colors.text }}>
            <Italic text={p.slice(2, -2)} />
          </Text>
        ) : (
          <Italic key={i} text={p} />
        ),
      )}
    </>
  );
}

/**
 * Minimal Markdown for AI replies: headings, bullet and numbered lists, bold and italic.
 * Anything else is shown as plain text.
 */
export function RichText({ text, color }: { text: string; color?: string }) {
  const { isRTL } = useI18n();
  const lines = text.replace(/\r/g, '').split('\n');
  return (
    <View style={{ gap: 4 }}>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} style={{ height: 4 }} />;
        const heading = line.match(/^#{1,4}\s+(.*)/);
        if (heading)
          return (
            <AppText key={i} color={color} style={{ fontWeight: '800', fontSize: 16, marginTop: 2 }}>
              <Inline text={heading[1]} color={color} />
            </AppText>
          );
        const bullet = line.match(/^(\s*)[*•-]\s+(.*)/);
        const numbered = line.match(/^(\s*)(\d+)[.)]\s+(.*)/);
        if (bullet || numbered) {
          const indent = (bullet ? bullet[1] : numbered![1]).length > 1 ? 14 : 0;
          return (
            <View key={i} style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, [isRTL ? 'paddingRight' : 'paddingLeft']: indent }}>
              <AppText color={color ?? colors.lime} style={{ fontWeight: '800' }}>
                {bullet ? '•' : `${numbered![2]}.`}
              </AppText>
              <AppText color={color} style={{ flex: 1 }}>
                <Inline text={bullet ? bullet[2] : numbered![3]} color={color} />
              </AppText>
            </View>
          );
        }
        return (
          <AppText key={i} color={color}>
            <Inline text={line} color={color} />
          </AppText>
        );
      })}
    </View>
  );
}
