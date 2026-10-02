'use client';

import React, { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { acceptedDisplayName } from '@/lib/account-name';
import { cn } from '@/lib/utils';
import type { RegisterFormProps } from '@/types';

/**
 * Account creation: a name, an address, and the same password twice.
 *
 * **The name is validated here, with the server's own function.**
 * `acceptedDisplayName` is imported rather than reimplemented for the same reason
 * the old add-member dialog imported `isMemberNameRefusal`: the client check and
 * the server check are two ends of one rule, and a second copy of the rule is a
 * second rule. The client is a suggestion to somebody holding a keyboard and the
 * route re-runs the same function on whatever the request actually contained - but
 * they can only agree because there is one of them.
 *
 * It fires on blur and then on every keystroke after that, never on a field nobody
 * has left yet. Validating live from the first character means refusing a name
 * mid-typing for the ordinary reason that a name is not a name yet - one letter, a
 * leading space, the half-finished state an IME reports while it composes - which
 * teaches the reader that the field is hostile before they have finished the word.
 * After the first blur the sentence appears on the first refusal and clears itself
 * the moment the value becomes a name, which is what "live" has to mean for a
 * keyboard.
 *
 * The remaining two fields are not validated live, and not because they were
 * forgotten. An address is short and the reader can see they are still typing it;
 * a password has no readable shape at all, and telling somebody their password is
 * too short three characters after they started is noise.
 */
const RegisterForm: React.FC<RegisterFormProps> = ({
  dict,
  isLoading,
  onSubmit,
  emailError,
  passwordError,
  displayNameError,
  onEmailChange,
  onPasswordChange,
  onDisplayNameChange,
}) => {
  /*
    The one field with a value in it. `RegisterFormProps` carries no `value`, and
    the submit handler reads `FormData` off the event - so nothing above this form
    owns the fields. This one is held locally only because this is the one that is
    checked while it is being typed, and a checked field needs a value.
  */
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  /*
    `name.length > 0` first, because an empty field is not a malformed name: it is
    a field nobody has filled in, and `required` already owns that case with the
    browser's own message. Answering a blur on an empty field with "names may
    contain letters, numbers, spaces, dots, hyphens and apostrophes" would state a
    rule about the value of nothing, 116 characters of German to say it, on a field
    the reader had not written in yet.
  */
  const liveNameError =
    name.length > 0 &&
    nameTouched &&
    acceptedDisplayName(name) === undefined
      ? dict.errors.invalidDisplayName
      : null;

  /*
    The server's sentence first, the live one behind it.

    Order matters and it is the other way round from what it looks like. The parent
    clears `displayNameError` on the first keystroke, so a server refusal and a live
    refusal are never both standing: the moment the reader touches the field again
    the server's verdict is gone and the one rule that produced it is answering
    instead. They cannot disagree, because they are the same function.
  */
  const shownNameError = displayNameError || liveNameError;

  return (
    <form
      onSubmit={onSubmit}
      className={cn('mt-4', 'flex', 'flex-col', 'gap-3')}
    >
      {/*
        Name, address, password. The name leads because it is the line the product
        will be carrying: `PRODUCT.md:72` puts the signed-in person's name in the
        header in place of the wordmark, so the first thing asked for is the thing
        the header will then show. It was also the first field of the group form
        this replaces, so the reading order a returning reader has does not move.
      */}
      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='newDisplayName'>
          {dict.displayName}
        </Label>
        <Input
          name='displayName'
          id='newDisplayName'
          type='text'
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            onDisplayNameChange?.();
          }}
          onBlur={() => setNameTouched(true)}
          /*
            `spellCheck={false}` and no `autoCapitalize`, for the same reason
            `lib/account-name.ts` rewrites the no-break space it is handed rather
            than storing it: this is a person's own name, not a word. A red
            underline under "Jörg" is a small lie, and a capitaliser that rewrites
            "van der Berg" or a Cyrillic patronymic into Title Case is the same
            class of defect as an invisible character in the stored value - the
            reader did not type what the product will later show.
          */
          spellCheck={false}
          autoCapitalize='none'
          required
          aria-invalid={shownNameError ? true : undefined}
          aria-describedby={
            shownNameError ? 'registerDisplayNameError' : undefined
          }
        />
        {shownNameError && (
          <p
            id='registerDisplayNameError'
            role='alert'
            data-testid='registerDisplayNameError'
            className='text-destructive text-[0.875rem] leading-snug'
          >
            {shownNameError}
          </p>
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='newEmail'>
          {dict.email}
        </Label>
        <Input
          name='email'
          id='newEmail'
          type='text'
          inputMode='email'
          autoComplete='email'
          spellCheck={false}
          autoCapitalize='none'
          onChange={onEmailChange}
          required
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'registerEmailError' : undefined}
        />
        {/*
          One sentence, two verdicts, and they are not the same. `invalid_email`
          says the address is not an address; `duplicate_email` says an account
          already exists for it. A client that could not tell them apart printed
          "that is not an address" to somebody whose address was fine and simply
          taken, which is not a small wrongness: it sends the reader off to retype
          an address that was correct the whole time. So the two arrive as distinct
          codes and are looked up separately in `auth-buttons.tsx`.
        */}
        {emailError && (
          <p
            id='registerEmailError'
            role='alert'
            data-testid='registerEmailError'
            className='text-destructive text-[0.875rem] leading-snug'
          >
            {emailError}
          </p>
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='newPassword'>
          {dict.password}
        </Label>
        <Input
          name='password'
          id='newPassword'
          type='password'
          autoComplete='new-password'
          onChange={onPasswordChange}
          required
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? 'registerPasswordError' : undefined}
        />
        {/*
          One paragraph, described from BOTH password fields, and both marked
          invalid. `RegisterFormProps` has a single `passwordError` and no
          `confirmPasswordError`, and it has to work that way: the two refusals it
          carries - "too short" and "these two do not match" - are about the pair,
          and a second slot would only invite a caller to put half a verdict in each
          half. So the sentence sits under the first field where the prop is named
          and the second field points at the same paragraph, which is the only
          arrangement where a keyboard user is told the same thing whichever of the
          two they are standing in.
        */}
        {passwordError && (
          <p
            id='registerPasswordError'
            role='alert'
            data-testid='registerPasswordError'
            className='text-destructive text-[0.875rem] leading-snug'
          >
            {passwordError}
          </p>
        )}
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='confirmPassword'>
          {dict.confirmPassword}
        </Label>
        <Input
          name='confirmPassword'
          id='confirmPassword'
          type='password'
          autoComplete='new-password'
          onChange={onPasswordChange}
          required
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? 'registerPasswordError' : undefined}
        />
      </div>

      {/* No `aria-label`: the button is named by its own text, which is the
          dictionary's. The English `aria-label="SubmitRegister"` this replaces did
          not contain the words on the button, which is the WCAG 2.5.3 failure the
          header's own comment describes. `data-testid` is unchanged. */}
      <Button
        type='submit'
        className={cn('w-full', 'xs:text-base', 'xs:h-12')}
        disabled={isLoading}
        data-testid='SubmitRegister'
      >
        {isLoading ? dict.loading : dict.registerBtn}
      </Button>
    </form>
  );
};

export default memo(RegisterForm);