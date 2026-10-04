'use client';

import React from 'react';
import { IconUserMinus, IconUsersMinus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AudienceListProps } from '@/types';

/**
 * The revoke control, in one place, because there are now two of them and they
 * are the same control.
 *
 * **A person being taken off a list, not a row being deleted, and the glyph says
 * which.** A bin here would read as "delete this person", and the difference is
 * the whole point of `PRODUCT.md:101`: a control that looks destructive but is
 * not has to say what it actually does. A person row removes one address's access
 * to one list and nothing else, and the person is named next to it.
 *
 * Quiet at rest and destructive on hover, like every other destructive
 * affordance in this product: a row of red buttons above somebody's list says
 * "these people are about to be removed" before anybody has touched one. Hover is
 * gated on a real pointer, and the gating spelling with its underscores is
 * load-bearing - written bare, Tailwind emits
 * `@media (hover:hover)and(pointer:fine)`, which no CSS parser accepts.
 *
 * The plural glyph on a group row is the same argument one level up: it removes
 * several people at once, and the control must not read as one person's.
 */
const RevokeButton: React.FC<{
  label: string;
  onClick: () => void;
  testId: string;
  icon: React.ReactNode;
}> = ({ label, onClick, testId, icon }) => (
  <Button
    type='button'
    variant='ghost'
    size='icon'
    onClick={onClick}
    aria-label={label}
    data-testid={testId}
    className={cn(
      'shrink-0',
      'text-caption',
      '[@media(hover:hover)_and_(pointer:fine)]:hover:bg-wash',
      '[@media(hover:hover)_and_(pointer:fine)]:hover:text-ink'
    )}
  >
    {icon}
  </Button>
);

/**
 * Who may reach one list: the people, then the groups.
 *
 * The people half is the `AccessList` that lived inside `share-list-dialog.tsx`,
 * moved here unchanged - same markup, same rows, the same
 * `divide-y divide-rule` between them, the same quiet ghost revoke. It left that
 * file because a second kind of row arrived and the two had to be one list rather
 * than two components a caller had to remember to order.
 *
 * **The rows are `py-3` and `gap-4`, and both were smaller.** `py-2`/`gap-3` made
 * a two-line row - a name and an address - 60px tall with 16px of it padding, and
 * this list is the state the share sheet exists to show, so it is the block most
 * hurt by reading as a dense table: on a 390px phone the audience head sat under
 * the standing instruction with the first row 40px away and the last row 40px from
 * the field below. Nothing here overflowed; it was all simply too close, which is
 * a spacing fault and not a width one. `gap-4` additionally stops a long address
 * from touching the 44px revoke control, which cannot give way itself.
 *
 * **A group is a row, not a name in the people list, and the difference is what
 * the revoke control does.** A group row is one grant that reaches several people
 * at once, so its glyph is plural and its confirmation is the group one -
 * `shareList.revokeGroupConfirmTitle` - because a prompt that did not say so
 * would understate what pressing it removes. `AudienceListProps` keeps two arrays
 * and two callbacks for that reason: folding a group into `access` would either
 * print the same reader twice or lose the row that removes nine people at once.
 *
 * **A person who reaches this list through both a grant and a group appears once,
 * as a person row, and nothing says so.** That is not a decision this component
 * makes; it is what the data is. `access` holds one `ListAccess` row per person
 * and `groupAccess` one `ListGroupAccess` row per group, so the overlap has no
 * representation to render in the first place - and inventing one would mean
 * resolving group membership on the client to annotate rows, which is the
 * distinct-count join `ListSummary.sharedWithGroupCount` declines for a cheaper
 * reason: the audience answers *who can read this*, and the answer is a name
 * either way.
 *
 * The confirmations themselves are the caller's. Each callback hands over one row
 * and nothing else, and `types.ts:949-963` is why: a group row is a control that
 * withdraws reach from several people at once, and saying so is the point of it.
 */
