'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AuthDialog from '@/components/auth-dialog';
import LoginForm from '@/components/login-form';
import RegisterForm from '@/components/register-form';
import { login, register } from '@/lib/auth';
import { isPasswordLongEnough } from '@/lib/account-name';
import { acceptedNickname } from '@/lib/nickname';
import { acceptedEmail } from '@/lib/email';
import { getLocaleFromPath } from '@/lib/i18n-config';
import { isRefusal } from '@/lib/refusals';
import { cn } from '@/lib/utils';
import type { AuthButtonsProps, AuthResponse } from '@/types';

/**
 * The credential refusals these two sheets can produce, and nothing else.
 *
 * Written out as literals rather than taken as the whole `Refusal` union because
* the union is the whole API: most of its members are share and authorization
 * refusals that neither form can produce and that have no sentence in a credential
 * form. Narrowing the vocabulary here is what lets the tables below be total
 * `Record`s, so adding a refusal to *these lists* without giving it a sentence is a
 * compile error.
 *
 * That is a narrower guarantee than `lib/api-refusal.ts` gives, and it is worth
 * being exact about the difference rather than claiming the stronger one: a refusal
 * added to the API union and not to these lists compiles fine here and falls
 * through to the generic toast at runtime. The gap is deliberate on both sides - a
 * refusal that is about a list must not be answered by a credential field - so what
 * holds is "no refusal reaches a field without a sentence *if the field owns it*",
 * not "no refusal can arrive unworded".
 *
 * Registration and sign-in do not raise the same set, and they are listed
 * separately rather than merged: `invalid_nickname` can only come back from
 * registration and `invalid_identifier` only from sign-in, and a merged list would
 * force each sheet to carry a sentence for the other's field.
 */
const REGISTER_REFUSALS = [
  'invalid_email',
  'duplicate_email',
  'invalid_nickname',
  'duplicate_nickname',
  'weak_password',
] as const;

const LOGIN_REFUSALS = ['invalid_identifier'] as const;

type RegisterRefusal = (typeof REGISTER_REFUSALS)[number];
type LoginRefusal = (typeof LOGIN_REFUSALS)[number];

/*
  `isRefusal` first, then a membership test, rather than a lookup keyed by whatever
  the body carried. `code` is attacker-reachable JSON, and the order matters: the
  first call rejects anything outside the closed union (including
  `Object.prototype.constructor`, which a `Record` keyed by it would find), the
  second rejects the refusals that exist but are not about a field here.
*/
const isRegisterRefusal = (code: unknown): code is RegisterRefusal =>
  isRefusal(code) && (REGISTER_REFUSALS as readonly string[]).includes(code);

const isLoginRefusal = (code: unknown): code is LoginRefusal =>
  isRefusal(code) && (LOGIN_REFUSALS as readonly string[]).includes(code);

const AuthButtons: React.FC<AuthButtonsProps> = ({ dict }) => {
  const router = useRouter();
  const pathname = usePathname();
  /*
    The locale off the path rather than off the `NEXT_LOCALE` cookie. The switcher
    writes the cookie and then navigates to `/{lang}`, so the path is the later of
    the two and is what the destination page will render in - and it ends the
    `'en'` literal this used to fall back to, which is wrong twice over in an app
    whose default locale is `de` and whose reader may be Russian.
  */
  const locale = getLocaleFromPath(pathname);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /*
    One error per field, held here rather than in the forms, because the forms hold
    no values and are handed nothing but a sentence. Three slots rather than one
    generic one is the point: a refusal the reader can act on has to say which field
    to fix, and "that address is already taken" against the address is a different
    piece of information from the same words under the display name.

    The state outlives the sheet - the forms unmount when their dialog closes, this
    component does not - so the `onOpenChange` handlers clear on the way out.
    Otherwise an Esc close leaves the verdict standing and the next open puts it
    back on an empty field, as an `aria-invalid` nobody earned.
  */
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(
    null
  );
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  const clearErrors = useCallback(() => {
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);
    setIdentifierError(null);
    setNicknameError(null);
  }, []);

  const goToDashboard = useCallback(() => {
    router.refresh();
    router.push(`/${locale}/dashboard`);
  }, [locale, router]);

  const handleLoginBase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return; // Prevent multiple submissions
    clearErrors();

    const formData = new FormData(e.currentTarget);
    const identifier = formData.get('identifier') as string;
    const password = formData.get('password') as string;

    /*
      One client-side gate before the request, and it is the identifier only.

      The field takes a nickname or an address and the gate has to accept both, so
      it is the disjunction of the same two functions the route runs - which is why
      the route can decide by the presence of an `@` and get the same answer twice.

      `lib/auth.ts`'s `login()` cannot do any of this: it throws on any non-2xx and
      throws the response body away, so every credential refusal the server has
      arrives here as one indistinguishable `Error`.

      That discarding is also why the *password* gets no equivalent check. There is
      no honest field-level sentence for a refused sign-in: the route answers the
      same 401 for an unknown identifier as for a wrong password, and printing
      "wrong password" under the password field would confirm which of the two a
      stranger got wrong. So the sheet says the one thing it can - `loginFailed`,
      under the password, meaning "these two values did not sign you in" - and no
      identifier sentence, which would have implied the identifier was good.
    */
    if (
      acceptedNickname(identifier) === undefined &&
      acceptedEmail(identifier) === undefined
    ) {
      setIdentifierError(dict.errors.invalidIdentifier);
      return;
    }

