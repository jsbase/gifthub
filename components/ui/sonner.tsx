'use client';

import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';
import { useSyncExternalStore } from 'react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * The height of the running head: 56px of bar plus its own 1px rule. It is
 * duplicated from `--header-height` rather than read, because it is a constant
 * in the same sense the breakpoint is, and a phone that resized would have to
 * re-run this anyway.
 */
const HEADER_OFFSET = 57;

/*
  Tailwind's `sm`, and the line the phone placement is drawn above. Stated once
  as a media query because it has to be *observed*, not sampled: the state used to
  be set once on mount from `window.innerWidth`, so rotating a tablet or resizing
  a desktop window left placement, offset and `visibleToasts` describing the
  viewport the page had loaded in. `useSyncExternalStore` rather than an effect
  and a setState, because the store is already external and the effect version
  rendered once with the wrong answer before correcting itself.
*/
const PHONE_VIEWPORT = '(max-width: 639px)';

const subscribeToPhoneViewport = (onStoreChange: () => void) => {
  const query = window.matchMedia(PHONE_VIEWPORT);
  query.addEventListener('change', onStoreChange);
  return () => query.removeEventListener('change', onStoreChange);
};

const phoneViewportMatches = () => window.matchMedia(PHONE_VIEWPORT).matches;

/*
  The server snapshot must not touch `window`, so it answers for the phone
  placement instead - the conservative answer, and the one the markup was already
  rendered with before the first client read corrected it. Reading the real query
  here is what threw `window is not defined` during the first server render.
*/
const serverSnapshotAssumesPhone = () => true;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();
  const isPhone = useSyncExternalStore(
    subscribeToPhoneViewport,
    phoneViewportMatches,
    serverSnapshotAssumesPhone
  );

  /*
    Two placements, and the phone one is the constrained one. Above 640px the
    toaster sits bottom-right, out of everyone's way. Below it the toaster sits
    top-centre, because on a phone the foot of the screen belongs to the control
    the page exists to offer.

    Two numbers make that placement safe, and both were wrong.

    `visibleToasts` - a phone is 664px tall, and a toast is 54px. Three of them
    stacked reach 178px, a quarter of the screen, and the dashboard's two
    primary controls sit at 112px. A user who added a gift and then deleted one
    could not reach "Mitglied hinzufügen" for four seconds, and neither could the
    e2e suite, which failed on WebKit for exactly this reason. One toast at a
    time is the whole fix, and on a phone the user was only ever shown the
    latest one anyway - each mutation gets its own line, and the line that is
    still there is the one describing what just happened.

    `offset` - at the default the first toast lands on top of the running head,
    over the wordmark and the two controls in it. Starting the stack under the
    header's rule puts it over the sheet's top margin instead, which is the one
    band of this page that holds nothing you can press. Both props are needed:
    sonner keeps a separate `mobileOffset` and uses that one below its own
    breakpoint, so `offset` alone moves nothing on the device this is for.
  */

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className={cn('toaster', 'group')}
      position={isPhone ? 'top-center' : 'bottom-right'}
      offset={isPhone ? HEADER_OFFSET : undefined}
      mobileOffset={isPhone ? HEADER_OFFSET : undefined}
      visibleToasts={isPhone ? 1 : undefined}
      toastOptions={{
        classNames: {
          toast:
            'group toast rounded-[10px] group-[.toaster]:bg-sheet group-[.toaster]:text-ink group-[.toaster]:border-rule group-[.toaster]:shadow-[0_12px_30px_-10px_rgb(0_0_0/0.24)]',
          description: 'group-[.toast]:text-caption',
          actionButton:
            'group-[.toast]:bg-ink group-[.toast]:text-ink-foreground',
          cancelButton: 'group-[.toast]:bg-wash',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
