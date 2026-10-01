import React from 'react';
import { StyleSheet } from 'react-native';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { textStyle } from './styles';

type ITextProps = Omit<React.ComponentProps<'span'>, 'style'> &
  VariantProps<typeof textStyle> & {
    /** React Native's line limit. On web this becomes a CSS line clamp. */
    numberOfLines?: number;
    ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
    allowFontScaling?: boolean;
    selectable?: boolean;
    /** Accepts React Native style values (objects, arrays, StyleSheet entries) */
    style?: any;
  };

const Text = React.forwardRef<React.ComponentRef<'span'>, ITextProps>(
  function Text(
    {
      className,
      isTruncated,
      bold,
      underline,
      strikeThrough,
      size = 'md',
      sub,
      italic,
      highlight,
      // React Native-only props. Forwarding them to a DOM <span> makes React log an
      // "unknown prop" error, and Expo's dev error toast then covers the bottom tab bar.
      numberOfLines,
      ellipsizeMode,
      allowFontScaling,
      selectable,
      style,
      ...props
    }: { className?: string } & ITextProps,
    ref
  ) {
    const clamp: React.CSSProperties | undefined =
      numberOfLines && numberOfLines > 0
        ? numberOfLines === 1
          ? { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
          : {
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: numberOfLines,
              overflow: 'hidden',
            }
        : undefined;

    return (
      <span
        className={textStyle({
          isTruncated: isTruncated as boolean,
          bold: bold as boolean,
          underline: underline as boolean,
          strikeThrough: strikeThrough as boolean,
          size,
          sub: sub as boolean,
          italic: italic as boolean,
          highlight: highlight as boolean,
          class: className,
        })}
        {...props}
        style={{ ...(StyleSheet.flatten(style) as React.CSSProperties), ...clamp }}
        ref={ref}
      />
    );
  }
);

Text.displayName = 'Text';

export { Text };
