import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

/**
 * Small, brand-neutral building blocks shared by every screen. Colours come
 * from the active palette, so the same components render the AMR teal and the
 * EMR blue without per-screen styling.
 */

export type Tone = "default" | "primary" | "good" | "warn" | "bad" | "muted";

export function useToneColors(tone: Tone) {
  const c = useColors();
  switch (tone) {
    case "primary":
      return { bg: c.primarySoft, fg: c.primary, border: c.primary + "55" };
    case "good":
      return { bg: c.goodSoft, fg: c.good, border: c.good + "55" };
    case "warn":
      return { bg: c.warnSoft, fg: c.warn, border: c.warn + "66" };
    case "bad":
      return { bg: c.badSoft, fg: c.bad, border: c.bad + "66" };
    case "muted":
      return { bg: c.muted, fg: c.mutedForeground, border: c.border };
    default:
      return { bg: c.card, fg: c.foreground, border: c.border };
  }
}

export function Screen({
  title,
  subtitle,
  children,
  right,
  back = false,
  scroll = true,
  onRefresh,
  refreshing = false,
  footer,
  testID,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  back?: boolean;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  footer?: ReactNode;
  testID?: string;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const header =
    title || back || right ? (
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {back ? (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            style={({ pressed }) => [styles.backBtn, { backgroundColor: pressed ? c.muted : "transparent" }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="button-back"
          >
            <Feather name="chevron-left" size={26} color={c.foreground} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          {title ? (
            <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2} testID="text-screen-title">
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={[styles.subtitle, { color: c.mutedForeground }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
      </View>
    ) : (
      <View style={{ height: insets.top }} />
    );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }} testID={testID}>
      {header}
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} /> : undefined
          }
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  tone = "default",
  testID,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: Tone;
  testID?: string;
}) {
  const c = useColors();
  const t = useToneColors(tone);
  const base = [
    styles.card,
    {
      backgroundColor: tone === "default" ? c.card : t.bg,
      borderColor: tone === "default" ? c.cardBorder : t.border,
      borderRadius: c.radius,
    },
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }]} testID={testID}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={base} testID={testID}>
      {children}
    </View>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>{children}</Text>
      {action}
    </View>
  );
}

export function Chip({ label, tone = "muted", small = false, testID }: { label: string; tone?: Tone; small?: boolean; testID?: string }) {
  const t = useToneColors(tone);
  return (
    <View style={[styles.chip, { backgroundColor: t.bg, borderColor: t.border }, small && styles.chipSmall]} testID={testID}>
      <Text style={[styles.chipText, { color: t.fg }, small && { fontSize: 11 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  small = false,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const c = useColors();
  const palette = {
    primary: { bg: c.primary, fg: c.primaryForeground, border: c.primary },
    outline: { bg: "transparent", fg: c.foreground, border: c.border },
    ghost: { bg: "transparent", fg: c.primary, border: "transparent" },
    danger: { bg: c.destructive, fg: c.destructiveForeground, border: c.destructive },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon ? <Feather name={icon} size={small ? 14 : 17} color={palette.fg} /> : null}
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.mutedForeground }]}>{label}</Text>
      {children}
      {hint ? <Text style={[styles.hint, { color: c.mutedForeground }]}>{hint}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps & { testID?: string }) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.mutedForeground}
      {...props}
      style={[
        styles.input,
        { backgroundColor: c.input, color: c.foreground, borderColor: c.border, borderRadius: c.radius - 4 },
        props.multiline && { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
        props.style,
      ]}
    />
  );
}

export function Select<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
  testID?: string;
}) {
  const c = useColors();
  return (
    <View style={styles.selectWrap} testID={testID}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            testID={testID ? `${testID}-${o.value}` : undefined}
            style={[
              styles.selectOption,
              {
                backgroundColor: active ? c.primary : c.input,
                borderColor: active ? c.primary : c.border,
              },
            ]}
          >
            <Text style={[styles.selectText, { color: active ? c.primaryForeground : c.foreground }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ label, value, onChange, hint, testID }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string; testID?: string }) {
  const c = useColors();
  return (
    <View style={[styles.toggleRow, { borderColor: c.border }]}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[styles.toggleLabel, { color: c.foreground }]}>{label}</Text>
        {hint ? <Text style={[styles.hint, { color: c.mutedForeground }]}>{hint}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.primary, false: c.border }} thumbColor="#ffffff" testID={testID} />
    </View>
  );
}