const AudienceList: React.FC<AudienceListProps> = ({
  access,
  groupAccess,
  dict,
  onRevoke,
  onRevokeGroup,
}) => {
const isEmpty = access.length === 0 && groupAccess.length === 0;

  /*
    **One head for the whole audience, and one sentence for its empty state.**

    It used to print two heads - "Geteilt mit:" over the people and "Gruppen" over
    the groups - plus, when both were empty, a third that read "Noch mit niemandem
    geteilt" above a sentence reading "Noch niemand eingetragen." That last pair is
    the same fact twice in the same face thirty pixels apart, and the other two
    meant this component was claiming a *taxonomy* where the share sheet needs a
    list: a person and a group are both answers to "who can open this list", and
    the rows are already distinguishable without a head each - a person row prints
    the address they were added by, a group row prints how many people one grant
    reaches.

    One head that is a question ("Wer sieht diese Liste") also puts the state
    before the two controls that change it, which is the order the share sheet
    renders them in.
  */
  return (
    <div className='flex flex-col gap-2'>
      {/*
        Nobody and nothing: the one state in which both sections are absent. It
        prints the sentence and no heading, because a heading and a sentence saying
        the same thing is the redundancy this sheet was opened to fix. With a group
        reaching the list and nobody added individually, `nobodyYet` would be false
        and the list is printed instead - so an empty section is not printed at all.
      */}
      {isEmpty ? (
        <p
          className='text-[0.8125rem] leading-relaxed text-caption'
          data-testid='nobodyYet'
        >
          {dict.shareList.nobodyYet}
        </p>
      ) : (
        <>
          <h3 className='label-print text-caption'>
            {dict.shareList.audienceHeading}
          </h3>

          {/*
            One list, both kinds, and a single pair of rules around it - so the
            audience reads as one block of rows rather than as two lists of
            different lengths stacked under two headings.
          */}
          <ul
            data-testid='accessList'
            className='divide-y divide-rule border-y border-rule'
          >
            {access.map((row) => (
              <li
                key={row.id}
                className='flex items-center justify-between gap-4 py-3'
              >
                {/*
                  The address is printed under the name and not instead of it. A
                  name identifies the person to the owner; the address is the key
                  they will recognise them by, and it is what they typed when they
                  added them. Oldest grant first, because `accessForList` orders by
                  `grantedAt` and that is the order the owner did this in - which is
                  the useful order when somebody is deciding whether one of five
                  addresses should still be on the list.
                */}
                <span className='flex min-w-0 flex-col'>
                  <span className='break-words text-[0.9375rem] text-ink'>
                    {row.displayName}
                  </span>
                  <span className='min-w-0 truncate text-[0.8125rem] text-caption'>
                    {row.email}
                  </span>
                </span>

                <RevokeButton
                  label={`${dict.shareList.revoke} · ${row.displayName}`}
                  onClick={() => onRevoke(row)}
                  testId='revokeAccess'
                  icon={<IconUserMinus className='h-4 w-4' aria-hidden='true' />}
                />
              </li>
            ))}

            {groupAccess.map((row) => (
              <li
                key={row.id}
                className='flex items-center justify-between gap-4 py-3'
              >
                <span className='flex min-w-0 flex-col'>
                  {/*
                    A group name is a name, so it is the one thing on this row in
                    the specimen serif - and at the row's own size rather than the
                    contents page's 20px, because the largest object in a 32rem
                    sheet is meant to be its title. A group of nine members is one
                    grant, so the line underneath is the size of the group and not
                    nine rows: `shareList.groupReaches` says how many people that
                    one grant reaches.
                  */}
                  <span className='font-serif break-words text-[0.9375rem] font-semibold leading-snug text-ink'>
                    {row.groupName}
                  </span>
                  <span className='min-w-0 truncate text-[0.8125rem] text-caption'>
                    {dict.shareList.groupReaches.replace(
                      '{count}',
                      String(row.memberCount)
                    )}
                  </span>
                </span>

                <RevokeButton
                  label={`${dict.shareList.revoke} · ${row.groupName}`}
                  onClick={() => onRevokeGroup(row)}
                  testId='revokeGroupAccess'
                  icon={<IconUsersMinus className='h-4 w-4' aria-hidden='true' />}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export { AudienceList };
export default AudienceList;