'use client';
import React from 'react';
import { createIcon } from '@gluestack-ui/core/icon/creator';
import { Svg, PrimitiveIcon } from '@gluestack-ui/core/icon/creator';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { cssInterop } from 'nativewind';
import { iconStyle } from './styles';

const UIIcon = createIcon({
  Root: Svg,
});

cssInterop(PrimitiveIcon, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      height: true,
      width: true,
      fill: true,
      color: 'classNameColor',
      stroke: true,
    },
  },
});

type IIconProps = React.ComponentPropsWithoutRef<typeof UIIcon> &
  VariantProps<typeof iconStyle> & { className?: string; as?: any; size?: any };

const Icon = React.forwardRef<
  React.ElementRef<typeof UIIcon>,
  IIconProps
>(({ size = 'md', className, ...props }, ref) => {
  if (typeof size === 'number') {
    return (
      <UIIcon
        ref={ref}
        {...props}
        className={iconStyle({ class: className })}
        height={size}
        width={size}
      />
    );
  }
  return (
    <UIIcon
      ref={ref}
      {...props}
      className={iconStyle({ size: size as any, class: className })}
    />
  );
});

Icon.displayName = 'Icon';

export { Icon };