setIsLoading(true);
    try {
      const result = await login(identifier, password);

      /*
        The server's code first, because the server is the authority on the rule and
        this file only has the copy it optimistically ran a moment ago. The gate above
        answers sooner, which is the whole point of having it; this answers for real,
        which is the whole point of not having to trust it.
      */
      if (isLoginRefusal(result.code)) {
        setIdentifierError(dict.errors.invalidIdentifier);
        return;
      }

      if (!result.success) {
        setPasswordError(dict.errors.loginFailed);
        return;
      }

      toast.success(dict.toasts.loginSuccess);
      setIsLoginOpen(false);
      goToDashboard();
    } catch {
      // The request never arrived, or the response was not JSON. There is nothing
      // to narrow and nothing to say about which half was wrong.
      setPasswordError(dict.errors.loginFailed);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterBase = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return; // Prevent multiple submissions
    clearErrors();

    const formData = new FormData(e.currentTarget);
    const nickname = formData.get('nickname') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    /*
      The three rules the server is about to run, run here first - and run from
      the same functions, for the same reason `lib/account-name.ts` is a module
      rather than a copy on each side: one rule, two callers. In the order the
      fields are printed, so a reader who filled the sheet top to bottom is told
      about the topmost thing they still have to fix rather than one further down.

      The mismatch check is the odd one out and has no server counterpart: the
      second password is never sent, so this is the only place the two can be
      compared.

      The two address refusals are the reason the table below exists. "That is not
      an address" and "that address is already taken" are different sentences about
      different problems, and a client that could not tell them apart answered
      "that is not an address" to a reader whose address was fine and simply taken
      - which sends them off to retype something that was never wrong, and reads as
      though the address itself were the problem.
    */
    if (acceptedNickname(nickname) === undefined) {
      setNicknameError(dict.errors.invalidNickname);
      return;
    }
    if (acceptedEmail(email) === undefined) {
      setEmailError(dict.errors.invalidEmail);
      return;
    }
    if (!isPasswordLongEnough(password)) {
      setPasswordError(dict.errors.weakPassword);
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError(dict.errors.passwordMismatch);
      return;
    }

    setIsLoading(true);
    try {
      const result = (await register(email, password, nickname)) as
        AuthResponse & { code?: unknown };

      /*
        `AuthResponse` declares `success`, `message` and `error` and no `code`,
        while the register route sends one and `lib/refusals.ts` exists precisely so
        the client can narrow it. The body is read through a local widening rather
        than left unreadable: `isRefusal` still decides what the string may be, so a
        code this build has never heard of falls through to the generic toast
        instead of rendering `undefined` into a field. `code?: string` on
        `AuthResponse` would delete this cast and nothing else.
      */
      const refusal = isRegisterRefusal(result?.code) ? result.code : undefined;

      if (refusal) {
        const fieldFor: Record<
          RegisterRefusal,
          'email' | 'password' | 'confirmPassword' | 'nickname'
        > = {
          invalid_email: 'email',
          duplicate_email: 'email',
          invalid_nickname: 'nickname',
          duplicate_nickname: 'nickname',
          weak_password: 'password',
        };
        const setters = {
          email: setEmailError,
          password: setPasswordError,
          confirmPassword: setConfirmPasswordError,
          nickname: setNicknameError,
        };
        const sentences: Record<RegisterRefusal, string> = {
          invalid_email: dict.errors.invalidEmail,
          duplicate_email: dict.errors.duplicateEmail,
          invalid_nickname: dict.errors.invalidNickname,
          duplicate_nickname: dict.errors.duplicateNickname,
          weak_password: dict.errors.weakPassword,
        };
        setters[fieldFor[refusal]](sentences[refusal]);
        return;
      }

      if (!result?.success) {
        toast.error(dict.errors.registrationFailed);
        return;
      }

      toast.success(dict.toasts.registrationSuccess);
      setIsRegisterOpen(false);
      /*
        Registration signs the person in. The route sets the same `auth-token`
        cookie `login` does, so going to the sign-in sheet instead - which is what
        this used to do, because the group route set no cookie at all - would be
        asking a reader to authenticate with the password they just chose.
      */
      goToDashboard();
    } catch {
      toast.error(dict.errors.registrationFailed);
    } finally {
      setIsLoading(false);
    }
  };

  /*
    These two are not debounced, and the reason is that they cannot be. A form
    submit handler has to call `preventDefault()` and read `FormData` off
    `e.currentTarget`, both of which are only valid while React is dispatching
    the event. Wrapping either in `useDebounce` hands the callback a synthetic
    event whose target has already been recycled by the time it runs - which is
    why this used to appear to work: the leading branch returned before the timer
    was armed, so the callback always ran synchronously and no trailing call
    existed to fail. The window did nothing except hide that.

    The double-submit guard these actually need is the `isLoading` check at the
    top of each handler, and the sheet that renders it.
  */

  const handleLoginOpenChange = useCallback(
    (open: boolean) => {
      setIsLoginOpen(open);
      if (!open) clearErrors();
    },
    [clearErrors]
  );

  const handleRegisterOpenChange = useCallback(
    (open: boolean) => {
      setIsRegisterOpen(open);
      if (!open) clearErrors();
    },
    [clearErrors]
  );

  return (
    <div className={cn('flex', 'flex-col', 'gap-3', 'sm:flex-row', 'sm:gap-4')}>
      <Dialog open={isLoginOpen} onOpenChange={handleLoginOpenChange}>
        <DialogTrigger asChild>
          {/*
            No `aria-label`. The button is named by its own visible text, which is
            the dictionary's and is therefore in the reader's language; the English
            `aria-label` this replaces overrode that with a test-id-shaped string
            that did not contain the words on the button, which is what WCAG 2.5.3
            asks for - the accessible name of a control has to carry its visible
            label. `data-testid` is the selector the specs use and is unchanged.
          */}
          <Button
            size='lg'
            className='w-full sm:w-auto sm:min-w-44'
            data-testid='OpenLogin'
          >
            {dict.login}
          </Button>
        </DialogTrigger>
        {/*
          No height class of any kind. The primitive already sizes the sheet to
          its own contents under `xs` (`xs:h-auto` with a max-height cap), so a
          caller that asks for a height here is asking a question the sheet has
          already answered. These two classes were the last survivors of a bug
          where the primitive anchored both vertical edges and `height: auto`
          could not bind; the over-constraint outlived the fix, and on a 390x844
          phone it pinned the sheet at 717px with 389px of empty label stock
          under a 209px form.
        */}
        <AuthDialog
          title={dict.login}
          description={dict.loginDescription}
          closeLabel={dict.close}
        >
<LoginForm
            dict={dict}
            isLoading={isLoading}
            onSubmit={handleLoginBase}
            identifierError={identifierError}
            passwordError={passwordError}
          />
        </AuthDialog>
      </Dialog>

      <Dialog open={isRegisterOpen} onOpenChange={handleRegisterOpenChange}>
        <DialogTrigger asChild>
          <Button
            size='lg'
            variant='outline'
            className='w-full sm:w-auto sm:min-w-44'
            data-testid='OpenRegister'
          >
            {dict.register}
          </Button>
        </DialogTrigger>
        {/*
          Four fields and a paragraph: below `sm` the largest form in the app, and
          the only one a reader meets before they have an account. The primitive
          makes the sheet the whole page under the header at that width and lets
          it scroll, so nothing here has to be squeezed to fit - the one thing
          that sets the height is `registerDescription`, at 104 characters in
          German the longest string any dialog in this app opens with, and it gets
          the description's measure rather than a truncated field.
        */}
        <AuthDialog
          title={dict.register}
          description={dict.registerDescription}
          closeLabel={dict.close}
        >
          <RegisterForm
            dict={dict}
            isLoading={isLoading}
            onSubmit={handleRegisterBase}
emailError={emailError}
            passwordError={passwordError}
            confirmPasswordError={confirmPasswordError}
            nicknameError={nicknameError}
            onEmailChange={() => setEmailError(null)}
            onPasswordChange={() => setPasswordError(null)}
            onNicknameChange={() => setNicknameError(null)}
        onConfirmPasswordChange={() => setConfirmPasswordError(null)}
          />
        </AuthDialog>
      </Dialog>
    </div>
  );
};

export default AuthButtons;