'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { LoginFormProps } from '@/types';

/*
  * Two fields, and no placeholders.
  *
  * The first takes a nickname **or** an email address. That is one field rather
  * than two because both identifiers are unique - `Account.nickname` is
  * `@unique` and so is `Account.email` - so one input resolves to at most one
  * account and there is no second question to ask. It used to accept a display
  * name, which could not work: two accounts are both called Anna, so the field
  * needed a "which one?" and the only honest answer was "use your email", which
  * is the same field again. `lib/nickname.ts` has the rest of it.
  *
  * `inputMode='email'` rather than `type='email'` on that field, which is the whole
  * of the reason the browser is not allowed to validate it. `type=email` buys the
  * `@` key on a phone keyboard and costs a constraint-validation bubble in the
  * browser's own language - so a German or Russian reader who typed a bad address
  * was told "Please include an '@'" in English, from a sentence no dictionary has
  * ever contained, and the app's localized `invalidEmail` never got the chance to
  * say the thing properly. `inputMode` keeps the keyboard and gives the rule up;
  * `acceptedNickname` or `acceptedEmail` runs it instead, in the reader's language,
  * and is the same function the route runs on the way in.
  *
  * So the fields carry a printed label (`PRODUCT.md:62`) and nothing else. There is
  * no third `enterEmail` string: `types.ts` dropped it, and dropping it is the fix
  * `loginDescription`'s own comment asks for - the old sheet put "Gruppenname" on
  * screen three times in a row, as the sheet's description, as the printed label and
  * as the placeholder inside the field. Two of those are already the description and
  * the label.
  *
  * There is no permanent hint under the nickname field either, and no
  * `aria-describedby` naming one. Its sentence - that a nickname is unique and is
  * what you sign in with - is in `loginDescription` instead, which the dialog reads
  * out with the title when the sheet opens.
  *
  * That is a move about *when* the sentence is read rather than about the room it
  * took. Every person asks whether a nickname has to be their real name exactly
  * once, on the way in; a line printed for the whole interaction answers it again on
  * every later glance, standing between the reader and the one thing this sheet
  * exists to do.
  *
  * The attribute stayed, though, with a different target: `#identifier` is described
  * by the error the reader earned and by nothing else, exactly as the password field
  * is. The sentence about the product belongs to the description, which is read once
  * with the title; a field's description belongs to what the reader just did.
  */
const LoginForm: React.FC<LoginFormProps> = ({
  dict,
  isLoading,
  onSubmit,
  identifierError,
  passwordError,
  onCreateAccount,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className={cn('mt-4', 'flex', 'flex-col', 'gap-3')}
    >
      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='identifier'>
          {dict.loginIdentifier}
        </Label>
        <Input
          name='identifier'
          id='identifier'
          data-testid='loginIdentifier'
          type='text'
          inputMode='email'
          autoComplete='username'
          spellCheck={false}
          autoCapitalize='none'
          required
          aria-invalid={identifierError ? true : undefined}
          aria-describedby={
            identifierError ? 'loginIdentifierError' : undefined
          }
        />
        {/*
          On the field, not in a toast. A refused identifier is still a form the
          reader is standing in front of, and a toast that leaves in four seconds
          is not something they can read, act on and come back to. The sentence is
          whatever locale the page is in.
        */}
        {identifierError && (
          <p
            id='loginIdentifierError'
            role='alert'
            data-testid='loginIdentifierError'
            className='text-destructive text-[0.875rem] leading-snug'
          >
            {identifierError}
          </p>
        )}
      </div>
      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='password'>
          {dict.password}
        </Label>
        <Input
          name='password'
          id='password'
          data-testid='loginPassword'
          type='password'
          autoComplete='current-password'
          required
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? 'loginPasswordError' : undefined}
        />
        {passwordError && (
          <p
            id='loginPasswordError'
            role='alert'
            data-testid='loginPasswordError'
            className='text-destructive text-[0.875rem] leading-snug'
          >
            {passwordError}
          </p>
        )}
        {/*
          The way out for somebody who has no account, printed under the failure it
          answers - so a reader who mistook the sheet for something they have done
          before is offered the other door without being told they should use it.

          `type='button'` is not decoration. A `<button>` with no type inside a
          `<form>` submits it, so this would have re-posted the very credentials
          that were just refused, on a second click, from a control whose label says
          "create an account".

          Rendered only when the caller hands over a handler, which is how the caller
          says "this particular failure is one where you may not have an account
          yet" - see `LoginFormProps`. A 5xx and a request that never left are both
          failures on our side of the wire, and a field the server refused as
          malformed is a fact about what was typed rather than about the reader; in
          none of the three is an offer to register the next step.

          `self-start` because the column stretches its children: full width, this
          would read as a second primary action next to the 48px submit below it.
          Ghost is the right weight for that - the quiet way to offer an action,
          per `components/ui/button.tsx` - and it inherits the app-wide focus ring
          and the 44px floor for free.
        */}
        {onCreateAccount && (
          <Button
            type='button'
            variant='ghost'
            onClick={onCreateAccount}
            data-testid='loginCreateAccount'
            className='self-start'
          >
            {dict.errors.createAccountInstead}
          </Button>
        )}
      </div>
      {/*
        `size='cta'` is the 48px floor for a dialog's primary action
        (`PRODUCT.md: 102`), and `xs:` because below `sm` the sheet IS the page
        under the header and this is the control a thumb is reaching for; above
        it the sheet is a centred card on a desk and the whole app is 44px. The
        phone size step is part of the variant rather than a class written here,
        for the reason `buttonVariants` gives: the footer of every sheet puts
        this button beside a cancel, and only one declaration can keep the two
        from disagreeing about their height.

        No `aria-label`: the button is named by its own text, which is the
        dictionary's and is in the reader's language. The English
        `aria-label="SubmitLogin"` this replaces overrode that with a string that
        did not contain the words on the button, which is the WCAG 2.5.3 failure
        the header's own comment describes. `data-testid` is unchanged.
      */}
      <Button
        type='submit'
        size='cta'
        className='w-full'
        disabled={isLoading}
        data-testid='SubmitLogin'
      >
        {isLoading ? dict.loading : dict.loginBtn}
      </Button>
    </form>
  );
};

export default memo(LoginForm);