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
 * moved here unchanged - same markup, same `py-2` rows, the same
 * `divide-y divide-rule` between them, the same quiet ghost revoke. It left that
 * file because a second kind of row arrived and the two had to be one list rather
 * than two components a caller had to remember to order.
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

  return (
    <div className='flex flex-col gap-4'>
      {access.length > 0 && (
        <section className='flex flex-col gap-2'>
          <h3 className='label-print text-caption'>
            {dict.visibility.sharedWith}
          </h3>

          <ul
            data-testid='accessList'
            className='divide-y divide-rule border-y border-rule'
          >
            {access.map((row) => (
              <li
                key={row.id}
                className='flex items-center justify-between gap-3 py-2'
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
                  label={`${dict.shareList.revoke} \u00b7 ${row.displayName}`}
                  onClick={() => onRevoke(row)}
                  testId='revokeAccess'
                  icon={<IconUserMinus className='h-4 w-4' aria-hidden='true' />}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {groupAccess.length > 0 && (
        <section className='flex flex-col gap-2'>
          {/*
            The group's own name as the heading, and it wants to be a sentence of
            its own - "shared with a group", which is what the section above says
            about the other half of the audience. `groupPickerHeading` is the
            *offer* on the share side of the sheet ("or share it with a group") and
            printing it above groups that already reach the list would describe a
            control in the past tense. It wants a new key.
          */}
          <h3
            className='label-print text-caption'
            data-testid='groupAudienceHeading'
          >
            {dict.groups.title}
          </h3>

          <ul
            data-testid='groupAccessList'
            className='divide-y divide-rule border-y border-rule'
          >
            {groupAccess.map((row) => (
              <li
                key={row.id}
                className='flex items-center justify-between gap-3 py-2'
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
                  label={`${dict.shareList.revoke} \u00b7 ${row.groupName}`}
                  onClick={() => onRevokeGroup(row)}
                  testId='revokeGroupAccess'
                  icon={<IconUsersMinus className='h-4 w-4' aria-hidden='true' />}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Nobody and nothing: the one state in which both sections are absent. It
        prints the sentence and the heading the old list printed, and only when
        the sentence is true. With a group reaching the list and nobody added
        individually, `nobodyYet` would be false and `visibility.sharedWithNobody`
        above an empty people list would be false too - so a section with no rows
        is not printed at all.
      */}
      {isEmpty && (
        <section className='flex flex-col gap-2'>
          <h3 className='label-print text-caption'>
            {dict.visibility.sharedWithNobody}
          </h3>
          <p
            className='text-[0.8125rem] leading-relaxed text-caption'
            data-testid='nobodyYet'
          >
            {dict.shareList.nobodyYet}
          </p>
        </section>
      )}
    </div>
  );
};

export { AudienceList };
export default AudienceList;