export function KeyValue({ k, v, tone }: { k: string; v: ReactNode; tone?: Tone }) {
  const c = useColors();
  const t = useToneColors(tone ?? "default");
  return (
    <View style={styles.kv}>
      <Text style={[styles.kvKey, { color: c.mutedForeground }]}>{k}</Text>
      {typeof v === "string" || typeof v === "number" ? (
        <Text style={[styles.kvVal, { color: tone ? t.fg : c.foreground }]}>{v}</Text>
      ) : (
        v
      )}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  meta,
  badge,
  badgeTone = "muted",
  onPress,
  right,
  testID,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  badgeTone?: Tone;
  onPress?: () => void;
  right?: ReactNode;
  testID?: string;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.card, borderColor: c.cardBorder, borderRadius: c.radius, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSub, { color: c.mutedForeground }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? <Text style={[styles.rowMeta, { color: c.mutedForeground }]}>{meta}</Text> : null}
      </View>
      {badge ? <Chip label={badge} tone={badgeTone} small /> : null}
      {right}
      {onPress ? <Feather name="chevron-right" size={18} color={c.mutedForeground} /> : null}
    </Pressable>
  );
}

export function Empty({ text, icon = "inbox" }: { text: string; icon?: keyof typeof Feather.glyphMap }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={28} color={c.mutedForeground} />
      <Text style={[styles.emptyText, { color: c.mutedForeground }]}>{text}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const c = useColors();
  return (
    <View style={styles.empty} testID="loading">
      <ActivityIndicator color={c.primary} />
      {label ? <Text style={[styles.emptyText, { color: c.mutedForeground }]}>{label}</Text> : null}
    </View>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  const c = useColors();
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <View style={[styles.errorBox, { backgroundColor: c.badSoft, borderColor: c.bad + "66" }]} testID="text-error">
      <Feather name="alert-circle" size={16} color={c.bad} />
      <Text style={[styles.errorText, { color: c.bad }]}>{message}</Text>
    </View>
  );
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap }, style]}>{children}</View>;
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: 1, backgroundColor: c.border, marginVertical: 12 }} />;
}

export function Bullets({ items, tone }: { items: string[]; tone?: Tone }) {
  const c = useColors();
  const t = useToneColors(tone ?? "default");
  if (!items.length) return null;
  return (
    <View style={{ gap: 6 }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8 }}>
          <Text style={{ color: tone ? t.fg : c.primary, lineHeight: 20 }}>•</Text>
          <Text style={[styles.body, { color: c.foreground, flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function Body({ children, muted = false, style }: { children: ReactNode; muted?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <Text style={[styles.body, { color: muted ? c.mutedForeground : c.foreground }, style as never]}>{children}</Text>;
}

export function Heading({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.heading, { color: c.foreground }]}>{children}</Text>;
}

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
};

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  title: { fontSize: 26, fontFamily: fonts.bold, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, marginTop: 2, fontFamily: fonts.regular },
  content: { padding: 16, gap: 12 },
  card: { borderWidth: 1, padding: 14, gap: 8 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 2 },
  sectionTitle: { fontSize: 12, fontFamily: fonts.semibold, letterSpacing: 1, textTransform: "uppercase" },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, alignSelf: "flex-start" },
  chipSmall: { paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontSize: 12, fontFamily: fonts.semibold },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  buttonText: { fontSize: 15, fontFamily: fonts.semibold },
  field: { gap: 6, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontFamily: fonts.semibold, letterSpacing: 0.4, textTransform: "uppercase" },
  hint: { fontSize: 12, fontFamily: fonts.regular, marginTop: 2 },
  input: { minHeight: 46, borderWidth: 1, paddingHorizontal: 14, fontSize: 15, fontFamily: fonts.regular },
  selectWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  selectText: { fontSize: 13, fontFamily: fonts.medium },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  toggleLabel: { fontSize: 15, fontFamily: fonts.medium },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 4 },
  kvKey: { fontSize: 13, fontFamily: fonts.regular, flexShrink: 0 },
  kvVal: { fontSize: 14, fontFamily: fonts.medium, textAlign: "right", flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderWidth: 1 },
  rowTitle: { fontSize: 15, fontFamily: fonts.semibold, lineHeight: 20 },
  rowSub: { fontSize: 13, marginTop: 3, lineHeight: 18, fontFamily: fonts.regular },
  rowMeta: { fontSize: 12, marginTop: 6, fontFamily: fonts.medium },
  empty: { alignItems: "center", gap: 10, paddingVertical: 32 },
  emptyText: { fontSize: 14, textAlign: "center", fontFamily: fonts.regular },
  errorBox: { flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1 },
  errorText: { fontSize: 13, fontFamily: fonts.medium, flex: 1 },
  body: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  heading: { fontSize: 17, fontFamily: fonts.semibold, letterSpacing: -0.2 },
});

export const isWeb = Platform.OS === "web";
