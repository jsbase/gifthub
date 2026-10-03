'use client';

import React, { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { acceptedNickname } from '@/lib/nickname';
import { cn } from '@/lib/utils';
import type { RegisterFormProps } from '@/types';

/**
 * Account creation: a nickname, an address, and the same password twice.
 *
 * **The nickname is validated here, with the server's own function.**
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
  nicknameError,
  confirmPasswordError,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onNicknameChange,
}) => {
  /*
    The one field with a value in it. `RegisterFormProps` carries no `value`, and
    the submit handler reads `FormData` off the event - so nothing above this form
    owns the fields. This one is held locally only because this is the one that is
    checked while it is being typed, and a checked field needs a value.
  */
  const [nickname, setNickname] = useState('');
  const [nicknameTouched, setNicknameTouched] = useState(false);

  /*
    `nickname.length > 0` first, because an empty field is not a malformed
    nickname: it is a field nobody has filled in, and `required` already owns that
    case with the browser's own message. Answering a blur on an empty field with the
    rule about the value would state a rule about nothing, in 70 characters of
    German, on a field the reader had not written in yet.
  */
  const liveNicknameError =
    nickname.length > 0 &&
    nicknameTouched &&
    acceptedNickname(nickname) === undefined
      ? dict.errors.invalidNickname
      : null;

  /*
    The server's sentence first, the live one behind it.

    Order matters and it is the other way round from what it looks like. The parent
    clears `nicknameError` on the first keystroke, so a server refusal and a live
    refusal are never both standing: the moment the reader touches the field again
    the server's verdict is gone and the one rule that produced it is answering
    instead. They cannot disagree, because they are the same function.
  */
  const shownNicknameError = nicknameError || liveNicknameError;

  return (
    <form
      onSubmit={onSubmit}
      className={cn('mt-4', 'flex', 'flex-col', 'gap-3')}
    >
      {/*
        Nickname first, then address, then password.

        The nickname leads because it is what the product will ask for every day
        afterwards - it is the handle `POST /api/auth/login` resolves - and putting
        it first means the reading order of the fields matches the order they matter
        in. It was not asked for in an earlier version of this form, because sign-in
        took a display name; a display name cannot be a handle, so the field appeared
        with the change rather than being renamed.

        Registration still asks for three things, not four. The display name is not
        among them: the route derives it from the nickname and capitalises the first
        letter, so somebody who typed `anna` is greeted as "Anna" and can change it
        later. For an audience that is explicitly not technical, a fourth field
        saying roughly what the first one already said is the one that tips the form
        over.
      */}
      <div className='flex flex-col gap-1.5'>
        <Label className='label-print text-caption' htmlFor='newNickname'>
          {dict.nickname}
        </Label>
        <Input
          name='nickname'
          id='newNickname'
          type='text'
          value={nickname}
          onChange={(event) => {
            setNickname(event.target.value);
            onNicknameChange?.();
          }}
          onBlur={() => setNicknameTouched(true)}
          /*
            No `spellCheck` and no `autoCapitalize`, because the field is a handle
            rather than a word: the route lowercases it on the way in, so leaving
            the capitaliser off stops the browser from fixing text the product is
            about to rewrite anyway, and a red line under `mueller` would be
            complaining about a word that is not supposed to be a word.
          */
          spellCheck={false}
          autoCapitalize='none'
          autoComplete='username'
          required
          aria-invalid={shownNicknameError ? true : undefined}
          aria-describedby={
            shownNicknameError ? 'registerNicknameError' : 'nicknameHint'
          }
        />
        <p id='nicknameHint' className='text-[0.8125rem] leading-snug text-caption'>
          {dict.registerNicknameHint}
        </p>
        {shownNicknameError && (
          <p
            id='registerNicknameError'
            role='alert'
            data-testid='registerNicknameError'
            className='text-destructive text-[0.875rem] leading-snug'
          >
            {shownNicknameError}
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
          invalid. `passwordError` and `confirmPasswordError` are two slots and they
          carry one of the two refusals between them - "too short" belongs to the
          first field on its own, and "these two do not match" is about the pair and
          has to be said under both. Splitting one paragraph into two would let a
          keyboard user standing at the second field be told nothing.
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
          onChange={onConfirmPasswordChange ?? onPasswordChange}
          required
          aria-invalid={
            passwordError || confirmPasswordError ? true : undefined
          }
          aria-describedby={
            confirmPasswordError
              ? 'registerConfirmPasswordError'
              : passwordError
                ? 'registerPasswordError'
                : undefined
          }
        />
        {confirmPasswordError && (
          <p
            id='registerConfirmPasswordError'
            role='alert'
            data-testid='registerConfirmPasswordError'
            className='text-destructive text-[0.875rem] leading-snug'
          >
            {confirmPasswordError}
          </p>
        )}
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