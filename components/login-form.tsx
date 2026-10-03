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
  */
const LoginForm: React.FC<LoginFormProps> = ({
  dict,
  isLoading,
  onSubmit,
  identifierError,
  passwordError,
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
          type='text'
          inputMode='email'
          autoComplete='username'
          spellCheck={false}
          autoCapitalize='none'
          required
          aria-invalid={identifierError ? true : undefined}
          aria-describedby='identifierHint'
        />
        {/*
          The hint is permanent rather than an error state, because the question it
          answers - "does this have to be my real name, and can I change it?" - is
          one every person asks once when a field is called a nickname. It is
          `aria-describedby` unconditionally so a screen reader meets it either way.
        */}
        <p
          id='identifierHint'
          className='text-[0.8125rem] leading-snug text-caption'
        >
          {dict.loginIdentifierHint}
        </p>
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
      </div>
      {/*
        `xs:h-12` is the 48px floor for a dialog's primary action (`PRODUCT.md:
        102`), and `xs:` because below `sm` the sheet IS the page under the header
        and this is the control a thumb is reaching for; above it the sheet is a
        centred card on a desk and the whole app is 44px. `xs:text-base` goes with
        it: at 390px the sheet is the whole screen, so the one action it exists to
        perform is set at body size rather than at label size.

        No `aria-label`: the button is named by its own text, which is the
        dictionary's and is in the reader's language. The English
        `aria-label="SubmitLogin"` this replaces overrode that with a string that
        did not contain the words on the button, which is the WCAG 2.5.3 failure
        the header's own comment describes. `data-testid` is unchanged.
      */}
      <Button
        type='submit'
        className={cn('w-full', 'xs:text-base', 'xs:h-12')}
        disabled={isLoading}
        data-testid='SubmitLogin'
      >
        {isLoading ? dict.loading : dict.loginBtn}
      </Button>
    </form>
  );
};

export default memo(LoginForm);